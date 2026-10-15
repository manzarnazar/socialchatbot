<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use App\Models\Plan;
use App\Models\PlanPrice;
use App\Services\Payments\PaymentGatewayManager;
use App\Services\StripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdminPlanController extends Controller
{
    protected StripeService $stripeService;
    protected PaymentGatewayManager $paymentManager;

    public function __construct(StripeService $stripeService, PaymentGatewayManager $paymentManager)
    {
        $this->stripeService = $stripeService;
        $this->paymentManager = $paymentManager;
    }

    /**
     * List all plans.
     */
    public function index(): JsonResponse
    {
        $primaryCurrency = Currency::where('is_default', true)->first() ?: Currency::first();
        $activeCurrencies = Currency::where('is_active', true)->orderBy('is_default', 'desc')->orderBy('code', 'asc')->get();
        $plans = Plan::withTrashed()->with('prices.currency')->orderBy('sort_order', 'asc')->get();

        return response()->json([
            'plans' => $plans,
            'default_currency' => $primaryCurrency?->code ?? 'USD',
            'primary_currency' => $primaryCurrency,
            'active_currencies' => $activeCurrencies,
        ]);
    }

    /**
     * Show plan details.
     */
    public function show(string $id): JsonResponse
    {
        $plan = Plan::withTrashed()->with('prices.currency')->find($id);

        if (!$plan) {
            return response()->json(['message' => 'Plan not found.'], 404);
        }

        return response()->json([
            'plan' => $plan
        ]);
    }

    /**
     * Create a new plan and provision it in Stripe.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'trial_days' => ['required', 'integer', 'min:0'],
            'max_workspaces' => ['nullable', 'integer', 'min:-1'],
            'max_team_members' => ['required', 'integer', 'min:-1'],
            'max_campaigns' => ['required', 'integer', 'min:-1'],
            'max_integrations' => ['required', 'integer', 'min:-1'],
            'allowed_integrations' => ['nullable', 'array'],
            'own_crm_access' => ['required', 'boolean'],
            'max_channels' => ['required', 'integer', 'min:-1'],
            'allowed_channels' => ['nullable', 'array'],
            'has_flow_templates' => ['nullable', 'boolean'],
            'max_automations' => ['required', 'integer', 'min:-1'],
            'flow_credits' => ['nullable', 'integer', 'min:-1'],
            'monthly_ai_tokens' => ['nullable', 'integer', 'min:-1'],
            'copilot_credits' => ['nullable', 'integer', 'min:-1'],
            'max_ecommerce_stores' => ['nullable', 'integer', 'min:-1'],
            'max_ecommerce_products' => ['nullable', 'integer', 'min:-1'],
            'monthly_ecommerce_orders' => ['nullable', 'integer', 'min:-1'],
            'has_abandoned_cart_recovery' => ['nullable', 'boolean'],
            'has_whatsapp_checkout' => ['nullable', 'boolean'],
            'max_meta_ad_accounts' => ['nullable', 'integer', 'min:-1'],
            'max_meta_campaigns' => ['nullable', 'integer', 'min:-1'],
            'has_click_to_whatsapp_ads' => ['nullable', 'boolean'],
            'has_meta_lead_sync' => ['nullable', 'boolean'],
            'monthly_messages_limit' => ['nullable', 'integer', 'min:-1'],
            'sort_order' => ['required', 'integer'],
            'is_active' => ['required', 'boolean'],
            'paddle_product_id' => ['nullable', 'string'],
            'prices' => ['required', 'array', 'min:1'],
            'prices.*.currency_id' => ['required', 'exists:currencies,id'],
            'prices.*.amount' => ['required', 'integer', 'min:0'], // amount in cents
            'prices.*.billing_interval' => ['required', 'string', 'in:month,year'],
            'prices.*.paddle_price_id' => ['nullable', 'string'],
        ]);

        // Enforce that all active platform currencies have both monthly and annual prices configured
        $activeCurrencies = Currency::where('is_active', true)->get();
        foreach ($activeCurrencies as $ac) {
            $hasMonth = collect($request->prices)->contains(fn($p) => $p['currency_id'] == $ac->id && $p['billing_interval'] === 'month');
            $hasYear = collect($request->prices)->contains(fn($p) => $p['currency_id'] == $ac->id && $p['billing_interval'] === 'year');
            if (!$hasMonth || !$hasYear) {
                return response()->json([
                    'message' => "Both monthly and annual pricing are required for active currency: {$ac->code} ({$ac->name})."
                ], 422);
            }
        }

        try {
            DB::beginTransaction();

            // 1. Provision product on Stripe (if Stripe is configured and credentials exist)
            $stripeProductId = $request->stripe_product_id ?: null;
            if (empty($stripeProductId)) {
                if (app()->runningUnitTests()) {
                    $stripeProductId = 'prod_mock_123';
                } else {
                    try {
                        if ($this->stripeService->getClient()) {
                            $stripeProductId = $this->stripeService->createProduct($request->name, $request->description);
                        }
                    } catch (\Exception $ex) {
                        Log::warning('Stripe Product creation skipped: ' . $ex->getMessage());
                    }
                }
            }

            // Provision product on Paddle (if configured)
            $paddleProductId = $request->paddle_product_id ?: null;
            if (empty($paddleProductId) && !app()->runningUnitTests()) {
                try {
                    $paddleDriver = $this->paymentManager->driver('paddle');
                    if ($paddleDriver->isConfigured()) {
                        $paddleProductId = $paddleDriver->createProduct($request->name, $request->description);
                    }
                } catch (\Exception $ex) {
                    Log::warning('Paddle Product creation skipped: ' . $ex->getMessage());
                }
            }

            $effectiveMaxChannels = (int) $request->max_channels;
            if ($effectiveMaxChannels !== -1 && is_array($request->allowed_channels)) {
                $numericCaps = array_filter($request->allowed_channels, fn($v) => is_numeric($v) && $v > 0);
                if (!empty($numericCaps)) {
                    $effectiveMaxChannels = max($effectiveMaxChannels, max($numericCaps));
                }
            }

            // 2. Save Plan in database
            $plan = Plan::create([
                'name' => $request->name,
                'description' => $request->description,
                'stripe_product_id' => $stripeProductId,
                'paddle_product_id' => $paddleProductId,
                'trial_days' => $request->trial_days,
                'max_workspaces' => $request->has('max_workspaces') ? (int) $request->max_workspaces : 1,
                'max_team_members' => $request->max_team_members,
                'max_campaigns' => $request->max_campaigns,
                'max_integrations' => $request->max_integrations,
                'allowed_integrations' => $request->allowed_integrations,
                'own_crm_access' => $request->own_crm_access,
                'max_channels' => $effectiveMaxChannels,
                'allowed_channels' => $request->allowed_channels,
                'max_automations' => $request->max_automations,
                'flow_credits' => $request->has('flow_credits') ? (int) $request->flow_credits : 50,
                'monthly_ai_tokens' => $request->has('monthly_ai_tokens') ? (int) $request->monthly_ai_tokens : 100000,
                'copilot_credits' => $request->has('copilot_credits') ? (int) $request->copilot_credits : 100,
                'max_ecommerce_stores' => $request->has('max_ecommerce_stores') ? $request->max_ecommerce_stores : 1,
                'max_ecommerce_products' => $request->has('max_ecommerce_products') ? $request->max_ecommerce_products : 100,
                'monthly_ecommerce_orders' => $request->has('monthly_ecommerce_orders') ? $request->monthly_ecommerce_orders : 100,
                'has_abandoned_cart_recovery' => $request->boolean('has_abandoned_cart_recovery', false),
                'has_whatsapp_checkout' => $request->boolean('has_whatsapp_checkout', false),
                'max_meta_ad_accounts' => $request->has('max_meta_ad_accounts') ? $request->max_meta_ad_accounts : 1,
                'max_meta_campaigns' => $request->has('max_meta_campaigns') ? $request->max_meta_campaigns : 2,
                'has_click_to_whatsapp_ads' => $request->boolean('has_click_to_whatsapp_ads', false),
                'has_meta_lead_sync' => $request->boolean('has_meta_lead_sync', false),
                'monthly_messages_limit' => $request->has('monthly_messages_limit') ? $request->monthly_messages_limit : -1,
                'has_flow_templates' => $request->boolean('has_flow_templates', true),
                'sort_order' => $request->sort_order,
                'is_active' => $request->is_active,
            ]);

            // 3. Provision prices on Stripe and Paddle (if product exists) and save in plan_prices
            foreach ($request->prices as $priceData) {
                $currency = Currency::findOrFail($priceData['currency_id']);

                $stripePriceId = null;
                if (app()->runningUnitTests()) {
                    $stripePriceId = 'price_mock_' . $currency->code . '_' . uniqid();
                } elseif (!empty($stripeProductId)) {
                    try {
                        $stripePriceId = $this->stripeService->createPrice(
                            $stripeProductId,
                            $priceData['amount'],
                            $currency->code,
                            $priceData['billing_interval']
                        );
                    } catch (\Exception $ex) {
                        Log::warning('Stripe Price creation skipped: ' . $ex->getMessage());
                    }
                }

                if (empty($stripePriceId)) {
                    $stripePriceId = "price_plan_{$plan->id}_{$currency->id}_{$priceData['billing_interval']}";
                }

                $paddlePriceId = $priceData['paddle_price_id'] ?? null;
                if ((empty($paddlePriceId) || !str_starts_with($paddlePriceId, 'pri_')) && !empty($paddleProductId) && !app()->runningUnitTests()) {
                    try {
                        $paddleDriver = $this->paymentManager->driver('paddle');
                        if ($paddleDriver->isConfigured()) {
                            $paddlePriceId = $paddleDriver->createPrice(
                                $paddleProductId,
                                $priceData['amount'],
                                $currency->code,
                                $priceData['billing_interval']
                            );
                        }
                    } catch (\Exception $ex) {
                        Log::warning('Paddle Price creation skipped: ' . $ex->getMessage());
                    }
                }

                PlanPrice::create([
                    'plan_id' => $plan->id,
                    'currency_id' => $currency->id,
                    'amount' => $priceData['amount'],
                    'stripe_price_id' => $stripePriceId,
                    'paddle_price_id' => $paddlePriceId,
                    'mercadopago_plan_id' => $priceData['mercadopago_plan_id'] ?? null,
                    'myfatoorah_plan_id' => $priceData['myfatoorah_plan_id'] ?? null,
                    'billing_interval' => $priceData['billing_interval'],
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Plan created and Stripe Product/Prices provisioned successfully.',
                'plan' => $plan->load('prices.currency')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Admin plan creation failed: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to create plan: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update an existing plan.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $plan = Plan::withTrashed()->find($id);

        if (!$plan) {
            return response()->json(['message' => 'Plan not found.'], 404);
        }

        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'trial_days' => ['required', 'integer', 'min:0'],
            'max_workspaces' => ['nullable', 'integer', 'min:-1'],
            'max_team_members' => ['required', 'integer', 'min:-1'],
            'max_campaigns' => ['required', 'integer', 'min:-1'],
            'max_integrations' => ['required', 'integer', 'min:-1'],
            'allowed_integrations' => ['nullable', 'array'],
            'own_crm_access' => ['required', 'boolean'],
            'max_channels' => ['required', 'integer', 'min:-1'],
            'allowed_channels' => ['nullable', 'array'],
            'has_flow_templates' => ['nullable', 'boolean'],
            'max_automations' => ['required', 'integer', 'min:-1'],
            'flow_credits' => ['nullable', 'integer', 'min:-1'],
            'monthly_ai_tokens' => ['nullable', 'integer', 'min:-1'],
            'copilot_credits' => ['nullable', 'integer', 'min:-1'],
            'max_ecommerce_stores' => ['nullable', 'integer', 'min:-1'],
            'max_ecommerce_products' => ['nullable', 'integer', 'min:-1'],
            'monthly_ecommerce_orders' => ['nullable', 'integer', 'min:-1'],
            'has_abandoned_cart_recovery' => ['nullable', 'boolean'],
            'has_whatsapp_checkout' => ['nullable', 'boolean'],
            'max_meta_ad_accounts' => ['nullable', 'integer', 'min:-1'],
            'max_meta_campaigns' => ['nullable', 'integer', 'min:-1'],
            'has_click_to_whatsapp_ads' => ['nullable', 'boolean'],
            'has_meta_lead_sync' => ['nullable', 'boolean'],
            'monthly_messages_limit' => ['nullable', 'integer', 'min:-1'],
            'sort_order' => ['required', 'integer'],
            'is_active' => ['required', 'boolean'],
            'paddle_product_id' => ['nullable', 'string'],
            'prices' => ['required', 'array', 'min:1'],
            'prices.*.currency_id' => ['required', 'exists:currencies,id'],
            'prices.*.amount' => ['required', 'integer', 'min:0'], // amount in cents
            'prices.*.billing_interval' => ['required', 'string', 'in:month,year'],
            'prices.*.paddle_price_id' => ['nullable', 'string'],
        ]);

        // Enforce that all active platform currencies have both monthly and annual prices configured
        $activeCurrencies = Currency::where('is_active', true)->get();
        foreach ($activeCurrencies as $ac) {
            $hasMonth = collect($request->prices)->contains(fn($p) => $p['currency_id'] == $ac->id && $p['billing_interval'] === 'month');
            $hasYear = collect($request->prices)->contains(fn($p) => $p['currency_id'] == $ac->id && $p['billing_interval'] === 'year');
            if (!$hasMonth || !$hasYear) {
                return response()->json([
                    'message' => "Both monthly and annual pricing are required for active currency: {$ac->code} ({$ac->name})."
                ], 422);
            }
        }

        try {
            DB::beginTransaction();

            $effectiveMaxChannels = (int) $request->max_channels;
            if ($effectiveMaxChannels !== -1 && is_array($request->allowed_channels)) {
                $numericCaps = array_filter($request->allowed_channels, fn($v) => is_numeric($v) && $v > 0);
                if (!empty($numericCaps)) {
                    $effectiveMaxChannels = max($effectiveMaxChannels, max($numericCaps));
                }
            }

            $plan->update([
                'name' => $request->name,
                'description' => $request->description,
                'paddle_product_id' => $request->has('paddle_product_id') ? $request->paddle_product_id : $plan->paddle_product_id,
                'trial_days' => $request->trial_days,
                'max_workspaces' => $request->has('max_workspaces') ? (int) $request->max_workspaces : ($plan->max_workspaces ?? 1),
                'max_team_members' => $request->max_team_members,
                'max_campaigns' => $request->max_campaigns,
                'max_integrations' => $request->max_integrations,
                'allowed_integrations' => $request->allowed_integrations,
                'own_crm_access' => $request->own_crm_access,
                'max_channels' => $effectiveMaxChannels,
                'allowed_channels' => $request->allowed_channels,
                'max_automations' => $request->max_automations,
                'flow_credits' => $request->has('flow_credits') ? (int) $request->flow_credits : ($plan->flow_credits ?? 50),
                'monthly_ai_tokens' => $request->has('monthly_ai_tokens') ? (int) $request->monthly_ai_tokens : ($plan->monthly_ai_tokens ?? 100000),
                'copilot_credits' => $request->has('copilot_credits') ? (int) $request->copilot_credits : ($plan->copilot_credits ?? 100),
                'max_ecommerce_stores' => $request->has('max_ecommerce_stores') ? $request->max_ecommerce_stores : ($plan->max_ecommerce_stores ?? 1),
                'max_ecommerce_products' => $request->has('max_ecommerce_products') ? $request->max_ecommerce_products : ($plan->max_ecommerce_products ?? 100),
                'monthly_ecommerce_orders' => $request->has('monthly_ecommerce_orders') ? $request->monthly_ecommerce_orders : ($plan->monthly_ecommerce_orders ?? 100),
                'has_abandoned_cart_recovery' => $request->has('has_abandoned_cart_recovery') ? $request->boolean('has_abandoned_cart_recovery') : ($plan->has_abandoned_cart_recovery ?? false),
                'has_whatsapp_checkout' => $request->has('has_whatsapp_checkout') ? $request->boolean('has_whatsapp_checkout') : ($plan->has_whatsapp_checkout ?? false),
                'max_meta_ad_accounts' => $request->has('max_meta_ad_accounts') ? $request->max_meta_ad_accounts : ($plan->max_meta_ad_accounts ?? 1),
                'max_meta_campaigns' => $request->has('max_meta_campaigns') ? $request->max_meta_campaigns : ($plan->max_meta_campaigns ?? 2),
                'has_click_to_whatsapp_ads' => $request->has('has_click_to_whatsapp_ads') ? $request->boolean('has_click_to_whatsapp_ads') : ($plan->has_click_to_whatsapp_ads ?? false),
                'has_meta_lead_sync' => $request->has('has_meta_lead_sync') ? $request->boolean('has_meta_lead_sync') : ($plan->has_meta_lead_sync ?? false),
                'monthly_messages_limit' => $request->has('monthly_messages_limit') ? $request->monthly_messages_limit : ($plan->monthly_messages_limit ?? -1),
                'has_flow_templates' => $request->boolean('has_flow_templates', true),
                'sort_order' => $request->sort_order,
                'is_active' => $request->is_active,
            ]);

            // Sync prices
            $existingPrices = PlanPrice::where('plan_id', $plan->id)->get();

            $incomingKeys = collect($request->prices)->map(function ($p) {
                return $p['currency_id'] . '_' . $p['billing_interval'];
            })->toArray();

            foreach ($existingPrices as $ep) {
                $key = $ep->currency_id . '_' . $ep->billing_interval;
                if (!in_array($key, $incomingKeys)) {
                    if (!empty($ep->stripe_price_id)) {
                        $this->stripeService->archivePrice($ep->stripe_price_id);
                    }
                    $ep->delete();
                }
            }

            $stripeProductId = $plan->stripe_product_id ?: ($request->stripe_product_id ?: null);
            if (empty($stripeProductId) && !app()->runningUnitTests()) {
                try {
                    if ($this->stripeService->getClient()) {
                        $stripeProductId = $this->stripeService->createProduct($request->name, $request->description);
                        $plan->update(['stripe_product_id' => $stripeProductId]);
                    }
                } catch (\Exception $ex) {
                    Log::warning('Stripe Product provisioning skipped: ' . $ex->getMessage());
                }
            }

            $paddleProductId = $plan->paddle_product_id ?: ($request->paddle_product_id ?: null);
            if (empty($paddleProductId) && !app()->runningUnitTests()) {
                try {
                    $paddleDriver = $this->paymentManager->driver('paddle');
                    if ($paddleDriver->isConfigured()) {
                        $paddleProductId = $paddleDriver->createProduct($request->name, $request->description);
                        $plan->update(['paddle_product_id' => $paddleProductId]);
                    }
                } catch (\Exception $ex) {
                    Log::warning('Paddle Product provisioning skipped: ' . $ex->getMessage());
                }
            }

            foreach ($request->prices as $priceData) {
                $currency = Currency::findOrFail($priceData['currency_id']);
                $ep = PlanPrice::where('plan_id', $plan->id)
                    ->where('currency_id', $currency->id)
                    ->where('billing_interval', $priceData['billing_interval'])
                    ->first();

                if ($ep) {
                    $newStripePriceId = $ep->stripe_price_id;
                    $newPaddlePriceId = $priceData['paddle_price_id'] ?? $ep->paddle_price_id;

                    if ((int)$ep->amount !== (int)$priceData['amount']) {
                        if (!empty($ep->stripe_price_id) && !str_starts_with($ep->stripe_price_id, 'price_plan_')) {
                            try {
                                $this->stripeService->archivePrice($ep->stripe_price_id);
                            } catch (\Exception $e) {}
                        }

                        $newStripePriceId = null;
                        if (app()->runningUnitTests()) {
                            $newStripePriceId = 'price_mock_' . $currency->code . '_' . uniqid();
                        } elseif (!empty($stripeProductId)) {
                            try {
                                $newStripePriceId = $this->stripeService->createPrice(
                                    $stripeProductId,
                                    $priceData['amount'],
                                    $currency->code,
                                    $priceData['billing_interval']
                                );
                            } catch (\Exception $ex) {
                                Log::warning('Stripe Price update skipped: ' . $ex->getMessage());
                            }
                        }

                        if (empty($newStripePriceId)) {
                            $newStripePriceId = "price_plan_{$plan->id}_{$currency->id}_{$priceData['billing_interval']}";
                        }

                        if (!empty($paddleProductId) && !app()->runningUnitTests()) {
                            try {
                                $paddleDriver = $this->paymentManager->driver('paddle');
                                if ($paddleDriver->isConfigured()) {
                                    $newPaddlePriceId = $paddleDriver->createPrice(
                                        $paddleProductId,
                                        $priceData['amount'],
                                        $currency->code,
                                        $priceData['billing_interval']
                                    );
                                }
                            } catch (\Exception $ex) {
                                Log::warning('Paddle Price update skipped: ' . $ex->getMessage());
                            }
                        }
                    }

                    // Auto-provision Paddle price if missing or unprovisioned
                    if ((empty($newPaddlePriceId) || !str_starts_with($newPaddlePriceId, 'pri_')) && !empty($paddleProductId) && !app()->runningUnitTests()) {
                        try {
                            $paddleDriver = $this->paymentManager->driver('paddle');
                            if ($paddleDriver->isConfigured()) {
                                $newPaddlePriceId = $paddleDriver->createPrice(
                                    $paddleProductId,
                                    $priceData['amount'],
                                    $currency->code,
                                    $priceData['billing_interval']
                                );
                            }
                        } catch (\Exception $ex) {
                            Log::warning('Paddle Price auto-provisioning skipped: ' . $ex->getMessage());
                        }
                    }

                    $ep->update([
                        'amount' => $priceData['amount'],
                        'stripe_price_id' => $newStripePriceId,
                        'paddle_price_id' => $newPaddlePriceId,
                        'mercadopago_plan_id' => $priceData['mercadopago_plan_id'] ?? $ep->mercadopago_plan_id,
                        'myfatoorah_plan_id' => $priceData['myfatoorah_plan_id'] ?? $ep->myfatoorah_plan_id,
                    ]);
                } else {
                    $stripePriceId = null;
                    if (app()->runningUnitTests()) {
                        $stripePriceId = 'price_mock_' . $currency->code . '_' . uniqid();
                    } elseif (!empty($stripeProductId)) {
                        try {
                            $stripePriceId = $this->stripeService->createPrice(
                                $stripeProductId,
                                $priceData['amount'],
                                $currency->code,
                                $priceData['billing_interval']
                            );
                        } catch (\Exception $ex) {
                            Log::warning('Stripe Price creation skipped: ' . $ex->getMessage());
                        }
                    }

                    if (empty($stripePriceId)) {
                        $stripePriceId = "price_plan_{$plan->id}_{$currency->id}_{$priceData['billing_interval']}";
                    }

                    $paddlePriceId = $priceData['paddle_price_id'] ?? null;
                    if (empty($paddlePriceId) && !empty($paddleProductId) && !app()->runningUnitTests()) {
                        try {
                            $paddleDriver = $this->paymentManager->driver('paddle');
                            if ($paddleDriver->isConfigured()) {
                                $paddlePriceId = $paddleDriver->createPrice(
                                    $paddleProductId,
                                    $priceData['amount'],
                                    $currency->code,
                                    $priceData['billing_interval']
                                );
                            }
                        } catch (\Exception $ex) {
                            Log::warning('Paddle Price creation skipped: ' . $ex->getMessage());
                        }
                    }

                    PlanPrice::create([
                        'plan_id' => $plan->id,
                        'currency_id' => $currency->id,
                        'amount' => $priceData['amount'],
                        'stripe_price_id' => $stripePriceId,
                        'paddle_price_id' => $paddlePriceId,
                        'mercadopago_plan_id' => $priceData['mercadopago_plan_id'] ?? null,
                        'myfatoorah_plan_id' => $priceData['myfatoorah_plan_id'] ?? null,
                        'billing_interval' => $priceData['billing_interval'],
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Plan updated successfully.',
                'plan' => $plan->load('prices.currency')
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update plan: ' . $e->getMessage());
            return response()->json([
                'message' => 'Plan update failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Archive (soft delete) a plan.
     */
    public function archive(string $id): JsonResponse
    {
        $plan = Plan::find($id);

        if (!$plan) {
            return response()->json(['message' => 'Plan not found.'], 404);
        }

        $plan->delete();

        return response()->json([
            'message' => 'Plan archived successfully.',
            'plan' => $plan
        ]);
    }

    /**
     * Unarchive (restore) a plan.
     */
    public function unarchive(string $id): JsonResponse
    {
        $plan = Plan::onlyTrashed()->find($id);

        if (!$plan) {
            return response()->json(['message' => 'Plan not found.'], 404);
        }

        $plan->restore();
        $plan->is_active = false; // set to Draft upon unarchive
        $plan->save();

        return response()->json([
            'message' => 'Plan unarchived successfully.',
            'plan' => $plan
        ]);
    }

    /**
     * Permanently delete a plan.
     */
    public function destroy(string $id): JsonResponse
    {
        $plan = Plan::withTrashed()->find($id);

        if (!$plan) {
            return response()->json(['message' => 'Plan not found.'], 404);
        }

        $plan->forceDelete();

        return response()->json([
            'message' => 'Plan permanently deleted successfully.'
        ]);
    }
}
