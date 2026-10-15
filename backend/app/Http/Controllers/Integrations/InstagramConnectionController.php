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

class InstagramConnectionController extends Controller
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
     * Get active Instagram connection status and all connected Instagram accounts for the tenant.
     */
    public function status(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $connections = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'instagram')
            ->orderBy('id', 'desc')
            ->get();

        $connectionsList = $connections->map(function ($conn) {
            $creds = $conn->decrypted_credentials;
            return [
                'id' => $conn->id,
                'name' => $conn->name,
                'status' => $conn->status,
                'instagram_business_account_id' => $creds['instagram_business_account_id'] ?? $creds['instagram_account_id'] ?? '',
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
            'instagram_business_account_id' => $firstCreds['instagram_business_account_id'] ?? $firstCreds['instagram_account_id'] ?? '',
            'webhook_url' => $firstConn ? AppServiceProvider::getBackendUrl() . "/api/webhooks/channel/{$firstConn->id}" : '',
            'webhook_verify_token' => $firstCreds['webhook_verify_token'] ?? '',
        ]);
    }

    /**
     * Redirect to Facebook Login OAuth page.
     */
    public function redirect(Request $request)
    {
        $frontendUrl = AppServiceProvider::getFrontendUrl($request->user());
        $tenant = $request->user()?->tenant;
        if ($tenant) {
            $limitCheck = app(\App\Services\PlanLimitService::class)->canConnectChannel($tenant, 'instagram');
            if (!$limitCheck['allowed']) {
                return redirect($frontendUrl . '/channels?error=' . urlencode($limitCheck['reason']));
            }
        }

        $meta = $this->getMetaConfig();
        $appId = $meta['app_id'];
        $redirectUri = AppServiceProvider::getBackendUrl() . '/api/integrations/instagram/oauth/callback';
        $scope = 'instagram_basic,instagram_manage_messages,pages_manage_metadata,pages_show_list';
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
        $redirectUri = AppServiceProvider::getBackendUrl() . '/api/integrations/instagram/oauth/callback';

        try {
            // 1. Exchange authorization code for short-lived User Access Token
            $tokenRes = Http::asForm()->post('https://graph.facebook.com/v21.0/oauth/access_token', [
                'client_id' => $appId,
                'client_secret' => $appSecret,
                'redirect_uri' => $redirectUri,
                'code' => $code,
            ]);

            if (!$tokenRes->successful() || !$tokenRes->json('access_token')) {
                throw new Exception("Failed to exchange OAuth code with Facebook: " . $tokenRes->body());
            }

            $userAccessToken = $tokenRes->json('access_token');

            // 2. Exchange short-lived token for Long-Lived User Access Token
            $longLivedRes = Http::get('https://graph.facebook.com/v21.0/oauth/access_token', [
                'grant_type' => 'fb_exchange_token',
                'client_id' => $appId,
                'client_secret' => $appSecret,
                'fb_exchange_token' => $userAccessToken,
            ]);

            $finalUserToken = $longLivedRes->successful() && $longLivedRes->json('access_token')
                ? $longLivedRes->json('access_token')
                : $userAccessToken;

            // 3. Fetch user's Facebook Pages
            $pagesRes = Http::withToken($finalUserToken)->get('https://graph.facebook.com/v20.0/me/accounts');
            if (!$pagesRes->successful() || !is_array($pagesRes->json('data'))) {
                throw new Exception("Failed to retrieve Facebook pages associated with account.");
            }

            $pages = $pagesRes->json('data');
            if (empty($pages)) {
                throw new Exception("No Facebook Pages found on this account. Instagram Business Messaging requires a linked Facebook page.");
            }

            // 4. Find the first page with a connected Instagram Business Account
            $targetPage = null;
            $instagramAccountId = null;

            foreach ($pages as $page) {
                $pageId = $page['id'];
                $pageDetails = Http::withToken($page['access_token'])->get("https://graph.facebook.com/v20.0/{$pageId}", [
                    'fields' => 'instagram_business_account',
                ]);

                if ($pageDetails->successful() && $pageDetails->json('instagram_business_account.id')) {
                    $targetPage = $page;
                    $instagramAccountId = $pageDetails->json('instagram_business_account.id');
                    break;
                }
            }

            if (!$targetPage || !$instagramAccountId) {
                throw new Exception("Could not find any Facebook Page linked to an Instagram Business Account.");
            }

            $tenant = $request->user()?->tenant;
            $tenantId = $tenant?->id ?? ($request->user()->tenant_id ?? 1);

            // Look for existing connection matching this instagram account ID or page ID
            $existing = ChannelConnection::where('tenant_id', $tenantId)
                ->where('channel_type', 'instagram')
                ->get();

            $connection = null;
            foreach ($existing as $conn) {
                $creds = $conn->decrypted_credentials;
                if (($creds['instagram_business_account_id'] ?? '') === $instagramAccountId || ($creds['page_id'] ?? '') === $targetPage['id']) {
                    $connection = $conn;
                    break;
                }
            }

            if (!$connection) {
                if ($tenant) {
                    $limitCheck = app(\App\Services\PlanLimitService::class)->canConnectChannel($tenant, 'instagram');
                    if (!$limitCheck['allowed']) {
                        return redirect($frontendUrl . '/channels?error=' . urlencode($limitCheck['reason']));
                    }
                }

                $connection = new ChannelConnection();
                $connection->tenant_id = $tenantId;
                $connection->channel_type = 'instagram';
            }

            $existingCreds = $connection->exists ? $connection->decrypted_credentials : [];
            $webhookVerifyToken = $existingCreds['webhook_verify_token'] ?? Str::random(32);

            $connection->name = $targetPage['name'] . " (Instagram)";
            $connection->status = 'connected';
            $connection->credentials = [
                'page_access_token' => $targetPage['access_token'],
                'access_token' => $targetPage['access_token'],
                'page_id' => $targetPage['id'],
                'instagram_business_account_id' => $instagramAccountId,
                'instagram_account_id' => $instagramAccountId,
                'webhook_verify_token' => $webhookVerifyToken,
            ];
            $connection->save();

            return redirect($frontendUrl . '/channels?success=Instagram+channel+connected+successfully');
        } catch (Exception $e) {
            Log::error("Instagram OAuth callback failed: " . $e->getMessage());
            return redirect($frontendUrl . '/channels?error=' . urlencode($e->getMessage()));
        }
    }

    /**
     * Delete/Disconnect Instagram channel by ID.
     */
    public function disconnect(Request $request, $id = null): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $targetId = $id ?: $request->input('id');

        $query = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'instagram');

        if ($targetId) {
            $query->where('id', $targetId);
        }

        $query->delete();

        $remaining = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'instagram')
            ->count();

        return response()->json([
            'connected' => $remaining > 0,
            'remaining_count' => $remaining,
            'message' => 'Instagram connection has been disconnected successfully.'
        ]);
    }

    /**
     * Manual API / BYOK connection for Instagram Direct.
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
            'instagram_business_account_id' => 'required|string|max:100',
            'page_access_token' => 'required|string',
            'app_secret' => 'nullable|string|max:150',
            'webhook_verify_token' => 'nullable|string|max:100',
        ]);

        $connectionId = $request->input('id');
        if ($connectionId) {
            $connection = ChannelConnection::where('tenant_id', $tenant->id)
                ->where('channel_type', 'instagram')
                ->findOrFail($connectionId);
        } else {
            $limitCheck = app(\App\Services\PlanLimitService::class)->canConnectChannel($tenant, 'instagram');
            if (!$limitCheck['allowed']) {
                return response()->json([
                    'message' => $limitCheck['reason'],
                    'error_code' => $limitCheck['code']
                ], 403);
            }

            $connection = new ChannelConnection();
            $connection->tenant_id = $tenant->id;
            $connection->channel_type = 'instagram';
        }

        $existingCreds = $connection->exists ? $connection->decrypted_credentials : [];
        $verifyToken = $request->input('webhook_verify_token') ?: ($existingCreds['webhook_verify_token'] ?? Str::random(16));
        $appSecret = $request->input('app_secret') ?: ($existingCreds['app_secret'] ?? ($existingCreds['webhook_secret'] ?? ''));

        // Validate token live against Meta Graph API if not mock
        $pageAccessToken = $request->input('page_access_token');
        $igId = $request->input('instagram_business_account_id');
        $pageId = $request->input('page_id');

        if ($pageAccessToken !== 'mock_token' && !str_starts_with($pageAccessToken, 'mock_')) {
            try {
                $testRes = Http::withToken($pageAccessToken)->timeout(10)->get("https://graph.facebook.com/v21.0/{$igId}", [
                    'fields' => 'id,username',
                ]);

                if (!$testRes->successful()) {
                    Log::warning("Instagram manual credential test warning: " . $testRes->body());
                }
            } catch (Exception $e) {
                Log::warning("Instagram manual connection test exception: " . $e->getMessage());
            }
        }

        $credentials = [
            'page_id' => $pageId,
            'instagram_business_account_id' => $igId,
            'instagram_account_id' => $igId,
            'page_access_token' => $pageAccessToken,
            'access_token' => $pageAccessToken,
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
            'instagram_business_account_id' => $igId,
            'page_id' => $pageId,
            'webhook_url' => $webhookUrl,
            'webhook_verify_token' => $verifyToken,
            'connection_mode' => 'manual',
            'message' => 'Instagram account connected successfully with your own API credentials.',
        ]);
    }
}
