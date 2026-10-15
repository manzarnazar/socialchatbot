<?php

namespace App\Services\Payments;

use App\Contracts\PaymentGatewayInterface;
use App\Models\PlatformSetting;
use App\Services\Payments\Drivers\StripeGatewayDriver;
use App\Services\Payments\Drivers\RazorpayGatewayDriver;
use App\Services\Payments\Drivers\PaystackGatewayDriver;
use App\Services\Payments\Drivers\FlutterwaveGatewayDriver;
use App\Services\Payments\Drivers\PayPalGatewayDriver;
use App\Services\Payments\Drivers\PaddleGatewayDriver;
use App\Services\Payments\Drivers\MercadoPagoGatewayDriver;
use App\Services\Payments\Drivers\MyFatoorahGatewayDriver;
use InvalidArgumentException;

class PaymentGatewayManager
{
    /**
     * Registered driver instances.
     */
    protected array $drivers = [];

    /**
     * Get or create a driver instance for a payment gateway.
     */
    public function driver(?string $name = null): PaymentGatewayInterface
    {
        $name = $name ?: $this->getActiveGateway();

        if (isset($this->drivers[$name])) {
            return $this->drivers[$name];
        }

        return $this->drivers[$name] = $this->resolve($name);
    }

    /**
     * Resolve the requested gateway driver.
     */
    protected function resolve(string $name): PaymentGatewayInterface
    {
        $config = $this->getGatewayConfig($name);

        switch ($name) {
            case 'stripe':
                return new StripeGatewayDriver($config);
            case 'razorpay':
                return new RazorpayGatewayDriver($config);
            case 'paystack':
                return new PaystackGatewayDriver($config);
            case 'flutterwave':
                return new FlutterwaveGatewayDriver($config);
            case 'paypal':
                return new PayPalGatewayDriver($config);
            case 'paddle':
                return new PaddleGatewayDriver($config);
            case 'mercadopago':
                return new MercadoPagoGatewayDriver($config);
            case 'myfatoorah':
                return new MyFatoorahGatewayDriver($config);
            default:
                throw new InvalidArgumentException("Payment gateway driver [{$name}] is not supported yet.");
        }
    }

    /**
     * Get the active primary payment gateway slug.
     */
    public function getActiveGateway(): string
    {
        $config = $this->getRawConfig();
        return $config['active_gateway'] ?? 'stripe';
    }

    /**
     * Get the settings config array for a specific gateway.
     */
    public function getGatewayConfig(string $name): array
    {
        $config = $this->getRawConfig();
        $gateways = $config['gateways'] ?? [];

        if (isset($gateways[$name]) && is_array($gateways[$name])) {
            return $gateways[$name];
        }

        return [
            'enabled' => false,
            'mode' => 'test',
            'publishable_key' => '',
            'public_key' => '',
            'client_id' => '',
            'secret_key' => '',
            'client_secret' => '',
            'webhook_secret' => '',
            'webhook_id' => '',
        ];
    }

    /**
     * Get raw configurations from PlatformSetting.
     * Can return all configs, specific gateway config, or specific gateway setting key.
     */
    public function getRawConfig(?string $gateway = null, ?string $key = null, mixed $default = null): mixed
    {
        $setting = PlatformSetting::where('key', 'payment_gateways_config')->first();
        if ($setting && is_array($setting->value)) {
            $config = $setting->value;
        } else {
            $config = [
                'active_gateway' => 'stripe',
                'gateways' => [
                    'stripe' => [
                        'enabled' => false,
                        'mode' => 'test',
                        'publishable_key' => '',
                        'secret_key' => '',
                        'webhook_secret' => '',
                    ],
                    'razorpay' => [
                        'enabled' => false,
                        'mode' => 'test',
                        'key_id' => '',
                        'key_secret' => '',
                        'webhook_secret' => '',
                    ],
                    'paystack' => [
                        'enabled' => false,
                        'mode' => 'test',
                        'public_key' => '',
                        'secret_key' => '',
                        'webhook_secret' => '',
                    ],
                    'flutterwave' => [
                        'enabled' => false,
                        'mode' => 'test',
                        'public_key' => '',
                        'secret_key' => '',
                        'webhook_secret' => '',
                    ],
                    'paypal' => [
                        'enabled' => false,
                        'mode' => 'test',
                        'client_id' => '',
                        'client_secret' => '',
                        'webhook_id' => '',
                    ],
                    'paddle' => [
                        'enabled' => false,
                        'mode' => 'sandbox',
                        'client_token' => '',
                        'api_key' => '',
                        'webhook_secret' => '',
                        'vendor_id' => '',
                    ],
                    'mercadopago' => [
                        'enabled' => false,
                        'mode' => 'test',
                        'public_key' => '',
                        'access_token' => '',
                        'secret_key' => '',
                        'webhook_secret' => '',
                    ],
                    'myfatoorah' => [
                        'enabled' => false,
                        'mode' => 'test',
                        'api_key' => '',
                        'public_key' => '',
                        'secret_key' => '',
                        'webhook_secret' => '',
                    ],
                ]
            ];
        }

        if ($gateway === null) {
            return $config;
        }

        $gwConfig = $config['gateways'][$gateway] ?? [];
        if ($key === null) {
            return $gwConfig ?: $default;
        }

        return $gwConfig[$key] ?? $default;
    }

    /**
     * Get masked gateway summary for the Super Admin UI.
     */
    public function getAllGatewaysSummary(): array
    {
        $rawConfig = $this->getRawConfig();
        $active = $rawConfig['active_gateway'] ?? 'stripe';

        $supported = [
            'stripe' => [
                'slug' => 'stripe',
                'name' => 'Stripe',
                'description' => 'Global credit/debit card, Apple Pay, Google Pay, and recurring subscription billing.',
                'logo' => '/payments/stripe.png',
                'is_ready' => true,
                'docs_url' => 'https://dashboard.stripe.com/apikeys',
            ],
            'razorpay' => [
                'slug' => 'razorpay',
                'name' => 'Razorpay',
                'description' => 'India & International payments: UPI, NetBanking, Credit/Debit Cards, EMI, Wallets, and Subscriptions.',
                'logo' => '/payments/razorpay.png',
                'is_ready' => true,
                'docs_url' => 'https://dashboard.razorpay.com/app/keys',
            ],
            'paystack' => [
                'slug' => 'paystack',
                'name' => 'Paystack',
                'description' => 'African & Global payments: Cards, Bank Transfer, USSD, Mobile Money, and Recurring Subscriptions.',
                'logo' => '/payments/paystack.png',
                'is_ready' => true,
                'docs_url' => 'https://dashboard.paystack.com/#/settings/developer',
            ],
            'flutterwave' => [
                'slug' => 'flutterwave',
                'name' => 'Flutterwave',
                'description' => 'Pan-African & Global payments: Cards, Mobile Money, Bank Transfers, and Recurring Subscriptions.',
                'logo' => '/payments/flutterwave.png',
                'is_ready' => true,
                'docs_url' => 'https://developer.flutterwave.com/docs',
            ],
            'paypal' => [
                'slug' => 'paypal',
                'name' => 'PayPal',
                'description' => 'Global digital wallet & card payments: recurring subscription billing, debit/credit cards, and PayPal balance.',
                'logo' => '/payments/paypal.svg',
                'is_ready' => true,
                'docs_url' => 'https://developer.paypal.com/dashboard/applications',
            ],
            'paddle' => [
                'slug' => 'paddle',
                'name' => 'Paddle',
                'description' => 'Merchant of Record (MoR) for global SaaS billing, automatic tax compliance, and recurring subscriptions.',
                'logo' => '/payments/paddle.png',
                'is_ready' => true,
                'docs_url' => 'https://developer.paddle.com',
            ],
            'mercadopago' => [
                'slug' => 'mercadopago',
                'name' => 'Mercado Pago',
                'description' => 'Latin American & Global payments: Cards, Pix, Boleto, and Recurring Preapproval Subscriptions.',
                'logo' => '/payments/mercadopago.png',
                'is_ready' => true,
                'docs_url' => 'https://www.mercadopago.com/developers/panel',
            ],
            'myfatoorah' => [
                'slug' => 'myfatoorah',
                'name' => 'MyFatoorah',
                'description' => 'Middle East, GCC & Global payments: KNET, Mada, Benefit, Apple Pay, Cards, and Recurring Subscriptions.',
                'logo' => '/payments/myfatoorah.png',
                'is_ready' => true,
                'docs_url' => 'https://myfatoorah.readme.io/docs',
            ],
        ];

        $gateways = [];
        foreach ($supported as $slug => $meta) {
            $gwConfig = $this->getGatewayConfig($slug);
            $isEnabled = (bool)($gwConfig['enabled'] ?? false);
            $hasSecret = !empty($gwConfig['secret_key'] ?? ($gwConfig['key_secret'] ?? ($gwConfig['client_secret'] ?? ($gwConfig['api_key'] ?? ($gwConfig['access_token'] ?? ($gwConfig['salt_key'] ?? null))))));

            $mode = $gwConfig['mode'] ?? 'test';
            $maskedSecret = '';
            if ($hasSecret) {
                $rawSecret = $gwConfig['secret_key'] ?? ($gwConfig['key_secret'] ?? ($gwConfig['client_secret'] ?? ($gwConfig['api_key'] ?? ($gwConfig['access_token'] ?? ($gwConfig['salt_key'] ?? '')))));
                $maskedSecret = $this->maskSecret($rawSecret);
            }

            $webhookSecretRaw = $gwConfig['webhook_secret'] ?? ($gwConfig['webhook_id'] ?? '');
            $maskedWebhook = '';
            if (!empty($webhookSecretRaw)) {
                $maskedWebhook = $this->maskSecret($webhookSecretRaw);
            }

            $gateways[$slug] = [
                'slug' => $slug,
                'name' => $meta['name'],
                'description' => $meta['description'],
                'logo' => $meta['logo'],
                'is_ready' => $meta['is_ready'],
                'docs_url' => $meta['docs_url'],
                'enabled' => $isEnabled,
                'is_active' => $active === $slug,
                'mode' => $mode,
                'publishable_key' => $gwConfig['publishable_key'] ?? ($gwConfig['public_key'] ?? ($gwConfig['key_id'] ?? ($gwConfig['client_id'] ?? ($gwConfig['app_id'] ?? ($gwConfig['merchant_id'] ?? ''))))),
                'public_key' => $gwConfig['public_key'] ?? ($gwConfig['publishable_key'] ?? ($gwConfig['client_id'] ?? '')),
                'client_id' => $gwConfig['client_id'] ?? ($gwConfig['app_id'] ?? ($gwConfig['publishable_key'] ?? '')),
                'client_token' => $gwConfig['client_token'] ?? ($gwConfig['publishable_key'] ?? ''),
                'merchant_id' => $gwConfig['merchant_id'] ?? ($gwConfig['key_id'] ?? ''),
                'salt_key' => $gwConfig['salt_key'] ?? '',
                'salt_index' => (string)($gwConfig['salt_index'] ?? ($gwConfig['key_index'] ?? '1')),
                'vendor_id' => $gwConfig['vendor_id'] ?? '',
                'has_secret' => $hasSecret,
                'masked_secret' => $maskedSecret,
                'has_webhook_secret' => !empty($webhookSecretRaw),
                'masked_webhook_secret' => $maskedWebhook,
                'webhook_url' => \App\Providers\AppServiceProvider::getBackendUrl() . "/api/webhooks/billing/{$slug}",
                'default_payment_link' => \App\Providers\AppServiceProvider::getFrontendUrl() . '/settings/billing',
            ];
        }

        return [
            'active_gateway' => $active,
            'gateways' => $gateways,
        ];
    }

    /**
     * Save gateways configuration with automatic AES-256 encryption.
     */
    public function saveConfig(array $data): void
    {
        $existing = $this->getRawConfig();

        if (isset($data['active_gateway'])) {
            $existing['active_gateway'] = $data['active_gateway'];
        }

        $gateways = isset($data['gateways']) && is_array($data['gateways'])
            ? $data['gateways']
            : array_filter($data, fn($v, $k) => is_array($v) && $k !== 'active_gateway', ARRAY_FILTER_USE_BOTH);

        if (!empty($gateways)) {
            foreach ($gateways as $slug => $newConfig) {
                $currentGw = $existing['gateways'][$slug] ?? [];
                
                // If a masked secret (e.g. ••••••••) or empty secret is passed, retain previous stored secret
                if (isset($newConfig['secret_key'])) {
                    if (str_contains($newConfig['secret_key'], '••••') || empty($newConfig['secret_key'])) {
                        $newConfig['secret_key'] = $currentGw['secret_key'] ?? ($currentGw['key_secret'] ?? ($currentGw['client_secret'] ?? ($currentGw['api_key'] ?? ($currentGw['access_token'] ?? ''))));
                    }
                }
                if (isset($newConfig['access_token'])) {
                    if (str_contains($newConfig['access_token'], '••••') || empty($newConfig['access_token'])) {
                        $newConfig['access_token'] = $currentGw['access_token'] ?? ($currentGw['secret_key'] ?? '');
                    }
                    $newConfig['secret_key'] = $newConfig['access_token'];
                }
                if (isset($newConfig['api_key'])) {
                    if (str_contains($newConfig['api_key'], '••••') || empty($newConfig['api_key'])) {
                        $newConfig['api_key'] = $currentGw['api_key'] ?? ($currentGw['secret_key'] ?? '');
                    }
                    $newConfig['secret_key'] = $newConfig['api_key'];
                }
                if (isset($newConfig['client_token'])) {
                    if (str_contains($newConfig['client_token'], '••••') || empty($newConfig['client_token'])) {
                        $newConfig['client_token'] = $currentGw['client_token'] ?? ($currentGw['publishable_key'] ?? '');
                    }
                }
                if (isset($newConfig['client_secret'])) {
                    if (str_contains($newConfig['client_secret'], '••••') || empty($newConfig['client_secret'])) {
                        $newConfig['client_secret'] = $currentGw['client_secret'] ?? ($currentGw['secret_key'] ?? '');
                    }
                    $newConfig['secret_key'] = $newConfig['client_secret'];
                }
                if (isset($newConfig['key_secret'])) {
                    if (str_contains($newConfig['key_secret'], '••••') || empty($newConfig['key_secret'])) {
                        $newConfig['key_secret'] = $currentGw['key_secret'] ?? ($currentGw['secret_key'] ?? '');
                    }
                }
                if (isset($newConfig['webhook_secret'])) {
                    if (str_contains($newConfig['webhook_secret'], '••••') || empty($newConfig['webhook_secret'])) {
                        $newConfig['webhook_secret'] = $currentGw['webhook_secret'] ?? ($currentGw['webhook_id'] ?? '');
                    }
                }
                if (isset($newConfig['webhook_id'])) {
                    if (str_contains($newConfig['webhook_id'], '••••') || empty($newConfig['webhook_id'])) {
                        $newConfig['webhook_id'] = $currentGw['webhook_id'] ?? ($currentGw['webhook_secret'] ?? '');
                    }
                    $newConfig['webhook_secret'] = $newConfig['webhook_id'];
                }
                if (isset($newConfig['app_id'])) {
                    $newConfig['client_id'] = $newConfig['app_id'];
                }

                $existing['gateways'][$slug] = array_merge($currentGw, $newConfig);
            }
        }

        PlatformSetting::updateOrCreate(
            ['key' => 'payment_gateways_config'],
            ['value' => $existing]
        );

        // Clear driver cache to re-instantiate with new keys
        $this->drivers = [];
    }

    protected function maskSecret(string $secret): string
    {
        $len = strlen($secret);
        if ($len <= 8) {
            return '••••••••';
        }
        $prefix = substr($secret, 0, min(7, $len - 4));
        $suffix = substr($secret, -4);
        return $prefix . '••••••••' . $suffix;
    }
}
