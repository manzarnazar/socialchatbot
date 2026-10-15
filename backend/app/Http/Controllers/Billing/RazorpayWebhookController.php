<?php

namespace App\Http\Controllers\Billing;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\PlanPrice;
use App\Services\Payments\PaymentGatewayManager;
use Razorpay\Api\Utility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;

class RazorpayWebhookController extends Controller
{
    protected PaymentGatewayManager $paymentManager;

    public function __construct(PaymentGatewayManager $paymentManager)
    {
        $this->paymentManager = $paymentManager;
    }

    /**
     * Handle incoming Razorpay webhook events.
     */
    public function handle(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('X-Razorpay-Signature');

        /** @var \App\Services\Payments\Drivers\RazorpayGatewayDriver $driver */
        $driver = $this->paymentManager->driver('razorpay');
        $webhookSecret = $driver->getWebhookSecret();

        if (empty($webhookSecret)) {
            Log::error('Razorpay Webhook: Webhook secret is not configured.');
            return response()->json(['error' => 'Webhook secret not configured on server.'], 400);
        }

        if (empty($sigHeader)) {
            Log::error('Razorpay Webhook: Missing X-Razorpay-Signature header.');
            return response()->json(['error' => 'Missing signature header.'], 401);
        }

        $isValid = false;
        try {
            if (class_exists(Utility::class)) {
                (new Utility())->verifyWebhookSignature($payload, $sigHeader, $webhookSecret);
                $isValid = true;
            }
        } catch (Exception $e) {
            $isValid = false;
        }

        if (!$isValid) {
            $expectedSig = hash_hmac('sha256', $payload, $webhookSecret);
            if (!hash_equals($expectedSig, $sigHeader)) {
                Log::error('Razorpay Webhook: Invalid signature.');
                return response()->json(['error' => 'Invalid signature.'], 401);
            }
        }

        $data = json_decode($payload, true);
        if (!$data || !isset($data['event'])) {
            Log::error('Razorpay Webhook: Invalid payload format');
            return response()->json(['error' => 'Invalid payload format'], 400);
        }

        $event = $data['event'];
        Log::info("Razorpay Webhook received: {$event}");

        try {
            switch ($event) {
                case 'subscription.authenticated':
                case 'subscription.activated':
                case 'subscription.charged':
                    $this->handleSubscriptionCharged($data['payload']);
                    break;

                case 'subscription.cancelled':
                case 'subscription.halted':
                case 'subscription.expired':
                    $this->handleSubscriptionCancelled($data['payload']);
                    break;

                case 'payment.captured':
                case 'payment.authorized':
                case 'order.paid':
                    $this->handlePaymentCaptured($data['payload']);
                    break;

                case 'payment_link.paid':
                    $this->handlePaymentLinkPaid($data['payload']);
                    break;

                default:
                    Log::info("Razorpay Webhook ignored event: {$event}");
                    break;
            }

            return response()->json(['status' => 'success']);
        } catch (Exception $e) {
            Log::error("Razorpay Webhook Processing Error [{$event}]: " . $e->getMessage());
            return response()->json(['error' => 'Webhook processing failed', 'details' => $e->getMessage()], 500);
        }
    }

    /**
     * Process subscription activation / charge.
     */
    protected function handleSubscriptionCharged(array $payload): void
    {
        $subscription = $payload['subscription']['entity'] ?? [];
        $subscriptionId = $subscription['id'] ?? null;
        $customerId = $subscription['customer_id'] ?? null;
        $planId = $subscription['plan_id'] ?? null;
        $notes = $subscription['notes'] ?? [];

        $tenantId = $notes['tenant_id'] ?? null;
        $metaPlanId = $notes['plan_id'] ?? null;

        Log::info("Razorpay Subscription Charged. Tenant: {$tenantId}, Sub ID: {$subscriptionId}, Plan ID: {$planId}");

        $tenant = null;
        if ($tenantId) {
            $tenant = Tenant::find($tenantId);
        }
        if (!$tenant && $subscriptionId) {
            $tenant = Tenant::where('razorpay_subscription_id', $subscriptionId)->first();
        }
        if (!$tenant && $customerId) {
            $tenant = Tenant::where('razorpay_customer_id', $customerId)->first();
        }

        if ($tenant) {
            $updateData = [
                'status' => 'active',
                'onboarding_step' => 'complete',
            ];

            if ($subscriptionId) {
                $updateData['razorpay_subscription_id'] = $subscriptionId;
            }
            if ($customerId) {
                $updateData['razorpay_customer_id'] = $customerId;
            }

            if (!empty($metaPlanId)) {
                $updateData['plan_id'] = (int) $metaPlanId;
            } elseif ($planId) {
                $priceObj = PlanPrice::where('razorpay_plan_id', $planId)->first();
                if ($priceObj) {
                    $updateData['plan_id'] = $priceObj->plan_id;
                }
            }

            $tenant->update($updateData);
            Log::info("Tenant {$tenant->id} successfully activated on plan " . ($updateData['plan_id'] ?? 'N/A'));
        }
    }

    /**
     * Process subscription cancellation / halt.
     */
    protected function handleSubscriptionCancelled(array $payload): void
    {
        $subscription = $payload['subscription']['entity'] ?? [];
        $subscriptionId = $subscription['id'] ?? null;
        $customerId = $subscription['customer_id'] ?? null;

        $tenant = null;
        if ($subscriptionId) {
            $tenant = Tenant::where('razorpay_subscription_id', $subscriptionId)->first();
        }
        if (!$tenant && $customerId) {
            $tenant = Tenant::where('razorpay_customer_id', $customerId)->first();
        }

        if ($tenant) {
            $tenant->update([
                'status' => 'suspended',
                'razorpay_subscription_id' => null,
            ]);
            Log::info("Tenant {$tenant->id} suspended on Razorpay subscription cancellation.");
        }
    }

    /**
     * Process payment captured / order paid.
     */
    protected function handlePaymentCaptured(array $payload): void
    {
        $payment = $payload['payment']['entity'] ?? [];
        $notes = $payment['notes'] ?? [];
        $tenantId = $notes['tenant_id'] ?? null;
        $planId = $notes['plan_id'] ?? null;

        if ($tenantId) {
            $tenant = Tenant::find($tenantId);
            if ($tenant) {
                $updateData = [
                    'status' => 'active',
                    'onboarding_step' => 'complete',
                ];
                if (!empty($planId)) {
                    $updateData['plan_id'] = (int) $planId;
                }
                $tenant->update($updateData);
                Log::info("Tenant {$tenant->id} activated via Razorpay Payment Captured.");
            }
        }
    }

    /**
     * Process payment link paid.
     */
    protected function handlePaymentLinkPaid(array $payload): void
    {
        $paymentLink = $payload['payment_link']['entity'] ?? [];
        $notes = $paymentLink['notes'] ?? [];
        $tenantId = $notes['tenant_id'] ?? null;
        $planId = $notes['plan_id'] ?? null;
        $subId = $notes['subscription_id'] ?? null;

        if ($tenantId) {
            $tenant = Tenant::find($tenantId);
            if ($tenant) {
                $updateData = [
                    'status' => 'active',
                    'onboarding_step' => 'complete',
                ];
                if (!empty($planId)) {
                    $updateData['plan_id'] = (int) $planId;
                }
                if (!empty($subId)) {
                    $updateData['razorpay_subscription_id'] = $subId;
                }
                $tenant->update($updateData);
                Log::info("Tenant {$tenant->id} activated via Razorpay Payment Link Paid.");
            }
        }
    }
}
