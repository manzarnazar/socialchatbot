<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Services\MeetingService;
use App\Models\TenantMeetingToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;

class MeetingIntegrationController extends Controller
{
    protected MeetingService $meetingService;

    public function __construct(MeetingService $meetingService)
    {
        $this->meetingService = $meetingService;
    }

    /**
     * Get meeting integrations status.
     */
    public function status(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        $zoomToken = TenantMeetingToken::where('tenant_id', $tenant->id)
            ->where('provider', 'zoom')
            ->first();

        $teamsToken = TenantMeetingToken::where('tenant_id', $tenant->id)
            ->where('provider', 'teams')
            ->first();

        $zoomCreds = MeetingService::getZoomCredentials();
        $teamsCreds = MeetingService::getTeamsCredentials();

        return response()->json([
            'zoom_connected' => (bool)$zoomToken,
            'zoom_email' => $zoomToken ? $zoomToken->email : null,
            'zoom_configured' => $zoomCreds['is_configured'],
            'teams_connected' => (bool)$teamsToken,
            'teams_email' => $teamsToken ? $teamsToken->email : null,
            'teams_configured' => $teamsCreds['is_configured'],
        ]);
    }

    /**
     * Get OAuth auth URL.
     */
    public function getAuthUrl(Request $request): JsonResponse
    {
        $provider = $request->query('provider');

        $tenant = $request->user()->tenant;
        if ($tenant && $provider) {
            $limitCheck = app(\App\Services\PlanLimitService::class)->canUseIntegration($tenant, $provider);
            if (!$limitCheck['allowed']) {
                return response()->json([
                    'message' => $limitCheck['reason'],
                    'error_code' => $limitCheck['code']
                ], 403);
            }
        }

        if ($provider === 'zoom') {
            $url = $this->meetingService->getZoomAuthUrl($tenant->id);
        } else if ($provider === 'teams') {
            $url = $this->meetingService->getTeamsAuthUrl($tenant->id);
        } else {
            return response()->json(['message' => 'Invalid meeting provider.'], 400);
        }

        return response()->json(['url' => $url]);
    }

    /**
     * OAuth callback handler.
     */
    public function callback(Request $request)
    {
        $stateStr = $request->query('state');
        $code = $request->query('code');

        $frontendUrl = \App\Providers\AppServiceProvider::getFrontendUrl($request->user());

        $stateData = \App\Services\Security\OAuthStateService::validateAndConsumeState($stateStr);

        if (!$stateData || !$code) {
            return redirect($frontendUrl . '/settings/integrations?meeting_error=' . urlencode('Invalid or expired OAuth state token.'));
        }

        $tenantId = (int)$stateData['tenant_id'];
        $provider = $stateData['provider'] ?? 'zoom';

        try {
            if ($provider === 'zoom') {
                $this->meetingService->exchangeZoomToken($code, $tenantId);
            } else if ($provider === 'teams') {
                $this->meetingService->exchangeTeamsToken($code, $tenantId);
            } else {
                throw new Exception("Unsupported meeting provider.");
            }

            return redirect($frontendUrl . "/settings/integrations?meeting_{$provider}_success=true");
        } catch (Exception $e) {
            Log::error("Meeting callback error [{$provider}]: " . $e->getMessage());
            return redirect($frontendUrl . '/settings/integrations?meeting_error=' . urlencode($e->getMessage()));
        }
    }

    /**
     * Disconnect meeting integration.
     */
    public function disconnect(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $provider = $request->query('provider');

        if (!in_array($provider, ['zoom', 'teams'])) {
            return response()->json(['message' => 'Invalid meeting provider.'], 400);
        }

        TenantMeetingToken::where('tenant_id', $tenant->id)
            ->where('provider', $provider)
            ->delete();

        return response()->json(['message' => "Disconnected {$provider} successfully."]);
    }

    /**
     * Handle Zoom App Marketplace Deauthorization webhook.
     */
    public function zoomDeauthorize(Request $request): JsonResponse
    {
        try {
            $payload = $request->input('payload', []);
            $accountId = $payload['account_id'] ?? null;
            $userId = $payload['user_id'] ?? null;

            Log::info("Zoom deauthorization webhook received", ['payload' => $payload]);

            if ($accountId || $userId) {
                TenantMeetingToken::where('provider', 'zoom')
                    ->when($accountId, fn($q) => $q->where('metadata->account_id', $accountId))
                    ->delete();
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Deauthorization processed.'
            ]);
        } catch (\Throwable $e) {
            Log::error('Zoom deauthorization webhook error: ' . $e->getMessage());
            return response()->json(['status' => 'error'], 500);
        }
    }
}
