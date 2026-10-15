<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Models\EcommerceConnection;
use App\Models\EcommerceOrder;
use App\Models\EcommerceProduct;
use App\Models\EcommerceAbandonedCart;
use App\Models\EcommerceDiscount;
use App\Jobs\SyncEcommerceCatalogJob;
use App\Jobs\SendAbandonedCartRecoveryJob;
use App\Providers\AppServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EcommerceIntegrationController extends Controller
{
    /**
     * Get ecommerce status & store connections for the tenant.
     */
    public function status(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        $totalCarts = EcommerceAbandonedCart::where('tenant_id', $tenantId)->count();
        $connections = EcommerceConnection::where('tenant_id', $tenantId)
            ->withCount(['products', 'orders'])
            ->get()
            ->map(function ($conn) use ($tenantId) {
                $creds = $conn->credentials ?? [];
                $hasCredentials = !empty($creds['access_token']) || !empty($creds['api_key']) || (!empty($creds['consumer_key']) && !empty($creds['consumer_secret']));
                $connCarts = EcommerceAbandonedCart::where('tenant_id', $tenantId)->where('ecommerce_connection_id', $conn->id)->count();
                return [
                    'id' => (string) $conn->id,
                    'tenant_id' => $conn->tenant_id,
                    'platform' => $conn->platform,
                    'provider' => $conn->platform,
                    'store_url' => $conn->store_url,
                    'status' => $conn->status,
                    'has_credentials' => $hasCredentials,
                    'webhook_secret' => $conn->webhook_secret,
                    'webhook_url' => AppServiceProvider::getBackendUrl() . '/api/webhooks/ecommerce/' . $conn->platform . ($conn->platform === 'woocommerce' ? '?connection_id=' . $conn->id : ''),
                    'last_synced_at' => $conn->last_synced_at ? $conn->last_synced_at->toIso8601String() : null,
                    'products_count' => (int) ($conn->products_count ?? 0),
                    'orders_count' => (int) ($conn->orders_count ?? 0),
                    'abandoned_carts_count' => $connCarts,
                    'created_at' => $conn->created_at ? $conn->created_at->toIso8601String() : null,
                ];
            });

        if ($request->is('*integrations/ecommerce/status') || $request->input('format') === 'array') {
            return response()->json($connections);
        }

        return response()->json([
            'success' => true,
            'connections' => $connections,
            'data' => $connections,
            'stats' => [
                'total_stores' => $connections->count(),
                'total_products' => $connections->sum('products_count'),
                'total_orders' => $connections->sum('orders_count'),
                'total_carts' => $totalCarts,
            ],
        ]);
    }

    /**
     * Connect a new store connection.
     */
    public function connect(Request $request)
    {
        $request->validate([
            'platform' => 'required|string|in:shopify,woocommerce',
            'store_url' => 'required|string',
            'credentials' => 'nullable|array',
        ]);

        $platform = $request->input('platform');
        $tenant = $request->user()->tenant;
        if ($tenant) {
            $limitCheck = app(\App\Services\PlanLimitService::class)->canUseIntegration($tenant, $platform);
            if (!$limitCheck['allowed']) {
                return response()->json([
                    'message' => $limitCheck['reason'],
                    'error_code' => $limitCheck['code']
                ], 403);
            }
        }

        $tenantId = $request->user()->tenant_id;
        $storeUrl = rtrim($request->input('store_url'), '/');

        // Parse and clean Shopify domain if necessary
        if ($platform === 'shopify') {
            if (str_starts_with($storeUrl, 'http://') || str_starts_with($storeUrl, 'https://')) {
                $parsed = parse_url($storeUrl);
                $storeUrl = $parsed['host'] ?? $storeUrl;
            }
        }

        // Validate URL against SSRF vulnerabilities
        $testUrl = str_starts_with($storeUrl, 'http://') || str_starts_with($storeUrl, 'https://')
            ? $storeUrl
            : 'https://' . $storeUrl;

        if (!\App\Services\Security\UrlSecurityValidator::isSafeUrl($testUrl, $ssrfError)) {
            return response()->json([
                'message' => $ssrfError ?: 'The provided store URL is not permitted for security reasons.',
                'error_code' => 'SSRF_BLOCKED'
            ], 422);
        }

        // Check if connection already exists
        $connection = EcommerceConnection::where('tenant_id', $tenantId)
            ->where('platform', $platform)
            ->first();

        if (!$connection && $tenant) {
            $storeLimitCheck = app(\App\Services\PlanLimitService::class)->canConnectEcommerceStore($tenant);
            if (!$storeLimitCheck['allowed']) {
                return response()->json([
                    'message' => $storeLimitCheck['reason'],
                    'error_code' => $storeLimitCheck['code']
                ], 403);
            }
        }

        $credentials = $request->input('credentials', []);

        if ($connection) {
            $updateData = [
                'store_url' => $storeUrl,
                'status' => 'active',
            ];
            if (!empty($credentials)) {
                $updateData['credentials'] = array_merge($connection->credentials ?? [], $credentials);
            }
            $connection->update($updateData);
        } else {
            $connection = EcommerceConnection::create([
                'tenant_id' => $tenantId,
                'platform' => $platform,
                'store_url' => $storeUrl,
                'credentials' => $credentials,
                'status' => 'active',
                'webhook_secret' => 'whsec_' . Str::random(32),
            ]);
        }

        // Automatically trigger initial catalog sync in the background
        SyncEcommerceCatalogJob::dispatch($connection->id);

        return response()->json([
            'message' => ucfirst($platform) . ' store connected successfully. Catalog synchronization started.',
            'connection' => $connection,
        ]);
    }

    /**
     * Update credentials for a store connection.
     */
    public function updateCredentials(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $connection = EcommerceConnection::where('tenant_id', $tenantId)->findOrFail($id);

        $credentials = $request->input('credentials');
        if (!is_array($credentials)) {
            $credentials = array_filter([
                'api_key' => $request->input('api_key'),
                'api_secret' => $request->input('api_secret'),
                'access_token' => $request->input('access_token'),
                'consumer_key' => $request->input('consumer_key') ?: $request->input('api_key'),
                'consumer_secret' => $request->input('consumer_secret') ?: $request->input('api_secret'),
            ], fn($val) => !is_null($val) && $val !== '');
        }

        if (empty($credentials)) {
            return response()->json([
                'success' => false,
                'message' => 'The credentials field is required.',
            ], 422);
        }

        $updateData = [];
        if ($request->filled('store_url')) {
            $url = rtrim($request->input('store_url'), '/');
            if ($connection->platform === 'shopify') {
                $parsed = parse_url($url);
                $url = $parsed['host'] ?? $url;
            } else {
                $url = preg_replace('#^https?://#', '', $url);
            }
            $updateData['store_url'] = $url;
        }

        $existing = $connection->credentials ?? [];
        $merged = array_merge($existing, $credentials);
        $updateData['credentials'] = $merged;
        $updateData['status'] = 'active';

        $connection->update($updateData);

        // Re-dispatch sync to fetch live catalog with updated credentials
        SyncEcommerceCatalogJob::dispatch($connection->id);

        return response()->json([
            'success' => true,
            'message' => 'Store credentials updated and sync initiated.',
            'connection' => $connection,
        ]);
    }

    /**
     * Disconnect store connection.
     */
    public function disconnect(Request $request, $id = null)
    {
        $targetId = $id ?? $request->input('id');
        if (!$targetId) {
            return response()->json(['message' => 'Connection ID is required.'], 422);
        }

        $tenantId = $request->user()->tenant_id;
        $connection = EcommerceConnection::where('tenant_id', $tenantId)
            ->where('id', $targetId)
            ->first();

        if (!$connection) {
            return response()->json(['message' => 'Connection not found.'], 404);
        }

        // Clean up products and orders
        EcommerceProduct::where('tenant_id', $tenantId)
            ->where('ecommerce_connection_id', $connection->id)
            ->delete();

        EcommerceOrder::where('tenant_id', $tenantId)
            ->where('ecommerce_connection_id', $connection->id)
            ->delete();

        $connection->delete();

        return response()->json([
            'success' => true,
            'message' => 'Store disconnected successfully.',
        ]);
    }

    /**
     * Manual sync action for a store connection.
     */
    public function syncNow(Request $request, $id = null)
    {
        $targetId = $id ?? $request->input('id');
        if (!$targetId) {
            return response()->json(['message' => 'Connection ID is required.'], 422);
        }

        $tenantId = $request->user()->tenant_id;
        $connection = EcommerceConnection::where('tenant_id', $tenantId)
            ->where('id', $targetId)
            ->first();

        if (!$connection) {
            return response()->json(['message' => 'Connection not found.'], 404);
        }

        // Run sync job directly for instant feedback if requested
        if ($request->boolean('sync_sync')) {
            app(SyncEcommerceCatalogJob::class, ['connectionId' => $connection->id])->handle(app(\App\Services\EmbeddingService::class));
        } else {
            SyncEcommerceCatalogJob::dispatch($connection->id);
        }

        return response()->json([
            'message' => 'Synchronization triggered successfully.',
        ]);
    }

    /**
     * List synced products for the tenant.
     */
    public function listProducts(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        $query = EcommerceProduct::where('tenant_id', $tenantId)
            ->with(['connection:id,platform,store_url,status']);

        // Filter by connection ID
        if ($request->filled('connection_id')) {
            $query->where('ecommerce_connection_id', $request->input('connection_id'));
        }

        // Filter by status
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        // Search by title, sku, handle, description
        if ($request->filled('search')) {
            $search = '%' . trim($request->input('search')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', $search)
                  ->orWhere('sku', 'like', $search)
                  ->orWhere('handle', 'like', $search)
                  ->orWhere('description', 'like', $search);
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');
        if (in_array($sortBy, ['title', 'price', 'stock_quantity', 'created_at', 'status'])) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->latest();
        }

        $perPage = (int) $request->input('per_page', 12);
        $products = $query->paginate($perPage);

        // Overall metrics for the catalog
        $totalProducts = EcommerceProduct::where('tenant_id', $tenantId)->count();
        $inStock = EcommerceProduct::where('tenant_id', $tenantId)->where('stock_quantity', '>', 0)->count();
        $outOfStock = EcommerceProduct::where('tenant_id', $tenantId)->where('stock_quantity', '<=', 0)->count();
        $totalStores = EcommerceConnection::where('tenant_id', $tenantId)->count();

        $tenant = $request->user()->tenant;
        $currencyInfo = $tenant?->currency ? [
            'code' => $tenant->currency->code,
            'symbol' => $tenant->currency->symbol
        ] : [
            'code' => 'USD',
            'symbol' => '$'
        ];

        return response()->json([
            'products' => $products,
            'metrics' => [
                'total_products' => $totalProducts,
                'in_stock' => $inStock,
                'out_of_stock' => $outOfStock,
                'total_stores' => $totalStores,
            ],
            'meta' => [
                'total_products' => $totalProducts,
                'in_stock' => $inStock,
                'out_of_stock' => $outOfStock,
                'total_stores' => $totalStores,
            ],
            'currency' => $currencyInfo,
        ]);
    }

    /**
     * Show single product details.
     */
    public function showProduct(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $product = EcommerceProduct::where('tenant_id', $tenantId)
            ->with(['connection:id,platform,store_url,status'])
            ->findOrFail($id);

        return response()->json($product);
    }

    /**
     * Delete product.
     */
    public function deleteProduct(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $product = EcommerceProduct::where('tenant_id', $tenantId)->findOrFail($id);

        // Delete from connected store platform if active
        if ($product->ecommerce_connection_id && $product->connection && $product->connection->status === 'active' && $product->external_product_id) {
            $connection = $product->connection;
            $platform = $connection->platform;
            $storeUrl = $connection->store_url;
            $creds = $connection->credentials ?? [];

            try {
                if ($platform === 'shopify') {
                    $accessToken = $creds['access_token'] ?? $creds['api_key'] ?? null;
                    if ($accessToken) {
                        Http::timeout(10)->withHeaders([
                            'X-Shopify-Access-Token' => $accessToken,
                            'Content-Type' => 'application/json',
                        ])->delete("https://{$storeUrl}/admin/api/2025-01/products/{$product->external_product_id}.json");
                    }
                } elseif ($platform === 'woocommerce') {
                    $consumerKey = $creds['consumer_key'] ?? null;
                    $consumerSecret = $creds['consumer_secret'] ?? null;
                    if ($consumerKey && $consumerSecret) {
                        $res = Http::timeout(10)->withBasicAuth($consumerKey, $consumerSecret)
                            ->delete("https://{$storeUrl}/wp-json/wc/v3/products/{$product->external_product_id}?force=true");
                        if ($res->status() === 401) {
                            Http::timeout(10)->delete("https://{$storeUrl}/wp-json/wc/v3/products/{$product->external_product_id}?force=true&consumer_key=" . urlencode($consumerKey) . "&consumer_secret=" . urlencode($consumerSecret));
                        }
                    }
                }
            } catch (\Throwable $delEx) {
                Log::warning("Failed to delete external product {$product->external_product_id} on {$platform}: " . $delEx->getMessage());
            }
        }

        $product->delete();

        return response()->json(['message' => 'Product removed successfully.']);
    }

    /**
     * Manually add a product to the tenant's catalog under plan limits.
     */
    public function createProduct(Request $request)
    {
        $tenant = $request->user()->tenant;
        if ($tenant) {
            $productLimitCheck = app(\App\Services\PlanLimitService::class)->canAddEcommerceProduct($tenant, 1);
            if (!$productLimitCheck['allowed']) {
                return response()->json([
                    'message' => $productLimitCheck['reason'],
                    'error_code' => $productLimitCheck['code'],
                ], 403);
            }
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'sku' => 'nullable|string|max:100',
            'stock_quantity' => 'nullable|integer|min:0',
            'description' => 'nullable|string',
            'image_url' => 'nullable|string|url',
        ]);

        $connection = EcommerceConnection::where('tenant_id', $request->user()->tenant_id)
            ->where('status', 'active')
            ->first();

        if (!$connection) {
            $connection = EcommerceConnection::create([
                'tenant_id' => $request->user()->tenant_id,
                'platform' => 'shopify',
                'store_url' => 'store-' . $request->user()->tenant_id . '.myshopify.com',
                'credentials' => [],
                'status' => 'active',
                'webhook_secret' => 'whsec_' . Str::random(16),
            ]);
        }

        $externalProductId = 'prod_' . Str::random(12);

        // Push product to connected store if credentials exist
        if ($connection && $connection->status === 'active') {
            $platform = $connection->platform;
            $storeUrl = $connection->store_url;
            $creds = $connection->credentials ?? [];

            try {
                if ($platform === 'shopify') {
                    $accessToken = $creds['access_token'] ?? $creds['api_key'] ?? null;
                    if ($accessToken) {
                        $shopifyPayload = [
                            'product' => [
                                'title' => $request->input('title'),
                                'body_html' => $request->input('description') ?? '',
                                'variants' => [
                                    [
                                        'price' => (string) $request->input('price'),
                                        'sku' => $request->input('sku') ?: null,
                                        'inventory_quantity' => (int) $request->input('stock_quantity', 1),
                                    ]
                                ],
                            ]
                        ];
                        if ($request->filled('image_url')) {
                            $shopifyPayload['product']['images'] = [['src' => $request->input('image_url')]];
                        }

                        $res = Http::timeout(12)->withHeaders([
                            'X-Shopify-Access-Token' => $accessToken,
                            'Content-Type' => 'application/json',
                        ])->post("https://{$storeUrl}/admin/api/2025-01/products.json", $shopifyPayload);

                        if ($res->successful() && !empty($res->json('product.id'))) {
                            $externalProductId = (string) $res->json('product.id');
                        }
                    }
                } elseif ($platform === 'woocommerce') {
                    $consumerKey = $creds['consumer_key'] ?? null;
                    $consumerSecret = $creds['consumer_secret'] ?? null;
                    if ($consumerKey && $consumerSecret) {
                        $wooPayload = [
                            'name' => $request->input('title'),
                            'regular_price' => (string) $request->input('price'),
                            'sku' => $request->input('sku') ?: '',
                            'manage_stock' => true,
                            'stock_quantity' => (int) $request->input('stock_quantity', 1),
                            'description' => $request->input('description') ?? '',
                        ];
                        if ($request->filled('image_url')) {
                            $wooPayload['images'] = [['src' => $request->input('image_url')]];
                        }

                        $res = Http::timeout(12)->withBasicAuth($consumerKey, $consumerSecret)
                            ->post("https://{$storeUrl}/wp-json/wc/v3/products", $wooPayload);
                        if ($res->status() === 401) {
                            $res = Http::timeout(12)->post("https://{$storeUrl}/wp-json/wc/v3/products?consumer_key=" . urlencode($consumerKey) . "&consumer_secret=" . urlencode($consumerSecret), $wooPayload);
                        }

                        if ($res->successful() && !empty($res->json('id'))) {
                            $externalProductId = (string) $res->json('id');
                        }
                    }
                }
            } catch (\Throwable $createEx) {
                Log::warning("Failed to create product on {$platform}: " . $createEx->getMessage());
            }
        }

        $product = EcommerceProduct::create([
            'tenant_id' => $request->user()->tenant_id,
            'ecommerce_connection_id' => $connection->id,
            'external_product_id' => $externalProductId,
            'title' => $request->input('title'),
            'handle' => Str::slug($request->input('title')),
            'price' => (float)$request->input('price'),
            'sku' => $request->input('sku') ?: ('SKU-' . strtoupper(Str::random(6))),
            'stock_quantity' => (int)$request->input('stock_quantity', 1),
            'description' => $request->input('description'),
            'image_url' => $request->input('image_url'),
            'currency' => $tenant?->currency?->code ?? 'USD',
            'status' => ((int)$request->input('stock_quantity', 1) > 0) ? 'active' : 'out_of_stock',
        ]);

        return response()->json([
            'message' => 'Product created successfully.',
            'product' => $product,
        ], 201);
    }

    /**
     * Trigger global or store product sync.
     */
    public function syncProducts(Request $request)
    {
        $tenant = $request->user()->tenant;
        if ($tenant) {
            $productCheck = app(\App\Services\PlanLimitService::class)->canAddEcommerceProduct($tenant, 0);
            if (!$productCheck['allowed']) {
                return response()->json([
                    'message' => $productCheck['reason'],
                    'error_code' => $productCheck['code'],
                ], 403);
            }
        }

        $tenantId = $request->user()->tenant_id;
        $connectionId = $request->input('connection_id');
        $embeddingService = app(\App\Services\EmbeddingService::class);

        if ($connectionId) {
            $connection = EcommerceConnection::where('tenant_id', $tenantId)->findOrFail($connectionId);
            try {
                app(SyncEcommerceCatalogJob::class, ['connectionId' => $connection->id])
                    ->handle($embeddingService);
            } catch (\Exception $e) {
                SyncEcommerceCatalogJob::dispatch($connection->id);
            }
        } else {
            $connections = EcommerceConnection::where('tenant_id', $tenantId)->get();
            if ($connections->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No connected e-commerce stores found.',
                ], 400);
            }
            foreach ($connections as $conn) {
                try {
                    app(SyncEcommerceCatalogJob::class, ['connectionId' => $conn->id])
                        ->handle($embeddingService);
                } catch (\Exception $e) {
                    SyncEcommerceCatalogJob::dispatch($conn->id);
                }
            }
        }

        $totalProducts = EcommerceProduct::where('tenant_id', $tenantId)->count();

        return response()->json([
            'success' => true,
            'message' => 'Product catalog synchronization completed successfully.',
            'total_products' => $totalProducts,
        ]);
    }

    /**
     * List ecommerce orders for the tenant with filters, search, and metrics.
     */
    public function listOrders(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        $query = EcommerceOrder::where('tenant_id', $tenantId)
            ->with([
                'connection:id,platform,store_url,status',
                'contact:id,first_name,last_name,email,phone',
            ]);

        // Filter by connection
        if ($request->filled('connection_id')) {
            $query->where('ecommerce_connection_id', $request->input('connection_id'));
        }

        // Filter by financial status
        if ($request->filled('financial_status') && $request->input('financial_status') !== 'all') {
            $query->where('financial_status', $request->input('financial_status'));
        }

        // Filter by fulfillment status
        if ($request->filled('fulfillment_status') && $request->input('fulfillment_status') !== 'all') {
            $query->where('fulfillment_status', $request->input('fulfillment_status'));
        }

        // Filter by overall status
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        // Search by order number, customer name, email, phone, or tracking
        if ($request->filled('search')) {
            $search = '%' . trim($request->input('search')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', $search)
                  ->orWhere('customer_name', 'like', $search)
                  ->orWhere('customer_email', 'like', $search)
                  ->orWhere('customer_phone', 'like', $search)
                  ->orWhere('tracking_number', 'like', $search);
            });
        }

        // Sort
        $sortBy = $request->input('sort_by', 'external_created_at');
        $sortDir = $request->input('sort_dir', 'desc');
        if (in_array($sortBy, ['order_number', 'total_price', 'financial_status', 'fulfillment_status', 'external_created_at', 'created_at'])) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('external_created_at', 'desc');
        }

        $perPage = (int) $request->input('per_page', 20);
        $orders = $query->paginate($perPage);

        // Overall order metrics
        $totalOrders = EcommerceOrder::where('tenant_id', $tenantId)->count();
        $paidOrders = EcommerceOrder::where('tenant_id', $tenantId)->where('financial_status', 'paid')->count();
        $pendingOrders = EcommerceOrder::where('tenant_id', $tenantId)->whereIn('financial_status', ['pending', 'authorized', 'partially_paid'])->count();
        $fulfilledOrders = EcommerceOrder::where('tenant_id', $tenantId)->where('fulfillment_status', 'fulfilled')->count();
        $totalRevenue = (float) EcommerceOrder::where('tenant_id', $tenantId)->where('financial_status', 'paid')->sum('total_price');

        $tenant = $request->user()->tenant;
        $currencyInfo = $tenant?->currency ? [
            'code' => $tenant->currency->code,
            'symbol' => $tenant->currency->symbol
        ] : [
            'code' => 'USD',
            'symbol' => '$'
        ];

        return response()->json([
            'success' => true,
            'orders' => $orders,
            'metrics' => [
                'total_orders' => $totalOrders,
                'paid_orders' => $paidOrders,
                'pending_orders' => $pendingOrders,
                'fulfilled_orders' => $fulfilledOrders,
                'total_revenue' => $totalRevenue,
            ],
            'currency' => $currencyInfo,
        ]);
    }

    /**
     * Show single order details.
     */
    public function showOrder(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $order = EcommerceOrder::where('tenant_id', $tenantId)
            ->with([
                'connection:id,platform,store_url,status',
                'contact:id,first_name,last_name,email,phone,avatar_url',
            ])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'order' => $order,
        ]);
    }

    /**
     * Delete / remove order.
     */
    public function deleteOrder(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $order = EcommerceOrder::where('tenant_id', $tenantId)->findOrFail($id);
        $order->delete();

        return response()->json([
            'success' => true,
            'message' => 'Order removed successfully.',
        ]);
    }

    /**
     * Sync orders from store connections.
     */
    public function syncOrders(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        $connectionId = $request->input('connection_id');

        if ($connectionId) {
            $connection = EcommerceConnection::where('tenant_id', $tenantId)->findOrFail($connectionId);
            $this->syncOrdersForConnection($connection);
        } else {
            $connections = EcommerceConnection::where('tenant_id', $tenantId)->get();
            if ($connections->isEmpty()) {
                return response()->json(['message' => 'No connected e-commerce stores found.'], 400);
            }
            foreach ($connections as $conn) {
                $this->syncOrdersForConnection($conn);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Store orders synchronized successfully.',
        ]);
    }

    /**
     * Helper to sync orders for a given store connection.
     */
    public function syncOrdersForConnection(EcommerceConnection $connection): int
    {
        $platform = $connection->platform;
        $storeUrl = $connection->store_url;
        $creds = $connection->credentials ?? [];
        $tenantId = $connection->tenant_id;
        $syncedCount = 0;
        $ordersList = [];

        try {
            if ($platform === 'shopify') {
                $accessToken = $creds['access_token'] ?? $creds['api_key'] ?? null;
                if ($accessToken) {
                    $pageInfo = null;
                    $pageCount = 0;
                    $maxPages = 10; // Sync up to 500 orders

                    do {
                        $url = "https://{$storeUrl}/admin/api/2025-01/orders.json?status=any&limit=50";
                        if ($pageInfo) {
                            $url .= '&page_info=' . urlencode($pageInfo);
                        }

                        $response = \App\Services\Security\UrlSecurityValidator::client(15)
                            ->withHeaders([
                                'X-Shopify-Access-Token' => $accessToken,
                                'Content-Type' => 'application/json',
                            ])
                            ->get($url);

                        if (!$response->successful()) {
                            break;
                        }

                        $shopifyOrders = $response->json('orders') ?? [];
                        foreach ($shopifyOrders as $o) {
                            $customer = $o['customer'] ?? [];
                            $billing = $o['billing_address'] ?? [];
                            $shipping = $o['shipping_address'] ?? [];

                            $customerName = trim(($customer['first_name'] ?? '') . ' ' . ($customer['last_name'] ?? '')) 
                                ?: ($billing['name'] ?? ($shipping['name'] ?? 'Guest Customer'));
                            $customerEmail = $o['email'] ?? ($o['contact_email'] ?? ($customer['email'] ?? null));
                            $customerPhone = $o['phone'] ?? ($billing['phone'] ?? ($customer['phone'] ?? null));

                            $lineItems = [];
                            foreach ($o['line_items'] ?? [] as $item) {
                                $lineItems[] = [
                                    'id' => (string) ($item['id'] ?? ''),
                                    'product_id' => (string) ($item['product_id'] ?? ''),
                                    'title' => $item['title'] ?? 'Item',
                                    'variant_title' => $item['variant_title'] ?? null,
                                    'sku' => $item['sku'] ?? null,
                                    'quantity' => (int) ($item['quantity'] ?? 1),
                                    'price' => (float) ($item['price'] ?? 0),
                                    'total' => (float) (($item['price'] ?? 0) * ($item['quantity'] ?? 1)),
                                ];
                            }

                            $ordersList[] = [
                                'external_order_id' => (string) $o['id'],
                                'order_number' => $o['name'] ?? ('#' . ($o['order_number'] ?? $o['id'])),
                                'customer_name' => $customerName,
                                'customer_email' => $customerEmail,
                                'customer_phone' => $customerPhone,
                                'total_price' => (float) ($o['total_price'] ?? 0),
                                'subtotal_price' => (float) ($o['subtotal_price'] ?? $o['total_price'] ?? 0),
                                'total_tax' => (float) ($o['total_tax'] ?? 0),
                                'total_discounts' => (float) ($o['total_discounts'] ?? 0),
                                'currency' => $o['currency'] ?? 'USD',
                                'financial_status' => $o['financial_status'] ?? 'paid',
                                'fulfillment_status' => $o['fulfillment_status'] ?? 'unfulfilled',
                                'status' => !empty($o['cancelled_at']) ? 'cancelled' : (!empty($o['closed_at']) ? 'closed' : 'open'),
                                'tracking_number' => $o['fulfillments'][0]['tracking_number'] ?? null,
                                'tracking_url' => $o['fulfillments'][0]['tracking_url'] ?? null,
                                'items_count' => count($lineItems),
                                'items_summary' => $lineItems,
                                'line_items' => $lineItems,
                                'shipping_address' => $shipping,
                                'billing_address' => $billing,
                                'external_created_at' => !empty($o['created_at']) ? \Carbon\Carbon::parse($o['created_at']) : now(),
                            ];
                        }

                        $linkHeader = $response->header('Link');
                        $pageInfo = $this->extractShopifyPageInfo($linkHeader);
                        $pageCount++;
                    } while ($pageInfo && $pageCount < $maxPages);
                }
            } elseif ($platform === 'woocommerce') {
                $consumerKey = $creds['consumer_key'] ?? null;
                $consumerSecret = $creds['consumer_secret'] ?? null;

                if ($consumerKey && $consumerSecret) {
                    $page = 1;
                    $totalPages = 1;
                    $maxPages = 10; // Sync up to 500 orders

                    do {
                        $url = "https://{$storeUrl}/wp-json/wc/v3/orders?per_page=50&page={$page}";
                        $response = \App\Services\Security\UrlSecurityValidator::client(15)
                            ->withBasicAuth($consumerKey, $consumerSecret)
                            ->get($url);

                        // Fallback to query parameters if server strips Authorization header
                        if ($response->status() === 401) {
                            $fallbackUrl = $url . '&consumer_key=' . urlencode($consumerKey) . '&consumer_secret=' . urlencode($consumerSecret);
                            $response = \App\Services\Security\UrlSecurityValidator::client(15)->get($fallbackUrl);
                        }

                        if (!$response->successful()) {
                            break;
                        }

                        $wooOrders = $response->json() ?? [];
                        if (empty($wooOrders)) {
                            break;
                        }

                        foreach ($wooOrders as $o) {
                            $billing = $o['billing'] ?? [];
                            $shipping = $o['shipping'] ?? [];

                            $customerName = trim(($billing['first_name'] ?? '') . ' ' . ($billing['last_name'] ?? '')) ?: 'Guest Customer';
                            $customerEmail = $billing['email'] ?? null;
                            $customerPhone = $billing['phone'] ?? null;

                            $lineItems = [];
                            foreach ($o['line_items'] ?? [] as $item) {
                                $lineItems[] = [
                                    'id' => (string) ($item['id'] ?? ''),
                                    'product_id' => (string) ($item['product_id'] ?? ''),
                                    'title' => $item['name'] ?? 'Item',
                                    'sku' => $item['sku'] ?? null,
                                    'quantity' => (int) ($item['quantity'] ?? 1),
                                    'price' => (float) ($item['price'] ?? 0),
                                    'total' => (float) ($item['total'] ?? 0),
                                ];
                            }

                            $finStatus = in_array($o['status'] ?? '', ['completed', 'processing']) ? 'paid' : ($o['status'] === 'refunded' ? 'refunded' : 'pending');
                            $fulStatus = ($o['status'] ?? '') === 'completed' ? 'fulfilled' : (($o['status'] ?? '') === 'processing' ? 'processing' : 'unfulfilled');

                            $ordersList[] = [
                                'external_order_id' => (string) $o['id'],
                                'order_number' => '#' . ($o['number'] ?? $o['id']),
                                'customer_name' => $customerName,
                                'customer_email' => $customerEmail,
                                'customer_phone' => $customerPhone,
                                'total_price' => (float) ($o['total'] ?? 0),
                                'subtotal_price' => (float) ($o['total'] ?? 0),
                                'total_tax' => (float) ($o['total_tax'] ?? 0),
                                'total_discounts' => (float) ($o['discount_total'] ?? 0),
                                'currency' => $o['currency'] ?? 'USD',
                                'financial_status' => $finStatus,
                                'fulfillment_status' => $fulStatus,
                                'status' => $o['status'] ?? 'open',
                                'tracking_number' => null,
                                'tracking_url' => null,
                                'items_count' => count($lineItems),
                                'items_summary' => $lineItems,
                                'line_items' => $lineItems,
                                'shipping_address' => $shipping,
                                'billing_address' => $billing,
                                'external_created_at' => !empty($o['date_created_gmt']) ? \Carbon\Carbon::parse($o['date_created_gmt']) : now(),
                            ];
                        }

                        $headerTotalPages = (int) $response->header('X-WP-TotalPages', 1);
                        if ($headerTotalPages > 1) {
                            $totalPages = $headerTotalPages;
                        }
                        $page++;
                    } while ($page <= $totalPages && $page <= $maxPages);
                }
            }
        } catch (\Exception $ex) {
            Log::warning("Order sync API connection error: " . $ex->getMessage());
        }

        if (empty($ordersList)) {
            Log::info("syncOrdersForConnection: 0 orders found for connection ID {$connection->id}.");
            return 0;
        }

        $tenant = $connection->tenant;
        $orderLimit = $tenant ? $tenant->getMonthlyEcommerceOrdersLimit() : -1;
        $currentOrdersThisMonth = \App\Models\EcommerceOrder::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->count();

        // Upsert orders into EcommerceOrder table & link CRM contacts
        foreach ($ordersList as $ord) {
            $existingOrder = EcommerceOrder::where('tenant_id', $tenantId)
                ->where('ecommerce_connection_id', $connection->id)
                ->where('external_order_id', $ord['external_order_id'])
                ->first();

            if (!$existingOrder && $orderLimit !== -1 && $currentOrdersThisMonth >= $orderLimit) {
                Log::info("syncOrdersForConnection: Tenant {$tenantId} reached monthly ecommerce orders limit ({$orderLimit}). Skipping remaining new orders.");
                continue;
            }

            if (!$existingOrder) {
                $currentOrdersThisMonth++;
            }

            $contactId = null;
            if (!empty($ord['customer_email']) || !empty($ord['customer_phone'])) {
                $contact = \App\Models\Contact::where('tenant_id', $tenantId)
                    ->where(function ($q) use ($ord) {
                        if (!empty($ord['customer_email'])) $q->where('email', $ord['customer_email']);
                        if (!empty($ord['customer_phone'])) $q->orWhere('phone', $ord['customer_phone']);
                    })->first();
                if ($contact) {
                    $contactId = $contact->id;
                }
            }

            EcommerceOrder::updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'ecommerce_connection_id' => $connection->id,
                    'external_order_id' => $ord['external_order_id'],
                ],
                [
                    'contact_id' => $contactId,
                    'order_number' => $ord['order_number'],
                    'customer_name' => $ord['customer_name'] ?? null,
                    'customer_email' => $ord['customer_email'] ?? 'customer@example.com',
                    'customer_phone' => $ord['customer_phone'] ?? null,
                    'total_price' => $ord['total_price'],
                    'subtotal_price' => $ord['subtotal_price'] ?? $ord['total_price'],
                    'total_tax' => $ord['total_tax'] ?? 0,
                    'total_discounts' => $ord['total_discounts'] ?? 0,
                    'currency' => $ord['currency'] ?? 'USD',
                    'financial_status' => $ord['financial_status'] ?? 'paid',
                    'fulfillment_status' => $ord['fulfillment_status'] ?? 'unfulfilled',
                    'status' => $ord['status'] ?? 'open',
                    'tracking_number' => $ord['tracking_number'] ?? null,
                    'tracking_url' => $ord['tracking_url'] ?? null,
                    'items_count' => $ord['items_count'] ?? 1,
                    'items_summary' => $ord['items_summary'] ?? [],
                    'line_items' => $ord['line_items'] ?? [],
                    'shipping_address' => $ord['shipping_address'] ?? null,
                    'billing_address' => $ord['billing_address'] ?? null,
                    'external_created_at' => $ord['external_created_at'] ?? now(),
                ]
            );
            $syncedCount++;
        }

        $connection->update(['last_synced_at' => now()]);
        return $syncedCount;
    }


    /**
     * Get ecommerce store coupons list.
     */
    public function coupons(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        $connection = EcommerceConnection::where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->first();

        // Default fallback mocks so the UI works immediately for test/demo accounts
        $fallbackCoupons = ['WELCOME10', 'FREESHIP', 'VIP20', 'WINTER30'];

        $dbDiscounts = EcommerceDiscount::where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->latest()
            ->get();

        $codes = $dbDiscounts->pluck('code')->toArray();

        if ($connection) {
            $platform = $connection->platform;
            $storeUrl = $connection->store_url;
            $creds = $connection->credentials ?? [];

            try {
                if ($platform === 'shopify') {
                    $accessToken = $creds['access_token'] ?? $creds['api_key'] ?? null;
                    if ($accessToken) {
                        $response = \App\Services\Security\UrlSecurityValidator::client(10)
                            ->withHeaders([
                                'X-Shopify-Access-Token' => $accessToken,
                                'Content-Type' => 'application/json',
                            ])
                            ->get("https://{$storeUrl}/admin/api/2025-01/price_rules.json");

                        if ($response->successful()) {
                            $priceRules = $response->json('price_rules') ?? [];
                            foreach ($priceRules as $pr) {
                                if (!empty($pr['title'])) {
                                    $codes[] = strtoupper($pr['title']);
                                }
                            }
                        }
                    }
                } else if ($platform === 'woocommerce') {
                    $consumerKey = $creds['consumer_key'] ?? null;
                    $consumerSecret = $creds['consumer_secret'] ?? null;

                    if ($consumerKey && $consumerSecret) {
                        $response = \App\Services\Security\UrlSecurityValidator::client(10)
                            ->withBasicAuth($consumerKey, $consumerSecret)
                            ->get("https://{$storeUrl}/wp-json/wc/v3/coupons");

                        if ($response->status() === 401) {
                            $response = \App\Services\Security\UrlSecurityValidator::client(10)
                                ->get("https://{$storeUrl}/wp-json/wc/v3/coupons?consumer_key=" . urlencode($consumerKey) . "&consumer_secret=" . urlencode($consumerSecret));
                        }

                        if ($response->successful()) {
                            $coupons = $response->json() ?? [];
                            foreach ($coupons as $c) {
                                if (!empty($c['code'])) {
                                    $codes[] = strtoupper($c['code']);
                                }
                            }
                        }
                    }
                }
            } catch (\Exception $e) {
                Log::error("EcommerceIntegrationController coupons query error: " . $e->getMessage());
            }
        }

        $allCodes = array_values(array_unique(array_merge($codes, $fallbackCoupons)));

        if ($request->boolean('details') || $request->input('format') === 'detailed') {
            return response()->json([
                'success' => true,
                'coupons' => $dbDiscounts,
                'codes' => $allCodes,
            ]);
        }

        return response()->json($allCodes);
    }

    /**
     * List all discounts created for this tenant.
     */
    public function listDiscounts(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        $discounts = EcommerceDiscount::where('tenant_id', $tenantId)
            ->latest()
            ->paginate((int) $request->input('per_page', 25));

        return response()->json([
            'success' => true,
            'discounts' => $discounts,
        ]);
    }

    /**
     * Create / generate a new discount coupon code for a customer or store.
     */
    public function createDiscount(Request $request)
    {
        $tenantId = $request->user()->tenant_id;

        $request->validate([
            'code' => 'nullable|string|max:50',
            'discount_type' => 'nullable|string|in:percentage,fixed_amount',
            'value' => 'required|numeric|min:0.01',
            'duration_days' => 'nullable|integer|min:0|max:365',
            'min_order_amount' => 'nullable|numeric|min:0',
            'connection_id' => 'nullable|integer',
            'customer_email' => 'nullable|email',
        ]);

        $connectionId = $request->input('connection_id');
        $connection = null;
        if ($connectionId) {
            $connection = EcommerceConnection::where('tenant_id', $tenantId)->find($connectionId);
        }
        if (!$connection) {
            $connection = EcommerceConnection::where('tenant_id', $tenantId)->where('status', 'active')->first();
        }

        $discountType = $request->input('discount_type', 'percentage');
        $value = (float) $request->input('value', 10);
        $durationDays = $request->has('duration_days') ? (int) $request->input('duration_days') : 7;
        $expiresAt = $durationDays > 0 ? now()->addDays($durationDays) : null;

        $rawCode = trim($request->input('code', ''));
        if (empty($rawCode)) {
            $prefix = $discountType === 'percentage' ? 'SAVE' . round($value) : 'DISC' . round($value);
            $suffix = strtoupper(Str::random(4));
            $code = "{$prefix}-{$suffix}";
        } else {
            $code = strtoupper(preg_replace('/[^A-Za-z0-9_-]/', '', $rawCode));
        }

        $externalDiscountId = null;

        // Sync with Shopify or WooCommerce if credentials exist
        if ($connection) {
            $platform = $connection->platform;
            $storeUrl = $connection->store_url;
            $creds = $connection->credentials ?? [];

            try {
                if ($platform === 'shopify') {
                    $accessToken = $creds['access_token'] ?? $creds['api_key'] ?? null;
                    if ($accessToken) {
                        $priceRulePayload = [
                            'price_rule' => [
                                'title' => $code,
                                'target_type' => 'line_item',
                                'target_selection' => 'all',
                                'allocation_method' => 'across',
                                'value_type' => $discountType === 'percentage' ? 'percentage' : 'fixed_amount',
                                'value' => '-' . abs($value),
                                'customer_selection' => 'all',
                                'starts_at' => now()->toIso8601String(),
                                'ends_at' => $expiresAt ? $expiresAt->toIso8601String() : null,
                            ]
                        ];

                        $prRes = \App\Services\Security\UrlSecurityValidator::client(10)
                            ->withHeaders([
                                'X-Shopify-Access-Token' => $accessToken,
                                'Content-Type' => 'application/json',
                            ])
                            ->post("https://{$storeUrl}/admin/api/2025-01/price_rules.json", $priceRulePayload);

                        if ($prRes->successful()) {
                            $priceRuleId = $prRes->json('price_rule.id');
                            if ($priceRuleId) {
                                $dcRes = \App\Services\Security\UrlSecurityValidator::client(10)
                                    ->withHeaders([
                                        'X-Shopify-Access-Token' => $accessToken,
                                        'Content-Type' => 'application/json',
                                    ])
                                    ->post("https://{$storeUrl}/admin/api/2025-01/price_rules/{$priceRuleId}/discount_codes.json", [
                                        'discount_code' => ['code' => $code]
                                    ]);
                                if ($dcRes->successful()) {
                                    $externalDiscountId = (string) $dcRes->json('discount_code.id');
                                }
                            }
                        }
                    }
                } elseif ($platform === 'woocommerce') {
                    $consumerKey = $creds['consumer_key'] ?? null;
                    $consumerSecret = $creds['consumer_secret'] ?? null;

                    if ($consumerKey && $consumerSecret) {
                        $wcPayload = [
                            'code' => strtolower($code),
                            'discount_type' => $discountType === 'percentage' ? 'percent' : 'fixed_cart',
                            'amount' => (string) abs($value),
                            'individual_use' => true,
                            'exclude_sale_items' => false,
                            'date_expires' => $expiresAt ? $expiresAt->toIso8601String() : null,
                        ];

                        $wcRes = \App\Services\Security\UrlSecurityValidator::client(10)
                            ->withBasicAuth($consumerKey, $consumerSecret)
                            ->post("https://{$storeUrl}/wp-json/wc/v3/coupons", $wcPayload);

                        if ($wcRes->status() === 401) {
                            $wcRes = \App\Services\Security\UrlSecurityValidator::client(10)
                                ->post("https://{$storeUrl}/wp-json/wc/v3/coupons?consumer_key=" . urlencode($consumerKey) . "&consumer_secret=" . urlencode($consumerSecret), $wcPayload);
                        }

                        if ($wcRes->successful()) {
                            $externalDiscountId = (string) ($wcRes->json('id') ?? '');
                        }
                    }
                }
            } catch (\Exception $e) {
                Log::warning("Store discount sync encountered exception: " . $e->getMessage());
            }
        }

        // Persist discount record
        $discount = EcommerceDiscount::create([
            'tenant_id' => $tenantId,
            'ecommerce_connection_id' => $connection?->id,
            'code' => $code,
            'discount_type' => $discountType,
            'value' => $value,
            'min_order_amount' => $request->input('min_order_amount'),
            'starts_at' => now(),
            'expires_at' => $expiresAt,
            'status' => 'active',
            'external_discount_id' => $externalDiscountId,
            'metadata' => [
                'created_by_user_id' => $request->user()->id,
                'customer_email' => $request->input('customer_email'),
            ],
        ]);

        $formattedDiscount = $discountType === 'percentage' ? round($value) . '% OFF' : '$' . number_format($value, 2) . ' OFF';
        $expiryHuman = $expiresAt ? $expiresAt->format('M d, Y') : 'no expiration';

        $messageTemplate = "I am delighted to offer you a special {$formattedDiscount} discount! Use promo code **{$code}** at checkout" . ($expiresAt ? " (valid until {$expiryHuman})" : "") . ". Let me know if you would like me to assist you with placing your order!";

        return response()->json([
            'success' => true,
            'message' => "Discount promo code {$code} created successfully.",
            'discount' => [
                'id' => $discount->id,
                'code' => $discount->code,
                'discount_type' => $discount->discount_type,
                'value' => (float) $discount->value,
                'formatted_discount' => $formattedDiscount,
                'expires_at' => $discount->expires_at ? $discount->expires_at->toIso8601String() : null,
                'formatted_expiry' => $expiryHuman,
                'message_template' => $messageTemplate,
            ]
        ]);
    }

    /**
     * Generate an instant checkout link for a product with an optional pre-applied discount.
     */
    public function generateCheckoutLink(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        $request->validate([
            'product_id' => 'required',
            'quantity' => 'nullable|integer|min:1',
            'discount_code' => 'nullable|string',
        ]);

        $productId = $request->input('product_id');
        $qty = max(1, (int) $request->input('quantity', 1));
        $discountCode = trim($request->input('discount_code', ''));

        $product = EcommerceProduct::where('tenant_id', $tenantId)
            ->where(function ($q) use ($productId) {
                if (is_numeric($productId)) {
                    $q->where('id', (int)$productId)->orWhere('external_product_id', $productId);
                } else {
                    $q->where('sku', $productId)
                      ->orWhere('handle', $productId)
                      ->orWhere('external_product_id', $productId);
                }
            })->first();

        if (!$product) {
            return response()->json(['message' => 'Product not found in catalog.'], 404);
        }

        $connection = $product->connection ?: EcommerceConnection::where('tenant_id', $tenantId)->where('status', 'active')->first();
        $storeUrl = $connection ? $connection->store_url : parse_url($product->external_url ?? '', PHP_URL_HOST);

        $checkoutUrl = $product->external_url;
        if (!$checkoutUrl && $storeUrl) {
            $checkoutUrl = "https://{$storeUrl}/cart/" . ($product->sku ?: $product->id) . ":{$qty}";
        }

        if ($discountCode && $checkoutUrl) {
            $separator = str_contains($checkoutUrl, '?') ? '&' : '?';
            $checkoutUrl .= "{$separator}discount=" . urlencode($discountCode);
        }

        $formattedMsg = "I recommend checking out **{$product->title}** (" . ($product->currency ?: '$') . number_format($product->price, 2) . ")!";
        if ($discountCode) {
            $formattedMsg .= " Here is your direct checkout link with promo code **{$discountCode}** applied: {$checkoutUrl}";
        } else {
            $formattedMsg .= " Here is your direct checkout link: {$checkoutUrl}";
        }

        return response()->json([
            'success' => true,
            'product' => $product,
            'quantity' => $qty,
            'discount_code' => $discountCode ?: null,
            'checkout_url' => $checkoutUrl,
            'formatted_message' => $formattedMsg,
        ]);
    }

    /**
     * Get recovery analytics dashboard parameters.
     */
    public function analytics(Request $request)
    {
        $tenantId = $request->user()->tenant_id;

        $abandonedCount = EcommerceAbandonedCart::where('tenant_id', $tenantId)->count();
        $recoveredCount = EcommerceAbandonedCart::where('tenant_id', $tenantId)->where('recovery_status', 'recovered')->count();
        
        $recoveryRate = $abandonedCount > 0 ? round(($recoveredCount / $abandonedCount) * 100, 2) : 0.00;
        $recoveredRevenue = EcommerceAbandonedCart::where('tenant_id', $tenantId)
            ->where('recovery_status', 'recovered')
            ->sum('total_price');

        // Chronological list of checkouts
        $carts = EcommerceAbandonedCart::where('tenant_id', $tenantId)
            ->with('contact')
            ->orderBy('id', 'desc')
            ->get();

        $tenant = $request->user()->tenant;
        $currencyInfo = $tenant?->currency ? [
            'code' => $tenant->currency->code,
            'symbol' => $tenant->currency->symbol
        ] : [
            'code' => 'USD',
            'symbol' => '$'
        ];

        return response()->json([
            'metrics' => [
                'carts_abandoned' => $abandonedCount,
                'carts_recovered' => $recoveredCount,
                'recovery_rate' => $recoveryRate,
                'recovered_revenue' => round($recoveredRevenue, 2),
            ],
            'carts' => $carts,
            'currency' => $currencyInfo
        ]);
    }

    /**
     * Manually trigger cart recovery.
     */
    public function triggerManualRecovery(Request $request, $id)
    {
        $tenant = $request->user()->tenant;
        if ($tenant) {
            $cartCheck = app(\App\Services\PlanLimitService::class)->canUseAbandonedCartRecovery($tenant);
            if (!$cartCheck['allowed']) {
                return response()->json([
                    'message' => $cartCheck['reason'],
                    'error_code' => $cartCheck['code']
                ], 403);
            }
        }

        $tenantId = $request->user()->tenant_id;
        $cart = EcommerceAbandonedCart::where('tenant_id', $tenantId)->find($id);

        if (!$cart) {
            return response()->json(['message' => 'Cart not found.'], 404);
        }

        // Force reset state to pending to allow manual dispatch even if standard dispatch is expired
        $cart->update(['recovery_status' => 'pending']);

        // Dispatch job synchronously for instant feedback in the UI
        SendAbandonedCartRecoveryJob::dispatchSync($cart->id);

        return response()->json([
            'message' => 'Manual cart recovery triggered successfully!',
            'status' => $cart->fresh()->recovery_status
        ]);
    }

    /**
     * Get active contact e-commerce context (active cart & order history).
     */
    public function customerContext(Request $request)
    {
        $tenantId = $request->user()->tenant_id;

        // Safety Guard: Check if tenant has an active e-commerce connection
        $hasConnection = EcommerceConnection::where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->exists();

        if (!$hasConnection) {
            return response()->json([
                'has_integration' => false,
                'active_cart' => null,
                'orders' => []
            ]);
        }

        $email = $request->query('email');
        $phone = $request->query('phone');

        if (empty($email) && empty($phone)) {
            return response()->json([
                'has_integration' => true,
                'active_cart' => null,
                'orders' => []
            ]);
        }

        // Find matching contact
        $contact = \App\Models\Contact::where('tenant_id', $tenantId)
            ->where(function ($q) use ($email, $phone) {
                if ($email) $q->where('email', $email);
                if ($phone) $q->orWhere('phone', $phone);
            })->first();

        $activeCart = null;
        $orders = [];

        if ($contact) {
            // Find active/abandoned cart for the contact
            $activeCart = EcommerceAbandonedCart::where('tenant_id', $tenantId)
                ->where('contact_id', $contact->id)
                ->orderBy('id', 'desc')
                ->first();
        }

        // Find order history matching email or phone
        $orders = EcommerceOrder::where('tenant_id', $tenantId)
            ->where(function ($q) use ($email, $phone) {
                if ($email) $q->where('customer_email', $email);
                if ($phone) $q->orWhere('customer_phone', $phone);
            })
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'has_integration' => true,
            'active_cart' => $activeCart,
            'orders' => $orders
        ]);
    }

    /**
     * Parse Shopify Link header for cursor-based next page info.
     */
    protected function extractShopifyPageInfo(?string $linkHeader): ?string
    {
        if (!$linkHeader) {
            return null;
        }

        // Shopify Link header format: <https://...?limit=50&page_info=xxx>; rel="next"
        if (preg_match('/<([^>]+)>;\s*rel="next"/', $linkHeader, $matches)) {
            $nextUrl = $matches[1];
            $parsed = parse_url($nextUrl);
            if (!empty($parsed['query'])) {
                parse_str($parsed['query'], $queryParams);
                return $queryParams['page_info'] ?? null;
            }
        }

        return null;
    }
}
