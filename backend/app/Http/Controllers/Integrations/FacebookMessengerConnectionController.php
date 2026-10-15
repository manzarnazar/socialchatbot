<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Models\ChannelConnection;
use App\Models\PlatformSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Providers\AppServiceProvider;
use Exception;

class FacebookMessengerConnectionController extends Controller
{
    /**
     * Get database-stored Meta platform credentials.
     */
    protected function getMetaConfig(): array
    {
        $meta = PlatformSetting::getSetting('meta_embedded_config') ?: [];
        $appId = !empty($meta['app_id']) ? $meta['app_id'] : (PlatformSetting::getSetting('facebook_client_id') ?: '');
        $appSecret = !empty($meta['app_secret']) ? $meta['app_secret'] : (PlatformSetting::getSetting('facebook_client_secret') ?: '');

        return [
            'app_id' => trim((string)$appId),
            'app_secret' => trim((string)$appSecret),
        ];
    }
    /**
     * Get active Facebook Messenger connection status and all connected pages for the tenant.
     */
    public function status(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $connections = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'messenger')
            ->orderBy('id', 'desc')
            ->get();

        $connectionsList = $connections->map(function ($conn) {
            $creds = $conn->decrypted_credentials;
            return [
                'id' => $conn->id,
                'name' => $conn->name,
                'status' => $conn->status,
                'page_id' => $creds['page_id'] ?? '',
                'connection_mode' => $creds['connection_mode'] ?? 'embedded',
                'webhook_url' => AppServiceProvider::getBackendUrl() . "/api/webhooks/channel/{$conn->id}",
                'webhook_verify_token' => $creds['webhook_verify_token'] ?? '',
                'raw_credentials' => $creds,
                'created_at' => $conn->created_at?->toIso8601String(),
            ];
        });

        $firstConn = $connections->first();
        $firstCreds = $firstConn ? $firstConn->decrypted_credentials : [];

        return response()->json([
            'connected' => $connections->isNotEmpty(),
            'connections' => $connectionsList,
            'id' => $firstConn?->id,
            'name' => $firstConn?->name,
            'status' => $firstConn?->status,
            'page_id' => $firstCreds['page_id'] ?? '',
            'webhook_url' => $firstConn ? AppServiceProvider::getBackendUrl() . "/api/webhooks/channel/{$firstConn->id}" : '',
            'webhook_verify_token' => $firstCreds['webhook_verify_token'] ?? '',
        ]);
    }

    /**
     * Redirect to Facebook Login OAuth page for Page permissions.
     */
    public function redirect(Request $request)
    {
        $frontendUrl = AppServiceProvider::getFrontendUrl($request->user());
        $tenant = $request->user()?->tenant;
        if ($tenant) {
            $limitCheck = app(\App\Services\PlanLimitService::class)->canConnectChannel($tenant, 'messenger');
            if (!$limitCheck['allowed']) {
                return redirect($frontendUrl . '/channels?error=' . urlencode($limitCheck['reason']));
            }
        }

        $meta = $this->getMetaConfig();
        $appId = $meta['app_id'];
        $redirectUri = AppServiceProvider::getBackendUrl() . '/api/integrations/messenger/oauth/callback';
        $scope = 'pages_show_list,pages_messaging,pages_manage_metadata';
        $state = csrf_token();

        if (!$appId) {
            return redirect($frontendUrl . '/channels?error=' . urlencode('Meta App ID is not configured in Superadmin settings.'));
        }

        $url = "https://www.facebook.com/v21.0/dialog/oauth?" . http_build_query([
            'client_id' => $appId,
            'redirect_uri' => $redirectUri,
            'scope' => $scope,
            'state' => $state,
        ]);

        return redirect($url);
    }

    /**
     * Handle the Facebook OAuth Callback.
     */
    public function callback(Request $request)
    {
        $frontendUrl = AppServiceProvider::getFrontendUrl($request->user());
        $code = $request->query('code');
        if (!$code) {
            return redirect($frontendUrl . '/channels?error=No+oauth+code+returned+from+Facebook');
        }

        $meta = $this->getMetaConfig();
        $appId = $meta['app_id'];
        $appSecret = $meta['app_secret'];
        $redirectUri = AppServiceProvider::getBackendUrl() . '/api/integrations/messenger/oauth/callback';

        try {
            // 1. Exchange auth code for user access token
            $response = Http::get("https://graph.facebook.com/v21.0/oauth/access_token", [
                'client_id' => $appId,
                'redirect_uri' => $redirectUri,
                'client_secret' => $appSecret,
                'code' => $code,
            ]);

            if (!$response->successful()) {
                throw new Exception("OAuth token exchange failed: " . $response->body());
            }

            $userAccessToken = $response->json('access_token');

            // 2. Exchange short-lived token for long-lived user access token
            $response = Http::get("https://graph.facebook.com/v21.0/oauth/access_token", [
                'grant_type' => 'fb_exchange_token',
                'client_id' => $appId,
                'client_secret' => $appSecret,
                'fb_exchange_token' => $userAccessToken,
            ]);

            if (!$response->successful()) {
                throw new Exception("Long-lived token exchange failed: " . $response->body());
            }

            $longLivedAccessToken = $response->json('access_token');

            // 3. Query Facebook Pages managed by user
            $response = Http::withToken($longLivedAccessToken)
                ->get("https://graph.facebook.com/v21.0/me/accounts");

            if (!$response->successful()) {
                throw new Exception("Failed to query user Facebook pages: " . $response->body());
            }

            $pages = $response->json('data') ?? [];
            if (empty($pages)) {
                throw new Exception("No Facebook Pages found managed by user.");
            }

            // Connect using the first returned Page
            $targetPage = $pages[0];
            $tenantId = $request->user()->tenant_id ?? 1;

            // Look for existing connection matching this page ID
            $existing = ChannelConnection::where('tenant_id', $tenantId)
                ->where('channel_type', 'messenger')
                ->get();

            $connection = null;
            foreach ($existing as $conn) {
                $creds = $conn->decrypted_credentials;
                if (($creds['page_id'] ?? '') === $targetPage['id']) {
                    $connection = $conn;
                    break;
                }
            }

            if (!$connection) {
                $tenant = $request->user()?->tenant;
                if ($tenant) {
                    $limitCheck = app(\App\Services\PlanLimitService::class)->canConnectChannel($tenant, 'messenger');
                    if (!$limitCheck['allowed']) {
                        return redirect($frontendUrl . '/channels?error=' . urlencode($limitCheck['reason']));
                    }
                }

                $connection = new ChannelConnection();
                $connection->tenant_id = $tenantId;
                $connection->channel_type = 'messenger';
            }

            $existingCreds = $connection->exists ? $connection->decrypted_credentials : [];
            $webhookVerifyToken = $existingCreds['webhook_verify_token'] ?? Str::random(32);

            $connection->name = $targetPage['name'] . " (Messenger)";
            $connection->status = 'connected';
            $connection->credentials = [
                'page_access_token' => $targetPage['access_token'],
                'page_id' => $targetPage['id'],
                'webhook_verify_token' => $webhookVerifyToken,
            ];
            $connection->save();

            return redirect($frontendUrl . '/channels?success=Facebook+Messenger+channel+connected+successfully');
        } catch (Exception $e) {
            Log::error("Facebook Messenger OAuth callback failed: " . $e->getMessage());
            return redirect($frontendUrl . '/channels?error=' . urlencode($e->getMessage()));
        }
    }

    /**
     * Delete/Disconnect Facebook Messenger channel by ID.
     */
    public function disconnect(Request $request, $id = null): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $targetId = $id ?: $request->input('id');

        $query = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'messenger');

        if ($targetId) {
            $query->where('id', $targetId);
        }

        $query->delete();

        $remaining = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'messenger')
            ->count();

        return response()->json([
            'connected' => $remaining > 0,
            'remaining_count' => $remaining,
            'message' => 'Facebook Messenger connection has been disconnected successfully.'
        ]);
    }

    /**
     * Manual API / BYOK connection for Facebook Messenger.
     */
    public function manualConnect(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        if (!$tenant) {
            return response()->json(['message' => 'Workspace context not found.'], 404);
        }

        $request->validate([
            'id' => 'nullable|integer',
            'name' => 'required|string|max:100',
            'page_id' => 'required|string|max:100',
            'page_access_token' => 'required|string',
            'app_secret' => 'nullable|string|max:150',
            'webhook_verify_token' => 'nullable|string|max:100',
        ]);

        $connectionId = $request->input('id');
        if ($connectionId) {
            $connection = ChannelConnection::where('tenant_id', $tenant->id)
                ->where('channel_type', 'messenger')
                ->findOrFail($connectionId);
        } else {
            $limitCheck = app(\App\Services\PlanLimitService::class)->canConnectChannel($tenant, 'messenger');
            if (!$limitCheck['allowed']) {
                return response()->json([
                    'message' => $limitCheck['reason'],
                    'error_code' => $limitCheck['code']
                ], 403);
            }

            $connection = new ChannelConnection();
            $connection->tenant_id = $tenant->id;
            $connection->channel_type = 'messenger';
        }

        $existingCreds = $connection->exists ? $connection->decrypted_credentials : [];
        $verifyToken = $request->input('webhook_verify_token') ?: ($existingCreds['webhook_verify_token'] ?? Str::random(16));
        $appSecret = $request->input('app_secret') ?: ($existingCreds['app_secret'] ?? ($existingCreds['webhook_secret'] ?? ''));

        // Validate token live against Meta Graph API if not mock
        $pageAccessToken = $request->input('page_access_token');
        $pageId = $request->input('page_id');

        if ($pageAccessToken !== 'mock_token' && !str_starts_with($pageAccessToken, 'mock_')) {
            try {
                $testRes = Http::withToken($pageAccessToken)->timeout(10)->get("https://graph.facebook.com/v21.0/{$pageId}", [
                    'fields' => 'id,name',
                ]);

                if (!$testRes->successful()) {
                    Log::warning("Facebook Messenger manual credential test warning: " . $testRes->body());
                }
            } catch (Exception $e) {
                Log::warning("Facebook Messenger manual connection test exception: " . $e->getMessage());
            }
        }

        $credentials = [
            'page_id' => $pageId,
            'page_access_token' => $pageAccessToken,
            'app_secret' => $appSecret,
            'webhook_secret' => $appSecret,
            'webhook_verify_token' => $verifyToken,
            'connection_mode' => 'manual',
            'connected_at' => now()->toIso8601String(),
        ];

        $connection->name = $request->input('name');
        $connection->status = 'connected';
        $connection->credentials = $credentials;
        $connection->save();

        $webhookUrl = AppServiceProvider::getBackendUrl() . "/api/webhooks/channel/{$connection->id}";

        return response()->json([
            'connected' => true,
            'id' => $connection->id,
            'name' => $connection->name,
            'status' => $connection->status,
            'page_id' => $pageId,
            'webhook_url' => $webhookUrl,
            'webhook_verify_token' => $verifyToken,
            'connection_mode' => 'manual',
            'message' => 'Facebook Page connected successfully with your own API credentials.',
        ]);
    }
}
