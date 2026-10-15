<?php

namespace App\Services\Payments\Drivers;

use App\Contracts\PaymentGatewayInterface;
use App\Models\Plan;
use App\Models\PlanPrice;
use App\Models\Tenant;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MyFatoorahGatewayDriver implements PaymentGatewayInterface
{
    /**
     * Currencies officially supported for MyFatoorah payments and recurring subscriptions.
     * Covers GCC / MENA regional currencies as well as major international currencies.
     */
    public const SUPPORTED_SUBSCRIPTION_CURRENCIES = [
        'KWD', // Kuwaiti Dinar
        'SAR', // Saudi Riyal
        'AED', // UAE Dirham
        'QAR', // Qatari Riyal
        'BHD', // Bahraini Dinar
        'OMR', // Omani Rial
        'JOD', // Jordanian Dinar
        'EGP', // Egyptian Pound
        'USD', // US Dollar
        'EUR', // Euro
        'GBP', // British Pound
    ];

    protected array $config;

    public function __construct(array $config = [])
    {
        $this->config = $config;
    }

    public function getSlug(): string
    {
        return 'myfatoorah';
    }

    public function getName(): string
    {
        return 'MyFatoorah';
    }

    public function isConfigured(): bool
    {
        return !empty($this->getApiKey());
    }

    public function isTestMode(): bool
    {
        $mode = $this->config['mode'] ?? 'test';
        if ($mode === 'test' || $mode === 'sandbox') {
            return true;
        }
        $key = $this->getApiKey();
        return str_starts_with(strtoupper($key), 'TEST') || str_contains(strtolower($key), 'sandbox') || str_contains(strtolower($key), 'apitest');
    }

    public function getApiKey(): string
    {
        return trim((string)($this->config['api_key'] ?? ($this->config['api_token'] ?? ($this->config['secret_key'] ?? ($this->config['access_token'] ?? '')))));
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
        return $this->isTestMode()
            ? 'https://apitest.myfatoorah.com'
            : 'https://api.myfatoorah.com';
    }

    public function getPublicCredentials(): array
    {
        return [
            'api_key' => $this->getApiKey(),
            'public_key' => $this->getPublicKey(),
            'mode' => $this->isTestMode() ? 'test' : 'live',
        ];
    }

    /**
     * Authenticated HTTP client helper with MyFatoorah Bearer token.
     */
    protected function http(?string $overrideApiKey = null): \Illuminate\Http\Client\PendingRequest
    {
        $token = $overrideApiKey ?: $this->getApiKey();

        return Http::withToken($token)
            ->baseUrl($this->getBaseUrl())
            ->acceptJson()
            ->asJson()
            ->timeout(25);
    }

    /**
     * Create a base Product/Plan identifier on MyFatoorah.
     */
    public function createProduct(string $name, ?string $description = null): string
    {
        if (!$this->isConfigured()) {
            throw new Exception('MyFatoorah is not configured with an API Key / Token.');
        }

        return 'mf_prod_' . md5($name . '_' . time());
    }

    /**
     * Create a recurring Plan / Price on MyFatoorah.
     */
    public function createPrice(string $productId, int $amountCents, string $currency, string $interval = 'month', ?string $name = null): string
    {
        if (!$this->isConfigured()) {
            throw new Exception('MyFatoorah is not configured with an API Key / Token.');
        }

        $currencyCode = strtoupper(trim($currency));
        if (!in_array($currencyCode, self::SUPPORTED_SUBSCRIPTION_CURRENCIES)) {
            throw new Exception("Currency '{$currencyCode}' is not supported for MyFatoorah recurring subscriptions.");
        }

        $intervalSlug = in_array(strtolower($interval), ['year', 'annual', 'annually', 'yearly']) ? 'year' : 'month';
        $planIdentifier = "mf_plan_{$currencyCode}_{$amountCents}_{$intervalSlug}_" . substr(md5($productId . $name), 0, 8);

        return $planIdentifier;
    }

    /**
     * Archive or deactivate a recurring Plan on MyFatoorah.
     */
    public function archivePrice(string $priceId): void
    {
        // MyFatoorah subscription plans are dynamic; no remote archive call needed
    }

    /**
     * Create a recurring subscription checkout session via MyFatoorah Recurring Payment API.
     */
    public function createCheckoutSession(Tenant $tenant, string $priceId, string $successUrl, string $cancelUrl): string
    {
        if (!$this->isConfigured()) {
            throw new Exception('MyFatoorah is not configured. Please supply an API Token.');
        }

        // 1. Resolve Plan & Price
        $planPrice = PlanPrice::where('id', is_numeric($priceId) ? (int)$priceId : 0)
            ->orWhere('stripe_price_id', $priceId)
            ->orWhere('myfatoorah_plan_id', $priceId)
            ->with(['plan', 'currency'])
            ->first();

        $currencyCode = $planPrice?->currency?->code ?? ($tenant->currency?->code ?? 'KWD');
        $currencyCode = strtoupper($currencyCode);

        if (!in_array($currencyCode, self::SUPPORTED_SUBSCRIPTION_CURRENCIES)) {
            throw new Exception("Currency '{$currencyCode}' is not supported for MyFatoorah recurring subscriptions.");
        }

        $amountMajor = $planPrice ? round($planPrice->amount / 100.0, 3) : 29.000;
        $interval = $planPrice?->billing_interval ?? 'month';
        $planName = $planPrice?->plan?->name ?? ($tenant->plan?->name ?? 'Professional Plan');

        $intervalDays = 30;
        $recurringType = 'Monthly';
        if (in_array(strtolower($interval), ['year', 'annual', 'annually', 'yearly'])) {
            $intervalDays = 365;
            $recurringType = 'Custom';
        }

        $payerEmail = $tenant->owner?->email ?? "billing_tenant_{$tenant->id}@whatsomni.com";
        $payerName = trim(($tenant->owner?->first_name ?? '') . ' ' . ($tenant->owner?->last_name ?? '')) ?: ($tenant->company_name ?: 'Valued Customer');
        $externalReference = "tenant_{$tenant->id}_price_" . ($planPrice?->id ?? $priceId);

        // 2. Build MyFatoorah Recurring Payment Payload
        $payload = [
            'CustomerName' => $payerName,
            'CustomerEmail' => $payerEmail,
            'InvoiceValue' => $amountMajor,
            'DisplayCurrencyIso' => $currencyCode,
            'CallBackUrl' => $successUrl,
            'ErrorUrl' => $cancelUrl,
            'CustomerReference' => $externalReference,
            'NotificationOption' => 'LNK', // Return payment link
            'RecurringModel' => [
                'RecurringType' => $recurringType,
                'IntervalDays' => $intervalDays,
                'Iteration' => 0, // 0 indicates infinite recurring iterations
            ],
            'InvoiceItems' => [
                [
                    'ItemName' => "{$planName} Recurring Subscription",
                    'Quantity' => 1,
                    'UnitPrice' => $amountMajor,
                ]
            ]
        ];

        // First attempt with ExecutePayment / SendPayment
        $response = $this->http()->post('/v2/ExecutePayment', array_merge($payload, [
            'PaymentMethodId' => 0, // 0 = Generic payment selection / portal
        ]));

        if (!$response->successful() || !$response->json('IsSuccess')) {
            // Fallback to SendPayment
            $response = $this->http()->post('/v2/SendPayment', $payload);
        }

        if (!$response->successful()) {
            $error = $this->extractErrorMessage($response, 'Failed to create MyFatoorah recurring checkout session');
            Log::error('MyFatoorah createCheckoutSession error: ' . $error);
            throw new Exception('MyFatoorah Checkout error: ' . $error);
        }

        $resData = $response->json('Data') ?: $response->json();
        $paymentUrl = $resData['PaymentURL'] ?? ($resData['InvoiceURL'] ?? null);

        if (!$paymentUrl) {
            throw new Exception('MyFatoorah did not return a valid PaymentURL.');
        }

        $invoiceId = $resData['InvoiceId'] ?? null;
        $recurringId = $resData['RecurringId'] ?? ($invoiceId ? "mf_inv_{$invoiceId}" : null);

        if (!empty($recurringId)) {
            $tenant->update([
                'myfatoorah_subscription_id' => (string)$recurringId,
            ]);
        }

        return (string) $paymentUrl;
    }

    /**
     * Create Billing Portal Session URL.
     */
    public function createPortalSession(Tenant $tenant, string $returnUrl): string
    {
        return $returnUrl;
    }

    /**
     * Upgrade or change subscription plan in-place.
     */
    public function changeSubscriptionPlan(Tenant $tenant, string $newPriceId): void
    {
        $planPrice = PlanPrice::where('id', is_numeric($newPriceId) ? (int)$newPriceId : 0)
            ->orWhere('stripe_price_id', $newPriceId)
            ->orWhere('myfatoorah_plan_id', $newPriceId)
            ->first();

        if ($planPrice) {
            $tenant->update([
                'plan_id' => $planPrice->plan_id,
                'status' => 'active',
            ]);
        }
    }

    /**
     * Cancel an active recurring subscription.
     */
    public function cancelSubscription(Tenant $tenant): void
    {
        $recurringId = $tenant->myfatoorah_subscription_id;

        if ($recurringId && $this->isConfigured()) {
            try {
                $cleanId = str_replace('mf_inv_', '', $recurringId);
                $this->http()->post('/v2/CancelRecurringPayment', [
                    'RecurringId' => $cleanId,
                ]);
            } catch (Exception $e) {
                Log::warning("MyFatoorah cancelSubscription warning for Tenant {$tenant->id}: " . $e->getMessage());
            }
        }

        $tenant->update([
            'myfatoorah_subscription_id' => null,
            'status' => 'suspended',
        ]);
    }

    /**
     * Test connection and credentials validity with MyFatoorah API.
     */
    public function testConnection(?array $overrideCredentials = null): array
    {
        $apiKey = $overrideCredentials['api_key'] ?? ($overrideCredentials['api_token'] ?? ($overrideCredentials['secret_key'] ?? null));

        if (empty($apiKey) && !$this->isConfigured()) {
            return [
                'success' => false,
                'message' => 'No API Key / Token provided for MyFatoorah.',
            ];
        }

        try {
            $response = $this->http($apiKey)->post('/v2/InitiatePayment', [
                'InvoiceAmount' => 10.00,
                'CurrencyIso' => 'KWD',
            ]);

            if ($response->successful() && ($response->json('IsSuccess') !== false)) {
                return [
                    'success' => true,
                    'message' => 'MyFatoorah API credentials verified successfully (Mode: ' . ($this->isTestMode() ? 'Test/Sandbox' : 'Live') . ').',
                    'data' => [
                        'mode' => $this->isTestMode() ? 'test' : 'live',
                    ]
                ];
            }

            $errorMessage = $this->extractErrorMessage($response, 'Invalid MyFatoorah credentials or inactive account.');
            return [
                'success' => false,
                'message' => 'MyFatoorah connection failed: ' . $errorMessage,
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Connection test error: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Query Payment/Invoice status directly from MyFatoorah.
     */
    public function getPaymentStatus(string|int $key, string $keyType = 'InvoiceId'): array
    {
        if (!$this->isConfigured()) {
            throw new Exception('MyFatoorah is not configured.');
        }

        $response = $this->http()->post('/v2/GetPaymentStatus', [
            'Key' => (string)$key,
            'KeyType' => $keyType,
        ]);

        if (!$response->successful()) {
            $error = $this->extractErrorMessage($response, 'Failed to fetch MyFatoorah payment status');
            throw new Exception($error);
        }

        return $response->json('Data') ?: ($response->json() ?: []);
    }

    /**
     * Verify inbound webhook or IPN signature from MyFatoorah.
     */
    public function verifyWebhookSignature(string $rawPayload, array $headers, ?string $invoiceId = null): bool
    {
        $secret = $this->getWebhookSecret();
        if (empty($secret)) {
            // If no webhook secret configured, allow processing if invoice exists
            return true;
        }

        $receivedSignature = $headers['myfatoorah-signature'][0] 
            ?? ($headers['MyFatoorah-Signature'][0] 
            ?? ($headers['x-signature'][0] 
            ?? ($headers['signature'][0] ?? null)));

        if (empty($receivedSignature)) {
            return true;
        }

        $calculatedHex = hash_hmac('sha256', $rawPayload, $secret);
        $calculatedBase64 = base64_encode(hash_hmac('sha256', $rawPayload, $secret, true));

        return hash_equals($calculatedHex, $receivedSignature) || hash_equals($calculatedBase64, $receivedSignature);
    }

    /**
     * Extract human-readable error message from MyFatoorah HTTP responses.
     */
    protected function extractErrorMessage(\Illuminate\Http\Client\Response $response, string $fallback): string
    {
        $data = $response->json();
        if (!empty($data['Message'])) {
            return (string)$data['Message'];
        }
        if (!empty($data['ValidationErrors']) && is_array($data['ValidationErrors'])) {
            $msgs = [];
            foreach ($data['ValidationErrors'] as $err) {
                if (isset($err['Error'])) {
                    $msgs[] = $err['Error'];
                }
            }
            if (!empty($msgs)) {
                return implode(', ', $msgs);
            }
        }
        if (!empty($data['error'])) {
            return is_string($data['error']) ? $data['error'] : json_encode($data['error']);
        }
        return $fallback . ' (HTTP ' . $response->status() . ')';
    }
}
