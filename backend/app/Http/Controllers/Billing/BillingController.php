<?php

namespace App\Http\Controllers\Billing;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use App\Models\Plan;
use App\Models\PlanPrice;
use App\Models\Tenant;
use App\Services\Payments\PaymentGatewayManager;
use App\Services\StripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BillingController extends Controller
{
    protected StripeService $stripeService;
    protected PaymentGatewayManager $paymentManager;
    protected \App\Services\GeoIPService $geoIPService;

    public function __construct(
        StripeService $stripeService,
        PaymentGatewayManager $paymentManager,
        \App\Services\GeoIPService $geoIPService
    ) {
        $this->stripeService = $stripeService;
        $this->paymentManager = $paymentManager;
        $this->geoIPService = $geoIPService;
    }

    /**
     * Get the tenant's current subscription details, status, and caps.
     */
    public function subscription(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        
        if (!$tenant) {
            return response()->json(['message' => 'Workspace context not resolved.'], 404);
        }

        // 1. If Paystack callback parameters are provided, verify with Paystack driver
        $paystackRef = $request->query('paystack_reference') ?? ($request->query('reference') ?? $request->query('trxref'));
        if (!empty($paystackRef)) {
            try {
                $paystackDriver = $this->paymentManager->driver('paystack');
                $verifyRes = $paystackDriver->verifyTransaction($paystackRef);
                if (!empty($verifyRes['status']) && ($verifyRes['data']['status'] ?? '') === 'success') {
                    $txData = $verifyRes['data'];
                    $subCode = $txData['subscription']['subscription_code'] ?? ($txData['subscription_code'] ?? null);
                    $custCode = $txData['customer']['customer_code'] ?? null;
                    $emailToken = $txData['subscription']['email_token'] ?? ($txData['email_token'] ?? null);
                    $metaPlanId = $txData['metadata']['plan_id'] ?? null;
                    $planCode = $txData['plan']['plan_code'] ?? ($txData['plan'] ?? null);

                    if (empty($subCode) && !empty($custCode) && !empty($planCode)) {
                        try {
                            $authCode = $txData['authorization']['authorization_code'] ?? null;
                            $subData = $paystackDriver->createSubscription($custCode, $planCode, $authCode);
                            if ($subData) {
                                $subCode = $subData['subscription_code'] ?? null;
                                $emailToken = $subData['email_token'] ?? null;
                            }
                        } catch (\Exception $e) {
                            Log::warning('Auto-provisioning Paystack subscription error: ' . $e->getMessage());
                        }
                    }

                    $updateData = [
                        'status' => 'active',
                        'onboarding_step' => 'complete',
                    ];
                    if ($subCode) $updateData['paystack_subscription_id'] = $subCode;
                    if ($custCode) $updateData['paystack_customer_id'] = $custCode;
                    if ($emailToken) $updateData['paystack_email_token'] = $emailToken;
                    if (!empty($metaPlanId)) {
                        $updateData['plan_id'] = (int) $metaPlanId;
                    } elseif ($planCode) {
                        $priceObj = PlanPrice::where('paystack_plan_code', $planCode)->first();
                        if ($priceObj) {
                            $updateData['plan_id'] = $priceObj->plan_id;
                        }
                    }
                    $tenant->update($updateData);
                    Log::info("Paystack transaction {$paystackRef} verified and activated for Tenant {$tenant->id}");
                }
            } catch (\Exception $e) {
                Log::warning("Could not verify Paystack reference on subscription fetch: " . $e->getMessage());
            }
        }

        // 2. If Flutterwave callback parameters are provided, verify with Flutterwave driver
        $flwTxId = $request->query('transaction_id') ?? ($request->query('tx_ref') ?? $request->query('flutterwave_reference'));
        $flwStatus = $request->query('status');
        if (!empty($flwTxId) && ($flwStatus === 'successful' || empty($flwStatus))) {
            try {
                $flwDriver = $this->paymentManager->driver('flutterwave');
                $verifyRes = $flwDriver->verifyTransaction($flwTxId);
                if (!empty($verifyRes['status']) && ($verifyRes['status'] === 'success' || ($verifyRes['data']['status'] ?? '') === 'successful')) {
                    $txData = $verifyRes['data'] ?? [];
                    $customerId = isset($txData['customer']['id']) ? (string) $txData['customer']['id'] : null;
                    $planId = $txData['payment_plan'] ?? ($txData['plan'] ?? null);
                    $subId = isset($txData['subscription_id']) ? (string)$txData['subscription_id'] : ($planId ? (string)$planId : null);
                    $metaPlanId = $txData['meta']['plan_id'] ?? null;

                    $updateData = [
                        'status' => 'active',
                        'onboarding_step' => 'complete',
                    ];
                    if ($customerId) $updateData['flutterwave_customer_id'] = $customerId;
                    if ($subId) $updateData['flutterwave_subscription_id'] = $subId;
                    if (!empty($metaPlanId)) {
                        $updateData['plan_id'] = (int) $metaPlanId;
                    } elseif ($planId) {
                        $priceObj = PlanPrice::where('flutterwave_plan_id', (string)$planId)->first();
                        if ($priceObj) {
                            $updateData['plan_id'] = $priceObj->plan_id;
                        }
                    }
                    $tenant->update($updateData);
                    Log::info("Flutterwave transaction {$flwTxId} verified and activated for Tenant {$tenant->id}");
                }
            } catch (\Exception $e) {
                Log::warning("Could not verify Flutterwave transaction on subscription fetch: " . $e->getMessage());
            }
        }

        // 3. If Razorpay callback parameters are provided, verify with Razorpay driver
        $razorpaySubId = $request->query('razorpay_subscription_id') ?? ($request->query('razorpay_payment_id') ? $request->query('razorpay_payment_link_id') : null);
        $rawSessionId = $request->query('session_id');

        if (!empty($razorpaySubId) || (!empty($rawSessionId) && (str_starts_with($rawSessionId, 'sub_') || str_starts_with($rawSessionId, 'plink_'))) || $request->has('razorpay_payment_id')) {
            $lookupId = $razorpaySubId ?: $rawSessionId;
            try {
                $razorpayDriver = $this->paymentManager->driver('razorpay');
                $rzpClient = $razorpayDriver->getClient();
                if ($rzpClient) {
                    $subEntity = null;
                    if (!empty($lookupId) && str_starts_with($lookupId, 'sub_')) {
                        $subEntity = $rzpClient->subscription->fetch($lookupId);
                    }

                    if ($subEntity) {
                        $updateData = [
                            'status' => 'active',
                            'onboarding_step' => 'complete',
                            'razorpay_subscription_id' => $subEntity->id,
                        ];
                        if (!empty($subEntity->customer_id)) {
                            $updateData['razorpay_customer_id'] = $subEntity->customer_id;
                        }
                        if (!empty($subEntity->notes['plan_id'])) {
                            $updateData['plan_id'] = (int) $subEntity->notes['plan_id'];
                        } elseif (!empty($subEntity->plan_id)) {
                            $priceObj = PlanPrice::where('razorpay_plan_id', $subEntity->plan_id)->first();
                            if ($priceObj) {
                                $updateData['plan_id'] = $priceObj->plan_id;
                            }
                        }

                        $tenant->update($updateData);
                        Log::info("Razorpay subscription {$lookupId} verified and activated for Tenant {$tenant->id}");
                    }

                    // Check Payment Link if returned from Payment Link
                    $paymentLinkId = $request->query('razorpay_payment_link_id') ?: (!empty($lookupId) && str_starts_with($lookupId, 'plink_') ? $lookupId : null);
                    if ($paymentLinkId || $request->query('razorpay_payment_link_status') === 'paid') {
                        try {
                            $plinkEntity = $paymentLinkId ? $rzpClient->paymentLink->fetch($paymentLinkId) : null;
                            if (($plinkEntity && $plinkEntity->status === 'paid') || $request->query('razorpay_payment_link_status') === 'paid') {
                                $updateData = [
                                    'status' => 'active',
                                    'onboarding_step' => 'complete',
                                ];
                                if ($plinkEntity && !empty($plinkEntity->notes['plan_id'])) {
                                    $updateData['plan_id'] = (int) $plinkEntity->notes['plan_id'];
                                }
                                if ($plinkEntity && !empty($plinkEntity->notes['subscription_id'])) {
                                    $updateData['razorpay_subscription_id'] = $plinkEntity->notes['subscription_id'];
                                }
                                $tenant->update($updateData);
                                Log::info("Razorpay payment link {$paymentLinkId} verified and activated for Tenant {$tenant->id}");
                            }
                        } catch (\Exception $plEx) {
                            Log::warning("Could not verify Razorpay payment link: " . $plEx->getMessage());
                        }
                    }
                }
            } catch (\Exception $e) {
                Log::warning("Could not verify Razorpay session on subscription fetch: " . $e->getMessage());
            }
        }

        // 3. If Stripe session_id is provided, verify and update local subscription status
        if ($request->has('session_id') && !empty($request->query('session_id')) && str_starts_with($request->query('session_id'), 'cs_')) {
            $sessionId = $request->query('session_id');
            $stripe = $this->stripeService->getClient();
            if ($stripe) {
                try {
                    $session = $stripe->checkout->sessions->retrieve($sessionId, [
                        'expand' => ['subscription', 'line_items']
                    ]);
                    
                    if ($session && ($session->status === 'complete' || $session->payment_status === 'paid' || $session->payment_status === 'no_payment_required')) {
                        $subscriptionId = is_string($session->subscription) ? $session->subscription : ($session->subscription?->id ?? null);
                        $customerId = is_string($session->customer) ? $session->customer : ($session->customer?->id ?? null);
                        
                        $updateData = [
                            'status' => 'active',
                            'onboarding_step' => 'complete',
                        ];
                        
                        if ($subscriptionId) {
                            $updateData['stripe_subscription_id'] = $subscriptionId;
                        }
                        if ($customerId) {
                            $updateData['stripe_customer_id'] = $customerId;
                        }

                        // 1. Resolve from session metadata
                        if (!empty($session->metadata->plan_id)) {
                            $updateData['plan_id'] = (int) $session->metadata->plan_id;
                        }

                        // 2. Resolve from subscription object
                        if (empty($updateData['plan_id']) && $session->subscription) {
                            $subObj = is_object($session->subscription) ? $session->subscription : $stripe->subscriptions->retrieve($subscriptionId);
                            if (!empty($subObj->metadata->plan_id)) {
                                $updateData['plan_id'] = (int) $subObj->metadata->plan_id;
                            } else {
                                $priceId = $subObj->items->data[0]->price->id ?? null;
                                if ($priceId) {
                                    $priceObj = PlanPrice::where('stripe_price_id', $priceId)->first();
                                    if ($priceObj) {
                                        $updateData['plan_id'] = $priceObj->plan_id;
                                    }
                                }
                            }
                        }

                        // 3. Fallback to line_items
                        if (empty($updateData['plan_id']) && !empty($session->line_items->data[0]->price->id)) {
                            $priceId = $session->line_items->data[0]->price->id;
                            $priceObj = PlanPrice::where('stripe_price_id', $priceId)->first();
                            if ($priceObj) {
                                $updateData['plan_id'] = $priceObj->plan_id;
                            }
                        }
                        
                        $tenant->update($updateData);
                        Log::info("Session {$sessionId} successfully verified and activated subscription for Tenant {$tenant->id}, Plan ID: " . ($updateData['plan_id'] ?? 'none'));
                    }
                } catch (\Exception $e) {
                    Log::warning("Could not verify session_id on subscription fetch: " . $e->getMessage());
                }
            }
        }

        // 4. If PayPal subscription callback parameters are provided, verify with PayPal driver
        $paypalSubId = $request->query('subscription_id') ?? $request->query('paypal_subscription_id');
        if (!empty($paypalSubId) && empty($tenant->paypal_subscription_id)) {
            try {
                /** @var \App\Services\Payments\Drivers\PayPalGatewayDriver $paypalDriver */
                $paypalDriver = $this->paymentManager->driver('paypal');
                $subDetails = $paypalDriver->getSubscription($paypalSubId);
                $subStatus = $subDetails['status'] ?? '';
                if ($subStatus === 'APPROVED') {
                    $paypalDriver->activateSubscription($paypalSubId);
                    $subStatus = 'ACTIVE';
                }

                if (in_array($subStatus, ['ACTIVE', 'APPROVED'])) {
                    $payerId = $subDetails['subscriber']['payer_id'] ?? null;
                    $ppPlanId = $subDetails['plan_id'] ?? null;

                    $updateData = [
                        'status' => 'active',
                        'onboarding_step' => 'complete',
                        'paypal_subscription_id' => $paypalSubId,
                    ];
                    if ($payerId) $updateData['paypal_customer_id'] = $payerId;
                    if ($ppPlanId) {
                        $priceObj = PlanPrice::where('paypal_plan_id', $ppPlanId)->first();
                        if ($priceObj) {
                            $updateData['plan_id'] = $priceObj->plan_id;
                        }
                    }
                    $tenant->update($updateData);
                    Log::info("PayPal subscription {$paypalSubId} verified and activated for Tenant {$tenant->id}");
                }
            } catch (\Exception $e) {
                Log::warning("Could not verify PayPal subscription on fetch: " . $e->getMessage());
            }
        }

        // 5. If Paddle transaction callback parameters are provided, verify with Paddle driver
        $paddleTxId = $request->query('_ptxn') ?? ($request->query('paddle_transaction_id') ?? ($request->query('transaction_id') && str_starts_with($request->query('transaction_id'), 'txn_') ? $request->query('transaction_id') : null));
        if (!empty($paddleTxId) && (empty($tenant->paddle_subscription_id) || empty($tenant->paddle_customer_id))) {
            try {
                /** @var \App\Services\Payments\Drivers\PaddleGatewayDriver $paddleDriver */
                $paddleDriver = $this->paymentManager->driver('paddle');
                $verifyRes = $paddleDriver->verifyTransaction($paddleTxId);
                $txData = $verifyRes['data'] ?? $verifyRes;
                $txStatus = $txData['status'] ?? '';

                if (in_array($txStatus, ['completed', 'paid', 'billed', 'past_due', 'active'])) {
                    $customerId = $txData['customer_id'] ?? null;
                    $subId = $txData['subscription_id'] ?? null;
                    $customData = $txData['custom_data'] ?? [];
                    $metaPlanId = $customData['plan_id'] ?? null;

                    $updateData = [
                        'status' => 'active',
                        'onboarding_step' => 'complete',
                    ];
                    if ($customerId) $updateData['paddle_customer_id'] = $customerId;
                    if ($subId) $updateData['paddle_subscription_id'] = $subId;

                    if (!empty($metaPlanId)) {
                        $updateData['plan_id'] = (int) $metaPlanId;
                    } else {
                        $items = $txData['items'] ?? [];
                        foreach ($items as $item) {
                            $priceId = $item['price']['id'] ?? ($item['price_id'] ?? null);
                            if ($priceId) {
                                $priceObj = PlanPrice::where('paddle_price_id', $priceId)->first();
                                if ($priceObj) {
                                    $updateData['plan_id'] = $priceObj->plan_id;
                                    break;
                                }
                            }
                        }
                    }

                    $tenant->update($updateData);
                    Log::info("Paddle transaction {$paddleTxId} verified and activated for Tenant {$tenant->id}");
                }
            } catch (\Exception $e) {
                Log::warning("Could not verify Paddle transaction on subscription fetch: " . $e->getMessage());
            }
        }

        // 6. If Mercado Pago preapproval/payment callback parameters are provided, verify with Mercado Pago driver
        $mpPreapprovalId = $request->query('preapproval_id') ?? ($request->query('mercadopago_subscription_id') ?? $request->query('preference_id'));
        $mpStatus = $request->query('status') ?? ($request->query('collection_status') ?? null);
        if (!empty($mpPreapprovalId) && (empty($tenant->mercadopago_subscription_id) || $mpStatus === 'approved')) {
            try {
                /** @var \App\Services\Payments\Drivers\MercadoPagoGatewayDriver $mpDriver */
                $mpDriver = $this->paymentManager->driver('mercadopago');
                $subDetails = $mpDriver->getSubscription($mpPreapprovalId);
                $subStatus = $subDetails['status'] ?? '';

                if (in_array(strtolower($subStatus), ['authorized', 'active']) || $mpStatus === 'approved') {
                    $payerId = isset($subDetails['payer_id']) ? (string)$subDetails['payer_id'] : ($subDetails['payer']['id'] ?? null);
                    $mpPlanId = $subDetails['preapproval_plan_id'] ?? null;

                    $updateData = [
                        'status' => 'active',
                        'onboarding_step' => 'complete',
                        'mercadopago_subscription_id' => $mpPreapprovalId,
                    ];
                    if ($payerId) $updateData['mercadopago_customer_id'] = (string)$payerId;
                    if ($mpPlanId) {
                        $priceObj = PlanPrice::where('mercadopago_plan_id', $mpPlanId)->first();
                        if ($priceObj) {
                            $updateData['plan_id'] = $priceObj->plan_id;
                        }
                    }
                    $tenant->update($updateData);
                    Log::info("Mercado Pago preapproval {$mpPreapprovalId} verified and activated for Tenant {$tenant->id}");
                }
            } catch (\Exception $e) {
                Log::warning("Could not verify Mercado Pago preapproval on fetch: " . $e->getMessage());
            }
        }

        // 7. If MyFatoorah invoice/payment callback parameters are provided, verify with MyFatoorah driver
        $mfPaymentId = $request->query('paymentId') ?? ($request->query('payment_id') ?? ($request->query('InvoiceId') ?? ($request->query('invoice_id') ?? $request->query('myfatoorah_subscription_id'))));
        $mfStatus = $request->query('status') ?? ($request->query('payment_status') ?? null);
        if (!empty($mfPaymentId) && (empty($tenant->myfatoorah_subscription_id) || $mfStatus === 'success')) {
            try {
                /** @var \App\Services\Payments\Drivers\MyFatoorahGatewayDriver $mfDriver */
                $mfDriver = $this->paymentManager->driver('myfatoorah');
                $invoiceDetails = $mfDriver->getPaymentStatus($mfPaymentId, is_numeric($mfPaymentId) ? 'InvoiceId' : 'PaymentId');
                $invoiceStatus = $invoiceDetails['InvoiceStatus'] ?? '';

                if (in_array(strtolower($invoiceStatus), ['paid', 'success', 'captured', 'authorized', 'active']) || $mfStatus === 'success') {
                    $recurringId = $invoiceDetails['RecurringId'] ?? "mf_inv_{$mfPaymentId}";
                    $externalRef = $invoiceDetails['CustomerReference'] ?? null;

                    $updateData = [
                        'status' => 'active',
                        'onboarding_step' => 'complete',
                        'myfatoorah_subscription_id' => (string)$recurringId,
                    ];
                    if ($externalRef && str_contains($externalRef, '_price_')) {
                        $parts = explode('_price_', $externalRef);
                        $priceIdOrVal = $parts[1] ?? null;
                        if ($priceIdOrVal) {
                            $priceObj = PlanPrice::where('id', is_numeric($priceIdOrVal) ? (int)$priceIdOrVal : 0)
                                ->orWhere('stripe_price_id', $priceIdOrVal)
                                ->orWhere('myfatoorah_plan_id', $priceIdOrVal)
                                ->first();
                            if ($priceObj) {
                                $updateData['plan_id'] = $priceObj->plan_id;
                            }
                        }
                    }
                    $tenant->update($updateData);
                    Log::info("MyFatoorah payment/invoice {$mfPaymentId} verified and activated for Tenant {$tenant->id}");
                }
            } catch (\Exception $e) {
                Log::warning("Could not verify MyFatoorah invoice on fetch: " . $e->getMessage());
            }
        }

        // Resolve localized/requested currency for tenant subscription
        $resolvedCurrency = $this->geoIPService->resolveCurrency($request, $tenant);
        $activeCurrencies = $this->geoIPService->getActiveCurrencies();
        $primaryCurrency = $this->geoIPService->getPlatformDefaultCurrency();

        $tenant->load(['plan']);

        // Find the active price for the plan in the resolved currency
        $price = null;
        if ($tenant->plan) {
            $price = PlanPrice::where('plan_id', $tenant->plan_id)
                ->where('currency_id', $resolvedCurrency->id)
                ->first();

            if (!$price) {
                $price = PlanPrice::where('plan_id', $tenant->plan_id)->first();
            }
        }

        $channelLimits = [];
        if ($tenant->plan) {
            $allowed = $tenant->plan->allowed_channels;
            $allowAll = is_null($allowed) || (is_array($allowed) && (in_array('*', $allowed) || in_array('all', $allowed)));

            $channelTypes = [
                'whatsapp_cloud' => 'channels_whatsapp_cloud',
                'whatsapp_baileys' => 'channels_whatsapp_baileys',
                'telegram' => 'channels_telegram',
                'instagram' => 'channels_instagram',
                'messenger' => 'channels_messenger',
                'sms' => 'channels_sms',
                'email' => 'channels_email',
                'tiktok' => 'channels_tiktok',
                'linkedin' => 'channels_linkedin',
            ];

            foreach ($channelTypes as $type => $limitKey) {
                if ($allowAll) {
                    $channelLimits[$limitKey] = true;
                } elseif (is_array($allowed)) {
                    $alias = ($type === 'whatsapp_cloud' || $type === 'whatsapp_baileys') ? 'whatsapp' : $type;
                    if (array_key_exists($type, $allowed)) {
                        $val = $allowed[$type];
                        $channelLimits[$limitKey] = !($val === false || $val === 0 || $val === '0');
                    } elseif (array_key_exists($alias, $allowed)) {
                        $val = $allowed[$alias];
                        $channelLimits[$limitKey] = !($val === false || $val === 0 || $val === '0');
                    } elseif (in_array($type, $allowed) || in_array($alias, $allowed)) {
                        $channelLimits[$limitKey] = true;
                    } else {
                        $channelLimits[$limitKey] = false;
                    }
                } else {
                    $channelLimits[$limitKey] = true;
                }
            }
        }

        $planData = $tenant->plan ? [
            'id' => $tenant->plan->id,
            'name' => $tenant->plan->name,
            'description' => $tenant->plan->description,
            'max_team_members' => $tenant->plan->max_team_members,
            'max_campaigns' => $tenant->plan->max_campaigns,
            'max_integrations' => $tenant->plan->max_integrations,
            'allowed_integrations' => $tenant->plan->allowed_integrations ?? [],
            'own_crm_access' => (bool) $tenant->plan->own_crm_access,
            'max_channels' => $tenant->plan->max_channels,
            'allowed_channels' => $tenant->plan->allowed_channels ?? [],
            'max_automations' => $tenant->plan->max_automations,
            'flow_credits' => $tenant->plan->flow_credits ?? 50,
            'copilot_credits' => $tenant->plan->copilot_credits ?? 100,
            'monthly_ai_tokens' => $tenant->plan->monthly_ai_tokens ?? 100000,
            'has_flow_templates' => (bool) $tenant->plan->has_flow_templates,
            'max_ecommerce_stores' => $tenant->plan->max_ecommerce_stores ?? 1,
            'max_ecommerce_products' => $tenant->plan->max_ecommerce_products ?? 100,
            'monthly_ecommerce_orders' => $tenant->plan->monthly_ecommerce_orders ?? 100,
            'has_abandoned_cart_recovery' => (bool) ($tenant->plan->has_abandoned_cart_recovery ?? false),
            'has_whatsapp_checkout' => (bool) ($tenant->plan->has_whatsapp_checkout ?? false),
            'max_meta_ad_accounts' => $tenant->plan->max_meta_ad_accounts ?? 1,
            'max_meta_campaigns' => $tenant->plan->max_meta_campaigns ?? 2,
            'has_click_to_whatsapp_ads' => (bool) ($tenant->plan->has_click_to_whatsapp_ads ?? false),
            'has_meta_lead_sync' => (bool) ($tenant->plan->has_meta_lead_sync ?? false),
            'monthly_messages_limit' => $tenant->plan->monthly_messages_limit ?? -1,
            'limits' => $channelLimits,
        ] : null;

        return response()->json([
            'status' => $tenant->status,
            'is_trial' => $tenant->onTrial(),
            'on_trial' => $tenant->onTrial(),
            'is_trial_expired' => $tenant->isTrialExpired(),
            'trial_ends_at' => $tenant->trial_ends_at ? $tenant->trial_ends_at->toIso8601String() : ($tenant->status === 'trial' && $tenant->created_at ? $tenant->created_at->addDays($tenant->plan?->trial_days ?: 14)->toIso8601String() : null),
            'trial_days_remaining' => $tenant->onTrial() ? max(0, (int) now()->diffInDays($tenant->trial_ends_at ?? ($tenant->created_at ? $tenant->created_at->addDays($tenant->plan?->trial_days ?: 14) : now()->addDays(14)), false)) : 0,
            'stripe_subscription_id' => $tenant->stripe_subscription_id,
            'stripe_customer_id' => $tenant->stripe_customer_id,
            'razorpay_subscription_id' => $tenant->razorpay_subscription_id,
            'razorpay_customer_id' => $tenant->razorpay_customer_id,
            'paystack_subscription_id' => $tenant->paystack_subscription_id,
            'paystack_customer_id' => $tenant->paystack_customer_id,
            'flutterwave_subscription_id' => $tenant->flutterwave_subscription_id,
            'flutterwave_customer_id' => $tenant->flutterwave_customer_id,
            'paypal_subscription_id' => $tenant->paypal_subscription_id,
            'paypal_customer_id' => $tenant->paypal_customer_id,
            'paddle_subscription_id' => $tenant->paddle_subscription_id,
            'paddle_customer_id' => $tenant->paddle_customer_id,
            'active_gateway' => $resolvedCurrency->payment_gateway ?: $this->paymentManager->getActiveGateway(),
            'plan' => $planData,
            'subscription' => [
                'plan' => $planData,
                'status' => $tenant->status,
                'is_trial' => $tenant->onTrial(),
                'on_trial' => $tenant->onTrial(),
                'is_trial_expired' => $tenant->isTrialExpired(),
                'trial_ends_at' => $tenant->trial_ends_at ? $tenant->trial_ends_at->toIso8601String() : null,
                'limits' => $channelLimits,
            ],
            'messages_limits' => [
                'limit' => $tenant->getMonthlyMessagesLimit(),
                'used' => $tenant->getMonthlyOutboundMessagesCount(),
                'is_unlimited' => $tenant->getMonthlyMessagesLimit() === -1,
                'remaining' => $tenant->getMonthlyMessagesLimit() === -1 ? -1 : max(0, $tenant->getMonthlyMessagesLimit() - $tenant->getMonthlyOutboundMessagesCount()),
            ],
            'ecommerce_limits' => [
                'stores' => [
                    'limit' => $tenant->getEcommerceStoresLimit(),
                    'used' => \App\Models\EcommerceConnection::where('tenant_id', $tenant->id)->count(),
                    'is_unlimited' => $tenant->getEcommerceStoresLimit() === -1,
                ],
                'products' => [
                    'limit' => $tenant->getEcommerceProductsLimit(),
                    'used' => \App\Models\EcommerceProduct::where('tenant_id', $tenant->id)->count(),
                    'is_unlimited' => $tenant->getEcommerceProductsLimit() === -1,
                ],
                'monthly_orders' => [
                    'limit' => $tenant->getMonthlyEcommerceOrdersLimit(),
                    'used' => \App\Models\EcommerceOrder::where('tenant_id', $tenant->id)
                        ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
                        ->count(),
                    'is_unlimited' => $tenant->getMonthlyEcommerceOrdersLimit() === -1,
                ],
                'has_abandoned_cart_recovery' => $tenant->canUseAbandonedCartRecovery(),
                'has_whatsapp_checkout' => $tenant->canUseWhatsAppCheckout(),
            ],
            'meta_ads_limits' => [
                'ad_accounts' => [
                    'limit' => $tenant->getMetaAdAccountsLimit(),
                    'used' => \App\Models\MetaAdAccount::where('tenant_id', $tenant->id)->count(),
                    'is_unlimited' => $tenant->getMetaAdAccountsLimit() === -1,
                ],
                'campaigns' => [
                    'limit' => $tenant->getMetaCampaignsLimit(),
                    'used' => \App\Models\MetaCampaign::where('tenant_id', $tenant->id)->whereIn('status', ['ACTIVE', 'PAUSED'])->count(),
                    'is_unlimited' => $tenant->getMetaCampaignsLimit() === -1,
                ],
                'has_click_to_whatsapp_ads' => $tenant->canUseClickToWhatsAppAds(),
                'has_meta_lead_sync' => $tenant->canUseMetaLeadSync(),
            ],
            'flow_credits' => [
                'max_credits' => $tenant->plan ? ($tenant->plan->flow_credits ?? 50) : 5,
                'used_credits' => $tenant->used_flow_credits ?? 0,
                'is_unlimited' => $tenant->plan ? ($tenant->plan->flow_credits === -1) : false,
                'remaining_credits' => ($tenant->plan && $tenant->plan->flow_credits === -1)
                    ? -1
                    : max(0, ($tenant->plan ? ($tenant->plan->flow_credits ?? 50) : 5) - ($tenant->used_flow_credits ?? 0)),
            ],
            'copilot_credits' => [
                'max_credits' => $tenant->getCopilotCreditsLimit(),
                'used_credits' => $tenant->getUsedCopilotCredits(),
                'remaining_credits' => $tenant->getRemainingCopilotCredits(),
                'is_unlimited' => $tenant->getCopilotCreditsLimit() === -1,
            ],
            'price' => $price ? [
                'amount' => $price->amount,
                'currency' => $price->currency ? $price->currency->code : $resolvedCurrency->code,
                'symbol' => $price->currency ? $price->currency->symbol : $resolvedCurrency->symbol,
                'interval' => $price->billing_interval,
            ] : null,
            'platform_currency' => [
                'code' => $primaryCurrency->code,
                'symbol' => $primaryCurrency->symbol,
            ],
            'resolved_currency' => [
                'id' => $resolvedCurrency->id,
                'code' => $resolvedCurrency->code,
                'symbol' => $resolvedCurrency->symbol,
                'name' => $resolvedCurrency->name,
                'payment_gateway' => $resolvedCurrency->payment_gateway ?? 'stripe',
                'is_default' => (bool)$resolvedCurrency->is_default,
            ],
            'active_currencies' => $activeCurrencies->map(fn($c) => [
                'id' => $c->id,
                'code' => $c->code,
                'symbol' => $c->symbol,
                'name' => $c->name,
                'payment_gateway' => $c->payment_gateway ?? 'stripe',
                'is_default' => (bool)$c->is_default,
            ]),
            'ai_operational_model' => app(\App\Services\AIProviderService::class)->getAiOperationalModel(),
        ]);
    }

    /**
     * Get all active subscription plans localized by tenant location / IP.
     */
    public function plans(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        
        if (!$tenant) {
            return response()->json(['message' => 'Workspace context not resolved.'], 404);
        }

        $resolvedCurrency = $this->geoIPService->resolveCurrency($request, $tenant);
        $activeCurrencies = $this->geoIPService->getActiveCurrencies();

        $plans = Plan::where('is_active', true)->with('prices.currency')->orderBy('sort_order')->get();
        $payload = [];

        foreach ($plans as $plan) {
            $prices = $plan->prices->where('currency_id', $resolvedCurrency->id)->values();

            // Fallback to default currency prices if no direct match for resolved currency
            if ($prices->isEmpty()) {
                $primaryCurrency = $this->geoIPService->getPlatformDefaultCurrency();
                $prices = $plan->prices->where('currency_id', $primaryCurrency->id)->values();
            }

            if ($prices->isEmpty()) {
                $prices = $plan->prices->values();
            }

            if ($prices->isEmpty()) {
                continue;
            }

            $pricePayload = [];
            foreach ($prices as $price) {
                if (empty($price->stripe_price_id)) {
                    $generatedId = "price_plan_{$price->plan_id}_{$price->currency_id}_{$price->id}";
                    $price->update(['stripe_price_id' => $generatedId]);
                    $price->stripe_price_id = $generatedId;
                }

                $pricePayload[] = [
                    'id' => $price->id,
                    'currency_id' => $price->currency_id,
                    'stripe_price_id' => $price->stripe_price_id,
                    'paddle_price_id' => $price->paddle_price_id,
                    'amount' => $price->amount,
                    'interval' => $price->billing_interval,
                    'currency_code' => $price->currency ? $price->currency->code : $resolvedCurrency->code,
                    'currency_symbol' => $price->currency ? $price->currency->symbol : $resolvedCurrency->symbol,
                ];
            }

            $allPricesPayload = [];
            foreach ($plan->prices as $ap) {
                $allPricesPayload[] = [
                    'id' => $ap->id,
                    'currency_id' => $ap->currency_id,
                    'stripe_price_id' => $ap->stripe_price_id,
                    'paddle_price_id' => $ap->paddle_price_id,
                    'amount' => $ap->amount,
                    'interval' => $ap->billing_interval,
                    'currency_code' => $ap->currency?->code,
                    'currency_symbol' => $ap->currency?->symbol,
                ];
            }

            $payload[] = [
                'id' => $plan->id,
                'name' => $plan->name,
                'description' => $plan->description,
                'paddle_product_id' => $plan->paddle_product_id,
                'trial_days' => $plan->trial_days ?? 0,
                'max_team_members' => $plan->max_team_members,
                'max_campaigns' => $plan->max_campaigns,
                'max_integrations' => $plan->max_integrations,
                'allowed_integrations' => $plan->allowed_integrations ?? [],
                'own_crm_access' => (bool) $plan->own_crm_access,
                'max_channels' => $plan->max_channels,
                'allowed_channels' => $plan->allowed_channels ?? [],
                'max_automations' => $plan->max_automations,
                'flow_credits' => $plan->flow_credits ?? 50,
                'copilot_credits' => $plan->copilot_credits ?? 100,
                'monthly_ai_tokens' => $plan->monthly_ai_tokens ?? 100000,
                'has_flow_templates' => (bool) $plan->has_flow_templates,
                'max_ecommerce_stores' => $plan->max_ecommerce_stores ?? 1,
                'max_ecommerce_products' => $plan->max_ecommerce_products ?? 100,
                'monthly_ecommerce_orders' => $plan->monthly_ecommerce_orders ?? 100,
                'has_abandoned_cart_recovery' => (bool) ($plan->has_abandoned_cart_recovery ?? false),
                'has_whatsapp_checkout' => (bool) ($plan->has_whatsapp_checkout ?? false),
                'max_meta_ad_accounts' => $plan->max_meta_ad_accounts ?? 1,
                'max_meta_campaigns' => $plan->max_meta_campaigns ?? 2,
                'has_click_to_whatsapp_ads' => (bool) ($plan->has_click_to_whatsapp_ads ?? false),
                'has_meta_lead_sync' => (bool) ($plan->has_meta_lead_sync ?? false),
                'prices' => $pricePayload,
                'all_prices' => $allPricesPayload,
            ];
        }

        return response()->json([
            'plans' => $payload,
            'resolved_currency' => [
                'id' => $resolvedCurrency->id,
                'code' => $resolvedCurrency->code,
                'symbol' => $resolvedCurrency->symbol,
                'name' => $resolvedCurrency->name,
                'is_default' => (bool)$resolvedCurrency->is_default,
            ],
            'active_currencies' => $activeCurrencies->map(fn($c) => [
                'id' => $c->id,
                'code' => $c->code,
                'symbol' => $c->symbol,
                'name' => $c->name,
                'is_default' => (bool)$c->is_default,
            ]),
            'ai_operational_model' => app(\App\Services\AIProviderService::class)->getAiOperationalModel(),
        ]);
    }

    /**
     * Get all active subscription plans for public landing pages (does not require authentication).
     */
    public function publicPlans(Request $request): JsonResponse
    {
        $resolvedCurrency = $this->geoIPService->resolveCurrency($request, null);
        $activeCurrencies = $this->geoIPService->getActiveCurrencies();

        $plans = Plan::where('is_active', true)->with('prices.currency')->orderBy('sort_order')->get();
        $payload = [];

        foreach ($plans as $plan) {
            $prices = $plan->prices->where('currency_id', $resolvedCurrency->id)->values();

            if ($prices->isEmpty()) {
                $primaryCurrency = $this->geoIPService->getPlatformDefaultCurrency();
                $prices = $plan->prices->where('currency_id', $primaryCurrency->id)->values();
            }

            if ($prices->isEmpty()) {
                $prices = $plan->prices->values();
            }

            if ($prices->isEmpty()) {
                continue;
            }

            $pricePayload = [];
            foreach ($prices as $price) {
                if (empty($price->stripe_price_id)) {
                    $generatedId = "price_plan_{$price->plan_id}_{$price->currency_id}_{$price->id}";
                    $price->update(['stripe_price_id' => $generatedId]);
                    $price->stripe_price_id = $generatedId;
                }

                $pricePayload[] = [
                    'id' => $price->id,
                    'currency_id' => $price->currency_id,
                    'stripe_price_id' => $price->stripe_price_id,
                    'paddle_price_id' => $price->paddle_price_id,
                    'amount' => $price->amount,
                    'interval' => $price->billing_interval,
                    'currency_code' => $price->currency ? $price->currency->code : $resolvedCurrency->code,
                    'currency_symbol' => $price->currency ? $price->currency->symbol : $resolvedCurrency->symbol,
                ];
            }

            $allPricesPayload = [];
            foreach ($plan->prices as $ap) {
                $allPricesPayload[] = [
                    'id' => $ap->id,
                    'currency_id' => $ap->currency_id,
                    'stripe_price_id' => $ap->stripe_price_id,
                    'paddle_price_id' => $ap->paddle_price_id,
                    'amount' => $ap->amount,
                    'interval' => $ap->billing_interval,
                    'currency_code' => $ap->currency?->code,
                    'currency_symbol' => $ap->currency?->symbol,
                ];
            }

            $payload[] = [
                'id' => $plan->id,
                'name' => $plan->name,
                'description' => $plan->description,
                'paddle_product_id' => $plan->paddle_product_id,
                'trial_days' => $plan->trial_days ?? 0,
                'max_team_members' => $plan->max_team_members,
                'max_campaigns' => $plan->max_campaigns,
                'max_integrations' => $plan->max_integrations,
                'allowed_integrations' => $plan->allowed_integrations ?? [],
                'own_crm_access' => (bool) $plan->own_crm_access,
                'max_channels' => $plan->max_channels,
                'allowed_channels' => $plan->allowed_channels ?? [],
                'max_automations' => $plan->max_automations,
                'flow_credits' => $plan->flow_credits ?? 50,
                'copilot_credits' => $plan->copilot_credits ?? 100,
                'monthly_ai_tokens' => $plan->monthly_ai_tokens ?? 100000,
                'has_flow_templates' => (bool) $plan->has_flow_templates,
                'max_ecommerce_stores' => $plan->max_ecommerce_stores ?? 1,
                'max_ecommerce_products' => $plan->max_ecommerce_products ?? 100,
                'monthly_ecommerce_orders' => $plan->monthly_ecommerce_orders ?? 100,
                'has_abandoned_cart_recovery' => (bool) ($plan->has_abandoned_cart_recovery ?? false),
                'has_whatsapp_checkout' => (bool) ($plan->has_whatsapp_checkout ?? false),
                'max_meta_ad_accounts' => $plan->max_meta_ad_accounts ?? 1,
                'max_meta_campaigns' => $plan->max_meta_campaigns ?? 2,
                'has_click_to_whatsapp_ads' => (bool) ($plan->has_click_to_whatsapp_ads ?? false),
                'has_meta_lead_sync' => (bool) ($plan->has_meta_lead_sync ?? false),
                'prices' => $pricePayload,
                'all_prices' => $allPricesPayload,
            ];
        }

        return response()->json([
            'plans' => $payload,
            'resolved_currency' => [
                'id' => $resolvedCurrency->id,
                'code' => $resolvedCurrency->code,
                'symbol' => $resolvedCurrency->symbol,
                'name' => $resolvedCurrency->name,
                'payment_gateway' => $resolvedCurrency->payment_gateway ?? 'stripe',
                'is_default' => (bool)$resolvedCurrency->is_default,
            ],
            'active_currencies' => $activeCurrencies->map(fn($c) => [
                'id' => $c->id,
                'code' => $c->code,
                'symbol' => $c->symbol,
                'name' => $c->name,
                'payment_gateway' => $c->payment_gateway ?? 'stripe',
                'is_default' => (bool)$c->is_default,
            ]),
            'ai_operational_model' => app(\App\Services\AIProviderService::class)->getAiOperationalModel(),
        ]);
    }


    /**
     * Start a Stripe Checkout Session to subscribe to a price tier.
     */
    public function checkout(Request $request): JsonResponse
    {
        $request->validate([
            'stripe_price_id' => ['nullable', 'string'],
            'price_id' => ['nullable'],
            'plan_id' => ['nullable'],
        ]);

        $tenant = $request->user()->tenant;
        if (!$tenant) {
            return response()->json(['message' => 'Workspace context not resolved.'], 404);
        }

        $price = null;
        if (!empty($request->stripe_price_id)) {
            $price = PlanPrice::where('stripe_price_id', $request->stripe_price_id)->first();
        }

        if (!$price && !empty($request->price_id)) {
            $price = PlanPrice::find($request->price_id);
        }

        if (!$price && !empty($request->plan_id)) {
            $resolvedCurrency = $this->geoIPService->resolveCurrency($request, $tenant);
            $rawInterval = $request->input('interval', 'month');
            $billingInterval = in_array(strtolower($rawInterval), ['year', 'yearly', 'annual', 'annually']) ? 'year' : 'month';
            $price = PlanPrice::where('plan_id', $request->plan_id)
                ->where('currency_id', $resolvedCurrency->id)
                ->where('billing_interval', $billingInterval)
                ->first();

            if (!$price) {
                $price = PlanPrice::where('plan_id', $request->plan_id)
                    ->where('currency_id', $resolvedCurrency->id)
                    ->first();
            }

            if (!$price) {
                $primaryCurrency = $this->geoIPService->getPlatformDefaultCurrency();
                $price = PlanPrice::where('plan_id', $request->plan_id)
                    ->where('currency_id', $primaryCurrency->id)
                    ->where('billing_interval', $billingInterval)
                    ->first();
            }

            if (!$price) {
                $price = PlanPrice::where('plan_id', $request->plan_id)->first();
            }
        }

        if (!$price) {
            return response()->json(['message' => 'Selected plan price tier is invalid.'], 422);
        }

        // Align tenant currency with selected plan price currency
        if ($price->currency_id && $tenant->currency_id !== $price->currency_id) {
            $tenant->update(['currency_id' => $price->currency_id]);
        }

        // Resolve payment gateway linked to the currency being paid
        $price->loadMissing('currency');
        $currencyGateway = $price->currency?->payment_gateway;
        $activeGateway = (!empty($currencyGateway) && in_array($currencyGateway, ['stripe', 'razorpay', 'paystack', 'flutterwave', 'paypal', 'paddle', 'mercadopago', 'myfatoorah']))
            ? $currencyGateway
            : $this->paymentManager->getActiveGateway();
        $gatewayDriver = $this->paymentManager->driver($activeGateway);

        $gatewayPriceId = match ($activeGateway) {
            'razorpay' => ($price->razorpay_plan_id ?: ($price->stripe_price_id ?: (string)$price->id)),
            'paystack' => ($price->paystack_plan_code ?: ($price->stripe_price_id ?: (string)$price->id)),
            'paypal' => ($price->paypal_plan_id ?: ($price->stripe_price_id ?: (string)$price->id)),
            'paddle' => ($price->paddle_price_id ?: ($price->stripe_price_id ?: (string)$price->id)),
            'mercadopago' => ($price->mercadopago_plan_id ?: ($price->stripe_price_id ?: (string)$price->id)),
            'myfatoorah' => ($price->myfatoorah_plan_id ?: ($price->stripe_price_id ?: (string)$price->id)),
            default => ($price->stripe_price_id ?: (string)$price->id),
        };

        if ($activeGateway === 'paddle' && method_exists($gatewayDriver, 'ensurePriceExists')) {
            $gatewayPriceId = $gatewayDriver->ensurePriceExists($gatewayPriceId, $price);
        }

        if (empty($price->stripe_price_id)) {
            $generatedId = "price_plan_{$price->plan_id}_{$price->id}";
            $price->update(['stripe_price_id' => $generatedId]);
            $price->stripe_price_id = $generatedId;
        }

        // Setup base callback URLs dynamically based on onboarding vs dashboard settings state
        $baseUrl = \App\Providers\AppServiceProvider::getFrontendUrl($request->user());
        $origin = $request->header('Origin') ?: $request->header('Referer');
        if ($origin) {
            $parsed = parse_url($origin);
            if (!empty($parsed['scheme']) && !empty($parsed['host'])) {
                $baseUrl = $parsed['scheme'] . '://' . $parsed['host'] . (!empty($parsed['port']) ? ':' . $parsed['port'] : '');
            }
        }

        // Determine destination page based on current context
        $refererPath = $request->header('Referer') ? (parse_url($request->header('Referer'), PHP_URL_PATH) ?? '') : '';
        $targetRoute = '/settings/billing';
        if (str_contains($refererPath, '/billing/plans') || empty($tenant->plan_id)) {
            $targetRoute = '/billing/plans';
        }

        $successUrl = match ($activeGateway) {
            'paystack' => "{$baseUrl}{$targetRoute}?paystack_reference={reference}",
            'paypal' => "{$baseUrl}{$targetRoute}?gateway=paypal",
            'paddle' => "{$baseUrl}{$targetRoute}?gateway=paddle&_ptxn={transaction_id}",
            'mercadopago' => "{$baseUrl}{$targetRoute}?gateway=mercadopago&status=approved&preapproval_id={preapproval_id}",
            'myfatoorah' => "{$baseUrl}{$targetRoute}?gateway=myfatoorah&status=success&paymentId={paymentId}",
            default => "{$baseUrl}{$targetRoute}?session_id={CHECKOUT_SESSION_ID}",
        };
        $cancelUrl = "{$baseUrl}{$targetRoute}?checkout=cancelled";

        try {
            $targetPlan = Plan::find($price->plan_id);

            // If user requests to start a free trial on a plan with trial_days > 0
            if (($request->boolean('start_trial') || $request->input('mode') === 'trial') && $targetPlan && $targetPlan->trial_days > 0) {
                $trialDays = (int) $targetPlan->trial_days;
                $tenant->update([
                    'plan_id' => $targetPlan->id,
                    'status' => 'trial',
                    'trial_ends_at' => now()->addDays($trialDays),
                ]);

                return response()->json([
                    'immediate' => true,
                    'message' => "Started {$trialDays}-day free trial of {$targetPlan->name} plan."
                ]);
            }

            // If the selected plan price is $0 (Free plan), update DB immediately and cancel active subscriptions if any
            if ($price->amount === 0) {
                try {
                    $gatewayDriver->cancelSubscription($tenant);
                } catch (\Exception $e) {
                    Log::error('Gateway cancel failed on downgrade to Free: ' . $e->getMessage());
                }

                $tenant->update([
                    'plan_id' => $price->plan_id,
                    'status' => 'active',
                    'stripe_subscription_id' => null,
                    'razorpay_subscription_id' => null,
                    'paystack_subscription_id' => null,
                    'paystack_email_token' => null,
                    'flutterwave_subscription_id' => null,
                    'paypal_subscription_id' => null,
                    'paddle_subscription_id' => null,
                    'paddle_customer_id' => null,
                    'mercadopago_subscription_id' => null,
                    'mercadopago_customer_id' => null,
                ]);

                return response()->json([
                    'immediate' => true,
                    'message' => 'Subscribed to Free Plan successfully.'
                ]);
            }

            // Check if tenant has subscription already on active gateway that supports silent in-place revision.
            // Note: Gateways like Paystack and Flutterwave require customer checkout/authorization
            // to create a new mandate or bill recurring amounts, so they must always go through checkout.
            $hasActiveSub = match ($activeGateway) {
                'stripe' => !empty($tenant->stripe_subscription_id),
                'paypal' => !empty($tenant->paypal_subscription_id),
                'razorpay' => !empty($tenant->razorpay_subscription_id),
                'paddle' => !empty($tenant->paddle_subscription_id),
                'mercadopago' => !empty($tenant->mercadopago_subscription_id),
                default => false,
            };

            if ($hasActiveSub) {
                try {
                    $gatewayDriver->changeSubscriptionPlan($tenant, $gatewayPriceId);
                    
                    // Update local plan immediately
                    $tenant->update([
                        'plan_id' => $price->plan_id,
                        'status' => 'active',
                    ]);

                    return response()->json([
                        'immediate' => true,
                        'message' => 'Subscription upgraded successfully.'
                    ]);
                } catch (\Exception $e) {
                    Log::warning("Could not revise subscription on {$activeGateway}, falling back to new checkout session: " . $e->getMessage());
                    match ($activeGateway) {
                        'paypal' => $tenant->update(['paypal_subscription_id' => null]),
                        'razorpay' => $tenant->update(['razorpay_subscription_id' => null]),
                        'paystack' => $tenant->update(['paystack_subscription_id' => null]),
                        'flutterwave' => $tenant->update(['flutterwave_subscription_id' => null]),
                        'paddle' => $tenant->update(['paddle_subscription_id' => null]),
                        'mercadopago' => $tenant->update(['mercadopago_subscription_id' => null]),
                        default => $tenant->update(['stripe_subscription_id' => null]),
                    };
                }
            }

            // Otherwise, create checkout session via active gateway driver
            if ($activeGateway === 'stripe') {
                $checkoutUrl = $this->stripeService->createCheckoutSession($tenant, $gatewayPriceId, $successUrl, $cancelUrl);
                return response()->json([
                    'immediate' => false,
                    'gateway' => 'stripe',
                    'checkout_url' => $checkoutUrl
                ]);
            }

            if ($activeGateway === 'paystack') {
                $sessionData = $gatewayDriver->createCheckoutSession($tenant, $gatewayPriceId, $successUrl, $cancelUrl);
                $parsed = json_decode($sessionData, true);

                if (is_array($parsed) && isset($parsed['access_code'])) {
                    return response()->json(array_merge([
                        'immediate' => false,
                        'plan_id' => $price->plan_id,
                    ], $parsed));
                }

                return response()->json([
                    'immediate' => false,
                    'gateway' => 'paystack',
                    'checkout_url' => is_string($sessionData) ? $sessionData : null,
                ]);
            }

            if ($activeGateway === 'flutterwave') {
                $sessionData = $gatewayDriver->createCheckoutSession($tenant, $gatewayPriceId, $successUrl, $cancelUrl);
                $parsed = json_decode($sessionData, true);

                if (is_array($parsed) && (isset($parsed['checkout_url']) || isset($parsed['authorization_url']))) {
                    return response()->json(array_merge([
                        'immediate' => false,
                        'plan_id' => $price->plan_id,
                    ], $parsed));
                }

                return response()->json([
                    'immediate' => false,
                    'gateway' => 'flutterwave',
                    'checkout_url' => is_string($sessionData) ? $sessionData : null,
                ]);
            }

            if ($activeGateway === 'paypal') {
                $sessionData = $gatewayDriver->createCheckoutSession($tenant, $gatewayPriceId, $successUrl, $cancelUrl);
                return response()->json([
                    'immediate' => false,
                    'gateway' => 'paypal',
                    'checkout_url' => $sessionData,
                ]);
            }

            if ($activeGateway === 'paddle') {
                $sessionData = $gatewayDriver->createCheckoutSession($tenant, $gatewayPriceId, $successUrl, $cancelUrl);
                $parsed = is_string($sessionData) ? json_decode($sessionData, true) : null;

                $checkoutUrl = null;
                $txId = null;

                if (is_array($parsed) && isset($parsed['url'])) {
                    $checkoutUrl = $parsed['url'];
                    $txId = $parsed['id'] ?? null;
                } elseif (is_string($sessionData)) {
                    $checkoutUrl = $sessionData;
                    parse_str(parse_url($sessionData, PHP_URL_QUERY) ?? '', $queryParams);
                    $txId = $queryParams['_ptxn'] ?? null;
                }

                return response()->json([
                    'immediate' => false,
                    'gateway' => 'paddle',
                    'checkout_url' => $checkoutUrl,
                    'transaction_id' => $txId,
                    'client_token' => $this->paymentManager->getRawConfig('paddle', 'client_token'),
                    'mode' => $this->paymentManager->getRawConfig('paddle', 'mode', 'sandbox'),
                ]);
            }

            if ($activeGateway === 'mercadopago') {
                $sessionData = $gatewayDriver->createCheckoutSession($tenant, $gatewayPriceId, $successUrl, $cancelUrl);
                $parsed = is_string($sessionData) ? json_decode($sessionData, true) : null;

                if (is_array($parsed) && (isset($parsed['init_point']) || isset($parsed['sandbox_init_point']) || isset($parsed['checkout_url']))) {
                    return response()->json(array_merge([
                        'immediate' => false,
                        'gateway' => 'mercadopago',
                        'plan_id' => $price->plan_id,
                    ], $parsed));
                }

                return response()->json([
                    'immediate' => false,
                    'gateway' => 'mercadopago',
                    'checkout_url' => is_string($sessionData) ? $sessionData : null,
                    'subscription_id' => $tenant->mercadopago_subscription_id,
                ]);
            }

            if ($activeGateway === 'myfatoorah') {
                $sessionData = $gatewayDriver->createCheckoutSession($tenant, $gatewayPriceId, $successUrl, $cancelUrl);
                return response()->json([
                    'immediate' => false,
                    'gateway' => 'myfatoorah',
                    'checkout_url' => is_string($sessionData) ? $sessionData : null,
                    'subscription_id' => $tenant->myfatoorah_subscription_id,
                ]);
            }

            // Razorpay Recurring Subscription Checkout
            $sessionData = $gatewayDriver->createCheckoutSession($tenant, $gatewayPriceId, $successUrl, $cancelUrl);
            $parsed = json_decode($sessionData, true);

            if (is_array($parsed) && isset($parsed['subscription_id'])) {
                return response()->json(array_merge([
                    'immediate' => false,
                    'plan_id' => $price->plan_id,
                ], $parsed));
            }

            return response()->json([
                'immediate' => false,
                'gateway' => 'razorpay',
                'checkout_url' => $sessionData,
            ]);

        } catch (\Exception $e) {
            Log::error('Checkout generation failed: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Verify Razorpay recurring subscription client-side authorization.
     */
    public function verifyRazorpay(Request $request): JsonResponse
    {
        $request->validate([
            'razorpay_payment_id' => ['required', 'string'],
            'razorpay_subscription_id' => ['required', 'string'],
            'razorpay_signature' => ['required', 'string'],
            'plan_id' => ['nullable'],
        ]);

        $tenant = $request->user()->tenant;
        if (!$tenant) {
            return response()->json(['message' => 'Workspace context not resolved.'], 404);
        }

        /** @var \App\Services\Payments\Drivers\RazorpayGatewayDriver $driver */
        $driver = $this->paymentManager->driver('razorpay');

        if (!$driver->verifySubscriptionSignature($request->all())) {
            return response()->json(['message' => 'Invalid Razorpay payment signature.'], 400);
        }

        $subId = $request->input('razorpay_subscription_id');
        $planId = $request->input('plan_id');

        // Fetch subscription from Razorpay to confirm plan ID
        $rzpClient = $driver->getClient();
        $rzpPlanId = null;
        if ($rzpClient) {
            try {
                $sub = $rzpClient->subscription->fetch($subId);
                if ($sub && !empty($sub->plan_id)) {
                    $rzpPlanId = $sub->plan_id;
                }
            } catch (\Exception $e) {
                Log::warning('Failed fetching subscription on verify: ' . $e->getMessage());
            }
        }

        $updateData = [
            'status' => 'active',
            'onboarding_step' => 'complete',
            'razorpay_subscription_id' => $subId,
        ];

        if ($rzpPlanId) {
            $priceObj = PlanPrice::where('razorpay_plan_id', $rzpPlanId)->first();
            if ($priceObj) {
                $updateData['plan_id'] = $priceObj->plan_id;
            }
        }
        if (empty($updateData['plan_id']) && !empty($planId)) {
            $updateData['plan_id'] = (int) $planId;
        }

        $tenant->update($updateData);
        Log::info("Tenant {$tenant->id} activated via Razorpay recurring subscription verification ({$subId}).");

        return response()->json([
            'success' => true,
            'message' => 'Recurring subscription activated successfully.',
            'tenant' => $tenant->fresh(),
        ]);
    }

    /**
     * Verify Paystack recurring subscription authorization.
     */
    public function verifyPaystack(Request $request): JsonResponse
    {
        $request->validate([
            'reference' => ['required', 'string'],
            'plan_id' => ['nullable'],
        ]);

        $tenant = $request->user()->tenant;
        if (!$tenant) {
            return response()->json(['message' => 'Workspace context not resolved.'], 404);
        }

        /** @var \App\Services\Payments\Drivers\PaystackGatewayDriver $driver */
        $driver = $this->paymentManager->driver('paystack');

        $reference = $request->input('reference');
        $planId = $request->input('plan_id');

        try {
            $verifyRes = $driver->verifyTransaction($reference);
            if (empty($verifyRes['status']) || ($verifyRes['data']['status'] ?? '') !== 'success') {
                return response()->json(['message' => $verifyRes['message'] ?? 'Transaction was not successful.'], 400);
            }

            $txData = $verifyRes['data'];
            $subCode = $txData['subscription']['subscription_code'] ?? ($txData['subscription_code'] ?? null);
            $custCode = $txData['customer']['customer_code'] ?? null;
            $emailToken = $txData['subscription']['email_token'] ?? ($txData['email_token'] ?? null);
            $metaPlanId = $txData['metadata']['plan_id'] ?? $planId;
            $planCode = $txData['plan']['plan_code'] ?? ($txData['plan'] ?? null);

            if (empty($subCode) && !empty($custCode) && !empty($planCode)) {
                try {
                    $authCode = $txData['authorization']['authorization_code'] ?? null;
                    $subData = $driver->createSubscription($custCode, $planCode, $authCode);
                    if ($subData) {
                        $subCode = $subData['subscription_code'] ?? null;
                        $emailToken = $subData['email_token'] ?? null;
                    }
                } catch (\Exception $e) {
                    Log::warning('Auto-provisioning Paystack subscription error on verify: ' . $e->getMessage());
                }
            }

            $updateData = [
                'status' => 'active',
                'onboarding_step' => 'complete',
            ];
            if ($subCode) $updateData['paystack_subscription_id'] = $subCode;
            if ($custCode) $updateData['paystack_customer_id'] = $custCode;
            if ($emailToken) $updateData['paystack_email_token'] = $emailToken;
            if (!empty($metaPlanId)) {
                $updateData['plan_id'] = (int) $metaPlanId;
            } elseif ($planCode) {
                $priceObj = PlanPrice::where('paystack_plan_code', $planCode)->first();
                if ($priceObj) {
                    $updateData['plan_id'] = $priceObj->plan_id;
                }
            }

            $tenant->update($updateData);
            Log::info("Tenant {$tenant->id} activated via Paystack recurring subscription verify ({$reference}).");

            return response()->json([
                'success' => true,
                'message' => 'Recurring subscription activated successfully.',
                'tenant' => $tenant->fresh(),
            ]);
        } catch (\Exception $e) {
            Log::error('Paystack verification error: ' . $e->getMessage());
            return response()->json(['message' => 'Verification failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Verify Flutterwave recurring subscription authorization.
     */
    public function verifyFlutterwave(Request $request): JsonResponse
    {
        $request->validate([
            'transaction_id' => ['nullable', 'string'],
            'tx_ref' => ['nullable', 'string'],
            'plan_id' => ['nullable'],
        ]);

        $tenant = $request->user()->tenant;
        if (!$tenant) {
            return response()->json(['message' => 'Workspace context not resolved.'], 404);
        }

        /** @var \App\Services\Payments\Drivers\FlutterwaveGatewayDriver $driver */
        $driver = $this->paymentManager->driver('flutterwave');

        $txId = $request->input('transaction_id') ?: $request->input('tx_ref');
        $planId = $request->input('plan_id');

        if (empty($txId)) {
            return response()->json(['message' => 'Transaction ID or reference is required.'], 400);
        }

        try {
            $verifyRes = $driver->verifyTransaction($txId);
            if (empty($verifyRes['status']) || ($verifyRes['data']['status'] ?? '') !== 'successful') {
                return response()->json(['message' => $verifyRes['message'] ?? 'Transaction was not successful.'], 400);
            }

            $txData = $verifyRes['data'] ?? [];
            $customerId = isset($txData['customer']['id']) ? (string) $txData['customer']['id'] : null;
            $paymentPlan = $txData['payment_plan'] ?? null;
            $subId = isset($txData['subscription_id']) ? (string)$txData['subscription_id'] : ($paymentPlan ? (string)$paymentPlan : null);
            $metaPlanId = $txData['meta']['plan_id'] ?? $planId;

            $updateData = [
                'status' => 'active',
                'onboarding_step' => 'complete',
            ];
            if ($customerId) $updateData['flutterwave_customer_id'] = $customerId;
            if ($subId) $updateData['flutterwave_subscription_id'] = $subId;
            if (!empty($metaPlanId)) {
                $updateData['plan_id'] = (int) $metaPlanId;
            } elseif ($paymentPlan) {
                $priceObj = PlanPrice::where('flutterwave_plan_id', (string)$paymentPlan)->first();
                if ($priceObj) {
                    $updateData['plan_id'] = $priceObj->plan_id;
                }
            }

            $tenant->update($updateData);
            Log::info("Tenant {$tenant->id} activated via Flutterwave verify ({$txId}).");

            return response()->json([
                'success' => true,
                'message' => 'Flutterwave subscription activated successfully.',
                'tenant' => $tenant->fresh(),
            ]);
        } catch (\Exception $e) {
            Log::error('Flutterwave verify error: ' . $e->getMessage());
            return response()->json(['message' => 'Verification failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Verify PayPal recurring subscription client-side return.
     */
    public function verifyPayPal(Request $request): JsonResponse
    {
        $request->validate([
            'subscription_id' => ['required', 'string'],
            'plan_id' => ['nullable'],
        ]);

        $tenant = $request->user()->tenant;
        if (!$tenant) {
            return response()->json(['message' => 'Workspace context not resolved.'], 404);
        }

        /** @var \App\Services\Payments\Drivers\PayPalGatewayDriver $driver */
        $driver = $this->paymentManager->driver('paypal');
        $subId = $request->input('subscription_id');
        $planId = $request->input('plan_id');

        try {
            $subDetails = $driver->getSubscription($subId);
            $subStatus = $subDetails['status'] ?? '';

            if ($subStatus === 'APPROVED') {
                $driver->activateSubscription($subId);
                $subStatus = 'ACTIVE';
            }

            if (!in_array($subStatus, ['ACTIVE', 'APPROVED'])) {
                return response()->json([
                    'message' => "PayPal subscription status is {$subStatus} (not active)."
                ], 400);
            }

            $payerId = $subDetails['subscriber']['payer_id'] ?? null;
            $ppPlanId = $subDetails['plan_id'] ?? null;

            $updateData = [
                'status' => 'active',
                'onboarding_step' => 'complete',
                'paypal_subscription_id' => $subId,
            ];
            if ($payerId) $updateData['paypal_customer_id'] = $payerId;
            if ($ppPlanId) {
                $priceObj = PlanPrice::where('paypal_plan_id', $ppPlanId)->first();
                if ($priceObj) {
                    $updateData['plan_id'] = $priceObj->plan_id;
                }
            }
            if (empty($updateData['plan_id']) && !empty($planId)) {
                $updateData['plan_id'] = (int) $planId;
            }

            $tenant->update($updateData);
            Log::info("Tenant {$tenant->id} activated via PayPal subscription verify ({$subId}).");

            return response()->json([
                'success' => true,
                'message' => 'PayPal subscription activated successfully.',
                'tenant' => $tenant->fresh(),
            ]);
        } catch (\Exception $e) {
            Log::error('PayPal verify error: ' . $e->getMessage());
            return response()->json(['message' => 'Verification failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Verify Paddle recurring subscription or checkout return.
     */
    public function verifyPaddle(Request $request): JsonResponse
    {
        $request->validate([
            'transaction_id' => ['required', 'string'],
            'plan_id' => ['nullable'],
        ]);

        $tenant = $request->user()?->tenant;

        /** @var \App\Services\Payments\Drivers\PaddleGatewayDriver $driver */
        $driver = $this->paymentManager->driver('paddle');
        $txId = $request->input('transaction_id');
        $planId = $request->input('plan_id');

        try {
            $verifyRes = $driver->verifyTransaction($txId);
            $txData = $verifyRes['data'] ?? $verifyRes;
            $status = $txData['status'] ?? '';

            if (!in_array($status, ['completed', 'paid', 'billed', 'past_due', 'active'])) {
                return response()->json([
                    'message' => "Paddle transaction status is {$status} (not completed)."
                ], 400);
            }

            $customData = $txData['custom_data'] ?? [];
            if (!$tenant && !empty($customData['tenant_id'])) {
                $tenant = Tenant::find($customData['tenant_id']);
            }

            if (!$tenant) {
                return response()->json(['message' => 'Workspace context not resolved.'], 404);
            }

            $customerId = $txData['customer_id'] ?? null;
            $subId = $txData['subscription_id'] ?? null;
            $customData = $txData['custom_data'] ?? [];
            $metaPlanId = $customData['plan_id'] ?? $planId;

            $updateData = [
                'status' => 'active',
                'onboarding_step' => 'complete',
            ];
            if ($customerId) $updateData['paddle_customer_id'] = $customerId;
            if ($subId) $updateData['paddle_subscription_id'] = $subId;

            if (!empty($metaPlanId)) {
                $updateData['plan_id'] = (int) $metaPlanId;
            } else {
                $items = $txData['items'] ?? [];
                foreach ($items as $item) {
                    $priceId = $item['price']['id'] ?? ($item['price_id'] ?? null);
                    if ($priceId) {
                        $priceObj = PlanPrice::where('paddle_price_id', $priceId)->first();
                        if ($priceObj) {
                            $updateData['plan_id'] = $priceObj->plan_id;
                            break;
                        }
                    }
                }
            }

            $tenant->update($updateData);
            Log::info("Tenant {$tenant->id} activated via Paddle verify ({$txId}).");

            return response()->json([
                'success' => true,
                'message' => 'Paddle subscription activated successfully.',
                'tenant' => $tenant->fresh(),
            ]);
        } catch (\Exception $e) {
            Log::error('Paddle verify error: ' . $e->getMessage());
            return response()->json(['message' => 'Verification failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Resolve the appropriate gateway for a tenant's active subscription.
     */
    protected function getTenantGateway(Tenant $tenant): string
    {
        if (!empty($tenant->paddle_subscription_id)) return 'paddle';
        if (!empty($tenant->paypal_subscription_id)) return 'paypal';
        if (!empty($tenant->razorpay_subscription_id)) return 'razorpay';
        if (!empty($tenant->paystack_subscription_id)) return 'paystack';
        if (!empty($tenant->flutterwave_subscription_id)) return 'flutterwave';
        if (!empty($tenant->stripe_subscription_id) || !empty($tenant->stripe_customer_id)) return 'stripe';

        $tenant->loadMissing('currency');
        if (!empty($tenant->currency?->payment_gateway)) {
            return $tenant->currency->payment_gateway;
        }

        return $this->paymentManager->getActiveGateway();
    }

    /**
     * Create a Customer Billing Portal session url.
     */
    public function portal(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        if (!$tenant) {
            return response()->json(['message' => 'Workspace context not resolved.'], 404);
        }

        $baseUrl = \App\Providers\AppServiceProvider::getFrontendUrl($request->user());
        $returnUrl = "{$baseUrl}/settings/billing";

        try {
            $activeGateway = $this->getTenantGateway($tenant);
            $portalUrl = ($activeGateway === 'stripe')
                ? $this->stripeService->createPortalSession($tenant, $returnUrl)
                : $this->paymentManager->driver($activeGateway)->createPortalSession($tenant, $returnUrl);

            return response()->json([
                'portal_url' => $portalUrl
            ]);
        } catch (\Exception $e) {
            Log::error('Portal session generation failed: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Cancel the subscription (stops renewal at cycle end).
     */
    public function cancel(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        if (!$tenant) {
            return response()->json(['message' => 'Workspace context not resolved.'], 404);
        }

        try {
            $activeGateway = $this->getTenantGateway($tenant);
            if ($activeGateway === 'stripe') {
                $this->stripeService->cancelSubscription($tenant);
            } else {
                $this->paymentManager->driver($activeGateway)->cancelSubscription($tenant);
            }

            return response()->json([
                'message' => 'Subscription set to cancel at the end of the billing period.'
            ]);
        } catch (\Exception $e) {
            Log::error('Subscription cancellation failed: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Detect currency based on user IP or GeoIP without requiring authentication.
     */
    public function detectCurrency(Request $request): JsonResponse
    {
        $tenant = $request->user()?->tenant;
        $resolvedCurrency = $this->geoIPService->resolveCurrency($request, $tenant);
        $activeCurrencies = $this->geoIPService->getActiveCurrencies();
        $ip = $this->geoIPService->getClientIp($request);
        $countryCode = $this->geoIPService->detectCountry($request);

        return response()->json([
            'ip' => $ip,
            'country_code' => $countryCode,
            'resolved_currency' => [
                'id' => $resolvedCurrency->id,
                'code' => $resolvedCurrency->code,
                'symbol' => $resolvedCurrency->symbol,
                'name' => $resolvedCurrency->name,
                'is_default' => (bool)$resolvedCurrency->is_default,
            ],
            'active_currencies' => $activeCurrencies->map(fn($c) => [
                'id' => $c->id,
                'code' => $c->code,
                'symbol' => $c->symbol,
                'name' => $c->name,
                'is_default' => (bool)$c->is_default,
            ]),
        ]);
    }

    /**
     * Resolve platform default primary currency strictly as set in Admin Panel.
     */
    protected function getPlatformDefaultCurrency(): \App\Models\Currency
    {
        return $this->geoIPService->getPlatformDefaultCurrency();
    }

    /**
     * Get public Paddle configuration for client-side Paddle.js initialization.
     */
    public function paddlePublicConfig(): JsonResponse
    {
        /** @var \App\Services\Payments\Drivers\PaddleGatewayDriver $driver */
        $driver = $this->paymentManager->driver('paddle');

        return response()->json([
            'client_token' => $this->paymentManager->getRawConfig('paddle', 'client_token'),
            'mode' => $driver->isTestMode() ? 'sandbox' : 'live',
            'enabled' => (bool)$this->paymentManager->getRawConfig('paddle', 'enabled', false),
        ]);
    }
}

