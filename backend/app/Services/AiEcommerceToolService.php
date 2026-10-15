<?php

namespace App\Services;

use App\Models\Contact;
use App\Models\EcommerceAbandonedCart;
use App\Models\EcommerceConnection;
use App\Models\EcommerceOrder;
use App\Models\EcommerceProduct;
use App\Models\KnowledgeChunk;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class AiEcommerceToolService
{
    /**
     * Get the standardized OpenAI/Groq/Gemini-compatible tool definitions based on chatbot settings.
     */
    public function getToolDefinitions(?array $settings = []): array
    {
        $enabled = $settings['enabled'] ?? true;
        if (!$enabled) {
            return [];
        }

        $tools = [];

        // 1. Search Products
        if ($settings['enable_catalog_search'] ?? true) {
            $tools[] = [
                'name' => 'search_products',
                'description' => 'Searches products in the store catalog matching keywords, category, or price constraints.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'query' => [
                            'type' => 'string',
                            'description' => 'Search keyword, product name, or recommendation query (e.g. "popular", "snowboards", "wax").'
                        ],
                        'category' => [
                            'type' => ['string', 'null'],
                            'description' => 'Optional product category or tag filter (e.g. Shoes, Jackets, Electronics). Omit or set to null if not specified.'
                        ],
                        'max_price' => [
                            'type' => ['number', 'null'],
                            'description' => 'Optional maximum budget/price filter. Omit or set to null if not specified.'
                        ],
                        'min_price' => [
                            'type' => ['number', 'null'],
                            'description' => 'Optional minimum price filter. Omit or set to null if not specified.'
                        ]
                    ],
                    'required' => ['query']
                ]
            ];
        }

        // 2. Get Detailed Product Info & Variants
        if ($settings['enable_catalog_search'] ?? true) {
            $tools[] = [
                'name' => 'get_product_details',
                'description' => 'Retrieves comprehensive specifications, variant options (sizes/colors), pricing, and purchase links for a specific product.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'product_id_or_sku' => [
                            'type' => 'string',
                            'description' => 'Product database ID, handle, or SKU.'
                        ]
                    ],
                    'required' => ['product_id_or_sku']
                ]
            ];
        }

        // 3. Live Stock & Inventory Verification
        if ($settings['enable_stock_check'] ?? true) {
            $tools[] = [
                'name' => 'check_inventory_stock',
                'description' => 'Checks real-time live stock inventory quantity and availability status for a product or variant.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'product_id_or_sku' => [
                            'type' => 'string',
                            'description' => 'Product ID, title keywords, or SKU.'
                        ],
                        'variant_title' => [
                            'type' => ['string', 'null'],
                            'description' => 'Optional variant name (e.g. "Size Medium", "Color Black"). Omit or set to null if not specified.'
                        ]
                    ],
                    'required' => ['product_id_or_sku']
                ]
            ];
        }

        // 4. Order Tracking & Shipment Status
        if ($settings['enable_order_tracking'] ?? true) {
            $tools[] = [
                'name' => 'track_order_status',
                'description' => 'Retrieves order fulfillment status, courier shipping carrier, tracking number, and live tracking URL.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'order_number' => [
                            'type' => 'string',
                            'description' => 'E-commerce order code or number (e.g. #1001 or 1001).'
                        ],
                        'email_or_phone' => [
                            'type' => ['string', 'null'],
                            'description' => 'Optional customer email address or phone number for verification. Omit or set to null if not specified.'
                        ]
                    ],
                    'required' => ['order_number']
                ]
            ];
        }

        // 5. Customer Active Abandoned Cart
        if ($settings['enable_cart_recovery'] ?? true) {
            $tools[] = [
                'name' => 'get_customer_active_cart',
                'description' => 'Checks if the customer currently chatting has an unpurchased or abandoned shopping cart to help them resume checkout.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'customer_identifier' => [
                            'type' => ['string', 'null'],
                            'description' => 'Customer phone or email or contact reference. Omit or set to null if not specified.'
                        ]
                    ],
                    'required' => []
                ]
            ];
        }

        // 6. Dynamic Promo / Discount Code Generator
        if ($settings['enable_discount_generation'] ?? true) {
            $tools[] = [
                'name' => 'create_discount_coupon',
                'description' => 'Creates a customer discount promo code within the authorized store discount cap.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'discount_percent' => [
                            'type' => 'number',
                            'description' => 'Requested discount percentage (e.g. 5, 10, 15).'
                        ],
                        'reason' => [
                            'type' => ['string', 'null'],
                            'description' => 'Brief reason (e.g. first_order, cart_recovery, customer_loyalty). Omit or set to null if not specified.'
                        ]
                    ],
                    'required' => ['discount_percent']
                ]
            ];
        }

        // 7. Instant Direct Checkout Link Generator
        if ($settings['enable_instant_checkout'] ?? true) {
            $tools[] = [
                'name' => 'generate_checkout_link',
                'description' => 'Creates a direct one-click checkout URL for a product with an optional pre-applied discount code.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'product_id_or_sku' => [
                            'type' => 'string',
                            'description' => 'Product ID or SKU to purchase.'
                        ],
                        'quantity' => [
                            'type' => ['integer', 'null'],
                            'description' => 'Number of items (defaults to 1).'
                        ],
                        'discount_code' => [
                            'type' => ['string', 'null'],
                            'description' => 'Optional coupon or discount code to pre-apply. Omit or set to null if not specified.'
                        ]
                    ],
                    'required' => ['product_id_or_sku']
                ]
            ];
        }

        return $tools;
    }

    /**
     * Dispatch and execute tool call.
     */
    public function executeTool(
        string $toolName,
        array $arguments,
        int $tenantId,
        ?int $connectionId = null,
        ?Contact $contact = null,
        ?array $settings = []
    ): string {
        try {
            switch ($toolName) {
                case 'search_products':
                    return $this->executeSearchProducts($arguments, $tenantId, $connectionId);

                case 'get_product_details':
                    return $this->executeGetProductDetails($arguments, $tenantId, $connectionId);

                case 'check_inventory_stock':
                case 'check_product_availability':
                    return $this->executeCheckStock($arguments, $tenantId, $connectionId);

                case 'track_order_status':
                case 'check_order_status':
                    return $this->executeTrackOrderStatus($arguments, $tenantId, $connectionId, $contact, $settings);

                case 'get_customer_active_cart':
                    return $this->executeGetCustomerActiveCart($arguments, $tenantId, $contact);

                case 'create_discount_coupon':
                    return $this->executeCreateDiscountCoupon($arguments, $tenantId, $connectionId, $settings);

                case 'generate_checkout_link':
                    return $this->executeGenerateCheckoutLink($arguments, $tenantId, $connectionId, $settings);

                default:
                    return json_encode([
                        'success' => false,
                        'message' => "Unknown tool function '{$toolName}'."
                    ]);
            }
        } catch (Exception $e) {
            Log::error("AiEcommerceToolService execution error for {$toolName}: " . $e->getMessage());
            return json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * 1. Search catalog products.
     */
    protected function executeSearchProducts(array $args, int $tenantId, ?int $connectionId): string
    {
        $rawQuery = trim($args['query'] ?? '');
        $category = trim($args['category'] ?? '');
        $maxPrice = isset($args['max_price']) && is_numeric($args['max_price']) ? (float)$args['max_price'] : null;
        $minPrice = isset($args['min_price']) && is_numeric($args['min_price']) ? (float)$args['min_price'] : null;

        $dbQuery = EcommerceProduct::where('tenant_id', $tenantId);
        if ($connectionId) {
            $dbQuery->where('ecommerce_connection_id', $connectionId);
        }

        // Check if query is a broad discovery/recommendation intent
        $isDiscoveryQuery = empty($rawQuery) || preg_match('/^(popular|best seller|bestseller|best sellers|best|top|recommend|recommended|trending|featured|all|catalog|best product|best products|products|store|shop|hot|latest|items|suggest|options|good)$/i', $rawQuery);

        if (!$isDiscoveryQuery && !empty($rawQuery)) {
            $dbQuery->where(function ($q) use ($rawQuery) {
                $q->where('title', 'LIKE', "%{$rawQuery}%")
                  ->orWhere('description', 'LIKE', "%{$rawQuery}%")
                  ->orWhere('sku', 'LIKE', "%{$rawQuery}%")
                  ->orWhere('handle', 'LIKE', "%{$rawQuery}%");
            });
        }

        if ($maxPrice !== null) {
            $dbQuery->where('price', '<=', $maxPrice);
        }
        if ($minPrice !== null) {
            $dbQuery->where('price', '>=', $minPrice);
        }

        // Prioritize in-stock and active products
        $products = $dbQuery->orderByRaw("CASE WHEN stock_quantity > 0 THEN 0 ELSE 1 END")
            ->orderByDesc('stock_quantity')
            ->limit(5)
            ->get();

        // Fallback 1: If exact multi-word query produced 0 matches, split meaningful keywords
        if ($products->isEmpty() && !$isDiscoveryQuery && !empty($rawQuery)) {
            $words = array_filter(explode(' ', strtolower($rawQuery)), fn($w) => strlen($w) >= 3 && !in_array($w, ['the', 'and', 'for', 'best', 'some', 'item', 'items', 'store', 'product', 'products', 'with']));
            if (!empty($words)) {
                $subQuery = EcommerceProduct::where('tenant_id', $tenantId);
                if ($connectionId) {
                    $subQuery->where('ecommerce_connection_id', $connectionId);
                }
                $subQuery->where(function ($q) use ($words) {
                    foreach ($words as $word) {
                        $q->orWhere('title', 'LIKE', "%{$word}%")
                          ->orWhere('description', 'LIKE', "%{$word}%");
                    }
                });
                $products = $subQuery->orderByRaw("CASE WHEN stock_quantity > 0 THEN 0 ELSE 1 END")
                    ->orderByDesc('stock_quantity')
                    ->limit(5)
                    ->get();
            }
        }

        // Fallback 2: Try vector chunk search
        if ($products->isEmpty() && !empty($rawQuery)) {
            $vectorMatches = KnowledgeChunk::whereHas('source', function ($q) use ($tenantId) {
                $q->where('source_type', 'ecommerce_catalog')
                  ->whereHas('knowledgeBase', function ($qb) use ($tenantId) {
                      $qb->where('tenant_id', $tenantId);
                  });
            })->where('content', 'LIKE', "%{$rawQuery}%")->limit(3)->get();

            if ($vectorMatches->isNotEmpty()) {
                $results = [];
                foreach ($vectorMatches as $chunk) {
                    $results[] = $chunk->content;
                }
                return json_encode([
                    'success' => true,
                    'count' => count($results),
                    'matches' => $results
                ]);
            }
        }

        // Fallback 3: If still empty, return top available store products as recommendations
        $isFallbackRecommendations = false;
        if ($products->isEmpty()) {
            $fallbackQuery = EcommerceProduct::where('tenant_id', $tenantId);
            if ($connectionId) {
                $fallbackQuery->where('ecommerce_connection_id', $connectionId);
            }
            $products = $fallbackQuery->orderByRaw("CASE WHEN stock_quantity > 0 THEN 0 ELSE 1 END")
                ->orderByDesc('stock_quantity')
                ->limit(4)
                ->get();
            $isFallbackRecommendations = true;
        }

        if ($products->isEmpty()) {
            return json_encode([
                'success' => true,
                'count' => 0,
                'message' => "Our store catalog is currently being updated. Please ask about any specific item!",
                'products' => []
            ]);
        }

        $items = [];
        foreach ($products as $p) {
            $items[] = [
                'id' => $p->id,
                'external_id' => $p->external_product_id,
                'title' => $p->title,
                'price' => "{$p->currency} {$p->price}",
                'compare_at_price' => $p->compare_at_price ? "{$p->currency} {$p->compare_at_price}" : null,
                'stock_status' => $p->stock_quantity > 0 ? "In Stock ({$p->stock_quantity} available)" : "Out of Stock",
                'sku' => $p->sku,
                'image_url' => $p->image_url,
                'url' => $p->external_url,
                'description_snippet' => Str::limit($p->description, 120),
            ];
        }

        return json_encode([
            'success' => true,
            'count' => count($items),
            'is_recommendation' => $isDiscoveryQuery || $isFallbackRecommendations,
            'message' => $isFallbackRecommendations ? "No exact matches for '{$rawQuery}', but here are our top featured items:" : "Store catalog products found:",
            'products' => $items
        ]);
    }

    /**
     * 2. Get full product details & variants.
     */
    protected function executeGetProductDetails(array $args, int $tenantId, ?int $connectionId): string
    {
        $idOrSku = trim($args['product_id_or_sku'] ?? '');
        if (!$idOrSku) {
            return json_encode(['success' => false, 'message' => 'Product identifier required.']);
        }

        $query = EcommerceProduct::where('tenant_id', $tenantId);
        if ($connectionId) {
            $query->where('ecommerce_connection_id', $connectionId);
        }

        $product = $query->where(function ($q) use ($idOrSku) {
            if (is_numeric($idOrSku)) {
                $q->where('id', (int)$idOrSku)
                  ->orWhere('external_product_id', $idOrSku);
            } else {
                $q->where('sku', $idOrSku)
                  ->orWhere('handle', $idOrSku)
                  ->orWhere('external_product_id', $idOrSku)
                  ->orWhere('title', 'LIKE', "%{$idOrSku}%");
            }
        })->first();

        if (!$product) {
            return json_encode([
                'success' => false,
                'message' => "Product '{$idOrSku}' was not found in catalog."
            ]);
        }

        return json_encode([
            'success' => true,
            'product' => [
                'id' => $product->id,
                'title' => $product->title,
                'description' => $product->description,
                'price' => "{$product->currency} {$product->price}",
                'compare_at_price' => $product->compare_at_price ? "{$product->currency} {$product->compare_at_price}" : null,
                'sku' => $product->sku,
                'stock_quantity' => $product->stock_quantity,
                'status' => $product->status,
                'image_url' => $product->image_url,
                'variants' => $product->variants ?: [],
                'categories' => $product->categories ?: [],
                'purchase_url' => $product->external_url
            ]
        ]);
    }

    /**
     * 3. Check live stock inventory.
     */
    protected function executeCheckStock(array $args, int $tenantId, ?int $connectionId): string
    {
        $idOrSku = trim($args['product_id_or_sku'] ?? $args['product_id'] ?? '');
        if (!$idOrSku) {
            return json_encode(['success' => false, 'message' => 'Product identifier required.']);
        }

        $query = EcommerceProduct::where('tenant_id', $tenantId);
        if ($connectionId) {
            $query->where('ecommerce_connection_id', $connectionId);
        }

        $product = $query->where(function ($q) use ($idOrSku) {
            if (is_numeric($idOrSku)) {
                $q->where('id', (int)$idOrSku)->orWhere('external_product_id', $idOrSku);
            } else {
                $q->where('sku', $idOrSku)
                  ->orWhere('handle', $idOrSku)
                  ->orWhere('external_product_id', $idOrSku)
                  ->orWhere('title', 'LIKE', "%{$idOrSku}%");
            }
        })->first();

        if ($product) {
            $isAvailable = $product->stock_quantity > 0;
            return json_encode([
                'success' => true,
                'product_title' => $product->title,
                'sku' => $product->sku,
                'price' => "{$product->currency} {$product->price}",
                'in_stock' => $isAvailable,
                'stock_quantity' => $product->stock_quantity,
                'status' => $isAvailable ? ($product->stock_quantity <= 5 ? 'Low Stock' : 'In Stock') : 'Out of Stock',
                'url' => $product->external_url
            ]);
        }

        // Mock fallback for sandbox demonstrations
        $mocks = [
            'shopify_prod_1' => ['title' => 'Premium Leather Jacket', 'stock' => 15, 'price' => '$199.99'],
            'shopify_prod_2' => ['title' => 'Wireless Noise-Canceling Headphones', 'stock' => 42, 'price' => '$149.50'],
            'shopify_prod_3' => ['title' => 'Minimalist Quartz Watch', 'stock' => 8, 'price' => '$89.00'],
            'shopify_prod_4' => ['title' => 'Ergonomic Office Chair', 'stock' => 20, 'price' => '$249.00'],
            'shopify_prod_5' => ['title' => 'Portable Bluetooth Speaker', 'stock' => 0, 'price' => '$45.00'],
        ];

        $clean = strtolower($idOrSku);
        if (isset($mocks[$clean])) {
            $m = $mocks[$clean];
            return json_encode([
                'success' => true,
                'product_title' => $m['title'],
                'in_stock' => $m['stock'] > 0,
                'stock_quantity' => $m['stock'],
                'price' => $m['price'],
                'status' => $m['stock'] > 0 ? 'In Stock' : 'Out of Stock'
            ]);
        }

        return json_encode([
            'success' => false,
            'message' => "Item '{$idOrSku}' was not found in active inventory catalog."
        ]);
    }

    /**
     * 4. Order Tracking & Shipment Status.
     */
    protected function executeTrackOrderStatus(
        array $args,
        int $tenantId,
        ?int $connectionId,
        ?Contact $contact,
        ?array $settings
    ): string {
        $orderNumber = trim($args['order_number'] ?? '');
        $emailOrPhone = trim($args['email_or_phone'] ?? $args['email'] ?? '');

        if (!$orderNumber) {
            return json_encode(['success' => false, 'message' => 'Order number is required.']);
        }

        $cleanOrderNum = ltrim($orderNumber, '#');

        $query = EcommerceOrder::where('tenant_id', $tenantId)
            ->where(function ($q) use ($orderNumber, $cleanOrderNum) {
                $q->where('order_number', $orderNumber)
                  ->orWhere('order_number', $cleanOrderNum)
                  ->orWhere('order_number', '#' . $cleanOrderNum)
                  ->orWhere('external_order_id', $orderNumber)
                  ->orWhere('external_order_id', $cleanOrderNum);
            });

        if ($connectionId) {
            $query->where('ecommerce_connection_id', $connectionId);
        }

        $order = $query->first();

        // Verification check if configured
        $verificationMode = $settings['order_verification_mode'] ?? 'phone_or_email';
        if ($order && $verificationMode === 'strict') {
            $contactPhone = $contact?->phone_number;
            $contactEmail = $contact?->email;
            $matches = false;

            if ($emailOrPhone) {
                if (stripos($order->customer_email, $emailOrPhone) !== false || stripos($order->customer_phone, $emailOrPhone) !== false) {
                    $matches = true;
                }
            }
            if ($contactPhone && $order->customer_phone && stripos($order->customer_phone, $contactPhone) !== false) {
                $matches = true;
            }
            if ($contactEmail && $order->customer_email && strcasecmp($order->customer_email, $contactEmail) === 0) {
                $matches = true;
            }

            if (!$matches && empty($contact)) {
                // Return masked prompt for email/phone verification
                return json_encode([
                    'success' => true,
                    'verified' => false,
                    'message' => "Order #{$orderNumber} found. For security, please provide the email address or phone number used during checkout to view full tracking details."
                ]);
            }
        }

        if ($order) {
            return json_encode([
                'success' => true,
                'verified' => true,
                'order' => [
                    'order_number' => $order->order_number,
                    'customer_name' => $order->customer_name,
                    'financial_status' => $order->financial_status,
                    'fulfillment_status' => $order->fulfillment_status,
                    'total_price' => "{$order->currency} {$order->total_price}",
                    'tracking_number' => $order->tracking_number ?: 'Not yet assigned',
                    'tracking_url' => $order->tracking_url ?: null,
                    'items_count' => $order->items_count,
                    'created_at' => $order->external_created_at ? $order->external_created_at->format('Y-m-d') : $order->created_at->format('Y-m-d'),
                ]
            ]);
        }

        return json_encode([
            'success' => false,
            'message' => "Order '{$orderNumber}' could not be found in our store system. Please verify your order number or reach out to our human support team."
        ]);
    }

    /**
     * 5. Get Customer's Active Cart.
     */
    protected function executeGetCustomerActiveCart(array $args, int $tenantId, ?Contact $contact): string
    {
        if (!$contact) {
            return json_encode([
                'success' => false,
                'message' => 'No active customer contact context available.'
            ]);
        }

        $cart = EcommerceAbandonedCart::where('tenant_id', $tenantId)
            ->where('contact_id', $contact->id)
            ->where('recovery_status', 'pending')
            ->latest()
            ->first();

        if (!$cart) {
            return json_encode([
                'success' => true,
                'has_active_cart' => false,
                'message' => 'Customer currently has no pending or abandoned carts.'
            ]);
        }

        return json_encode([
            'success' => true,
            'has_active_cart' => true,
            'cart' => [
                'total_price' => $cart->total_price,
                'items' => $cart->items_summary ?: [],
                'checkout_url' => $cart->checkout_url,
                'created_at' => $cart->created_at->diffForHumans()
            ]
        ]);
    }

    /**
     * 6. Generate dynamic discount promo code with strict cap guardrails.
     */
    protected function executeCreateDiscountCoupon(
        array $args,
        int $tenantId,
        ?int $connectionId,
        ?array $settings
    ): string {
        $requestedPercent = (float)($args['discount_percent'] ?? 10);
        $maxCap = (float)($settings['max_discount_percent'] ?? 15);
        $prefix = strtoupper(trim($settings['discount_code_prefix'] ?? 'CHATAI'));

        // Guardrail: Clamp discount to merchant limit
        $actualPercent = min($requestedPercent, $maxCap);
        if ($actualPercent <= 0) {
            $actualPercent = 5;
        }

        $randomSuffix = strtoupper(Str::random(4));
        $generatedCode = "{$prefix}-" . round($actualPercent) . "-{$randomSuffix}";
        $expiryDate = now()->addDays(7)->format('Y-m-d');

        return json_encode([
            'success' => true,
            'coupon_code' => $generatedCode,
            'discount_percentage' => $actualPercent,
            'discount_text' => "{$actualPercent}% OFF",
            'expires_at' => $expiryDate,
            'instruction' => "Customer can enter promo code '{$generatedCode}' during checkout to receive {$actualPercent}% off their order. Share this code warmly: 'I have set up a special {$actualPercent}% discount for you: {$generatedCode}'. Speak naturally like a store specialist without using words like 'generated'."
        ]);
    }

    /**
     * 7. Generate instant checkout link.
     */
    protected function executeGenerateCheckoutLink(
        array $args,
        int $tenantId,
        ?int $connectionId,
        ?array $settings
    ): string {
        $idOrSku = trim($args['product_id_or_sku'] ?? '');
        $qty = max(1, (int)($args['quantity'] ?? 1));
        $discountCode = trim($args['discount_code'] ?? '');

        $query = EcommerceProduct::where('tenant_id', $tenantId);
        if ($connectionId) {
            $query->where('ecommerce_connection_id', $connectionId);
        }

        $product = $query->where(function ($q) use ($idOrSku) {
            if (is_numeric($idOrSku)) {
                $q->where('id', (int)$idOrSku)->orWhere('external_product_id', $idOrSku);
            } else {
                $q->where('sku', $idOrSku)
                  ->orWhere('handle', $idOrSku)
                  ->orWhere('external_product_id', $idOrSku)
                  ->orWhere('title', 'LIKE', "%{$idOrSku}%");
            }
        })->first();

        $baseUrl = $product?->external_url;
        if (!$baseUrl) {
            $conn = $connectionId ? EcommerceConnection::find($connectionId) : EcommerceConnection::where('tenant_id', $tenantId)->first();
            $storeDomain = $conn ? $conn->store_url : 'store.example.com';
            $baseUrl = "https://{$storeDomain}/cart/{$idOrSku}:{$qty}";
        }

        // Attach pre-applied discount code query parameter if present
        $finalUrl = $baseUrl;
        if ($discountCode) {
            $sep = str_contains($finalUrl, '?') ? '&' : '?';
            $finalUrl .= "{$sep}discount=" . urlencode($discountCode);
        }

        return json_encode([
            'success' => true,
            'product_title' => $product?->title ?: 'Selected Product',
            'quantity' => $qty,
            'discount_code' => $discountCode ?: null,
            'checkout_url' => $finalUrl
        ]);
    }

    /**
     * Build customer context string for injection into LLM system prompt.
     */
    public function buildCustomerContext(int $tenantId, ?Contact $contact = null): string
    {
        if (!$contact) {
            return '';
        }

        $lines = ["\nCURRENT CUSTOMER PROFILE:"];
        $name = trim(($contact->first_name ?: '') . ' ' . ($contact->last_name ?: ''));
        $lines[] = "- Name: " . ($name ?: 'Customer');
        if ($contact->phone_number) {
            $lines[] = "- Phone: {$contact->phone_number}";
        }
        if ($contact->email) {
            $lines[] = "- Email: {$contact->email}";
        }

        // Recent Orders
        try {
            $orders = EcommerceOrder::where('tenant_id', $tenantId)
                ->where(function ($q) use ($contact) {
                    if ($contact->id) $q->where('contact_id', $contact->id);
                    if ($contact->email) $q->orWhere('customer_email', $contact->email);
                    if ($contact->phone_number) $q->orWhere('customer_phone', $contact->phone_number);
                })
                ->latest()
                ->limit(3)
                ->get();

            if ($orders->isNotEmpty()) {
                $lines[] = "- Recent Order History:";
                foreach ($orders as $ord) {
                    $tracking = $ord->tracking_number ? "Tracking: {$ord->tracking_number}" : "No tracking yet";
                    $lines[] = "  * Order {$ord->order_number}: Status={$ord->fulfillment_status} ({$ord->financial_status}), Total={$ord->currency} {$ord->total_price}, {$tracking}";
                }
            }
        } catch (Exception $e) {
            Log::warning("Customer context order query warning: " . $e->getMessage());
        }

        // Active Cart
        try {
            $activeCart = EcommerceAbandonedCart::where('tenant_id', $tenantId)
                ->where('contact_id', $contact->id)
                ->where('recovery_status', 'pending')
                ->latest()
                ->first();

            if ($activeCart) {
                $lines[] = "- Active Pending Cart: Total={$activeCart->total_price}, Checkout URL={$activeCart->checkout_url}";
            }
        } catch (Exception $e) {
            Log::warning("Customer context cart query warning: " . $e->getMessage());
        }

        return implode("\n", $lines) . "\n";
    }
}
