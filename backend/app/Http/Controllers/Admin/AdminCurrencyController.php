<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCurrencyController extends Controller
{
    /**
     * List all currencies.
     */
    public function index(): JsonResponse
    {
        $currencies = Currency::orderBy('is_default', 'desc')
            ->orderBy('code', 'asc')
            ->get();

        foreach ($currencies as $currency) {
            $currency->pricing_count = \App\Models\PlanPrice::where('currency_id', $currency->id)->count();
            $currency->tenant_count = \App\Models\Tenant::where('currency_id', $currency->id)->count();
        }

        $gatewayManager = app(\App\Services\Payments\PaymentGatewayManager::class);
        $allGatewaysSummary = $gatewayManager->getAllGatewaysSummary();
        $gatewaysData = $allGatewaysSummary['gateways'] ?? [];

        $supportedGateways = [];
        foreach ($gatewaysData as $slug => $gw) {
            $supportedGateways[] = [
                'slug' => $slug,
                'name' => $gw['name'],
                'logo' => $gw['logo'],
                'is_configured' => (bool)($gw['has_secret'] ?? false),
                'enabled' => (bool)($gw['enabled'] ?? false),
                'supported_currencies' => match ($slug) {
                    'paypal' => \App\Services\Payments\Drivers\PayPalGatewayDriver::SUPPORTED_SUBSCRIPTION_CURRENCIES,
                    'paystack' => ['NGN', 'GHS', 'ZAR', 'KES', 'USD'],
                    'mercadopago' => \App\Services\Payments\Drivers\MercadoPagoGatewayDriver::SUPPORTED_SUBSCRIPTION_CURRENCIES,
                    'myfatoorah' => \App\Services\Payments\Drivers\MyFatoorahGatewayDriver::SUPPORTED_SUBSCRIPTION_CURRENCIES,
                    default => null,
                },
            ];
        }

        return response()->json([
            'currencies' => $currencies,
            'supported_gateways' => $supportedGateways
        ]);
    }

    /**
     * Validate whether a payment gateway supports recurring subscriptions in the given currency.
     */
    protected function validateGatewayCurrency(string $gateway, string $currencyCode): ?string
    {
        $code = strtoupper(trim($currencyCode));
        if ($gateway === 'paypal' && !in_array($code, \App\Services\Payments\Drivers\PayPalGatewayDriver::SUPPORTED_SUBSCRIPTION_CURRENCIES)) {
            $supported = implode(', ', \App\Services\Payments\Drivers\PayPalGatewayDriver::SUPPORTED_SUBSCRIPTION_CURRENCIES);
            return "Currency '{$code}' is not supported by PayPal Subscriptions. Supported currencies: {$supported}. For INR, please select Razorpay or Stripe.";
        }

        if ($gateway === 'paystack' && !in_array($code, ['NGN', 'GHS', 'ZAR', 'KES', 'USD'])) {
            return "Currency '{$code}' is not supported by Paystack. Supported currencies: NGN, GHS, ZAR, KES, USD.";
        }

        if ($gateway === 'mercadopago' && !in_array($code, \App\Services\Payments\Drivers\MercadoPagoGatewayDriver::SUPPORTED_SUBSCRIPTION_CURRENCIES)) {
            $supported = implode(', ', \App\Services\Payments\Drivers\MercadoPagoGatewayDriver::SUPPORTED_SUBSCRIPTION_CURRENCIES);
            return "Currency '{$code}' is not supported by Mercado Pago Subscriptions. Supported currencies: {$supported}.";
        }

        if ($gateway === 'myfatoorah' && !in_array($code, \App\Services\Payments\Drivers\MyFatoorahGatewayDriver::SUPPORTED_SUBSCRIPTION_CURRENCIES)) {
            $supported = implode(', ', \App\Services\Payments\Drivers\MyFatoorahGatewayDriver::SUPPORTED_SUBSCRIPTION_CURRENCIES);
            return "Currency '{$code}' is not supported by MyFatoorah Subscriptions. Supported currencies: {$supported}.";
        }

        return null;
    }

    /**
     * Create a new currency.
     */
    public function store(Request $request): JsonResponse
    {
        if ($request->has('code')) {
            $request->merge(['code' => strtoupper(trim($request->code))]);
        }

        $request->validate([
            'code' => ['required', 'string', 'size:3', 'unique:currencies,code'],
            'symbol' => ['required', 'string', 'max:10'],
            'name' => ['required', 'string', 'max:50'],
            'payment_gateway' => ['required', 'string', 'in:stripe,razorpay,paystack,flutterwave,paypal,paddle,mercadopago,myfatoorah'],
            'is_active' => ['required', 'boolean'],
            'is_default' => ['required', 'boolean'],
        ]);

        $gatewayManager = app(\App\Services\Payments\PaymentGatewayManager::class);
        $allGatewaysSummary = $gatewayManager->getAllGatewaysSummary();
        $targetGw = $allGatewaysSummary['gateways'][$request->payment_gateway] ?? null;

        if (!$targetGw || empty($targetGw['has_secret'])) {
            return response()->json([
                'message' => "The payment gateway '{$request->payment_gateway}' is not configured. Please configure its API credentials in Settings > Payment Gateways first."
            ], 422);
        }

        if ($error = $this->validateGatewayCurrency($request->payment_gateway, $request->code)) {
            return response()->json(['message' => $error], 422);
        }

        if ($request->is_default) {
            // Set all other default flags to false
            Currency::where('is_default', true)->update(['is_default' => false]);
            // If default, must be active
            $request->merge(['is_active' => true]);
            \App\Models\PlatformSetting::updateOrCreate(
                ['key' => 'default_currency'],
                ['value' => $request->code]
            );
        }

        $currency = Currency::create([
            'code' => strtoupper($request->code),
            'symbol' => $request->symbol,
            'name' => $request->name,
            'payment_gateway' => $request->payment_gateway,
            'is_active' => $request->is_active,
            'is_default' => $request->is_default,
        ]);

        return response()->json([
            'message' => 'Currency created successfully.',
            'currency' => $currency
        ], 201);
    }

    /**
     * Update an existing currency status or default rules.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $currency = Currency::find($id);

        if (!$currency) {
            return response()->json(['message' => 'Currency not found.'], 404);
        }

        $request->validate([
            'name' => ['sometimes', 'string', 'max:50'],
            'symbol' => ['sometimes', 'string', 'max:10'],
            'payment_gateway' => ['sometimes', 'string', 'in:stripe,razorpay,paystack,flutterwave,paypal,paddle,mercadopago,myfatoorah'],
            'is_active' => ['sometimes', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
            'plan_prices' => ['sometimes', 'array'],
            'plan_prices.*.plan_id' => ['required_with:plan_prices', 'exists:plans,id'],
            'plan_prices.*.monthly_amount' => ['required_with:plan_prices', 'integer', 'min:0'],
            'plan_prices.*.yearly_amount' => ['required_with:plan_prices', 'integer', 'min:0'],
        ]);

        if ($request->filled('payment_gateway')) {
            $gatewayManager = app(\App\Services\Payments\PaymentGatewayManager::class);
            $allGatewaysSummary = $gatewayManager->getAllGatewaysSummary();
            $targetGw = $allGatewaysSummary['gateways'][$request->payment_gateway] ?? null;

            if (!$targetGw || empty($targetGw['has_secret'])) {
                return response()->json([
                    'message' => "The payment gateway '{$request->payment_gateway}' is not configured. Please configure its API credentials in Settings > Payment Gateways first."
                ], 422);
            }

            if ($error = $this->validateGatewayCurrency($request->payment_gateway, $currency->code)) {
                return response()->json(['message' => $error], 422);
            }
        }

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            if ($request->filled('name')) {
                $currency->name = trim($request->name);
            }
            if ($request->filled('symbol')) {
                $currency->symbol = trim($request->symbol);
            }
            if ($request->filled('payment_gateway')) {
                $currency->payment_gateway = $request->payment_gateway;
            }

            if ($request->has('is_default') && $request->boolean('is_default')) {
                // Set all other default flags to false, but preserve their active status and plan prices
                Currency::where('id', '!=', $currency->id)->where('is_default', true)->update(['is_default' => false]);
                $currency->forceFill([
                    'is_default' => true,
                    'is_active' => true, // Default must always be active
                ]);
                \App\Models\PlatformSetting::updateOrCreate(
                    ['key' => 'default_currency'],
                    ['value' => $currency->code]
                );

                // If specific plan prices are provided for this currency, update or create them
                if ($request->has('plan_prices') && is_array($request->plan_prices)) {
                    $stripeService = app(\App\Services\StripeService::class);
                    foreach ($request->plan_prices as $pp) {
                        $plan = \App\Models\Plan::find($pp['plan_id']);
                        if (!$plan) continue;

                        // Upsert monthly price for this currency without touching other currencies
                        $monthlyStripePriceId = "price_plan_{$plan->id}_{$currency->id}_month";
                        if (!empty($plan->stripe_product_id) && !app()->runningUnitTests()) {
                            try {
                                $monthlyStripePriceId = $stripeService->createPrice(
                                    $plan->stripe_product_id,
                                    $pp['monthly_amount'],
                                    $currency->code,
                                    'month'
                                );
                            } catch (\Exception $e) {}
                        }

                        \App\Models\PlanPrice::updateOrCreate(
                            [
                                'plan_id' => $plan->id,
                                'currency_id' => $currency->id,
                                'billing_interval' => 'month',
                            ],
                            [
                                'amount' => $pp['monthly_amount'],
                                'stripe_price_id' => $monthlyStripePriceId,
                            ]
                        );

                        // Upsert yearly price for this currency without touching other currencies
                        $yearlyStripePriceId = "price_plan_{$plan->id}_{$currency->id}_year";
                        if (!empty($plan->stripe_product_id) && !app()->runningUnitTests()) {
                            try {
                                $yearlyStripePriceId = $stripeService->createPrice(
                                    $plan->stripe_product_id,
                                    $pp['yearly_amount'],
                                    $currency->code,
                                    'year'
                                );
                            } catch (\Exception $e) {}
                        }

                        \App\Models\PlanPrice::updateOrCreate(
                            [
                                'plan_id' => $plan->id,
                                'currency_id' => $currency->id,
                                'billing_interval' => 'year',
                            ],
                            [
                                'amount' => $pp['yearly_amount'],
                                'stripe_price_id' => $yearlyStripePriceId,
                            ]
                        );
                    }
                }
            } elseif ($request->has('is_default') && !$request->boolean('is_default') && $currency->is_default) {
                \Illuminate\Support\Facades\DB::rollBack();
                return response()->json([
                    'message' => 'You must set another currency as default first. There must always be one default currency.'
                ], 400);
            }

            if ($request->has('is_active') && !$currency->is_default) {
                $currency->is_active = $request->boolean('is_active');
            }

            $currency->save();
            \Illuminate\Support\Facades\DB::commit();

            return response()->json([
                'message' => 'Currency updated successfully.',
                'currency' => $currency
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json(['message' => 'Failed to update currency: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Safely delete a currency.
     */
    public function destroy(string $id): JsonResponse
    {
        $currency = Currency::find($id);

        if (!$currency) {
            return response()->json(['message' => 'Currency not found.'], 404);
        }

        if ($currency->is_default) {
            return response()->json([
                'message' => 'Default currency cannot be deleted.'
            ], 400);
        }

        // Check if there are plan prices or tenants using this currency
        $pricingCount = \App\Models\PlanPrice::where('currency_id', $id)->count();
        $tenantCount = \App\Models\Tenant::where('currency_id', $id)->count();

        if ($pricingCount > 0 || $tenantCount > 0) {
            return response()->json([
                'message' => 'This currency is currently linked to plans or active tenant workspaces and cannot be deleted.'
            ], 400);
        }

        $currency->delete();

        return response()->json([
            'message' => 'Currency deleted successfully.'
        ]);
    }
}
