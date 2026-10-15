<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Models\ChannelConnection;
use App\Models\PlatformSetting;
use App\Services\PlanLimitService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Providers\AppServiceProvider;
use Exception;

class TikTokConnectionController extends Controller
{
    protected PlanLimitService $planLimitService;

    public function __construct(PlanLimitService $planLimitService)
    {
        $this->planLimitService = $planLimitService;
    }

    /**
     * Get active TikTok connection status and list of connections for the tenant.
     */
    public function status(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;

        $connections = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'tiktok')
            ->orderBy('id', 'desc')
            ->get();

        $appConfig = PlatformSetting::getSetting('tiktok_app_config') ?: [];
        $clientKey = $appConfig['client_key'] ?? '';

        $connectionsList = $connections->map(function ($conn) {
            $creds = $conn->decrypted_credentials;
            return [
                'id' => $conn->id,
                'name' => $conn->name,
                'status' => $conn->status,
                'handle' => $creds['handle'] ?? $creds['username'] ?? '',
                'open_id' => $creds['open_id'] ?? $conn->identifier,
                'avatar_url' => $creds['avatar_url'] ?? null,
                'webhook_url' => AppServiceProvider::getBackendUrl() . "/api/webhooks/channel/{$conn->id}",
                'created_at' => $conn->created_at?->toIso8601String(),
                'raw_credentials' => [
                    'handle' => $creds['handle'] ?? $creds['username'] ?? '',
                    'open_id' => $creds['open_id'] ?? $conn->identifier,
                    'access_token' => isset($creds['access_token']) ? substr($creds['access_token'], 0, 8) . '...' : '',
                ],
            ];
        });

        $firstConn = $connections->first();
        $firstCreds = $firstConn ? $firstConn->decrypted_credentials : [];

        return response()->json([
            'connected' => $connections->isNotEmpty(),
            'connections' => $connectionsList,
            'is_configured' => !empty($clientKey),
            'client_key_configured' => !empty($clientKey),
            'id' => $firstConn?->id,
            'name' => $firstConn?->name,
            'handle' => $firstCreds['handle'] ?? $firstCreds['username'] ?? '',
            'open_id' => $firstCreds['open_id'] ?? $firstConn?->identifier,
            'webhook_url' => $firstConn ? AppServiceProvider::getBackendUrl() . "/api/webhooks/channel/{$firstConn->id}" : '',
        ]);
    }

    /**
     * Connect or update a TikTok connection manually (Account Handle, Open ID, Access Token).
     */
    public function connect(Request $request): JsonResponse
    {
        $request->validate([
            'id' => 'nullable|integer',
            'name' => 'required|string|max:255',
            'handle' => 'required|string|max:255',
            'open_id' => 'required|string|max:255',
            'access_token' => 'required|string|max:2000',
            'client_secret' => 'nullable|string|max:255',
        ]);

        $tenant = $request->user()->tenant;
        $connectionId = $request->input('id');

        // Check plan limits for new connections
        if (!$connectionId) {
            $limitCheck = $this->planLimitService->canConnectChannel($tenant, 'tiktok');
            if (!$limitCheck['allowed']) {
                return response()->json([
                    'message' => $limitCheck['reason'],
                    'error_code' => $limitCheck['code'],
                ], 403);
            }
        }

        $cleanHandle = ltrim(trim($request->input('handle')), '@');
        $openId = trim($request->input('open_id'));
        $accessToken = trim($request->input('access_token'));
        $name = trim($request->input('name'));
        $clientSecret = trim($request->input('client_secret', ''));

        try {
            $credentials = [
                'handle' => '@' . $cleanHandle,
                'username' => $cleanHandle,
                'open_id' => $openId,
                'access_token' => $accessToken,
                'client_secret' => $clientSecret ?: null,
            ];

            if ($connectionId) {
                $connection = ChannelConnection::where('tenant_id', $tenant->id)->findOrFail($connectionId);
            } else {
                $connection = new ChannelConnection();
                $connection->tenant_id = $tenant->id;
                $connection->channel_type = 'tiktok';
            }

            $connection->name = $name;
            $connection->status = 'connected';
            $connection->credentials = $credentials;
            $connection->save();

            return response()->json([
                'message' => 'TikTok account connected successfully.',
                'connection' => [
                    'id' => $connection->id,
                    'name' => $connection->name,
                    'handle' => '@' . $cleanHandle,
                    'open_id' => $openId,
                    'status' => $connection->status,
                    'webhook_url' => AppServiceProvider::getBackendUrl() . "/api/webhooks/channel/{$connection->id}",
                ],
            ]);
        } catch (Exception $e) {
            Log::error("Failed to connect TikTok channel: " . $e->getMessage());
            return response()->json([
                'message' => 'Failed to connect TikTok account. ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate TikTok OAuth 2.0 authorization URL.
     */
    public function redirect(Request $request): JsonResponse
    {
        $appConfig = PlatformSetting::getSetting('tiktok_app_config') ?: [];
        $clientKey = $appConfig['client_key'] ?? '';

        if (empty($clientKey)) {
            return response()->json([
                'message' => 'TikTok Client Key is not configured by the platform administrator. Please connect via Manual BYOK Token or configure TikTok settings in Super Admin.',
            ], 422);
        }

        $redirectUri = AppServiceProvider::getBackendUrl() . '/api/integrations/tiktok/callback';
        $csrfState = bin2hex(random_bytes(16)) . '_' . ($request->user()->tenant_id ?? 1);
        
        // TikTok official Login Kit authorization URL
        $scopes = 'user.info.basic,im,video.upload,video.publish';
        $authUrl = "https://www.tiktok.com/v2/auth/authorize/?client_key=" . urlencode($clientKey) 
            . "&scope=" . urlencode($scopes) 
            . "&response_type=code" 
            . "&redirect_uri=" . urlencode($redirectUri) 
            . "&state=" . urlencode($csrfState);

        return response()->json([
            'url' => $authUrl,
        ]);
    }

    /**
     * Handle TikTok OAuth authorization callback.
     */
    public function callback(Request $request)
    {
        $code = $request->query('code');
        $state = $request->query('state');
        $error = $request->query('error');

        $frontendRedirect = AppServiceProvider::getFrontendUrl($request->user()) . '/channels';

        if ($error || !$code) {
            return redirect($frontendRedirect . '?tiktok_error=' . urlencode($request->query('error_description') ?: 'Authorization cancelled'));
        }

        $tenantId = 1;
        if ($state && str_contains($state, '_')) {
            $parts = explode('_', $state);
            $tenantId = (int) end($parts);
        }

        $tenant = \App\Models\Tenant::find($tenantId);
        if (!$tenant) {
            return redirect($frontendRedirect . '?tiktok_error=Invalid+tenant+session');
        }

        // Enforce plan limit
        $limitCheck = $this->planLimitService->canConnectChannel($tenant, 'tiktok');
        if (!$limitCheck['allowed']) {
            return redirect($frontendRedirect . '?tiktok_error=' . urlencode($limitCheck['reason']));
        }

        $appConfig = PlatformSetting::getSetting('tiktok_app_config') ?: [];
        $clientKey = $appConfig['client_key'] ?? '';
        $clientSecret = $appConfig['client_secret'] ?? '';
        $redirectUri = AppServiceProvider::getBackendUrl() . '/api/integrations/tiktok/callback';

        try {
            // Exchange code for access token
            $tokenRes = Http::asForm()->post('https://open.tiktokapis.com/v2/oauth/token/', [
                'client_key' => $clientKey,
                'client_secret' => $clientSecret,
                'code' => $code,
                'grant_type' => 'authorization_code',
                'redirect_uri' => $redirectUri,
            ]);

            if (!$tokenRes->successful()) {
                Log::error("TikTok OAuth Token exchange failed: " . $tokenRes->body());
                return redirect($frontendRedirect . '?tiktok_error=Token+exchange+failed');
            }

            $tokenData = $tokenRes->json('data') ?? $tokenRes->json();
            $accessToken = $tokenData['access_token'] ?? null;
            $openId = $tokenData['open_id'] ?? null;

            if (!$accessToken || !$openId) {
                return redirect($frontendRedirect . '?tiktok_error=Missing+token+or+open_id');
            }

            // Fetch basic profile info
            $profileRes = Http::withToken($accessToken)->get('https://open.tiktokapis.com/v2/user/info/', [
                'fields' => 'open_id,union_id,avatar_url,display_name,username',
            ]);

            $userData = $profileRes->json('data.user') ?? [];
            $displayName = $userData['display_name'] ?? $userData['username'] ?? 'TikTok Account';
            $handle = $userData['username'] ?? $openId;
            $avatarUrl = $userData['avatar_url'] ?? null;

            $credentials = [
                'handle' => '@' . ltrim($handle, '@'),
                'username' => ltrim($handle, '@'),
                'open_id' => $openId,
                'access_token' => $accessToken,
                'avatar_url' => $avatarUrl,
                'client_secret' => $clientSecret,
            ];

            $connection = ChannelConnection::where('tenant_id', $tenant->id)
                ->where('channel_type', 'tiktok')
                ->get()
                ->first(function ($conn) use ($openId) {
                    return ($conn->decrypted_credentials['open_id'] ?? null) === $openId;
                });

            if (!$connection) {
                $connection = new ChannelConnection();
                $connection->tenant_id = $tenant->id;
                $connection->channel_type = 'tiktok';
            }

            $connection->name = $displayName;
            $connection->status = 'connected';
            $connection->credentials = $credentials;
            $connection->save();

            return redirect($frontendRedirect . '?tiktok_success=connected');
        } catch (Exception $e) {
            Log::error("TikTok callback exception: " . $e->getMessage());
            return redirect($frontendRedirect . '?tiktok_error=' . urlencode($e->getMessage()));
        }
    }

    /**
     * Disconnect an active TikTok channel connection.
     */
    public function disconnect(Request $request, $id = null): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;

        $query = ChannelConnection::where('tenant_id', $tenantId)->where('channel_type', 'tiktok');
        if ($id) {
            $query->where('id', $id);
        }

        $connection = $query->first();

        if (!$connection) {
            return response()->json(['message' => 'TikTok connection not found.'], 404);
        }

        $connection->delete();

        return response()->json(['message' => 'TikTok account disconnected successfully.']);
    }
}
