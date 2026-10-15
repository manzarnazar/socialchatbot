<?php

namespace App\Services\Payments\Drivers;

use App\Contracts\PaymentGatewayInterface;
use App\Models\Tenant;
use App\Models\PlanPrice;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class MercadoPagoGatewayDriver implements PaymentGatewayInterface
{
    protected array $config = [];

    /**
     * Currencies officially supported by Mercado Pago for Subscriptions / Payments.
     */
    public const SUPPORTED_SUBSCRIPTION_CURRENCIES = [
        'ARS', // Argentine Peso
        'BRL', // Brazilian Real
        'CLP', // Chilean Peso
        'COP', // Colombian Peso
        'MXN', // Mexican Peso
        'PEN', // Peruvian Sol
        'UYU', // Uruguayan Peso
        'USD', // US Dollar
    ];

    public function __construct(array $config = [])
    {
        $this->config = $config;
    }

    public function getSlug(): string
    {
        return 'mercadopago';
    }

    public function getName(): string
    {
        return 'Mercado Pago';
    }

    public function isConfigured(): bool
    {
        return !empty($this->getAccessToken());
    }

    public function isTestMode(): bool
    {
        $mode = $this->config['mode'] ?? 'test';
        if ($mode === 'test' || $mode === 'sandbox') {
            return true;
        }
        $token = $this->getAccessToken();
        $publicKey = $this->getPublicKey();
        return str_starts_with(strtoupper($token), 'TEST-') || str_starts_with(strtoupper($publicKey), 'TEST-');
    }

    public function getAccessToken(): string
    {
        return trim((string)($this->config['access_token'] ?? ($this->config['secret_key'] ?? ($this->config['api_key'] ?? ''))));
    }

    public function getPublicKey(): string
    {
        return trim((string)($this->config['public_key'] ?? ($this->config['publishable_key'] ?? ($this->config['client_id'] ?? ''))));
    }

    public function getPublishableKey(): string
    {
        return $this->getPublicKey();
    }

    public function getWebhookSecret(): string
    {
        return trim((string)($this->config['webhook_secret'] ?? ($this->config['secret_key'] ?? '')));
    }

    public function getBaseUrl(): string
    {
        return 'https://api.mercadopago.com';
    }

    public function getPublicCredentials(): array
    {
        return [
            'public_key' => $this->getPublicKey(),
            'mode' => $this->isTestMode() ? 'test' : 'live',
        ];
    }

    /**
     * Authenticated HTTP client helper with Mercado Pago Bearer token.
     */
    protected function http(?string $overrideAccessToken = null): \Illuminate\Http\Client\PendingRequest
    {
        $token = $overrideAccessToken ?: $this->getAccessToken();

        return Http::withToken($token)
            ->baseUrl($this->getBaseUrl())
            ->acceptJson()
            ->timeout(20);
    }

    /**
     * Create a base Product/Plan identifier on Mercado Pago.
     */
    public function createProduct(string $name, ?string $description = null): string
    {
        if (!$this->isConfigured()) {
            throw new Exception('Mercado Pago is not configured with an Access Token.');
        }

        return 'mp_prod_' . md5($name . '_' . time());
    }

    /**
     * Create a recurring Preapproval Plan (Price) on Mercado Pago.
     */
    public function createPrice(string $productId, int $amountCents, string $currency, string $interval = 'month'): string
    {
        if (!$this->isConfigured()) {
            throw new Exception('Mercado Pago is not configured with an Access Token.');
        }

        $currencyCode = strtoupper(trim($currency));
        if (!in_array($currencyCode, self::SUPPORTED_SUBSCRIPTION_CURRENCIES)) {
            throw new Exception("Currency '{$currencyCode}' is not supported for Mercado Pago recurring subscriptions.");
        }
        $amountMajor = round($amountCents / 100.0, 2);

        $frequency = 1;
        $frequencyType = 'months';
        if (in_array(strtolower($interval), ['year', 'annual', 'annually', 'yearly'])) {
            $frequency = 12;
            $frequencyType = 'months';
        } elseif (in_array(strtolower($interval), ['week', 'weekly'])) {
            $frequency = 7;
            $frequencyType = 'days';
        } elseif (in_array(strtolower($interval), ['day', 'daily'])) {
            $frequency = 1;
            $frequencyType = 'days';
        }

        $frontendUrl = \App\Providers\AppServiceProvider::getFrontendUrl();
        $backUrl = rtrim($frontendUrl, '/') . '/settings/billing';

        $payload = [
            'reason' => "WhatsOmni Subscription ({$currencyCode} {$amountMajor}/{$interval})",
            'auto_recurring' => [
                'frequency' => $frequency,
                'frequency_type' => $frequencyType,
                'transaction_amount' => $amountMajor,
                'currency_id' => $currencyCode,
            ],
            'back_url' => $backUrl,
        ];

        $response = $this->http()->post('/preapproval_plan', $payload);

        if (!$response->successful()) {
            $error = $this->extractErrorMessage($response, 'Failed to create Mercado Pago recurring preapproval plan');
            Log::error('Mercado Pago createPrice error: ' . $error);
            throw new Exception('Mercado Pago Price creation error: ' . $error);
        }

        $planId = $response->json('id');
        if (!$planId) {
            throw new Exception('Mercado Pago did not return a valid Preapproval Plan ID.');
        }

        return (string) $planId;
    }

    /**
     * Archive or deactivate a recurring Preapproval Plan on Mercado Pago.
     */
    public function archivePrice(string $priceId): void
    {
        if (!$this->isConfigured() || empty($priceId)) {
            return;
        }

        try {
            $this->http()->put("/preapproval_plan/{$priceId}", [
                'status' => 'inactive',
            ]);
        } catch (Exception $e) {
            Log::warning("Could not archive Mercado Pago preapproval plan {$priceId}: " . $e->getMessage());
        }
    }

    /**
     * Create a Checkout Session URL for a tenant workspace recurring subscription.
     */
    public function createCheckoutSession(Tenant $tenant, string $priceId, string $successUrl, string $cancelUrl): string
    {
        if (!$this->isConfigured()) {
            throw new Exception('Mercado Pago payment gateway is not configured.');
        }

        // 1. Lookup PlanPrice
        $planPrice = PlanPrice::where('mercadopago_plan_id', $priceId)
            ->orWhere('stripe_price_id', $priceId)
            ->orWhere('id', is_numeric($priceId) ? (int)$priceId : 0)
            ->with(['plan', 'currency'])
            ->first();

        $currencyCode = $planPrice?->currency?->code ?? ($tenant->currency?->code ?? 'BRL');
        $currencyCode = strtoupper($currencyCode);
        $amountMajor = $planPrice ? round($planPrice->amount / 100.0, 2) : 29.99;
        $interval = $planPrice?->billing_interval ?? 'month';
        $planName = $planPrice?->plan?->name ?? ($tenant->plan?->name ?? 'Professional Plan');

        $frequency = 1;
        $frequencyType = 'months';
        if (in_array(strtolower($interval), ['year', 'annual', 'annually', 'yearly'])) {
            $frequency = 12;
            $frequencyType = 'months';
        }

        $payerEmail = $tenant->owner?->email ?? "billing_tenant_{$tenant->id}@whatsomni.com";
        $externalReference = "tenant_{$tenant->id}_price_" . ($planPrice?->id ?? $priceId);

        // 2. If valid mercadopago_plan_id exists on PlanPrice, use it as preapproval_plan_id
        $mpPlanId = $planPrice?->mercadopago_plan_id;
        if (empty($mpPlanId) && $planPrice && !app()->runningUnitTests()) {
            try {
                $mpPlanId = $this->createPrice("prod_plan_{$planPrice->plan_id}", (int)$planPrice->amount, $currencyCode, $interval);
                $planPrice->update(['mercadopago_plan_id' => $mpPlanId]);
                $planPrice->mercadopago_plan_id = $mpPlanId;
            } catch (Exception $e) {
                Log::warning("Could not auto-provision Mercado Pago plan on checkout: " . $e->getMessage());
            }
        }

        // 3. Create Preapproval Subscription Link
        $payload = [
            'reason' => "{$planName} Subscription",
            'payer_email' => $payerEmail,
            'external_reference' => $externalReference,
            'back_url' => $successUrl,
            'status' => 'pending',
            'auto_recurring' => [
                'frequency' => $frequency,
                'frequency_type' => $frequencyType,
                'transaction_amount' => $amountMajor,
                'currency_id' => $currencyCode,
            ],
        ];

        if (!empty($mpPlanId)) {
            $payload['preapproval_plan_id'] = $mpPlanId;
        }

        $response = $this->http()->post('/preapproval', $payload);

        if (!$response->successful()) {
            $error = $this->extractErrorMessage($response, 'Failed to create Mercado Pago checkout session');
            Log::error('Mercado Pago createCheckoutSession error: ' . $error);
            throw new Exception('Mercado Pago Checkout error: ' . $error);
        }

        $data = $response->json();
        $initPoint = $this->isTestMode()
            ? ($data['sandbox_init_point'] ?? ($data['init_point'] ?? null))
            : ($data['init_point'] ?? ($data['sandbox_init_point'] ?? null));

        if (!$initPoint) {
            throw new Exception('Mercado Pago did not return an init_point checkout URL.');
        }

        // Pre-save pending preapproval ID if available
        if (!empty($data['id'])) {
            $tenant->update([
                'mercadopago_subscription_id' => (string)$data['id'],
            ]);
        }

        return (string) $initPoint;
    }

    /**
     * Create Billing Portal Session URL.
     */
    public function createPortalSession(Tenant $tenant, string $returnUrl): string
    {
        return $returnUrl;
    }

    /**
     * Modify/Upgrade an active subscription.
     */
    public function changeSubscriptionPlan(Tenant $tenant, string $newPriceId): void
    {
        $subId = $tenant->mercadopago_subscription_id;
        if (empty($subId)) {
            return;
        }

        $planPrice = PlanPrice::where('mercadopago_plan_id', $newPriceId)
            ->orWhere('stripe_price_id', $newPriceId)
            ->orWhere('id', is_numeric($newPriceId) ? (int)$newPriceId : 0)
            ->first();

        if ($planPrice) {
            $amountMajor = round($planPrice->amount / 100.0, 2);
            $payload = [
                'auto_recurring' => [
                    'transaction_amount' => $amountMajor,
                ],
            ];
            if (!empty($planPrice->mercadopago_plan_id)) {
                $payload['preapproval_plan_id'] = $planPrice->mercadopago_plan_id;
            }

            $response = $this->http()->put("/preapproval/{$subId}", $payload);
            if (!$response->successful()) {
                $error = $this->extractErrorMessage($response, 'Failed to update Mercado Pago subscription');
                Log::error('Mercado Pago changeSubscriptionPlan error: ' . $error);
                throw new Exception('Mercado Pago Subscription Upgrade error: ' . $error);
            }
        }
    }

    /**
     * Cancel an active recurring subscription.
     */
    public function cancelSubscription(Tenant $tenant): void
    {
        $subId = $tenant->mercadopago_subscription_id;
        if (empty($subId)) {
            return;
        }

        try {
            $response = $this->http()->put("/preapproval/{$subId}", [
                'status' => 'cancelled',
            ]);

            if ($response->successful()) {
                Log::info("Mercado Pago preapproval subscription {$subId} cancelled for Tenant {$tenant->id}");
            }
        } catch (Exception $e) {
            Log::warning("Mercado Pago cancelSubscription error: " . $e->getMessage());
        }
    }

    /**
     * Retrieve preapproval subscription details by ID.
     */
    public function getSubscription(string $subscriptionId): array
    {
        $response = $this->http()->get("/preapproval/{$subscriptionId}");

        if (!$response->successful()) {
            throw new Exception('Failed to fetch Mercado Pago subscription: ' . $response->body());
        }

        return $response->json() ?? [];
    }

    /**
     * Retrieve payment details by payment ID.
     */
    public function getPayment(string $paymentId): array
    {
        $response = $this->http()->get("/v1/payments/{$paymentId}");

        if (!$response->successful()) {
            throw new Exception('Failed to fetch Mercado Pago payment: ' . $response->body());
        }

        return $response->json() ?? [];
    }

    /**
     * Test connection and credentials validity with Mercado Pago.
     */
    public function testConnection(?array $overrideCredentials = null): array
    {
        $token = $overrideCredentials['access_token'] ?? ($overrideCredentials['secret_key'] ?? $this->getAccessToken());

        if (empty($token)) {
            return [
                'success' => false,
                'message' => 'Mercado Pago Access Token is missing.',
            ];
        }

        try {
            $response = $this->http($token)->get('/users/me');

            if (!$response->successful()) {
                $errorMsg = $this->extractErrorMessage($response, 'Authentication failed');
                return [
                    'success' => false,
                    'message' => "Mercado Pago verification failed: {$errorMsg}",
                ];
            }

            $user = $response->json();
            $nickname = $user['nickname'] ?? ($user['first_name'] ?? 'Mercado Pago Merchant');
            $userId = $user['id'] ?? 'Unknown';
            $siteId = $user['site_id'] ?? 'MLA';
            $country = $user['country_id'] ?? '';

            return [
                'success' => true,
                'message' => "Connection verified successfully! Authenticated as '{$nickname}' (Account ID: {$userId}, Site: {$siteId}, Country: {$country}).",
                'merchant' => [
                    'id' => $userId,
                    'nickname' => $nickname,
                    'site_id' => $siteId,
                    'country' => $country,
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Network error connecting to Mercado Pago API: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Verify Mercado Pago Webhook / IPN Signature.
     */
    public function verifyWebhookSignature(string $rawPayload, array $headers, ?string $dataId = null, ?string $requestId = null): bool
    {
        $webhookSecret = $this->getWebhookSecret();
        if (empty($webhookSecret)) {
            return true; // If secret not configured, allow processing in development/fallback mode
        }

        $sigHeader = $headers['x-signature'][0] ?? ($headers['x-signature'] ?? null);
        if (!$sigHeader) {
            return true; // Fallback for standard IPN notifications
        }

        $parts = [];
        foreach (explode(',', $sigHeader) as $part) {
            $sub = explode('=', trim($part), 2);
            if (count($sub) === 2) {
                $parts[$sub[0]] = $sub[1];
            }
        }

        $ts = $parts['ts'] ?? null;
        $v1 = $parts['v1'] ?? null;

        if (!$ts || !$v1) {
            return false;
        }

        $reqId = $requestId ?: ($headers['x-request-id'][0] ?? ($headers['x-request-id'] ?? ''));
        $manifest = "id:" . ($dataId ?: '') . ";request-id:{$reqId};ts:{$ts};";
        $computed = hash_hmac('sha256', $manifest, $webhookSecret);

        return hash_equals($computed, $v1);
    }

    /**
     * Extract human-readable error messages from Mercado Pago API responses.
     */
    protected function extractErrorMessage(\Illuminate\Http\Client\Response $response, string $default): string
    {
        $json = $response->json();
        if (is_array($json)) {
            if (!empty($json['message'])) {
                return $json['message'];
            }
            if (!empty($json['error'])) {
                return is_string($json['error']) ? $json['error'] : json_encode($json['error']);
            }
            if (!empty($json['cause']) && is_array($json['cause'])) {
                $causes = array_map(fn($c) => $c['description'] ?? json_encode($c), $json['cause']);
                return implode('; ', $causes);
            }
        }

        return $default . ' (HTTP ' . $response->status() . ')';
    }
}
