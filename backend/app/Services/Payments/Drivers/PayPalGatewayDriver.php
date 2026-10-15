<?php

namespace App\Services\Payments\Drivers;

use App\Contracts\PaymentGatewayInterface;
use App\Models\Tenant;
use App\Models\PlanPrice;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class PayPalGatewayDriver implements PaymentGatewayInterface
{
    protected array $config = [];

    public function __construct(array $config = [])
    {
        $this->config = $config;
    }

    public function getSlug(): string
    {
        return 'paypal';
    }

    public function getName(): string
    {
        return 'PayPal';
    }

    public function isConfigured(): bool
    {
        return !empty($this->getClientId()) && !empty($this->getClientSecret());
    }

    public function isTestMode(): bool
    {
        $mode = $this->config['mode'] ?? null;
        if ($mode) {
            return $mode === 'test' || $mode === 'sandbox';
        }
        $clientId = $this->getClientId();
        return str_contains(strtolower($clientId), 'sandbox') || str_starts_with($clientId, 'sb-');
    }

    public function getClientId(): string
    {
        return $this->config['client_id'] ?? ($this->config['publishable_key'] ?? ($this->config['public_key'] ?? ''));
    }

    public function getClientSecret(): string
    {
        return $this->config['client_secret'] ?? ($this->config['secret_key'] ?? '');
    }

    public function getWebhookId(): string
    {
        return $this->config['webhook_id'] ?? ($this->config['webhook_secret'] ?? '');
    }

    public function getBaseUrl(): string
    {
        return $this->isTestMode()
            ? 'https://api-m.sandbox.paypal.com'
            : 'https://api-m.paypal.com';
    }

    public function getPublicCredentials(): array
    {
        return [
            'client_id' => $this->getClientId(),
            'mode' => $this->isTestMode() ? 'test' : 'live',
        ];
    }

    /**
     * Get or fetch an OAuth 2.0 access token from PayPal.
     */
    public function getAccessToken(?string $customClientId = null, ?string $customClientSecret = null): string
    {
        $clientId = $customClientId ?: $this->getClientId();
        $clientSecret = $customClientSecret ?: $this->getClientSecret();

        if (empty($clientId) || empty($clientSecret)) {
            throw new Exception('PayPal credentials are missing or not configured.');
        }

        $cacheKey = 'paypal_oauth_token_' . md5($clientId . '_' . ($this->isTestMode() ? 'test' : 'live'));
        
        if (empty($customClientId) && Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        $response = Http::asForm()
            ->withBasicAuth($clientId, $clientSecret)
            ->post($this->getBaseUrl() . '/v1/oauth2/token', [
                'grant_type' => 'client_credentials',
            ]);

        if (!$response->successful()) {
            $error = $response->json('error_description') ?? ($response->json('error') ?? $response->body());
            Log::error('PayPal OAuth token error: ' . $error);
            throw new Exception('PayPal Authentication Failed: ' . $error);
        }

        $tokenData = $response->json();
        $accessToken = $tokenData['access_token'] ?? null;
        $expiresIn = (int) ($tokenData['expires_in'] ?? 3600);

        if (!$accessToken) {
            throw new Exception('PayPal did not return an access token.');
        }

        if (empty($customClientId)) {
            Cache::put($cacheKey, $accessToken, max(60, $expiresIn - 120));
        }

        return $accessToken;
    }

    /**
     * Authenticated HTTP client helper.
     */
    protected function http(): \Illuminate\Http\Client\PendingRequest
    {
        $token = $this->getAccessToken();
        return Http::withToken($token)
            ->baseUrl($this->getBaseUrl())
            ->acceptJson();
    }

    /**
     * Currencies officially supported by PayPal Subscriptions REST API.
     * Note: INR is not supported for PayPal Subscriptions or domestic Indian processing.
     */
    public const SUPPORTED_SUBSCRIPTION_CURRENCIES = [
        'AUD', 'BRL', 'CAD', 'CNY', 'CZK', 'DKK', 'EUR', 'HKD',
        'HUF', 'ILS', 'JPY', 'MYR', 'MXN', 'TWD', 'NZD', 'NOK',
        'PHP', 'PLN', 'GBP', 'RUB', 'SGD', 'SEK', 'CHF', 'THB', 'USD'
    ];

    /**
     * Currencies that do not use decimal fractions in PayPal.
     */
    public const ZERO_DECIMAL_CURRENCIES = ['HUF', 'JPY', 'TWD'];

    /**
     * Extract comprehensive, human-readable error messages from PayPal API responses.
     */
    public function extractErrorMessage(\Illuminate\Http\Client\Response $response, string $fallback = 'PayPal API error'): string
    {
        $body = $response->json();
        if (is_array($body)) {
            $details = $body['details'] ?? [];
            if (is_array($details) && count($details) > 0) {
                $issues = [];
                foreach ($details as $detail) {
                    $desc = $detail['description'] ?? $detail['issue'] ?? '';
                    $field = $detail['field'] ?? '';
                    if ($field && $desc) {
                        $issues[] = "{$field}: {$desc}";
                    } elseif ($desc) {
                        $issues[] = $desc;
                    } elseif (!empty($detail['issue'])) {
                        $issues[] = $detail['issue'];
                    }
                }
                if (!empty($issues)) {
                    $mainMessage = $body['message'] ?? $fallback;
                    return implode('; ', $issues) . " ({$mainMessage})";
                }
            }
            if (!empty($body['message'])) {
                return $body['message'];
            }
            if (!empty($body['error_description'])) {
                return $body['error_description'];
            }
            if (!empty($body['error'])) {
                return $body['error'];
            }
        }

        return $response->body() ?: $fallback;
    }

    /**
     * Create a Product in the PayPal catalog.
     */
    public function createProduct(string $name, ?string $description = null): string
    {
        try {
            $productName = substr(trim($name), 0, 127) ?: 'WhatsOmni Subscription';
            $productDesc = substr(trim($description ?: 'WhatsOmni Subscription Service'), 0, 127);

            $requestId = (string) Str::uuid();
            $response = $this->http()
                ->withHeaders(['PayPal-Request-Id' => $requestId])
                ->post('/v1/catalogs/products', [
                    'name' => $productName,
                    'description' => $productDesc,
                    'type' => 'SERVICE',
                    'category' => 'SOFTWARE',
                ]);

            if ($response->successful() && !empty($response->json('id'))) {
                return $response->json('id');
            }

            $errMsg = $this->extractErrorMessage($response, 'PayPal Product Error');
            Log::error("PayPal Product creation failed: {$errMsg}", [
                'status' => $response->status(),
                'response' => $response->json() ?? $response->body(),
            ]);
            throw new Exception("PayPal Product Error: {$errMsg}");
        } catch (Exception $e) {
            Log::error('PayPal createProduct Exception: ' . $e->getMessage());
            throw new Exception('PayPal Integration Error: ' . $e->getMessage());
        }
    }

    /**
     * Create a recurring Price/Plan linked to a Product.
     */
    public function createPrice(string $productId, int $amountCents, string $currency, string $interval = 'month'): string
    {
        try {
            $currencyCode = strtoupper(trim($currency));

            // Validate against PayPal Subscriptions supported currencies
            if (!in_array($currencyCode, self::SUPPORTED_SUBSCRIPTION_CURRENCIES)) {
                $supportedList = implode(', ', self::SUPPORTED_SUBSCRIPTION_CURRENCIES);
                throw new Exception("Currency '{$currencyCode}' is not supported for PayPal recurring subscriptions. PayPal only supports: {$supportedList}. For INR, please use Razorpay or Stripe.");
            }

            $intervalUnit = in_array(strtolower($interval), ['year', 'yearly', 'annually']) ? 'YEAR' : 'MONTH';
            $isZeroDecimal = in_array($currencyCode, self::ZERO_DECIMAL_CURRENCIES);
            $amountMajor = $isZeroDecimal ? (string) $amountCents : number_format($amountCents / 100, 2, '.', '');

            $planName = substr('Subscription Plan (' . ucfirst($interval) . ')', 0, 127);
            $planDesc = substr("WhatsOmni {$currencyCode} {$amountMajor}/{$interval} Recurring Plan", 0, 127);

            $requestId = (string) Str::uuid();
            $payload = [
                'product_id' => $productId,
                'name' => $planName,
                'description' => $planDesc,
                'status' => 'ACTIVE',
                'billing_cycles' => [
                    [
                        'frequency' => [
                            'interval_unit' => $intervalUnit,
                            'interval_count' => 1,
                        ],
                        'tenure_type' => 'REGULAR',
                        'sequence' => 1,
                        'total_cycles' => 0, // 0 = continuous until canceled
                        'pricing_scheme' => [
                            'fixed_price' => [
                                'value' => $amountMajor,
                                'currency_code' => $currencyCode,
                            ]
                        ]
                    ]
                ],
                'payment_preferences' => [
                    'auto_bill_outstanding' => true,
                    'setup_fee_failure_action' => 'CONTINUE',
                    'payment_failure_threshold' => 3,
                ]
            ];

            $response = $this->http()
                ->withHeaders(['PayPal-Request-Id' => $requestId])
                ->post('/v1/billing/plans', $payload);

            if ($response->successful() && !empty($response->json('id'))) {
                return $response->json('id');
            }

            $errMsg = $this->extractErrorMessage($response, 'PayPal Plan Error');
            Log::error("PayPal Plan creation failed: {$errMsg}", [
                'status' => $response->status(),
                'response' => $response->json() ?? $response->body(),
                'payload' => $payload,
            ]);
            throw new Exception("PayPal Plan Error: {$errMsg}");
        } catch (Exception $e) {
            Log::error('PayPal createPrice Exception: ' . $e->getMessage());
            throw new Exception('PayPal Integration Error: ' . $e->getMessage());
        }
    }

    /**
     * Archive or deactivate an existing Price.
     */
    public function archivePrice(string $priceId): void
    {
        try {
            if (str_starts_with($priceId, 'P-')) {
                $this->http()->post("/v1/billing/plans/{$priceId}/deactivate");
            }
        } catch (Exception $e) {
            Log::warning("PayPal archivePrice notice for {$priceId}: " . $e->getMessage());
        }
    }

    /**
     * Ensure a PayPal plan exists, auto-provisioning product & billing plan if needed.
     */
    public function ensurePlanExists(string $priceId): string
    {
        // 1. Direct plan id starting with P-
        if (str_starts_with($priceId, 'P-')) {
            try {
                $check = $this->http()->get("/v1/billing/plans/{$priceId}");
                if ($check->successful()) {
                    return $priceId;
                }
            } catch (Exception $e) {
                // Not found on current PayPal account, proceed to auto-provision
            }
        }

        // 2. Query PlanPrice from database
        $planPrice = PlanPrice::where('paypal_plan_id', $priceId)
            ->orWhere('stripe_price_id', $priceId)
            ->first();

        if (!$planPrice && is_numeric($priceId)) {
            $planPrice = PlanPrice::find($priceId);
        }

        if ($planPrice) {
            if (!empty($planPrice->paypal_plan_id) && str_starts_with($planPrice->paypal_plan_id, 'P-')) {
                return $planPrice->paypal_plan_id;
            }

            try {
                $plan = $planPrice->plan;
                $productName = $plan ? $plan->name : 'WhatsOmni Subscription';
                $productId = $this->createProduct($productName, $plan?->description);

                $amountCents = (int) $planPrice->amount;
                $currency = $planPrice->currency ? strtoupper($planPrice->currency->code) : 'USD';
                $interval = in_array(strtolower($planPrice->billing_interval), ['year', 'yearly', 'annually']) ? 'year' : 'month';

                $paypalPlanId = $this->createPrice($productId, $amountCents, $currency, $interval);
                $planPrice->update(['paypal_plan_id' => $paypalPlanId]);

                return $paypalPlanId;
            } catch (Exception $e) {
                Log::error('PayPal auto-provisioning plan failed: ' . $e->getMessage());
                throw new Exception('PayPal Subscription Plan Setup Failed: ' . $e->getMessage());
            }
        }

        return $priceId;
    }

    /**
     * Create a Checkout Session URL for a tenant workspace subscription.
     */
    public function createCheckoutSession(Tenant $tenant, string $priceId, string $successUrl, string $cancelUrl): string
    {
        $actualPlanId = $this->ensurePlanExists($priceId);

        $primaryUser = $tenant->users()->first();
        $email = $primaryUser?->email;
        $nameParts = explode(' ', trim($primaryUser?->name ?: ($tenant->company_name ?: 'Workspace Customer')), 2);
        $givenName = $nameParts[0] ?? 'Valued';
        $surname = $nameParts[1] ?? 'Customer';

        if (empty($email)) {
            throw new Exception('Customer email is required to initiate PayPal recurring subscription.');
        }

        $requestId = (string) Str::uuid();
        $payload = [
            'plan_id' => $actualPlanId,
            'subscriber' => [
                'name' => [
                    'given_name' => $givenName,
                    'surname' => $surname,
                ],
                'email_address' => $email,
            ],
            'application_context' => [
                'brand_name' => 'WhatsOmni',
                'locale' => 'en-US',
                'shipping_preference' => 'NO_SHIPPING',
                'user_action' => 'SUBSCRIBE_NOW',
                'payment_method' => [
                    'payer_selected' => 'PAYPAL',
                    'payee_preferred' => 'IMMEDIATE_PAYMENT_REQUIRED',
                ],
                'return_url' => $successUrl,
                'cancel_url' => $cancelUrl,
            ],
            'custom_id' => (string) $tenant->id,
        ];

        try {
            $response = $this->http()
                ->withHeaders(['PayPal-Request-Id' => $requestId])
                ->post('/v1/billing/subscriptions', $payload);

            if (!$response->successful()) {
                $errMsg = $this->extractErrorMessage($response, 'PayPal Checkout Error');
                Log::error("PayPal Subscription creation failed: {$errMsg}", [
                    'status' => $response->status(),
                    'response' => $response->json() ?? $response->body(),
                ]);
                throw new Exception("PayPal Checkout Error: {$errMsg}");
            }

            $subData = $response->json();
            $links = $subData['links'] ?? [];
            $approveUrl = null;

            foreach ($links as $link) {
                if (($link['rel'] ?? '') === 'approve') {
                    $approveUrl = $link['href'] ?? null;
                    break;
                }
            }

            if (!$approveUrl) {
                throw new Exception('PayPal did not return an approval checkout URL.');
            }

            return $approveUrl;
        } catch (Exception $e) {
            Log::error('PayPal createCheckoutSession Exception: ' . $e->getMessage());
            throw new Exception('PayPal Subscription Initialization Error: ' . $e->getMessage());
        }
    }

    /**
     * Create a Billing Portal Session URL for customer self-service invoice/autopay management.
     */
    public function createPortalSession(Tenant $tenant, string $returnUrl): string
    {
        // PayPal manages recurring billing and pre-approved payments via customer account autopay
        return $this->isTestMode()
            ? 'https://www.sandbox.paypal.com/myaccount/autopay/'
            : 'https://www.paypal.com/myaccount/autopay/';
    }

    /**
     * Modify/Upgrade an active subscription.
     */
    public function changeSubscriptionPlan(Tenant $tenant, string $newPriceId): void
    {
        $subId = $tenant->paypal_subscription_id;
        if (empty($subId)) {
            throw new Exception('No active PayPal subscription found for this tenant.');
        }

        $actualPlanId = $this->ensurePlanExists($newPriceId);

        try {
            $response = $this->http()->post("/v1/billing/subscriptions/{$subId}/revise", [
                'plan_id' => $actualPlanId,
            ]);

            if (!$response->successful()) {
                $errMsg = $this->extractErrorMessage($response, 'PayPal Subscription Revision Error');
                Log::error("PayPal Subscription revision failed for {$subId}: {$errMsg}", [
                    'status' => $response->status(),
                    'response' => $response->json() ?? $response->body(),
                ]);
                throw new Exception("PayPal Plan Upgrade Error: {$errMsg}");
            }
        } catch (Exception $e) {
            Log::error('PayPal changeSubscriptionPlan Exception: ' . $e->getMessage());
            throw new Exception('PayPal Subscription Upgrade Error: ' . $e->getMessage());
        }
    }

    /**
     * Cancel an active subscription.
     */
    public function cancelSubscription(Tenant $tenant): void
    {
        $subId = $tenant->paypal_subscription_id;
        if (empty($subId)) {
            return;
        }

        try {
            $response = $this->http()->post("/v1/billing/subscriptions/{$subId}/cancel", [
                'reason' => 'Canceled by user from WhatsOmni workspace settings.',
            ]);

            if (!$response->successful() && $response->status() !== 404) {
                $errMsg = $response->json('message') ?: $response->body();
                Log::warning("PayPal Subscription cancellation note for {$subId}: {$errMsg}");
            }
        } catch (Exception $e) {
            Log::warning('PayPal cancelSubscription Exception: ' . $e->getMessage());
        }

        $tenant->update([
            'paypal_subscription_id' => null,
            'status' => 'suspended',
        ]);
    }

    /**
     * Retrieve subscription details by ID.
     */
    public function getSubscription(string $subscriptionId): array
    {
        $response = $this->http()->get("/v1/billing/subscriptions/{$subscriptionId}");
        if (!$response->successful()) {
            throw new Exception('Could not fetch PayPal subscription: ' . ($response->json('message') ?: $response->body()));
        }
        return $response->json() ?: [];
    }

    /**
     * Activate an approved subscription if not already active.
     */
    public function activateSubscription(string $subscriptionId): bool
    {
        try {
            $response = $this->http()->post("/v1/billing/subscriptions/{$subscriptionId}/activate", [
                'reason' => 'Activating subscription upon customer return',
            ]);
            return $response->successful() || $response->status() === 204;
        } catch (Exception $e) {
            Log::warning("PayPal activateSubscription note for {$subscriptionId}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Verify incoming webhook signature with PayPal API.
     */
    public function verifyWebhookSignature(string $rawPayload, array $headers): bool
    {
        $webhookId = $this->getWebhookId();
        if (empty($webhookId)) {
            // If webhook ID is not yet configured, allow in development/testing
            Log::warning('PayPal Webhook ID not set in settings, skipping signature verification.');
            return true;
        }

        $authAlgo = $headers['paypal-auth-algo'][0] ?? ($headers['paypal-auth-algo'] ?? null);
        $certUrl = $headers['paypal-cert-url'][0] ?? ($headers['paypal-cert-url'] ?? null);
        $transmissionId = $headers['paypal-transmission-id'][0] ?? ($headers['paypal-transmission-id'] ?? null);
        $transmissionSig = $headers['paypal-transmission-sig'][0] ?? ($headers['paypal-transmission-sig'] ?? null);
        $transmissionTime = $headers['paypal-transmission-time'][0] ?? ($headers['paypal-transmission-time'] ?? null);

        if (!$authAlgo || !$certUrl || !$transmissionId || !$transmissionSig || !$transmissionTime) {
            Log::warning('PayPal Webhook missing required signature headers.');
            return false;
        }

        try {
            $verifyPayload = [
                'auth_algo' => $authAlgo,
                'cert_url' => $certUrl,
                'transmission_id' => $transmissionId,
                'transmission_sig' => $transmissionSig,
                'transmission_time' => $transmissionTime,
                'webhook_id' => $webhookId,
                'webhook_event' => json_decode($rawPayload, true),
            ];

            $response = $this->http()->post('/v1/notifications/verify-webhook-signature', $verifyPayload);
            if ($response->successful()) {
                $status = $response->json('verification_status');
                return $status === 'SUCCESS';
            }

            Log::error('PayPal Webhook verification failed: ' . ($response->json('message') ?: $response->body()));
            return false;
        } catch (Exception $e) {
            Log::error('PayPal verifyWebhookSignature Exception: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Test connection and credentials validity with PayPal.
     */
    public function testConnection(?array $overrideCredentials = null): array
    {
        $clientId = $overrideCredentials['client_id'] ?? ($overrideCredentials['publishable_key'] ?? ($overrideCredentials['public_key'] ?? $this->getClientId()));
        $clientSecret = $overrideCredentials['client_secret'] ?? ($overrideCredentials['secret_key'] ?? $this->getClientSecret());

        if (empty($clientId) || empty($clientSecret)) {
            return [
                'success' => false,
                'message' => 'Client ID and Client Secret are required to test PayPal connection.',
            ];
        }

        try {
            $token = $this->getAccessToken($clientId, $clientSecret);
            if (!empty($token)) {
                return [
                    'success' => true,
                    'message' => 'PayPal connection verified successfully! OAuth access token retrieved from PayPal API.',
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to obtain access token from PayPal.',
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'PayPal connection test failed: ' . $e->getMessage(),
            ];
        }
    }
}
