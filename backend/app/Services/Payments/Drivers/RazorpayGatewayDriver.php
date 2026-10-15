<?php

namespace App\Services\Payments\Drivers;

use App\Contracts\PaymentGatewayInterface;
use App\Models\Tenant;
use App\Models\PlanPrice;
use Razorpay\Api\Api;
use Illuminate\Support\Facades\Log;
use Exception;

class RazorpayGatewayDriver implements PaymentGatewayInterface
{
    protected ?Api $api = null;
    protected array $config = [];

    public function __construct(array $config = [])
    {
        $this->config = $config;
        $keyId = $this->getKeyId();
        $keySecret = $this->getKeySecret();

        if (!empty($keyId) && !empty($keySecret)) {
            $this->api = new Api($keyId, $keySecret);
        }
    }

    public function getSlug(): string
    {
        return 'razorpay';
    }

    public function getName(): string
    {
        return 'Razorpay';
    }

    public function isConfigured(): bool
    {
        return !empty($this->getKeyId()) && !empty($this->getKeySecret());
    }

    public function isTestMode(): bool
    {
        $mode = $this->config['mode'] ?? null;
        if ($mode) {
            return $mode === 'test';
        }
        $keyId = $this->getKeyId();
        return str_starts_with($keyId, 'rzp_test_');
    }

    public function getKeyId(): string
    {
        return $this->config['key_id'] ?? ($this->config['publishable_key'] ?? '');
    }

    public function getKeySecret(): string
    {
        return $this->config['key_secret'] ?? ($this->config['secret_key'] ?? '');
    }

    public function getWebhookSecret(): string
    {
        return $this->config['webhook_secret'] ?? '';
    }

    public function getPublicCredentials(): array
    {
        return [
            'key_id' => $this->getKeyId(),
            'mode' => $this->isTestMode() ? 'test' : 'live',
        ];
    }

    public function getClient(): ?Api
    {
        return $this->api;
    }

    public function createProduct(string $name, ?string $description = null): string
    {
        // In Razorpay, plans encapsulate both product details and pricing
        return $name;
    }

    public function createPrice(string $productId, int $amountCents, string $currency, string $interval = 'month'): string
    {
        if (!$this->api) {
            throw new Exception('Razorpay credentials not configured. Please set Razorpay API keys in Superadmin Payment Settings.');
        }

        try {
            $period = ($interval === 'year' || $interval === 'yearly') ? 'yearly' : 'monthly';
            $plan = $this->api->plan->create([
                'period' => $period,
                'interval' => 1,
                'item' => [
                    'name' => $productId,
                    'amount' => $amountCents,
                    'currency' => strtoupper($currency),
                    'description' => 'Subscription Plan',
                ],
            ]);

            return $plan->id;
        } catch (Exception $e) {
            Log::error('Razorpay Plan creation failed: ' . $e->getMessage());
            throw new Exception('Razorpay Integration Error: ' . $e->getMessage());
        }
    }

    public function archivePrice(string $priceId): void
    {
        // Razorpay plans are archived by not linking them to new subscriptions
    }

    public function createCheckoutSession(Tenant $tenant, string $priceId, string $successUrl, string $cancelUrl): string
    {
        if (!$this->api) {
            throw new Exception('Razorpay credentials not configured.');
        }

        try {
            $actualPlanId = $this->ensurePlanExists($priceId);
            $planPrice = PlanPrice::where('razorpay_plan_id', $priceId)
                ->orWhere('razorpay_plan_id', $actualPlanId)
                ->orWhere('stripe_price_id', $priceId)
                ->first();

            // Retrieve or create customer safely on Razorpay
            $customerId = $tenant->razorpay_customer_id;
            if (!empty($customerId)) {
                try {
                    $this->api->customer->fetch($customerId);
                } catch (Exception $e) {
                    $customerId = null;
                }
            }

            if (empty($customerId)) {
                $primaryUser = $tenant->users()->first();
                $userEmail = $primaryUser?->email;
                $userName = $tenant->company_name ?: ($primaryUser?->name ?: 'Customer');
                $userPhone = $primaryUser?->phone ?? null;

                try {
                    $customerData = [
                        'name' => $userName,
                        'notes' => [
                            'tenant_id' => (string) $tenant->id,
                        ],
                    ];
                    if (!empty($userEmail)) {
                        $customerData['email'] = $userEmail;
                    }
                    if (!empty($userPhone)) {
                        $customerData['contact'] = $userPhone;
                    }

                    $customer = $this->api->customer->create($customerData);
                    $customerId = $customer->id;
                    $tenant->update(['razorpay_customer_id' => $customerId]);
                } catch (Exception $e) {
                    // Safeguard: If customer already exists on Razorpay merchant account, find and link existing customer
                    if (str_contains(strtolower($e->getMessage()), 'already exists') && !empty($userEmail)) {
                        try {
                            $existingList = $this->api->customer->all(['count' => 100]);
                            if (!empty($existingList->items)) {
                                foreach ($existingList->items as $custItem) {
                                    if (isset($custItem->email) && strtolower($custItem->email) === strtolower($userEmail)) {
                                        $customerId = $custItem->id;
                                        $tenant->update(['razorpay_customer_id' => $customerId]);
                                        break;
                                    }
                                }
                            }
                        } catch (Exception $searchEx) {
                            Log::warning('Failed searching existing Razorpay customer: ' . $searchEx->getMessage());
                        }
                    }

                    if (empty($customerId)) {
                        Log::warning('Razorpay customer creation skipped/failed: ' . $e->getMessage());
                    }
                }
            }

            $metadata = [
                'tenant_id' => (string) $tenant->id,
                'plan_id' => (string) ($planPrice ? $planPrice->plan_id : ''),
                'price_id' => (string) ($planPrice ? $planPrice->id : ''),
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
            ];

            $totalCount = ($planPrice?->billing_interval === 'year') ? 10 : 120;

            $subscriptionParams = [
                'plan_id' => $actualPlanId,
                'total_count' => $totalCount,
                'quantity' => 1,
                'customer_notify' => 1,
                'notes' => $metadata,
            ];

            if (!empty($customerId)) {
                $subscriptionParams['customer_id'] = $customerId;
            }

            $subscription = $this->api->subscription->create($subscriptionParams);

            // Save subscription ID to tenant
            $tenant->update(['razorpay_subscription_id' => $subscription->id]);

            // Pure Recurring Subscription Checkout Payload for Razorpay Standard Checkout SDK
            $amount = $planPrice ? (int) $planPrice->amount : 10000;
            $currency = $planPrice && $planPrice->currency ? strtoupper($planPrice->currency->code) : 'INR';
            $primaryUser = $tenant->users()->first();

            $checkoutData = [
                'gateway' => 'razorpay',
                'subscription_id' => $subscription->id,
                'key_id' => $this->getKeyId(),
                'name' => config('app.name', 'WhatsOmni'),
                'description' => ($planPrice?->plan?->name ?? 'Subscription Plan') . ' (' . ucfirst($planPrice?->billing_interval ?? 'month') . ')',
                'currency' => $currency,
                'amount' => $amount,
                'customer' => [
                    'name' => $tenant->company_name ?: ($primaryUser?->name ?: 'Customer'),
                    'email' => $primaryUser?->email ?? '',
                    'contact' => $primaryUser?->phone ?? '',
                ],
                'theme' => [
                    'color' => '#000000',
                ],
            ];

            return json_encode($checkoutData);
        } catch (Exception $e) {
            Log::error('Razorpay Recurring Subscription creation failed: ' . $e->getMessage());
            throw new Exception('Razorpay Integration Error: ' . $e->getMessage());
        }
    }

    /**
     * Verify HMAC-SHA256 signature for Razorpay recurring subscription.
     */
    public function verifySubscriptionSignature(array $attributes): bool
    {
        $secret = $this->getKeySecret();
        if (empty($secret) || empty($attributes['razorpay_signature']) || empty($attributes['razorpay_payment_id']) || empty($attributes['razorpay_subscription_id'])) {
            return false;
        }

        $payload = $attributes['razorpay_payment_id'] . '|' . $attributes['razorpay_subscription_id'];
        $expectedSignature = hash_hmac('sha256', $payload, $secret);

        return hash_equals($expectedSignature, $attributes['razorpay_signature']);
    }

    public function createPortalSession(Tenant $tenant, string $returnUrl): string
    {
        if (!$this->api) {
            throw new Exception('Razorpay credentials not configured.');
        }

        if (empty($tenant->razorpay_subscription_id)) {
            return $returnUrl;
        }

        try {
            $subscription = $this->api->subscription->fetch($tenant->razorpay_subscription_id);
            return $subscription->short_url ?? $returnUrl;
        } catch (Exception $e) {
            Log::warning('Razorpay portal session fetch failed: ' . $e->getMessage());
            return $returnUrl;
        }
    }

    public function changeSubscriptionPlan(Tenant $tenant, string $newPriceId): void
    {
        $this->updateSubscriptionPlan($tenant, $newPriceId);
    }

    public function updateSubscriptionPlan(Tenant $tenant, string $newPriceId): void
    {
        if (!$this->api || empty($tenant->razorpay_subscription_id)) {
            return;
        }

        try {
            $actualPlanId = $this->ensurePlanExists($newPriceId);
            $this->api->subscription->fetch($tenant->razorpay_subscription_id)->update([
                'plan_id' => $actualPlanId,
                'quantity' => 1,
                'schedule_change_at' => 'now',
            ]);
        } catch (Exception $e) {
            Log::error('Razorpay Subscription update failed: ' . $e->getMessage());
        }
    }

    public function cancelSubscription(Tenant $tenant): void
    {
        if (!$this->api || empty($tenant->razorpay_subscription_id)) {
            $tenant->update(['razorpay_subscription_id' => null]);
            return;
        }

        try {
            $this->api->subscription->fetch($tenant->razorpay_subscription_id)->cancel([
                'cancel_at_cycle_end' => 0,
            ]);
        } catch (Exception $e) {
            Log::warning("Razorpay subscription {$tenant->razorpay_subscription_id} cancel warning: " . $e->getMessage());
        } finally {
            $tenant->update(['razorpay_subscription_id' => null]);
        }
    }

    public function testConnection(?array $overrideCredentials = null): array
    {
        $keyId = $overrideCredentials['key_id'] ?? ($overrideCredentials['publishable_key'] ?? $this->getKeyId());
        $keySecret = $overrideCredentials['key_secret'] ?? ($overrideCredentials['secret_key'] ?? $this->getKeySecret());

        if (empty($keyId) || empty($keySecret)) {
            return [
                'success' => false,
                'message' => 'Please provide both Razorpay Key ID and Key Secret to test the connection.',
            ];
        }

        try {
            $client = new Api($keyId, $keySecret);
            // Fetch list of orders or customers to verify credentials
            $client->customer->all(['count' => 1]);
            $isTest = str_starts_with($keyId, 'rzp_test_');

            return [
                'success' => true,
                'message' => 'Connection verified successfully! Razorpay API keys are active.',
                'details' => [
                    'mode' => $isTest ? 'test' : 'live',
                    'key_id' => substr($keyId, 0, 8) . '••••••••',
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Razorpay connection test failed: ' . $e->getMessage(),
            ];
        }
    }

    protected function ensurePlanExists(string $priceId): string
    {
        try {
            if (str_starts_with($priceId, 'plan_')) {
                $this->api->plan->fetch($priceId);
                return $priceId;
            }
        } catch (Exception $e) {
            // Plan ID not found in current Razorpay account, proceed to dynamic creation
        }

        // Look up PlanPrice from database
        $planPrice = PlanPrice::where('razorpay_plan_id', $priceId)
            ->orWhere('stripe_price_id', $priceId)
            ->first();

        if (!$planPrice && is_numeric($priceId)) {
            $planPrice = PlanPrice::find($priceId);
        }

        if ($planPrice) {
            if (!empty($planPrice->razorpay_plan_id) && str_starts_with($planPrice->razorpay_plan_id, 'plan_')) {
                return $planPrice->razorpay_plan_id;
            }

            try {
                $plan = $planPrice->plan;
                $productName = $plan ? $plan->name : 'Subscription Plan';
                $amount = (int) $planPrice->amount;
                $interval = ($planPrice->billing_interval === 'year' || $planPrice->billing_interval === 'yearly') ? 'yearly' : 'monthly';
                $currency = $planPrice->currency ? strtoupper($planPrice->currency->code) : 'INR';

                $razorpayPlan = $this->api->plan->create([
                    'period' => $interval,
                    'interval' => 1,
                    'item' => [
                        'name' => $productName . ' (' . ucfirst($interval) . ')',
                        'amount' => $amount,
                        'currency' => $currency,
                        'description' => 'Subscription Tier',
                    ],
                ]);

                $planPrice->update(['razorpay_plan_id' => $razorpayPlan->id]);
                return $razorpayPlan->id;
            } catch (Exception $e) {
                // Safeguard: Search if a matching plan already exists on Razorpay
                try {
                    $existingPlans = $this->api->plan->all(['count' => 100]);
                    if (!empty($existingPlans->items)) {
                        foreach ($existingPlans->items as $pItem) {
                            if ($pItem->period === $interval && (int)($pItem->item->amount ?? 0) === $amount && strtoupper($pItem->item->currency ?? '') === $currency) {
                                $planPrice->update(['razorpay_plan_id' => $pItem->id]);
                                return $pItem->id;
                            }
                        }
                    }
                } catch (Exception $searchPlanEx) {}

                Log::warning("Dynamic Razorpay plan creation fallback: " . $e->getMessage());
                return $priceId;
            }
        }

        return $priceId;
    }
}
