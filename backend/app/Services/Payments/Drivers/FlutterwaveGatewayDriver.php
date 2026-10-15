<?php

namespace App\Services\Payments\Drivers;

use App\Contracts\PaymentGatewayInterface;
use App\Models\Tenant;
use App\Models\PlanPrice;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class FlutterwaveGatewayDriver implements PaymentGatewayInterface
{
    protected array $config = [];
    protected string $baseUrl = 'https://api.flutterwave.com/v3';

    public function __construct(array $config = [])
    {
        $this->config = $config;
    }

    public function getSlug(): string
    {
        return 'flutterwave';
    }

    public function getName(): string
    {
        return 'Flutterwave';
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
        return str_starts_with($secret, 'FLWSECK_TEST-');
    }

    public function getPublicKey(): string
    {
        return $this->config['public_key'] ?? ($this->config['publishable_key'] ?? '');
    }

    public function getSecretKey(): string
    {
        return $this->config['secret_key'] ?? '';
    }

    public function getWebhookSecret(): string
    {
        return $this->config['webhook_secret'] ?? ($this->config['secret_hash'] ?? '');
    }

    public function getPublicCredentials(): array
    {
        return [
            'public_key' => $this->getPublicKey(),
            'mode' => $this->isTestMode() ? 'test' : 'live',
        ];
    }

    /**
     * Create an HTTP client configured with Flutterwave Bearer token.
     */
    protected function http()
    {
        $secretKey = $this->getSecretKey();
        if (empty($secretKey)) {
            throw new Exception('Flutterwave Secret Key is not configured in Superadmin Payment Settings.');
        }

        return Http::baseUrl($this->baseUrl)
            ->withToken($secretKey)
            ->acceptJson()
            ->timeout(15);
    }

    public function createProduct(string $name, ?string $description = null): string
    {
        return $name;
    }

    public function createPrice(string $productId, int $amountCents, string $currency, string $interval = 'month'): string
    {
        $intervalMapped = in_array(strtolower($interval), ['year', 'yearly', 'annually', 'annual']) ? 'yearly' : 'monthly';
        $currencyCode = strtoupper($currency ?: 'NGN');
        $amountValue = $amountCents >= 100 ? ($amountCents / 100) : $amountCents;

        try {
            $response = $this->http()->post('/payment-plans', [
                'name' => $productId . ' (' . ucfirst($intervalMapped) . ')',
                'amount' => $amountValue,
                'interval' => $intervalMapped,
                'currency' => $currencyCode,
                'duration' => 0, // 0 for unlimited recurring renewals
            ]);

            if ($response->successful() && !empty($response->json('data.id'))) {
                return (string) $response->json('data.id');
            }

            $errMsg = $response->json('message') ?: $response->body();
            Log::error("Flutterwave Payment Plan creation failed: {$errMsg}");
            throw new Exception("Flutterwave Payment Plan Error: {$errMsg}");
        } catch (Exception $e) {
            Log::error('Flutterwave createPrice Exception: ' . $e->getMessage());
            throw new Exception('Flutterwave Integration Error: ' . $e->getMessage());
        }
    }

    public function archivePrice(string $priceId): void
    {
        try {
            if (is_numeric($priceId)) {
                $this->http()->put("/payment-plans/{$priceId}/cancel");
            }
        } catch (Exception $e) {
            Log::warning("Flutterwave archivePrice exception for {$priceId}: " . $e->getMessage());
        }
    }

    public function createCheckoutSession(Tenant $tenant, string $priceId, string $successUrl, string $cancelUrl): string
    {
        $actualPlanId = $this->ensurePlanExists($priceId);

        $planPrice = PlanPrice::where('flutterwave_plan_id', $priceId)
            ->orWhere('flutterwave_plan_id', $actualPlanId)
            ->orWhere('stripe_price_id', $priceId)
            ->first();

        if (!$planPrice && is_numeric($priceId)) {
            $planPrice = PlanPrice::find($priceId);
        }

        $primaryUser = $tenant->users()->first();
        $email = $primaryUser?->email;

        if (empty($email)) {
            throw new Exception('Workspace customer email is required to initiate Flutterwave recurring checkout.');
        }

        $amountRaw = $planPrice ? (int) $planPrice->amount : 10000;
        $amountValue = $amountRaw >= 100 ? ($amountRaw / 100) : $amountRaw;
        $currency = $planPrice && $planPrice->currency ? strtoupper($planPrice->currency->code) : 'NGN';
        $planName = $planPrice?->plan?->name ?? 'Subscription Plan';
        $interval = $planPrice?->billing_interval ?? 'month';
        $txRef = "FLW_TXN_{$tenant->id}_" . time() . '_' . bin2hex(random_bytes(4));

        $metadata = [
            'tenant_id' => (string) $tenant->id,
            'plan_id' => (string) ($planPrice ? $planPrice->plan_id : ''),
            'price_id' => (string) ($planPrice ? $planPrice->id : ''),
            'cancel_url' => $cancelUrl,
            'company_name' => $tenant->company_name ?: 'Workspace',
        ];

        $cleanSuccessUrl = str_replace(['?session_id={CHECKOUT_SESSION_ID}', '&session_id={CHECKOUT_SESSION_ID}'], '', $successUrl);

        try {
            $payload = [
                'tx_ref' => $txRef,
                'amount' => $amountValue,
                'currency' => $currency,
                'redirect_url' => $cleanSuccessUrl,
                'payment_plan' => (int) $actualPlanId,
                'customer' => [
                    'email' => $email,
                    'name' => $tenant->company_name ?: 'Workspace Customer',
                ],
                'meta' => $metadata,
                'customizations' => [
                    'title' => config('app.name', 'WhatsOmni'),
                    'description' => "{$planName} (" . ucfirst($interval) . ") Recurring Subscription",
                ],
            ];

            $response = $this->http()->post('/payments', $payload);

            if (!$response->successful() || !$response->json('status') || empty($response->json('data.link'))) {
                $errMsg = $response->json('message') ?: $response->body();
                throw new Exception("Flutterwave Payment Initialization failed: {$errMsg}");
            }

            $checkoutLink = $response->json('data.link');

            $checkoutData = [
                'gateway' => 'flutterwave',
                'checkout_url' => $checkoutLink,
                'authorization_url' => $checkoutLink,
                'tx_ref' => $txRef,
                'public_key' => $this->getPublicKey(),
                'plan_id' => $actualPlanId,
                'amount' => $amountValue,
                'currency' => $currency,
                'email' => $email,
                'name' => config('app.name', 'WhatsOmni'),
                'description' => "{$planName} (" . ucfirst($interval) . ")",
            ];

            return json_encode($checkoutData);
        } catch (Exception $e) {
            Log::error('Flutterwave Recurring Subscription Checkout failed: ' . $e->getMessage());
            throw new Exception('Flutterwave Integration Error: ' . $e->getMessage());
        }
    }

    /**
     * Verify a transaction with Flutterwave using transaction ID or reference.
     */
    public function verifyTransaction(string $transactionIdOrRef): array
    {
        if (is_numeric($transactionIdOrRef)) {
            $response = $this->http()->get("/transactions/{$transactionIdOrRef}/verify");
        } else {
            $response = $this->http()->get("/transactions/verify_by_reference", ['tx_ref' => $transactionIdOrRef]);
        }

        if (!$response->successful()) {
            $msg = $response->json('message') ?: 'Verification request failed';
            throw new Exception("Flutterwave Verification Error: {$msg}");
        }

        return $response->json() ?? [];
    }

    /**
     * Verify Flutterwave Webhook signature using verif-hash header.
     */
    public function verifyWebhookSignature(string $payload, ?string $signatureHeader): bool
    {
        $secret = $this->getWebhookSecret();
        if (empty($secret) || empty($signatureHeader)) {
            return false;
        }

        return hash_equals($secret, $signatureHeader);
    }

    public function createPortalSession(Tenant $tenant, string $returnUrl): string
    {
        return $returnUrl;
    }

    public function changeSubscriptionPlan(Tenant $tenant, string $newPriceId): void
    {
        $this->ensurePlanExists($newPriceId);
    }

    public function cancelSubscription(Tenant $tenant): void
    {
        $subId = $tenant->flutterwave_subscription_id;

        if (!empty($subId)) {
            try {
                $response = $this->http()->put("/subscriptions/{$subId}/cancel");
                if (!$response->successful()) {
                    Log::warning("Flutterwave subscription cancel response: " . $response->body());
                }
            } catch (Exception $e) {
                Log::warning("Flutterwave subscription cancel failed for {$subId}: " . $e->getMessage());
            } finally {
                $tenant->update([
                    'flutterwave_subscription_id' => null,
                ]);
            }
        }
    }

    public function testConnection(?array $overrideCredentials = null): array
    {
        $secretKey = $overrideCredentials['secret_key'] ?? $this->getSecretKey();
        $publicKey = $overrideCredentials['public_key'] ?? ($overrideCredentials['publishable_key'] ?? $this->getPublicKey());

        if (empty($secretKey)) {
            return [
                'success' => false,
                'message' => 'Flutterwave Secret Key is required to test the connection.',
            ];
        }

        try {
            $response = Http::baseUrl($this->baseUrl)
                ->withToken($secretKey)
                ->acceptJson()
                ->timeout(10)
                ->get('/payment-plans', ['status' => 'active']);

            if ($response->successful() && $response->json('status') === 'success') {
                $isTest = str_starts_with($secretKey, 'FLWSECK_TEST-');

                return [
                    'success' => true,
                    'message' => 'Connection verified successfully! Flutterwave API keys are active.',
                    'details' => [
                        'mode' => $isTest ? 'test' : 'live',
                        'public_key' => !empty($publicKey) ? (substr($publicKey, 0, 12) . '••••••••') : 'Configured',
                    ]
                ];
            }

            $errMsg = $response->json('message') ?: 'Invalid response from Flutterwave API.';
            return [
                'success' => false,
                'message' => "Flutterwave connection test failed: {$errMsg}",
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Flutterwave connection test failed: ' . $e->getMessage(),
            ];
        }
    }

    public function ensurePlanExists(string $priceId): string
    {
        try {
            if (is_numeric($priceId)) {
                $response = $this->http()->get("/payment-plans/{$priceId}");
                if ($response->successful() && $response->json('status') === 'success') {
                    return (string) $priceId;
                }
            }
        } catch (Exception $e) {
            // Proceed to lookup or create
        }

        // Look up PlanPrice from database
        $planPrice = PlanPrice::where('flutterwave_plan_id', $priceId)
            ->orWhere('stripe_price_id', $priceId)
            ->first();

        if (!$planPrice && is_numeric($priceId)) {
            $planPrice = PlanPrice::find($priceId);
        }

        if ($planPrice) {
            if (!empty($planPrice->flutterwave_plan_id) && is_numeric($planPrice->flutterwave_plan_id)) {
                return (string) $planPrice->flutterwave_plan_id;
            }

            try {
                $plan = $planPrice->plan;
                $productName = $plan ? $plan->name : 'Subscription Plan';
                $amount = (int) $planPrice->amount;
                $interval = in_array(strtolower($planPrice->billing_interval), ['year', 'yearly', 'annually']) ? 'yearly' : 'monthly';
                $currency = $planPrice->currency ? strtoupper($planPrice->currency->code) : 'NGN';

                $planId = $this->createPrice(
                    $productName,
                    $amount,
                    $currency,
                    $interval
                );

                $planPrice->update(['flutterwave_plan_id' => $planId]);
                return $planId;
            } catch (Exception $e) {
                // Safeguard: search if matching plan exists in Flutterwave account
                try {
                    $existing = $this->http()->get('/payment-plans', ['status' => 'active']);
                    if ($existing->successful()) {
                        $items = $existing->json('data') ?? [];
                        $targetAmount = $amount >= 100 ? ($amount / 100) : $amount;
                        foreach ($items as $item) {
                            if (
                                ($item['interval'] ?? '') === $interval &&
                                (float)($item['amount'] ?? 0) == (float)$targetAmount &&
                                strtoupper($item['currency'] ?? '') === $currency
                            ) {
                                $matchedId = (string) $item['id'];
                                $planPrice->update(['flutterwave_plan_id' => $matchedId]);
                                return $matchedId;
                            }
                        }
                    }
                } catch (Exception $searchEx) {}

                Log::warning("Dynamic Flutterwave plan creation fallback: " . $e->getMessage());
                return (string) $priceId;
            }
        }

        return (string) $priceId;
    }
}
