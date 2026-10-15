<?php

namespace App\Services\Payments\Drivers;

use App\Contracts\PaymentGatewayInterface;
use App\Models\Tenant;
use App\Models\PlanPrice;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class PaystackGatewayDriver implements PaymentGatewayInterface
{
    protected array $config = [];
    protected string $baseUrl = 'https://api.paystack.co';

    public function __construct(array $config = [])
    {
        $this->config = $config;
    }

    public function getSlug(): string
    {
        return 'paystack';
    }

    public function getName(): string
    {
        return 'Paystack';
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
        return str_starts_with($secret, 'sk_test_');
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
        return $this->config['webhook_secret'] ?? ($this->config['secret_key'] ?? '');
    }

    public function getPublicCredentials(): array
    {
        return [
            'public_key' => $this->getPublicKey(),
            'mode' => $this->isTestMode() ? 'test' : 'live',
        ];
    }

    /**
     * Create an HTTP client configured with Paystack Bearer token.
     */
    protected function http()
    {
        $secretKey = $this->getSecretKey();
        if (empty($secretKey)) {
            throw new Exception('Paystack Secret Key is not configured in Superadmin Payment Settings.');
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
        $intervalMapped = in_array(strtolower($interval), ['year', 'yearly', 'annually', 'annual']) ? 'annually' : 'monthly';
        $currencyCode = strtoupper($currency ?: 'NGN');

        try {
            $response = $this->http()->post('/plan', [
                'name' => $productId . ' (' . ucfirst($intervalMapped) . ')',
                'interval' => $intervalMapped,
                'amount' => $amountCents,
                'currency' => $currencyCode,
                'description' => 'Subscription Plan Tier',
            ]);

            if ($response->successful() && !empty($response->json('data.plan_code'))) {
                return $response->json('data.plan_code');
            }

            $errMsg = $response->json('message') ?: $response->body();
            Log::error("Paystack Plan creation failed: {$errMsg}");
            throw new Exception("Paystack Plan Error: {$errMsg}");
        } catch (Exception $e) {
            Log::error('Paystack createPrice Exception: ' . $e->getMessage());
            throw new Exception('Paystack Integration Error: ' . $e->getMessage());
        }
    }

    public function archivePrice(string $priceId): void
    {
        // Paystack plans are archived or decommissioned on dashboard
    }

    public function createCheckoutSession(Tenant $tenant, string $priceId, string $successUrl, string $cancelUrl): string
    {
        $actualPlanCode = $this->ensurePlanExists($priceId);

        $planPrice = PlanPrice::where('paystack_plan_code', $priceId)
            ->orWhere('paystack_plan_code', $actualPlanCode)
            ->orWhere('stripe_price_id', $priceId)
            ->first();

        if (!$planPrice && is_numeric($priceId)) {
            $planPrice = PlanPrice::find($priceId);
        }

        $primaryUser = $tenant->users()->first();
        $email = $primaryUser?->email;

        if (empty($email)) {
            throw new Exception('Workspace customer email is required to initiate Paystack recurring checkout.');
        }

        $amount = $planPrice ? (int) $planPrice->amount : 10000;
        $currency = $planPrice && $planPrice->currency ? strtoupper($planPrice->currency->code) : 'NGN';
        $planName = $planPrice?->plan?->name ?? 'Subscription Plan';
        $interval = $planPrice?->billing_interval ?? 'month';

        $metadata = [
            'tenant_id' => (string) $tenant->id,
            'plan_id' => (string) ($planPrice ? $planPrice->plan_id : ''),
            'price_id' => (string) ($planPrice ? $planPrice->id : ''),
            'cancel_url' => $cancelUrl,
            'custom_fields' => [
                [
                    'display_name' => 'Tenant ID',
                    'variable_name' => 'tenant_id',
                    'value' => (string) $tenant->id,
                ],
                [
                    'display_name' => 'Company Name',
                    'variable_name' => 'company_name',
                    'value' => $tenant->company_name ?: 'Workspace',
                ]
            ]
        ];

        try {
            $payload = [
                'email' => $email,
                'amount' => $amount,
                'plan' => $actualPlanCode,
                'currency' => $currency,
                'callback_url' => $successUrl,
                'metadata' => $metadata,
            ];

            $response = $this->http()->post('/transaction/initialize', $payload);

            if (!$response->successful() || !$response->json('status')) {
                $errMsg = $response->json('message') ?: $response->body();
                throw new Exception("Paystack Transaction Initialization failed: {$errMsg}");
            }

            $data = $response->json('data');

            $checkoutData = [
                'gateway' => 'paystack',
                'checkout_url' => $data['authorization_url'] ?? '',
                'authorization_url' => $data['authorization_url'] ?? '',
                'access_code' => $data['access_code'] ?? '',
                'reference' => $data['reference'] ?? '',
                'public_key' => $this->getPublicKey(),
                'plan_code' => $actualPlanCode,
                'amount' => $amount,
                'currency' => $currency,
                'email' => $email,
                'name' => config('app.name', 'WhatsOmni'),
                'description' => "{$planName} (" . ucfirst($interval) . ")",
            ];

            return json_encode($checkoutData);
        } catch (Exception $e) {
            Log::error('Paystack Recurring Subscription Checkout failed: ' . $e->getMessage());
            throw new Exception('Paystack Integration Error: ' . $e->getMessage());
        }
    }

    /**
     * Verify a transaction with Paystack using its reference.
     */
    public function verifyTransaction(string $reference): array
    {
        $response = $this->http()->get("/transaction/verify/{$reference}");

        if (!$response->successful()) {
            $msg = $response->json('message') ?: 'Verification request failed';
            throw new Exception("Paystack Verification Error: {$msg}");
        }

        return $response->json() ?? [];
    }

    /**
     * Create a recurring subscription directly on Paystack.
     */
    public function createSubscription(string $customerCode, string $planCode, ?string $authorization = null): ?array
    {
        try {
            $payload = [
                'customer' => $customerCode,
                'plan' => $planCode,
            ];
            if (!empty($authorization)) {
                $payload['authorization'] = $authorization;
            }

            $response = $this->http()->post('/subscription', $payload);
            if ($response->successful() && $response->json('status')) {
                return $response->json('data') ?? [];
            }
            Log::warning('Paystack createSubscription response: ' . $response->body());
        } catch (Exception $e) {
            Log::warning('Paystack createSubscription exception: ' . $e->getMessage());
        }

        return null;
    }

    public function createPortalSession(Tenant $tenant, string $returnUrl): string
    {
        $subId = $tenant->paystack_subscription_id;
        if (empty($subId)) {
            return $returnUrl;
        }

        try {
            // Fetch subscription management link from Paystack
            $response = $this->http()->get("/subscription/{$subId}/manage/link");
            if ($response->successful() && !empty($response->json('data.link'))) {
                return $response->json('data.link');
            }
        } catch (Exception $e) {
            Log::warning("Paystack portal link fetch failed for {$subId}: " . $e->getMessage());
        }

        return $returnUrl;
    }

    public function changeSubscriptionPlan(Tenant $tenant, string $newPriceId): void
    {
        // When changing plan on Paystack, ensure the new plan exists
        $this->ensurePlanExists($newPriceId);
    }

    public function cancelSubscription(Tenant $tenant): void
    {
        $subCode = $tenant->paystack_subscription_id;
        $emailToken = $tenant->paystack_email_token;

        if (!empty($subCode)) {
            try {
                $payload = [
                    'code' => $subCode,
                ];
                if (!empty($emailToken)) {
                    $payload['token'] = $emailToken;
                }

                $response = $this->http()->post('/subscription/disable', $payload);
                if (!$response->successful()) {
                    Log::warning("Paystack subscription disable response: " . $response->body());
                }
            } catch (Exception $e) {
                Log::warning("Paystack subscription cancel failed for {$subCode}: " . $e->getMessage());
            } finally {
                $tenant->update([
                    'paystack_subscription_id' => null,
                    'paystack_email_token' => null,
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
                'message' => 'Paystack Secret Key is required to test the connection.',
            ];
        }

        try {
            $response = Http::baseUrl($this->baseUrl)
                ->withToken($secretKey)
                ->acceptJson()
                ->timeout(10)
                ->get('/plan', ['perPage' => 1]);

            if ($response->successful() && $response->json('status')) {
                $isTest = str_starts_with($secretKey, 'sk_test_');

                return [
                    'success' => true,
                    'message' => 'Connection verified successfully! Paystack API keys are active.',
                    'details' => [
                        'mode' => $isTest ? 'test' : 'live',
                        'public_key' => !empty($publicKey) ? (substr($publicKey, 0, 8) . '••••••••') : 'Configured',
                    ]
                ];
            }

            $errMsg = $response->json('message') ?: 'Invalid response from Paystack API.';
            return [
                'success' => false,
                'message' => "Paystack connection test failed: {$errMsg}",
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Paystack connection test failed: ' . $e->getMessage(),
            ];
        }
    }

    public function ensurePlanExists(string $priceId): string
    {
        try {
            if (str_starts_with($priceId, 'PLN_')) {
                $response = $this->http()->get("/plan/{$priceId}");
                if ($response->successful() && $response->json('status')) {
                    return $priceId;
                }
            }
        } catch (Exception $e) {
            // Plan not found on active Paystack account, proceed to dynamic creation
        }

        // Look up PlanPrice from database
        $planPrice = PlanPrice::where('paystack_plan_code', $priceId)
            ->orWhere('stripe_price_id', $priceId)
            ->first();

        if (!$planPrice && is_numeric($priceId)) {
            $planPrice = PlanPrice::find($priceId);
        }

        if ($planPrice) {
            if (!empty($planPrice->paystack_plan_code) && str_starts_with($planPrice->paystack_plan_code, 'PLN_')) {
                return $planPrice->paystack_plan_code;
            }

            try {
                $plan = $planPrice->plan;
                $productName = $plan ? $plan->name : 'Subscription Plan';
                $amount = (int) $planPrice->amount;
                $interval = in_array(strtolower($planPrice->billing_interval), ['year', 'yearly', 'annually']) ? 'annually' : 'monthly';
                $currency = $planPrice->currency ? strtoupper($planPrice->currency->code) : 'NGN';

                $planCode = $this->createPrice(
                    $productName,
                    $amount,
                    $currency,
                    $interval
                );

                $planPrice->update(['paystack_plan_code' => $planCode]);
                return $planCode;
            } catch (Exception $e) {
                // Safeguard: search if matching plan exists in Paystack account
                try {
                    $existing = $this->http()->get('/plan', ['perPage' => 50]);
                    if ($existing->successful()) {
                        $items = $existing->json('data') ?? [];
                        foreach ($items as $item) {
                            if (
                                ($item['interval'] ?? '') === $interval &&
                                (int)($item['amount'] ?? 0) === $amount &&
                                strtoupper($item['currency'] ?? '') === $currency
                            ) {
                                $matchedCode = $item['plan_code'];
                                $planPrice->update(['paystack_plan_code' => $matchedCode]);
                                return $matchedCode;
                            }
                        }
                    }
                } catch (Exception $searchEx) {}

                Log::warning("Dynamic Paystack plan creation fallback: " . $e->getMessage());
                return $priceId;
            }
        }

        return $priceId;
    }
}
