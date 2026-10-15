<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Services\CRM\CrmManager;
use App\Models\CrmIntegration;
use App\Models\CrmSyncLog;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Exception;

class CrmIntegrationController extends Controller
{
    protected CrmManager $crmManager;

    public function __construct(CrmManager $crmManager)
    {
        $this->crmManager = $crmManager;
    }

    /**
     * Get status of all CRM integrations.
     */
    public function status(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $integrations = CrmIntegration::where('tenant_id', $tenant->id)->get()->keyBy('provider');

        $providers = ['hubspot', 'salesforce', 'zoho'];
        $status = [];

        foreach ($providers as $provider) {
            $integration = $integrations->get($provider);
            try {
                $driver = $this->crmManager->driver($provider);
                $cfg = \App\Models\PlatformSetting::getSetting("{$provider}_app_config") ?: [];
                $status[$provider] = [
                    'connected' => (bool)$integration,
                    'email' => $integration ? $integration->email : null,
                    'field_mapping' => $integration ? $integration->field_mapping : $driver->getDefaultMapping(),
                    'sync_direction' => $integration ? $integration->sync_direction : 'bidirectional',
                    'last_sync_at' => $integration ? $integration->last_sync_at : null,
                    'configured' => !empty($cfg['client_id']) && !empty($cfg['client_secret']),
                ];
            } catch (Exception $e) {
                Log::error("Failed to load status for CRM provider {$provider}: " . $e->getMessage());
            }
        }

        return response()->json($status);
    }

    /**
     * Get OAuth auth URL for a provider.
     */
    public function connect(Request $request, string $provider): JsonResponse
    {
        try {
            $tenant = $request->user()->tenant;
            if ($tenant) {
                $limitCheck = app(\App\Services\PlanLimitService::class)->canUseIntegration($tenant, $provider);
                if (!$limitCheck['allowed']) {
                    return response()->json([
                        'message' => $limitCheck['reason'],
                        'error_code' => $limitCheck['code']
                    ], 403);
                }
            }

            $driver = $this->crmManager->driver($provider);
            $url = $driver->getAuthUrl($tenant->id);

            return response()->json(['url' => $url]);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Handle CRM OAuth Callback.
     */
    public function callback(Request $request, string $provider)
    {
        $stateStr = $request->query('state');
        $code = $request->query('code');

        $stateData = \App\Services\Security\OAuthStateService::validateAndConsumeState($stateStr, $provider);

        $frontendUrl = \App\Providers\AppServiceProvider::getFrontendUrl($request->user());

        if (!$stateData || !$code) {
            return redirect($frontendUrl . '/settings/integrations?crm_error=' . urlencode('Invalid or expired OAuth state token.'));
        }

        $tenantId = (int)$stateData['tenant_id'];

        try {
            $driver = $this->crmManager->driver($provider);
            $driver->handleCallback($code, $tenantId);
            return redirect($frontendUrl . '/settings/integrations?crm_success=true&provider=' . urlencode($provider));
        } catch (Exception $e) {
            Log::error("CRM {$provider} callback error: " . $e->getMessage());
            return redirect($frontendUrl . '/settings/integrations?crm_error=' . urlencode($e->getMessage()));
        }
    }

    /**
     * Disconnect CRM integration.
     */
    public function disconnect(Request $request, string $provider): JsonResponse
    {
        $tenant = $request->user()->tenant;
        CrmIntegration::where('tenant_id', $tenant->id)->where('provider', $provider)->delete();

        return response()->json(['message' => "Disconnected {$provider} successfully."]);
    }

    /**
     * Update Field Mappings.
     */
    public function updateMapping(Request $request, string $provider): JsonResponse
    {
        $request->validate([
            'field_mapping' => ['required', 'array'],
            'sync_direction' => ['required', 'string', 'in:push,pull,bidirectional'],
        ]);

        $tenant = $request->user()->tenant;
        $integration = CrmIntegration::where('tenant_id', $tenant->id)->where('provider', $provider)->firstOrFail();

        $integration->update([
            'field_mapping' => $request->input('field_mapping'),
            'sync_direction' => $request->input('sync_direction'),
        ]);

        return response()->json([
            'message' => 'Field mappings updated successfully.',
            'field_mapping' => $integration->field_mapping,
            'sync_direction' => $integration->sync_direction
        ]);
    }

    /**
     * Trigger Manual Sync push/pull.
     */
    public function syncNow(Request $request, string $provider): JsonResponse
    {
        $request->validate([
            'duplicate_strategy' => ['required', 'string', 'in:merge,keep'],
        ]);

        $tenant = $request->user()->tenant;
        $integration = CrmIntegration::where('tenant_id', $tenant->id)->where('provider', $provider)->firstOrFail();
        $strategy = $request->input('duplicate_strategy');

        $pullResult = ['imported' => 0, 'merged' => 0];
        $pushedCount = 0;

        try {
            $driver = $this->crmManager->driver($provider);

            // Pull contacts
            if ($integration->sync_direction === 'pull' || $integration->sync_direction === 'bidirectional') {
                $pullResult = $driver->pullContacts($integration, $strategy);
            }

            // Push contacts
            if ($integration->sync_direction === 'push' || $integration->sync_direction === 'bidirectional') {
                $contacts = Contact::where('tenant_id', $tenant->id)->get();
                foreach ($contacts as $contact) {
                    $driver->pushContact($contact, $integration);
                    $pushedCount++;
                }
            }

            return response()->json([
                'success' => true,
                'pulled' => $pullResult,
                'pushed' => $pushedCount
            ]);

        } catch (Exception $e) {
            return response()->json(['message' => 'Sync failed: ' . $e->getMessage()], 400);
        }
    }

    /**
     * Get Sync Logs.
     */
    public function logs(Request $request, string $provider): JsonResponse
    {
        $tenant = $request->user()->tenant;
        
        $integration = CrmIntegration::where('tenant_id', $tenant->id)
            ->where('provider', $provider)
            ->firstOrFail();

        $logs = CrmSyncLog::where('tenant_id', $tenant->id)
            ->where('crm_integration_id', $integration->id)
            ->with(['contact'])
            ->orderBy('id', 'desc')
            ->limit(20)
            ->get();

        return response()->json(['logs' => $logs]);
    }

    /**
     * Retry failed sync logs.
     */
    public function retry(Request $request, int $logId): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $log = CrmSyncLog::where('tenant_id', $tenant->id)->where('id', $logId)->firstOrFail();

        if ($log->status === 'success') {
            return response()->json(['message' => 'This log item has already succeeded.'], 400);
        }

        $integration = $log->crmIntegration;
        $driver = $this->crmManager->driver($integration->provider);

        try {
            if ($log->action === 'push') {
                if (!$log->contact) {
                    return response()->json(['message' => 'Contact details no longer exist.'], 400);
                }
                $newLog = $driver->pushContact($log->contact, $integration);
            } else {
                $newLog = $driver->pullContacts($integration);
            }

            return response()->json([
                'success' => true,
                'log' => $newLog
            ]);
        } catch (Exception $e) {
            return response()->json(['message' => 'Retry sync failed: ' . $e->getMessage()], 400);
        }
    }
}
