<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\EcommerceAbandonedCart;
use App\Models\EcommerceConnection;
use App\Models\EcommerceOrder;
use App\Jobs\SendAbandonedCartRecoveryJob;
use Illuminate\Http\Request;

class EcommerceWebhookController extends Controller
{
    /**
     * Handle Shopify webhooks.
     */
    public function handleShopify(Request $request)
    {
        $shopDomain = $request->header('X-Shopify-Shop-Domain');
        $hmacHeader = $request->header('X-Shopify-Hmac-SHA256');
        $topic = $request->header('X-Shopify-Topic');

        if (!$shopDomain || !$hmacHeader) {
            return response()->json(['error' => 'Missing security headers'], 400);
        }

        // Find the connection
        $connection = EcommerceConnection::where('store_url', $shopDomain)
            ->where('platform', 'shopify')
            ->first();

        if (!$connection) {
            return response()->json(['error' => 'Store connection not found'], 404);
        }

        // Verify HMAC per official Shopify API documentation:
        // Shopify webhooks are signed using the partner application's Client Secret.
        // We also check connection webhook_secret or credentials secret as fallback for custom setups & testing.
        $shopifyConfig = \App\Models\PlatformSetting::getSetting('shopify_app_config') ?: [];
        $appSecret = trim((string) ($shopifyConfig['client_secret'] ?? ''))
            ?: (getenv('SHOPIFY_CLIENT_SECRET') ?: (string) env('SHOPIFY_CLIENT_SECRET', ''));
        if (empty($appSecret)) {
            $appSecret = (string) (getenv('SHOPIFY_API_SECRET') ?: env('SHOPIFY_API_SECRET', ''));
        }

        $rawBody = $request->getContent();
        $isValidHmac = false;

        $candidateSecrets = array_filter([
            $appSecret,
            $connection->webhook_secret ?? null,
            $connection->credentials['api_secret'] ?? null,
        ]);

        foreach ($candidateSecrets as $secret) {
            $calculatedHmac = base64_encode(hash_hmac('sha256', $rawBody, $secret, true));
            if (hash_equals($hmacHeader, $calculatedHmac)) {
                $isValidHmac = true;
                break;
            }
        }

        if (!$isValidHmac) {
            return response()->json(['error' => 'Invalid webhook signature'], 401);
        }

        // Bind tenant context
        app()->instance('tenant', $connection->tenant);

        $payload = $request->all();

        // Process based on topic
        if ($topic === 'checkouts/create' || $topic === 'checkouts/update') {
            return $this->processShopifyCheckout($connection, $payload);
        } elseif ($topic === 'orders/create') {
            return $this->processShopifyOrder($connection, $payload);
        }

        return response()->json(['status' => 'ignored', 'topic' => $topic]);
    }

    /**
     * Handle WooCommerce webhooks.
     */
    public function handleWooCommerce(Request $request)
    {
        $signatureHeader = $request->header('X-WC-Webhook-Signature');
        $topic = $request->header('X-WC-Webhook-Topic');
        $source = $request->header('X-WC-Webhook-Source');

        if (!$signatureHeader) {
            return response()->json(['error' => 'Missing WooCommerce signature header'], 400);
        }

        // Find WooCommerce connection by connection_id query or fallback to source URL
        $connectionId = $request->query('connection_id');
        $connection = null;

        if ($connectionId) {
            $connection = EcommerceConnection::where('id', $connectionId)
                ->where('platform', 'woocommerce')
                ->first();
        }

        if (!$connection && $source) {
            $sourceUrl = rtrim($source, '/');
            $connection = EcommerceConnection::where('store_url', 'like', "%{$sourceUrl}%")
                ->where('platform', 'woocommerce')
                ->first();
        }

        if (!$connection) {
            return response()->json(['error' => 'WooCommerce store connection not found'], 404);
        }

        // Verify WooCommerce Signature
        $calculatedSignature = base64_encode(hash_hmac('sha256', $request->getContent(), $connection->webhook_secret, true));
        if (!hash_equals($signatureHeader, $calculatedSignature)) {
            $consumerSecret = $connection->credentials['consumer_secret'] ?? null;
            if (!$consumerSecret || !hash_equals($signatureHeader, base64_encode(hash_hmac('sha256', $request->getContent(), $consumerSecret, true)))) {
                return response()->json(['error' => 'Invalid webhook signature'], 401);
            }
        }

        // Bind tenant context
        app()->instance('tenant', $connection->tenant);

        $payload = $request->all();

        // Standard WooCommerce Webhook Topics
        if ($topic === 'order.created') {
            return $this->processWooCommerceOrder($connection, $payload);
        } elseif ($topic === 'order.updated') {
            return $this->processWooCommerceOrderUpdated($connection, $payload);
        }

        return response()->json(['status' => 'ignored', 'topic' => $topic]);
    }

    /**
     * Process Shopify checkout event.
     */
    private function processShopifyCheckout(EcommerceConnection $connection, array $payload)
    {
        // Normalization Layer
        $cartToken = $payload['token'] ?? $payload['id'] ?? null;
        if (!$cartToken) {
            return response()->json(['error' => 'No cart token provided'], 400);
        }

        $email = $payload['customer']['email'] ?? $payload['email'] ?? null;
        $phone = $payload['customer']['phone'] ?? $payload['phone'] ?? null;
        $firstName = $payload['customer']['first_name'] ?? '';
        $lastName = $payload['customer']['last_name'] ?? '';

        if (!$email && !$phone) {
            return response()->json(['status' => 'ignored', 'reason' => 'No customer contact info']);
        }

        // Find or create Contact
        $contact = $this->resolveContact($connection->tenant_id, $email, $phone, $firstName, $lastName);

        $items = array_map(function ($item) {
            return [
                'title' => $item['title'] ?? '',
                'qty' => $item['quantity'] ?? 1,
                'price' => $item['price'] ?? '0.00',
                'image_url' => null,
            ];
        }, $payload['line_items'] ?? []);

        // Log/update abandoned checkout
        $cart = EcommerceAbandonedCart::updateOrCreate(
            [
                'tenant_id' => $connection->tenant_id,
                'cart_token' => $cartToken,
            ],
            [
                'ecommerce_connection_id' => $connection->id,
                'contact_id' => $contact->id,
                'checkout_url' => $payload['abandoned_checkout_url'] ?? '',
                'total_price' => $payload['total_price'] ?? '0.00',
                'items_summary' => $items,
                'recovery_status' => 'pending',
            ]
        );

        $tenant = $connection->tenant;
        $recoveryAllowed = $tenant ? $tenant->canUseAbandonedCartRecovery() : false;

        // Schedule delayed cart recovery background task if plan permits
        if ($recoveryAllowed) {
            SendAbandonedCartRecoveryJob::dispatch($cart->id)->delay(now()->addMinutes(30));
        } else {
            $cart->update(['recovery_status' => 'plan_restricted']);
        }

        return response()->json([
            'status' => 'processed',
            'type' => 'checkout',
            'cart_id' => $cart->id,
            'normalized' => [
                'platform' => 'shopify',
                'cart_token' => $cartToken,
                'total' => $cart->total_price,
                'customer' => [
                    'email' => $email,
                    'phone' => $phone,
                ]
            ]
        ]);
    }

    /**
     * Process Shopify order event.
     */
    private function processShopifyOrder(EcommerceConnection $connection, array $payload)
    {
        $externalOrderId = (string)($payload['id'] ?? '');
        $orderNumber = (string)($payload['order_number'] ?? $payload['name'] ?? '');

        if (!$externalOrderId) {
            return response()->json(['error' => 'No external order ID provided'], 400);
        }

        $email = $payload['customer']['email'] ?? $payload['email'] ?? null;
        $phone = $payload['customer']['phone'] ?? $payload['phone'] ?? null;
        $firstName = $payload['customer']['first_name'] ?? '';
        $lastName = $payload['customer']['last_name'] ?? '';

        $items = array_map(function ($item) {
            return [
                'title' => $item['title'] ?? '',
                'qty' => $item['quantity'] ?? 1,
                'price' => $item['price'] ?? '0.00',
            ];
        }, $payload['line_items'] ?? []);

        // Record order
        $order = EcommerceOrder::updateOrCreate(
            [
                'tenant_id' => $connection->tenant_id,
                'ecommerce_connection_id' => $connection->id,
                'external_order_id' => $externalOrderId,
            ],
            [
                'order_number' => $orderNumber,
                'customer_email' => $email ?? '',
                'customer_phone' => $phone,
                'total_price' => $payload['total_price'] ?? '0.00',
                'financial_status' => $payload['financial_status'] ?? 'pending',
                'fulfillment_status' => $payload['fulfillment_status'] ?? 'unfulfilled',
                'tracking_number' => $payload['fulfillments'][0]['tracking_number'] ?? null,
                'tracking_url' => $payload['fulfillments'][0]['tracking_url'] ?? null,
                'items_summary' => $items,
                'external_created_at' => isset($payload['created_at']) ? new \DateTime($payload['created_at']) : now(),
            ]
        );

        // Resolve Contact
        $this->resolveContact($connection->tenant_id, $email, $phone, $firstName, $lastName);

        // Mark checkout as recovered if checkout_token matches
        $checkoutToken = $payload['checkout_token'] ?? null;
        if ($checkoutToken) {
            EcommerceAbandonedCart::where('tenant_id', $connection->tenant_id)
                ->where('cart_token', $checkoutToken)
                ->update([
                    'recovery_status' => 'recovered',
                    'recovered_at' => now(),
                ]);
        }

        $tenant = $connection->tenant;
        $orderCheck = $tenant ? app(\App\Services\PlanLimitService::class)->canProcessEcommerceOrder($tenant) : ['allowed' => true];
        $isOverLimit = !$orderCheck['allowed'];

        return response()->json([
            'status' => 'processed',
            'type' => 'order',
            'order_id' => $order->id,
            'over_limit' => $isOverLimit,
            'limit_warning' => $isOverLimit ? $orderCheck['reason'] : null,
            'normalized' => [
                'platform' => 'shopify',
                'order_number' => $orderNumber,
                'total' => $order->total_price,
            ]
        ]);
    }

    /**
     * Process WooCommerce order creation.
     */
    private function processWooCommerceOrder(EcommerceConnection $connection, array $payload)
    {
        $externalOrderId = (string)($payload['id'] ?? '');
        $orderNumber = (string)($payload['number'] ?? $payload['id'] ?? '');

        if (!$externalOrderId) {
            return response()->json(['error' => 'No WooCommerce order ID provided'], 400);
        }

        $email = $payload['billing']['email'] ?? null;
        $phone = $payload['billing']['phone'] ?? null;
        $firstName = $payload['billing']['first_name'] ?? '';
        $lastName = $payload['billing']['last_name'] ?? '';

        $items = array_map(function ($item) {
            return [
                'title' => $item['name'] ?? '',
                'qty' => $item['quantity'] ?? 1,
                'price' => $item['subtotal'] ?? '0.00',
            ];
        }, $payload['line_items'] ?? []);

        $financialStatus = ($payload['status'] === 'completed' || $payload['status'] === 'processing') ? 'paid' : 'pending';
        $fulfillmentStatus = $payload['status'] === 'completed' ? 'fulfilled' : 'unfulfilled';

        // Record order
        $order = EcommerceOrder::updateOrCreate(
            [
                'tenant_id' => $connection->tenant_id,
                'ecommerce_connection_id' => $connection->id,
                'external_order_id' => $externalOrderId,
            ],
            [
                'order_number' => $orderNumber,
                'customer_email' => $email ?? '',
                'customer_phone' => $phone,
                'total_price' => $payload['total'] ?? '0.00',
                'financial_status' => $financialStatus,
                'fulfillment_status' => $fulfillmentStatus,
                'items_summary' => $items,
                'external_created_at' => isset($payload['date_created']) ? new \DateTime($payload['date_created']) : now(),
            ]
        );

        // Resolve Contact
        $this->resolveContact($connection->tenant_id, $email, $phone, $firstName, $lastName);

        // Check if there's an active abandoned cart for this customer and mark it as recovered
        $cartQuery = EcommerceAbandonedCart::where('tenant_id', $connection->tenant_id)
            ->where('recovery_status', 'pending');

        if ($email) {
            $cartQuery->whereHas('contact', function ($q) use ($email) {
                $q->where('email', $email);
            });
        } elseif ($phone) {
            $cartQuery->whereHas('contact', function ($q) use ($phone) {
                $q->where('phone', $phone);
            });
        }

        $cartQuery->update([
            'recovery_status' => 'recovered',
            'recovered_at' => now(),
        ]);

        $tenant = $connection->tenant;
        $orderCheck = $tenant ? app(\App\Services\PlanLimitService::class)->canProcessEcommerceOrder($tenant) : ['allowed' => true];
        $isOverLimit = !$orderCheck['allowed'];

        return response()->json([
            'status' => 'processed',
            'type' => 'order_created',
            'order_id' => $order->id,
            'over_limit' => $isOverLimit,
            'limit_warning' => $isOverLimit ? $orderCheck['reason'] : null,
            'normalized' => [
                'platform' => 'woocommerce',
                'order_number' => $orderNumber,
                'total' => $order->total_price,
            ]
        ]);
    }

    /**
     * Process WooCommerce order updates.
     */
    private function processWooCommerceOrderUpdated(EcommerceConnection $connection, array $payload)
    {
        return $this->processWooCommerceOrder($connection, $payload);
    }

    /**
     * Find or create contact context helper.
     */
    private function resolveContact(int $tenantId, ?string $email, ?string $phone, string $firstName, string $lastName): Contact
    {
        $contact = null;

        if ($email) {
            $contact = Contact::where('tenant_id', $tenantId)->where('email', $email)->first();
        }

        if (!$contact && $phone) {
            $contact = Contact::where('tenant_id', $tenantId)->where('phone', $phone)->first();
        }

        if (!$contact) {
            $contact = Contact::create([
                'tenant_id' => $tenantId,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $email,
                'phone' => $phone,
                'lifecycle_stage' => 'subscriber',
            ]);
        } else {
            if (empty($contact->first_name) && !empty($firstName)) {
                $contact->first_name = $firstName;
            }
            if (empty($contact->last_name) && !empty($lastName)) {
                $contact->last_name = $lastName;
            }
            $contact->save();
        }

        return $contact;
    }
}
