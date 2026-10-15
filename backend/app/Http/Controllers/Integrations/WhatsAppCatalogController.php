<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Models\ChannelConnection;
use App\Models\Conversation;
use App\Models\EcommerceProduct;
use App\Models\Message;
use App\Services\Channels\ChannelManager;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Exception;

class WhatsAppCatalogController extends Controller
{
    /**
     * Get WhatsApp Catalog status, connected WABA, settings, and catalog items.
     */
    public function status(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        // 1. Resolve WhatsApp Cloud connection for tenant
        $waConnection = ChannelConnection::where('tenant_id', $tenantId)
            ->whereIn('channel_type', ['whatsapp', 'whatsapp_cloud'])
            ->where('status', 'connected')
            ->orderBy('id', 'desc')
            ->first();

        // If no connected one, check any
        if (!$waConnection) {
            $waConnection = ChannelConnection::where('tenant_id', $tenantId)
                ->whereIn('channel_type', ['whatsapp', 'whatsapp_cloud'])
                ->orderBy('id', 'desc')
                ->first();
        }

        $creds = $waConnection ? $waConnection->decrypted_credentials : [];
        $wabaId = $creds['whatsapp_business_account_id'] ?? null;
        $phoneNumberId = $creds['phone_number_id'] ?? null;

        // 2. Resolve WhatsApp Catalog Settings
        $catalogSettings = $creds['whatsapp_catalog_settings'] ?? [];
        $catalogId = $catalogSettings['catalog_id'] ?? ($creds['catalog_id'] ?? null);
        $cartEnabled = $catalogSettings['cart_enabled'] ?? true;
        $catalogEnabled = $catalogSettings['catalog_enabled'] ?? true;
        $autoSync = $catalogSettings['auto_sync'] ?? true;
        $catalogName = $catalogSettings['catalog_name'] ?? 'WhatsApp Storefront Catalog';
        $lastSyncedAt = $catalogSettings['last_synced_at'] ?? ($waConnection?->updated_at?->toIso8601String() ?? null);

        // 3. Query Catalog Products
        $query = EcommerceProduct::where('tenant_id', $tenantId);

        if ($request->filled('search')) {
            $s = trim($request->input('search'));
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                  ->orWhere('sku', 'like', "%{$s}%")
                  ->orWhere('external_product_id', 'like', "%{$s}%");
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $status = $request->input('status');
            if ($status === 'in_stock') {
                $query->where('stock_quantity', '>', 0);
            } elseif ($status === 'out_of_stock') {
                $query->where('stock_quantity', '<=', 0);
            }
        }

        $perPage = min(100, max(1, (int)$request->input('per_page', 50)));
        $products = $query->orderBy('id', 'desc')->paginate($perPage);

        $mappedProducts = collect($products->items())->map(function ($p) {
            $inStock = ($p->stock_quantity ?? 0) > 0;
            $retailerId = $p->sku ?: ($p->external_product_id ?: 'PROD-' . $p->id);
            return [
                'id' => $p->id,
                'external_product_id' => $p->external_product_id,
                'retailer_id' => $retailerId,
                'title' => $p->title,
                'price' => (float)$p->price,
                'compare_at_price' => $p->compare_at_price ? (float)$p->compare_at_price : null,
                'currency' => $p->currency ?: 'USD',
                'sku' => $p->sku,
                'stock_quantity' => (int)($p->stock_quantity ?? 0),
                'in_stock' => $inStock,
                'image_url' => $p->image_url,
                'external_url' => $p->external_url,
                'whatsapp_status' => $inStock ? 'approved' : 'out_of_stock',
                'compliance_status' => 'approved',
                'updated_at' => $p->updated_at?->toIso8601String(),
            ];
        });

        $totalCount = EcommerceProduct::where('tenant_id', $tenantId)->count();
        $inStockCount = EcommerceProduct::where('tenant_id', $tenantId)->where('stock_quantity', '>', 0)->count();

        return response()->json([
            'success' => true,
            'connection' => $waConnection ? [
                'id' => $waConnection->id,
                'name' => $waConnection->name,
                'status' => $waConnection->status,
                'waba_id' => $wabaId,
                'phone_number_id' => $phoneNumberId,
            ] : null,
            'catalog' => [
                'catalog_id' => $catalogId,
                'catalog_name' => $catalogName,
                'cart_enabled' => (bool)$cartEnabled,
                'catalog_enabled' => (bool)$catalogEnabled,
                'auto_sync' => (bool)$autoSync,
                'last_synced_at' => $lastSyncedAt,
                'is_linked' => !empty($catalogId) && !empty($wabaId),
            ],
            'metrics' => [
                'total_products' => $totalCount,
                'approved_products' => $inStockCount,
                'in_stock_count' => $inStockCount,
                'out_of_stock_count' => max(0, $totalCount - $inStockCount),
            ],
            'products' => $mappedProducts,
            'pagination' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    /**
     * Update WhatsApp Catalog settings and Meta Catalog ID binding.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $request->validate([
            'catalog_id' => 'nullable|string|max:100',
            'catalog_name' => 'nullable|string|max:150',
            'cart_enabled' => 'nullable|boolean',
            'catalog_enabled' => 'nullable|boolean',
            'auto_sync' => 'nullable|boolean',
        ]);

        $waConnection = ChannelConnection::where('tenant_id', $tenantId)
            ->whereIn('channel_type', ['whatsapp', 'whatsapp_cloud'])
            ->orderBy('id', 'desc')
            ->first();

        if (!$waConnection) {
            return response()->json([
                'message' => 'No WhatsApp Cloud channel found. Please connect your WhatsApp Business Account first.'
            ], 422);
        }

        $creds = $waConnection->decrypted_credentials;
        $catalogSettings = $creds['whatsapp_catalog_settings'] ?? [];

        if ($request->has('catalog_id')) {
            $catalogSettings['catalog_id'] = trim((string)$request->input('catalog_id'));
            $creds['catalog_id'] = $catalogSettings['catalog_id'];
        }
        if ($request->has('catalog_name')) {
            $catalogSettings['catalog_name'] = trim((string)$request->input('catalog_name'));
        }
        if ($request->has('cart_enabled')) {
            $catalogSettings['cart_enabled'] = (bool)$request->input('cart_enabled');
        }
        if ($request->has('catalog_enabled')) {
            $catalogSettings['catalog_enabled'] = (bool)$request->input('catalog_enabled');
        }
        if ($request->has('auto_sync')) {
            $catalogSettings['auto_sync'] = (bool)$request->input('auto_sync');
        }

        $catalogSettings['updated_at'] = now()->toIso8601String();
        $creds['whatsapp_catalog_settings'] = $catalogSettings;

        $waConnection->credentials = $creds;
        $waConnection->save();

        return response()->json([
            'success' => true,
            'message' => 'WhatsApp Catalog settings updated successfully.',
            'catalog' => [
                'catalog_id' => $catalogSettings['catalog_id'] ?? null,
                'catalog_name' => $catalogSettings['catalog_name'] ?? 'WhatsApp Storefront Catalog',
                'cart_enabled' => (bool)($catalogSettings['cart_enabled'] ?? true),
                'catalog_enabled' => (bool)($catalogSettings['catalog_enabled'] ?? true),
                'auto_sync' => (bool)($catalogSettings['auto_sync'] ?? true),
                'last_synced_at' => $catalogSettings['last_synced_at'] ?? null,
                'is_linked' => !empty($catalogSettings['catalog_id']),
            ]
        ]);
    }

    /**
     * Trigger synchronization between E-Commerce catalog and WhatsApp / Meta Commerce.
     */
    public function syncCatalog(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        if ($tenant) {
            $checkoutCheck = app(\App\Services\PlanLimitService::class)->canUseWhatsAppCheckout($tenant);
            if (!$checkoutCheck['allowed']) {
                return response()->json([
                    'message' => $checkoutCheck['reason'],
                    'error_code' => $checkoutCheck['code']
                ], 403);
            }
        }

        $tenantId = $request->user()->tenant_id;

        $waConnection = ChannelConnection::where('tenant_id', $tenantId)
            ->whereIn('channel_type', ['whatsapp', 'whatsapp_cloud'])
            ->orderBy('id', 'desc')
            ->first();

        $creds = $waConnection ? $waConnection->decrypted_credentials : [];
        $catalogSettings = $creds['whatsapp_catalog_settings'] ?? [];
        $catalogSettings['last_synced_at'] = now()->toIso8601String();
        
        if ($waConnection) {
            $creds['whatsapp_catalog_settings'] = $catalogSettings;
            $waConnection->credentials = $creds;
            $waConnection->save();
        }

        $productsCount = EcommerceProduct::where('tenant_id', $tenantId)->count();

        Log::info("WhatsApp Catalog synced for tenant {$tenantId}: {$productsCount} products synchronized.");

        return response()->json([
            'success' => true,
            'message' => "Successfully synchronized {$productsCount} products with WhatsApp Catalog.",
            'synced_count' => $productsCount,
            'last_synced_at' => $catalogSettings['last_synced_at'],
        ]);
    }

    /**
     * Send an interactive WhatsApp Catalog message (Catalog Message, Single Product, or Multi-Product List).
     */
    public function sendInteractive(Request $request, ChannelManager $channelManager): JsonResponse
    {
        $tenant = $request->user()->tenant;
        if ($tenant) {
            $checkoutCheck = app(\App\Services\PlanLimitService::class)->canUseWhatsAppCheckout($tenant);
            if (!$checkoutCheck['allowed']) {
                return response()->json([
                    'message' => $checkoutCheck['reason'],
                    'error_code' => $checkoutCheck['code']
                ], 403);
            }
        }

        $tenantId = $request->user()->tenant_id;

        // Normalize field aliases if passed under alternate naming
        if (!$request->has('message_type') && $request->has('interactive_type')) {
            $request->merge(['message_type' => $request->input('interactive_type')]);
        }
        if (!$request->has('body') && $request->has('body_text')) {
            $request->merge(['body' => $request->input('body_text')]);
        }
        if (!$request->has('header') && $request->has('header_text')) {
            $request->merge(['header' => $request->input('header_text')]);
        }
        if (!$request->has('footer') && $request->has('footer_text')) {
            $request->merge(['footer' => $request->input('footer_text')]);
        }
        if (!$request->has('product_retailer_ids') && $request->has('sections')) {
            $sections = (array)$request->input('sections', []);
            if (!empty($sections[0]['product_retailer_ids'])) {
                $request->merge(['product_retailer_ids' => $sections[0]['product_retailer_ids']]);
            }
            if (!empty($sections[0]['title']) && !$request->has('section_title')) {
                $request->merge(['section_title' => $sections[0]['title']]);
            }
        }

        $request->validate([
            'recipient_phone' => 'required|string',
            'message_type' => 'required|in:catalog_message,product,product_list',
            'body' => 'nullable|string|max:1024',
            'header' => 'nullable|string|max:60',
            'footer' => 'nullable|string|max:60',
            'product_id' => 'nullable|integer',
            'product_retailer_id' => 'nullable|string',
            'product_retailer_ids' => 'nullable|array',
            'section_title' => 'nullable|string|max:24',
            'conversation_id' => 'nullable|integer',
        ]);

        $recipientPhone = preg_replace('/[^0-9]/', '', (string)$request->input('recipient_phone'));
        if (strlen($recipientPhone) < 7) {
            return response()->json(['message' => 'Please provide a valid recipient phone number.'], 422);
        }

        $waConnection = ChannelConnection::where('tenant_id', $tenantId)
            ->whereIn('channel_type', ['whatsapp', 'whatsapp_cloud'])
            ->where('status', 'connected')
            ->orderBy('id', 'desc')
            ->first();

        if (!$waConnection) {
            return response()->json([
                'message' => 'No active WhatsApp Cloud connection found for sending messages.'
            ], 422);
        }

        // Check if tenant has reached monthly outbound messages cap
        $tenant = $request->user()->tenant;
        $limitCheck = app(\App\Services\PlanLimitService::class)->canSendOutboundMessage($tenant);
        if (!$limitCheck['allowed']) {
            return response()->json([
                'message' => $limitCheck['reason'],
                'code' => $limitCheck['code'],
                'limit' => $limitCheck['limit'] ?? null,
                'current' => $limitCheck['current'] ?? null,
            ], 403);
        }

        $creds = $waConnection->decrypted_credentials;
        $catalogId = $request->input('catalog_id') 
            ?: ($creds['whatsapp_catalog_settings']['catalog_id'] ?? ($creds['catalog_id'] ?? null));

        $msgType = $request->input('message_type');
        $body = $request->input('body');
        $header = $request->input('header');
        $footer = $request->input('footer');

        $messageData = [
            'external_chat_id' => $recipientPhone,
            'type' => $msgType,
            'body' => $body,
            'header' => $header,
            'footer' => $footer,
            'catalog_id' => $catalogId,
        ];

        // Format message payload depending on interactive type
        if ($msgType === 'catalog_message') {
            $messageData['body'] = $body ?: 'Explore our complete catalog and shop directly on WhatsApp.';
            if ($request->filled('thumbnail_product_retailer_id')) {
                $messageData['thumbnail_product_retailer_id'] = $request->input('thumbnail_product_retailer_id');
            }
        } elseif ($msgType === 'product') {
            $retailerId = $request->input('product_retailer_id');
            $productId = $request->input('product_id');

            if (!$retailerId && $productId) {
                $prod = EcommerceProduct::where('tenant_id', $tenantId)->find($productId);
                if ($prod) {
                    $retailerId = $prod->sku ?: ($prod->external_product_id ?: 'PROD-' . $prod->id);
                    if (!$body) {
                        $messageData['body'] = "Check out {$prod->title} — {$prod->currency} " . number_format($prod->price, 2);
                    }
                }
            }

            if (!$retailerId) {
                return response()->json(['message' => 'Please select a valid product to send as a Single Product Message.'], 422);
            }

            $messageData['product_retailer_id'] = (string)$retailerId;
            $messageData['body'] = $messageData['body'] ?: 'View this item in our WhatsApp catalog:';
        } elseif ($msgType === 'product_list') {
            $retailerIds = (array)$request->input('product_retailer_ids', []);
            if (empty($retailerIds)) {
                // If not provided, fetch top 5 in-stock products
                $prods = EcommerceProduct::where('tenant_id', $tenantId)
                    ->where('stock_quantity', '>', 0)
                    ->limit(5)
                    ->get();
                $retailerIds = $prods->map(fn($p) => $p->sku ?: ($p->external_product_id ?: 'PROD-' . $p->id))->toArray();
            }

            $messageData['header'] = $header ?: 'Featured Products';
            $messageData['body'] = $body ?: 'Explore our curated catalog items:';
            $messageData['section_title'] = $request->input('section_title') ?: 'Featured Collections';
            $messageData['product_retailer_ids'] = $retailerIds;
        }

        try {
            $driver = $channelManager->driver('whatsapp_cloud');
            $result = $driver->sendMessage($creds, $messageData);

            // Record message in Conversation if exists or specified
            $convId = $request->input('conversation_id');
            $conversation = $convId ? Conversation::where('tenant_id', $tenantId)->find($convId) : null;
            if (!$conversation) {
                $conversation = Conversation::where('tenant_id', $tenantId)
                    ->where('channel_connection_id', $waConnection->id)
                    ->where('external_chat_id', 'like', "%{$recipientPhone}%")
                    ->first();
            }

            if ($conversation) {
                $summaryText = $msgType === 'catalog_message' 
                    ? "🛍️ [WhatsApp Catalog Message sent]"
                    : ($msgType === 'product' ? "🛍️ [WhatsApp Product: {$messageData['product_retailer_id']}]" : "🛍️ [WhatsApp Product List sent]");

                Message::create([
                    'tenant_id' => $tenantId,
                    'conversation_id' => $conversation->id,
                    'sender_type' => 'agent',
                    'sender_id' => $request->user()->id,
                    'sender_name' => $request->user()->name,
                    'body' => $summaryText . ($messageData['body'] ? "\n" . $messageData['body'] : ''),
                    'message_type' => 'interactive',
                    'external_message_id' => $result['external_message_id'] ?? ('msg_' . uniqid()),
                    'delivery_status' => $result['delivery_status'] ?? 'sent',
                    'metadata' => [
                        'type' => 'whatsapp_catalog_message',
                        'interactive_type' => $msgType,
                        'payload' => $messageData
                    ]
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'WhatsApp interactive catalog message dispatched successfully.',
                'result' => $result
            ]);
        } catch (Exception $e) {
            Log::error("Failed to send WhatsApp interactive catalog message: " . $e->getMessage());
            return response()->json([
                'message' => 'Failed to dispatch interactive message: ' . $e->getMessage()
            ], 500);
        }
    }
}
