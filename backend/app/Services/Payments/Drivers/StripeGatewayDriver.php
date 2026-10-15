<?php

namespace App\Services\Payments\Drivers;

use App\Contracts\PaymentGatewayInterface;
use App\Models\Tenant;
use App\Models\PlanPrice;
use Stripe\StripeClient;
use Illuminate\Support\Facades\Log;
use Exception;

class StripeGatewayDriver implements PaymentGatewayInterface
{
    protected ?StripeClient $stripe = null;
    protected array $config = [];

    public function __construct(array $config = [])
    {
        $this->config = $config;
        $secretKey = $this->getSecretKey();

        if (!empty($secretKey)) {
            $this->stripe = new StripeClient($secretKey);
        }
    }

    public function getSlug(): string
    {
        return 'stripe';
    }

    public function getName(): string
    {
        return 'Stripe';
    }

    public function isConfigured(): bool
    {
        return !empty($this->getSecretKey());
    }

    public function isTestMode(): bool
    {
        $mode = $this->config['mode'] ?? null;
        if ($mode) {
            return $mode === 'test';
        }
        $secret = $this->getSecretKey();
        return str_starts_with($secret, 'sk_test_') || str_starts_with($secret, 'rk_test_');
    }

    public function getPublishableKey(): string
    {
        return $this->config['publishable_key'] ?? '';
    }

    public function getSecretKey(): string
    {
        return $this->config['secret_key'] ?? '';
    }

    public function getWebhookSecret(): string
    {
        return $this->config['webhook_secret'] ?? '';
    }

    public function getPublicCredentials(): array
    {
        return [
            'publishable_key' => $this->getPublishableKey(),
            'mode' => $this->isTestMode() ? 'test' : 'live',
        ];
    }

    /**
     * Get underlying StripeClient instance.
     */
    public function getClient(): ?StripeClient
    {
        return $this->stripe;
    }

    public function createProduct(string $name, ?string $description = null): string
    {
        if (!$this->stripe) {
            throw new Exception('Stripe credentials not configured. Please set Stripe API keys in Superadmin Payment Settings.');
        }

        try {
            $product = $this->stripe->products->create([
                'name' => $name,
                'description' => $description,
            ]);

            return $product->id;
        } catch (Exception $e) {
            Log::error('Stripe Product creation failed: ' . $e->getMessage());
            throw new Exception('Stripe Integration Error: ' . $e->getMessage());
        }
    }

    public function createPrice(string $productId, int $amountCents, string $currency, string $interval = 'month'): string
    {
        if (!$this->stripe) {
            throw new Exception('Stripe credentials not configured. Please set Stripe API keys in Superadmin Payment Settings.');
        }

        try {
            $price = $this->stripe->prices->create([
                'product' => $productId,
                'unit_amount' => $amountCents,
                'currency' => strtolower($currency),
                'recurring' => [
                    'interval' => $interval,
                ],
            ]);

            return $price->id;
        } catch (Exception $e) {
            Log::error('Stripe Price creation failed: ' . $e->getMessage());
            throw new Exception('Stripe Integration Error: ' . $e->getMessage());
        }
    }

    public function archivePrice(string $priceId): void
    {
        if (!$this->stripe || str_starts_with($priceId, 'price_mock_')) {
            return;
        }

        try {
            $this->stripe->prices->update($priceId, [
                'active' => false,
            ]);
        } catch (Exception $e) {
            Log::warning("Failed to archive Stripe price {$priceId}: " . $e->getMessage());
        }
    }

    public function createCheckoutSession(Tenant $tenant, string $priceId, string $successUrl, string $cancelUrl): string
    {
        if (!$this->stripe) {
            throw new Exception('Stripe credentials not configured.');
        }

        try {
            $actualPriceId = $this->ensurePriceExists($priceId);
            $planPrice = PlanPrice::where('stripe_price_id', $priceId)
                ->orWhere('stripe_price_id', $actualPriceId)
                ->first();

            // Retrieve or create customer safely on the active Stripe account
            $customerId = $tenant->stripe_customer_id;
            if (!empty($customerId)) {
                try {
                    $this->stripe->customers->retrieve($customerId);
                } catch (Exception $e) {
                    $customerId = null;
                }
            }

            if (empty($customerId)) {
                $customer = $this->stripe->customers->create([
                    'name' => $tenant->company_name,
                    'metadata' => [
                        'tenant_id' => (string) $tenant->id,
                    ],
                ]);
                $customerId = $customer->id;
                $tenant->update(['stripe_customer_id' => $customerId]);
            }

            $metadata = [
                'tenant_id' => (string) $tenant->id,
                'plan_id' => (string) ($planPrice ? $planPrice->plan_id : ''),
                'price_id' => (string) ($planPrice ? $planPrice->id : ''),
            ];

            $subscriptionData = [
                'metadata' => $metadata,
            ];
            if (!empty($planPrice?->plan?->trial_days) && $planPrice->plan->trial_days > 0) {
                $subscriptionData['trial_period_days'] = (int) $planPrice->plan->trial_days;
            }

            $session = $this->stripe->checkout->sessions->create([
                'customer' => $customerId,
                'mode' => 'subscription',
                'line_items' => [[
                    'price' => $actualPriceId,
                    'quantity' => 1,
                ]],
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
                'metadata' => $metadata,
                'subscription_data' => $subscriptionData,
            ]);

            return $session->url;
        } catch (Exception $e) {
            Log::error('Stripe Checkout Session creation failed: ' . $e->getMessage());
            throw new Exception('Stripe Integration Error: ' . $e->getMessage());
        }
    }

    public function createPortalSession(Tenant $tenant, string $returnUrl): string
    {
        if (!$this->stripe) {
            throw new Exception('Stripe credentials not configured.');
        }

        $customerId = $tenant->stripe_customer_id;
        if (!empty($customerId)) {
            try {
                $this->stripe->customers->retrieve($customerId);
            } catch (Exception $e) {
                $customerId = null;
            }
        }

        if (empty($customerId)) {
            $customer = $this->stripe->customers->create([
                'name' => $tenant->company_name,
                'metadata' => [
                    'tenant_id' => (string) $tenant->id,
                ],
            ]);
            $customerId = $customer->id;
            $tenant->update(['stripe_customer_id' => $customerId]);
        }

        try {
            $session = $this->stripe->billingPortal->sessions->create([
                'customer' => $customerId,
                'return_url' => $returnUrl,
            ]);

            return $session->url;
        } catch (Exception $e) {
            Log::error('Stripe Portal creation failed: ' . $e->getMessage());
            throw new Exception('Stripe Integration Error: ' . $e->getMessage());
        }
    }

    public function changeSubscriptionPlan(Tenant $tenant, string $newPriceId): void
    {
        if (!$this->stripe) {
            throw new Exception('Stripe credentials not configured.');
        }

        if (empty($tenant->stripe_subscription_id)) {
            throw new Exception('No active subscription found to modify.');
        }

        try {
            $actualPriceId = $this->ensurePriceExists($newPriceId);
            $subscription = $this->stripe->subscriptions->retrieve($tenant->stripe_subscription_id);
            $subscriptionItemId = $subscription->items->data[0]->id;

            $this->stripe->subscriptions->update($tenant->stripe_subscription_id, [
                'items' => [
                    [
                        'id' => $subscriptionItemId,
                        'price' => $actualPriceId,
                    ]
                ],
                'proration_behavior' => 'create_prorations',
            ]);
        } catch (Exception $e) {
            Log::error('Stripe Subscription Plan update failed: ' . $e->getMessage());
            throw new Exception('Stripe Integration Error: ' . $e->getMessage());
        }
    }

    public function cancelSubscription(Tenant $tenant): void
    {
        if (!$this->stripe) {
            throw new Exception('Stripe credentials not configured.');
        }

        if (empty($tenant->stripe_subscription_id)) {
            throw new Exception('No active subscription found to cancel.');
        }

        try {
            $this->stripe->subscriptions->update($tenant->stripe_subscription_id, [
                'cancel_at_period_end' => true,
            ]);
        } catch (Exception $e) {
            Log::error('Stripe Subscription cancellation failed: ' . $e->getMessage());
            throw new Exception('Stripe Integration Error: ' . $e->getMessage());
        }
    }

    public function testConnection(?array $overrideCredentials = null): array
    {
        $secretKey = $overrideCredentials['secret_key'] ?? $this->getSecretKey();

        if (empty($secretKey)) {
            return [
                'success' => false,
                'message' => 'Stripe Secret Key is empty. Please enter your secret key.',
            ];
        }

        try {
            $client = new StripeClient($secretKey);
            // Query account or balance to verify the API key
            $balance = $client->balance->retrieve();
            $livemode = $balance->livemode ?? false;

            return [
                'success' => true,
                'message' => 'Connection verified successfully! Stripe API key is active.',
                'details' => [
                    'mode' => $livemode ? 'live' : 'test',
                    'available_currencies' => array_map(fn($b) => strtoupper($b->currency), $balance->available ?? []),
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Stripe connection test failed: ' . $e->getMessage(),
            ];
        }
    }

    protected function ensurePriceExists(string $priceId): string
    {
        try {
            if (str_starts_with($priceId, 'price_1') || str_starts_with($priceId, 'price_2')) {
                $this->stripe->prices->retrieve($priceId);
                return $priceId;
            }
        } catch (Exception $e) {
            // Price ID not found in current Stripe account, proceed to dynamic creation
        }

        // Look up PlanPrice from database
        $planPrice = PlanPrice::where('stripe_price_id', $priceId)->first();
        if (!$planPrice && is_numeric($priceId)) {
            $planPrice = PlanPrice::find($priceId);
        }

        if ($planPrice) {
            try {
                $plan = $planPrice->plan;
                $productName = $plan ? $plan->name : 'Subscription Plan';
                $amount = (int) $planPrice->amount;
                $interval = $planPrice->billing_interval ?: 'month';
                $currency = $planPrice->currency ? strtolower($planPrice->currency->code) : 'usd';

                $price = $this->stripe->prices->create([
                    'unit_amount' => $amount,
                    'currency' => $currency,
                    'recurring' => ['interval' => $interval],
                    'product_data' => [
                        'name' => $productName,
                    ],
                ]);

                $planPrice->update(['stripe_price_id' => $price->id]);
                return $price->id;
            } catch (Exception $e) {
                Log::warning("Dynamic Stripe price creation fallback: " . $e->getMessage());
                return $priceId;
            }
        }

        return $priceId;
    }
}
