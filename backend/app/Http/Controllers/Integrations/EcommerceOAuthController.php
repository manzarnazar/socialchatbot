<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Models\EcommerceConnection;
use App\Models\PlatformSetting;
use App\Jobs\SyncEcommerceCatalogJob;
use App\Providers\AppServiceProvider;
use App\Services\PlanLimitService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class EcommerceOAuthController extends Controller
{
    /**
     * Initiate Shopify OAuth 2.0 Authorization.
     */
    public function authorizeShopify(Request $request): JsonResponse
    {
        $shop = trim($request->input('shop_domain') ?: $request->input('store_url') ?: $request->input('shop') ?: '');
        if (!$shop) {
            return response()->json([
                'message' => 'Shopify store domain or URL is required (e.g. mystore.myshopify.com).',
            ], 422);
        }

        $tenant = $request->user()->tenant;
        if ($tenant) {
            $limitCheck = app(PlanLimitService::class)->canUseIntegration($tenant, 'shopify');
            if (!$limitCheck['allowed']) {
                return response()->json([
                    'message' => $limitCheck['reason'],
                    'error_code' => $limitCheck['code'],
                ], 403);
            }

            $existingConn = EcommerceConnection::where('tenant_id', $tenant->id)->where('platform', 'shopify')->first();
            if (!$existingConn) {
                $storeLimitCheck = app(PlanLimitService::class)->canConnectEcommerceStore($tenant);
                if (!$storeLimitCheck['allowed']) {
                    return response()->json([
                        'message' => $storeLimitCheck['reason'],
                        'error_code' => $storeLimitCheck['code'],
                    ], 403);
                }
            }
        }

        $shop = preg_replace('#^https?://#i', '', $shop);
        $shop = rtrim($shop, '/');

        // Normalize myshopify domain
        if (!str_contains($shop, '.')) {
            $shop .= '.myshopify.com';
        } elseif (!str_ends_with($shop, '.myshopify.com') && !str_contains($shop, '.')) {
            $shop .= '.myshopify.com';
        }

        $shopifyConfig = PlatformSetting::getSetting('shopify_app_config') ?: [];
        $clientId = $shopifyConfig['client_id'] ?? '';
        $scopes = $shopifyConfig['scopes'] ?? 'read_products,write_products,read_orders,read_customers,read_checkouts,read_inventory,read_draft_orders';
        $redirectUri = !empty($shopifyConfig['redirect_uri']) 
            ? $shopifyConfig['redirect_uri'] 
            : (AppServiceProvider::getBackendUrl() . '/api/ecommerce/oauth/shopify/callback');

        if (!$clientId) {
            return response()->json([
                'message' => 'Shopify Client ID is not configured in Superadmin settings.',
                'error_code' => 'SHOPIFY_CLIENT_ID_MISSING',
            ], 422);
        }

        // Generate tamper-proof encrypted state payload using hex encoding for URL-safety
        $statePayload = json_encode([
            'tenant_id' => $tenant->id,
            'shop' => $shop,
            'nonce' => Str::random(24),
            'expires_at' => now()->addMinutes(30)->timestamp,
        ]);
        $stateToken = bin2hex(Crypt::encryptString($statePayload));

        $authUrl = "https://{$shop}/admin/oauth/authorize?" . http_build_query([
            'client_id' => $clientId,
            'scope' => $scopes,
            'redirect_uri' => $redirectUri,
            'state' => $stateToken,
        ]);

        return response()->json([
            'success' => true,
            'url' => $authUrl,
            'shop' => $shop,
            'provider' => 'shopify',
        ]);
    }

    /**
     * Verify Shopify HMAC signature using multiple standard encodings.
     */
    protected function verifyShopifyHmac(Request $request, string $clientSecret): bool
    {
        $hmac = $request->query('hmac');
        if (!$hmac) {
            return false;
        }

        $params = $request->query();
        unset($params['hmac'], $params['signature']);
        ksort($params);

        // Variant 1: Standard key=value pairs joined with &
        $rawPairs = [];
        foreach ($params as $k => $v) {
            $rawPairs[] = "{$k}={$v}";
        }
        $rawQuery = implode('&', $rawPairs);
        if (hash_equals($hmac, hash_hmac('sha256', $rawQuery, $clientSecret))) {
            return true;
        }

        // Variant 2: http_build_query (RFC 1738)
        if (hash_equals($hmac, hash_hmac('sha256', http_build_query($params), $clientSecret))) {
            return true;
        }

        // Variant 3: http_build_query (RFC 3986)
        if (hash_equals($hmac, hash_hmac('sha256', http_build_query($params, '', '&', PHP_QUERY_RFC3986), $clientSecret))) {
            return true;
        }

        Log::warning('Shopify OAuth HMAC verification failed', [
            'received_hmac' => $hmac,
            'params' => $params,
            'raw_query' => $rawQuery,
            'computed_hmac_raw' => hash_hmac('sha256', $rawQuery, $clientSecret),
            'computed_hmac_rfc1738' => hash_hmac('sha256', http_build_query($params), $clientSecret),
        ]);

        return false;
    }

    /**
     * Handle Shopify OAuth 2.0 Callback.
     */
    public function callbackShopify(Request $request)
    {
        $frontendUrl = AppServiceProvider::getFrontendUrl($request->user());
        $code = $request->query('code');
        $shop = $request->query('shop');
        $state = $request->query('state');
        $hmac = $request->query('hmac');

        if (!$code || !$shop || !$state) {
            return redirect($frontendUrl . '/ecommerce/stores?oauth_error=' . urlencode('Missing OAuth authorization parameters from Shopify.'));
        }

        // Validate and decrypt state
        try {
            $rawState = (is_string($state) && ctype_xdigit($state) && strlen($state) % 2 === 0) ? hex2bin($state) : $state;
            $decrypted = Crypt::decryptString($rawState);
            $stateData = json_decode($decrypted, true);
            if (!$stateData || empty($stateData['tenant_id'])) {
                throw new Exception('Invalid state payload.');
            }
            if (!empty($stateData['expires_at']) && now()->timestamp > $stateData['expires_at']) {
                throw new Exception('OAuth state token has expired.');
            }
            $tenantId = (int) $stateData['tenant_id'];
        } catch (Exception $e) {
            Log::error('Shopify OAuth state verification failed: ' . $e->getMessage());
            return redirect($frontendUrl . '/ecommerce/stores?oauth_error=' . urlencode('OAuth session validation failed or token expired.'));
        }

        $shopifyConfig = PlatformSetting::getSetting('shopify_app_config') ?: [];
        $clientId = trim((string) ($shopifyConfig['client_id'] ?? ''));
        $clientSecret = trim((string) ($shopifyConfig['client_secret'] ?? ''));

        // Verify HMAC if client secret is configured
        if ($clientSecret && $hmac) {
            if (!$this->verifyShopifyHmac($request, $clientSecret)) {
                return redirect($frontendUrl . '/ecommerce/stores?oauth_error=' . urlencode('Security validation failed (HMAC signature mismatch).'));
            }
        }

        // Exchange authorization code for offline access token
        try {
            $tokenResponse = Http::timeout(15)
                ->asForm()
                ->post("https://{$shop}/admin/oauth/access_token", [
                    'client_id' => $clientId,
                    'client_secret' => $clientSecret,
                    'code' => $code,
                ]);

            if (!$tokenResponse->successful()) {
                Log::error('Shopify token exchange error: ' . $tokenResponse->body());
                return redirect($frontendUrl . '/ecommerce/stores?oauth_error=' . urlencode('Failed to obtain access token from Shopify: ' . $tokenResponse->json('error_description', $tokenResponse->body())));
            }

            $tokenData = $tokenResponse->json();
            $accessToken = $tokenData['access_token'] ?? null;
            $scope = $tokenData['scope'] ?? '';

            if (!$accessToken) {
                return redirect($frontendUrl . '/ecommerce/stores?oauth_error=' . urlencode('Shopify returned an empty access token.'));
            }

            // Create or update store connection
            $connection = EcommerceConnection::where('tenant_id', $tenantId)
                ->where('platform', 'shopify')
                ->first();

            $credentials = [
                'access_token' => $accessToken,
                'scope' => $scope,
                'connection_mode' => 'oauth_2_0',
                'connected_at' => now()->toIso8601String(),
            ];

            if ($connection) {
                $connection->update([
                    'store_url' => $shop,
                    'credentials' => $credentials,
                    'status' => 'active',
                ]);
            } else {
                $tenant = \App\Models\Tenant::find($tenantId);
                if ($tenant) {
                    $storeLimitCheck = app(PlanLimitService::class)->canConnectEcommerceStore($tenant);
                    if (!$storeLimitCheck['allowed']) {
                        return redirect($frontendUrl . '/ecommerce/stores?oauth_error=' . urlencode($storeLimitCheck['reason']));
                    }
                }

                $connection = EcommerceConnection::create([
                    'tenant_id' => $tenantId,
                    'platform' => 'shopify',
                    'store_url' => $shop,
                    'credentials' => $credentials,
                    'status' => 'active',
                    'webhook_secret' => 'whsec_' . Str::random(32),
                ]);
            }

            // Auto-register webhook subscriptions for real-time order & checkout sync
            $this->registerShopifyWebhooks($connection, $accessToken);

            // Automatically dispatch catalog synchronization
            SyncEcommerceCatalogJob::dispatch($connection->id);

            return redirect($frontendUrl . '/ecommerce/stores?oauth_success=true&provider=shopify&shop=' . urlencode($shop));
        } catch (Exception $ex) {
            Log::error('Shopify OAuth Callback Exception: ' . $ex->getMessage());
            return redirect($frontendUrl . '/ecommerce/stores?oauth_error=' . urlencode('Error completing Shopify authorization: ' . $ex->getMessage()));
        }
    }

    /**
     * Auto-register webhook subscriptions with Shopify Partner API.
     */
    protected function registerShopifyWebhooks(EcommerceConnection $connection, string $accessToken): void
    {
        $backendUrl = AppServiceProvider::getBackendUrl();
        if (!str_starts_with($backendUrl, 'https://')) {
            Log::info("Skipping automatic Shopify webhook registration: backend URL is not HTTPS ({$backendUrl})");
            return;
        }

        $webhookAddress = rtrim($backendUrl, '/') . '/api/webhooks/ecommerce/shopify';
        $shop = $connection->store_url;
        $apiVersion = '2025-01';
        $topics = ['checkouts/create', 'checkouts/update', 'orders/create'];

        foreach ($topics as $topic) {
            try {
                Http::timeout(10)->withHeaders([
                    'X-Shopify-Access-Token' => $accessToken,
                    'Content-Type' => 'application/json',
                ])->post("https://{$shop}/admin/api/{$apiVersion}/webhooks.json", [
                    'webhook' => [
                        'topic' => $topic,
                        'address' => $webhookAddress,
                        'format' => 'json',
                    ]
                ]);
            } catch (\Throwable $e) {
                Log::warning("Failed to auto-register Shopify webhook for topic {$topic}: " . $e->getMessage());
            }
        }
    }

    /**
     * Initiate WooCommerce OAuth 2.0 / REST API 1-Click Auth.
     */
    public function authorizeWooCommerce(Request $request): JsonResponse
    {
        $rawUrl = trim($request->input('store_url') ?: $request->input('url') ?: $request->input('shop_domain') ?: $request->input('shop') ?: '');
        if (!$rawUrl) {
            return response()->json([
                'message' => 'WooCommerce store URL is required (e.g. https://mystore.com).',
            ], 422);
        }

        $tenant = $request->user()->tenant;
        if ($tenant) {
            $limitCheck = app(PlanLimitService::class)->canUseIntegration($tenant, 'woocommerce');
            if (!$limitCheck['allowed']) {
                return response()->json([
                    'message' => $limitCheck['reason'],
                    'error_code' => $limitCheck['code'],
                ], 403);
            }

            $existingConn = EcommerceConnection::where('tenant_id', $tenant->id)->where('platform', 'woocommerce')->first();
            if (!$existingConn) {
                $storeLimitCheck = app(PlanLimitService::class)->canConnectEcommerceStore($tenant);
                if (!$storeLimitCheck['allowed']) {
                    return response()->json([
                        'message' => $storeLimitCheck['reason'],
                        'error_code' => $storeLimitCheck['code'],
                    ], 403);
                }
            }
        }

        if (!str_starts_with($rawUrl, 'http://') && !str_starts_with($rawUrl, 'https://')) {
            $rawUrl = 'https://' . $rawUrl;
        }
        $storeUrl = rtrim($rawUrl, '/');

        // Extract clean host/domain for connection record
        $parsed = parse_url($storeUrl);
        $cleanHost = $parsed['host'] ?? preg_replace('#^https?://#i', '', $storeUrl);

        // Generate encrypted state token
        $statePayload = json_encode([
            'tenant_id' => $tenant->id,
            'store_url' => $cleanHost,
            'raw_url' => $storeUrl,
            'nonce' => Str::random(24),
            'expires_at' => now()->addMinutes(30)->timestamp,
        ]);
        $stateToken = Crypt::encryptString($statePayload);

        $wooConfig = PlatformSetting::getSetting('woocommerce_app_config') ?: [];
        $appName = $wooConfig['app_name'] ?? 'WhatsOmni';
        $scope = $wooConfig['scopes'] ?? 'read_write';
        $frontendUrl = AppServiceProvider::getFrontendUrl($request->user());

        $returnUrl = $frontendUrl . '/ecommerce/stores?oauth_success=true&provider=woocommerce&store=' . urlencode($cleanHost);
        $baseCallback = !empty($wooConfig['redirect_uri']) 
            ? $wooConfig['redirect_uri'] 
            : (AppServiceProvider::getBackendUrl() . '/api/ecommerce/oauth/woocommerce/callback');
        $callbackUrl = $baseCallback . (str_contains($baseCallback, '?') ? '&' : '?') . 'state=' . urlencode($stateToken);

        // Standard WooCommerce 1-Click Auth Endpoint
        $authUrl = "{$storeUrl}/wc-auth/v1/authorize?" . http_build_query([
            'app_name' => $appName,
            'scope' => $scope,
            'user_id' => (string) $tenant->id,
            'return_url' => $returnUrl,
            'callback_url' => $callbackUrl,
        ]);

        return response()->json([
            'success' => true,
            'url' => $authUrl,
            'store_url' => $cleanHost,
            'provider' => 'woocommerce',
        ]);
    }

    /**
     * Handle WooCommerce OAuth 2.0 / REST API Callback.
     */
    public function callbackWooCommerce(Request $request)
    {
        $frontendUrl = AppServiceProvider::getFrontendUrl();
        $state = $request->query('state');

        // Handle GET redirect from WooCommerce browser completion
        if ($request->isMethod('GET')) {
            return redirect($frontendUrl . '/ecommerce/stores?oauth_success=true&provider=woocommerce');
        }

        // Handle POST payload from WooCommerce authentication endpoint
        if (!$state) {
            Log::error('WooCommerce OAuth Callback missing state query parameter.');
            return response()->json(['message' => 'Missing state token.'], 400);
        }

        try {
            $decrypted = Crypt::decryptString($state);
            $stateData = json_decode($decrypted, true);
            if (!$stateData || empty($stateData['tenant_id'])) {
                throw new Exception('Invalid state payload.');
            }
            $tenantId = (int) $stateData['tenant_id'];
            $storeUrl = $stateData['store_url'] ?? 'woocommerce-store';
        } catch (Exception $e) {
            Log::error('WooCommerce OAuth state verification error: ' . $e->getMessage());
            return response()->json(['message' => 'Invalid or expired state.'], 400);
        }

        $consumerKey = $request->input('consumer_key');
        $consumerSecret = $request->input('consumer_secret');
        $keyId = $request->input('key_id');

        if (!$consumerKey || !$consumerSecret) {
            Log::error('WooCommerce OAuth Callback missing consumer credentials in payload.', $request->all());
            return response()->json(['message' => 'Missing consumer credentials.'], 422);
        }

        // Create or update store connection
        $connection = EcommerceConnection::where('tenant_id', $tenantId)
            ->where('platform', 'woocommerce')
            ->first();

        $credentials = [
            'consumer_key' => $consumerKey,
            'consumer_secret' => $consumerSecret,
            'key_id' => $keyId,
            'connection_mode' => 'oauth_2_0',
            'connected_at' => now()->toIso8601String(),
        ];

        if ($connection) {
            $connection->update([
                'store_url' => $storeUrl,
                'credentials' => $credentials,
                'status' => 'active',
            ]);
        } else {
            $tenant = \App\Models\Tenant::find($tenantId);
            if ($tenant) {
                $storeLimitCheck = app(PlanLimitService::class)->canConnectEcommerceStore($tenant);
                if (!$storeLimitCheck['allowed']) {
                    return response()->json([
                        'message' => $storeLimitCheck['reason'],
                        'error_code' => $storeLimitCheck['code']
                    ], 403);
                }
            }

            $connection = EcommerceConnection::create([
                'tenant_id' => $tenantId,
                'platform' => 'woocommerce',
                'store_url' => $storeUrl,
                'credentials' => $credentials,
                'status' => 'active',
                'webhook_secret' => 'whsec_' . Str::random(32),
            ]);
        }

        // Trigger catalog synchronization
        SyncEcommerceCatalogJob::dispatch($connection->id);

        return response()->json([
            'success' => true,
            'message' => 'WooCommerce store successfully connected via OAuth 2.0.',
        ]);
    }
}
