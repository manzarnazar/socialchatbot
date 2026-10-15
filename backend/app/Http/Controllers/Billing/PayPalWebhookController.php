<?php

namespace App\Http\Controllers\Billing;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\PlanPrice;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;

class PayPalWebhookController extends Controller
{
    protected PaymentGatewayManager $paymentManager;

    public function __construct(PaymentGatewayManager $paymentManager)
    {
        $this->paymentManager = $paymentManager;
    }

    /**
     * Handle incoming PayPal webhook events.
     */
    public function handle(Request $request): JsonResponse
    {
        $rawPayload = $request->getContent();
        $headers = $request->headers->all();

        /** @var \App\Services\Payments\Drivers\PayPalGatewayDriver $driver */
        $driver = $this->paymentManager->driver('paypal');

        if (!$driver->verifyWebhookSignature($rawPayload, $headers)) {
            Log::error('PayPal Webhook: Invalid webhook signature verification.');
            return response()->json(['error' => 'Invalid signature verification'], 400);
        }

        $data = json_decode($rawPayload, true);
        if (!$data || !isset($data['event_type'])) {
            Log::error('PayPal Webhook: Missing or invalid event_type');
            return response()->json(['error' => 'Invalid payload format'], 400);
        }

        $eventType = $data['event_type'];
        $resource = $data['resource'] ?? [];
        Log::info("PayPal Webhook received: {$eventType}");

        try {
            switch ($eventType) {
                case 'BILLING.SUBSCRIPTION.ACTIVATED':
                case 'BILLING.SUBSCRIPTION.CREATED':
                case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
                    $this->handleSubscriptionActivated($resource);
                    break;

                case 'BILLING.SUBSCRIPTION.CANCELLED':
                case 'BILLING.SUBSCRIPTION.SUSPENDED':
                case 'BILLING.SUBSCRIPTION.EXPIRED':
                    $this->handleSubscriptionDisabled($resource);
                    break;

                case 'PAYMENT.SALE.COMPLETED':
                    $this->handleSaleCompleted($resource);
                    break;

                default:
                    Log::info("PayPal Webhook unhandled event: {$eventType}");
                    break;
            }

            return response()->json(['status' => 'success']);
        } catch (Exception $e) {
            Log::error("PayPal Webhook Processing Error [{$eventType}]: " . $e->getMessage());
            return response()->json(['error' => 'Webhook processing failed', 'details' => $e->getMessage()], 500);
        }
    }

    /**
     * Handle subscription activation event.
     */
    protected function handleSubscriptionActivated(array $resource): void
    {
        $subscriptionId = $resource['id'] ?? null;
        $tenantId = $resource['custom_id'] ?? null;
        $planId = $resource['plan_id'] ?? null;
        $payerId = $resource['subscriber']['payer_id'] ?? null;
        $subscriberEmail = $resource['subscriber']['email_address'] ?? null;

        Log::info("PayPal Subscription Activated: Sub ID: {$subscriptionId}, Tenant ID: {$tenantId}, Payer: {$payerId}");

        $tenant = null;
        if ($tenantId) {
            $tenant = Tenant::find($tenantId);
        }
        if (!$tenant && $subscriptionId) {
            $tenant = Tenant::where('paypal_subscription_id', $subscriptionId)->first();
        }
        if (!$tenant && !empty($subscriberEmail)) {
            $tenant = Tenant::whereHas('users', function ($q) use ($subscriberEmail) {
                $q->where('email', strtolower($subscriberEmail));
            })->first();
        }

        if ($tenant) {
            $updateData = [
                'status' => 'active',
                'onboarding_step' => 'complete',
            ];

            if ($subscriptionId) {
                $updateData['paypal_subscription_id'] = $subscriptionId;
            }
            if ($payerId) {
                $updateData['paypal_customer_id'] = $payerId;
            }

            if ($planId) {
                $priceObj = PlanPrice::where('paypal_plan_id', $planId)->first();
                if ($priceObj) {
                    $updateData['plan_id'] = $priceObj->plan_id;
                }
            }

            $tenant->update($updateData);
            Log::info("Tenant {$tenant->id} activated via PayPal Subscription ({$subscriptionId}) on plan " . ($updateData['plan_id'] ?? 'current'));
        }
    }

    /**
     * Handle recurring subscription cancellation / suspension.
     */
    protected function handleSubscriptionDisabled(array $resource): void
    {
        $subscriptionId = $resource['id'] ?? null;
        $tenant = null;

        if ($subscriptionId) {
            $tenant = Tenant::where('paypal_subscription_id', $subscriptionId)->first();
        }

        if ($tenant) {
            $tenant->update([
                'status' => 'suspended',
                'paypal_subscription_id' => null,
            ]);
            Log::info("Tenant {$tenant->id} suspended on PayPal subscription cancel/suspend ({$subscriptionId}).");
        }
    }

    /**
     * Handle successful payment sale completion.
     */
    protected function handleSaleCompleted(array $resource): void
    {
        $billingAgreementId = $resource['billing_agreement_id'] ?? null;
        if (!$billingAgreementId) {
            return;
        }

        $tenant = Tenant::where('paypal_subscription_id', $billingAgreementId)->first();
        if ($tenant) {
            $tenant->update([
                'status' => 'active',
            ]);
            Log::info("Tenant {$tenant->id} confirmed active on PayPal sale completed ({$billingAgreementId}).");
        }
    }
}
