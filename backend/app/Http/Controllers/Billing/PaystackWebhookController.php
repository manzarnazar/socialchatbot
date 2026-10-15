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

class PaystackWebhookController extends Controller
{
    protected PaymentGatewayManager $paymentManager;

    public function __construct(PaymentGatewayManager $paymentManager)
    {
        $this->paymentManager = $paymentManager;
    }

    /**
     * Handle incoming Paystack webhook events.
     */
    public function handle(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('x-paystack-signature') ?? $request->header('X-Paystack-Signature');

        /** @var \App\Services\Payments\Drivers\PaystackGatewayDriver $driver */
        $driver = $this->paymentManager->driver('paystack');

        if (!$driver->verifyWebhookSignature($payload, $sigHeader)) {
            Log::error('Paystack Webhook: Invalid HMAC-SHA512 signature.');
            return response()->json(['error' => 'Invalid signature'], 400);
        }

        $data = json_decode($payload, true);
        if (!$data || !isset($data['event'])) {
            Log::error('Paystack Webhook: Invalid payload format');
            return response()->json(['error' => 'Invalid payload format'], 400);
        }

        $event = $data['event'];
        Log::info("Paystack Webhook received: {$event}");

        try {
            switch ($event) {
                case 'charge.success':
                    $this->handleChargeSuccess($data['data'] ?? []);
                    break;

                case 'subscription.create':
                case 'subscription.enable':
                    $this->handleSubscriptionCreated($data['data'] ?? []);
                    break;

                case 'subscription.disable':
                case 'subscription.not_renew':
                    $this->handleSubscriptionDisabled($data['data'] ?? []);
                    break;

                case 'invoice.payment_failed':
                    $this->handleInvoicePaymentFailed($data['data'] ?? []);
                    break;

                default:
                    Log::info("Paystack Webhook unhandled event: {$event}");
                    break;
            }

            return response()->json(['status' => 'success']);
        } catch (Exception $e) {
            Log::error("Paystack Webhook Processing Error [{$event}]: " . $e->getMessage());
            return response()->json(['error' => 'Webhook processing failed', 'details' => $e->getMessage()], 500);
        }
    }

    /**
     * Handle successful charge event.
     */
    protected function handleChargeSuccess(array $data): void
    {
        $metadata = $data['metadata'] ?? [];
        $tenantId = $metadata['tenant_id'] ?? null;
        $metaPlanId = $metadata['plan_id'] ?? null;
        $planCode = $data['plan']['plan_code'] ?? ($data['plan'] ?? null);
        $customer = $data['customer'] ?? [];
        $customerCode = $customer['customer_code'] ?? null;
        $customerEmail = $customer['email'] ?? null;

        Log::info("Paystack Charge Success. Tenant ID: {$tenantId}, Plan: {$planCode}, Customer: {$customerCode}");

        $tenant = null;
        if ($tenantId) {
            $tenant = Tenant::find($tenantId);
        }
        if (!$tenant && $customerCode) {
            $tenant = Tenant::where('paystack_customer_id', $customerCode)->first();
        }
        if (!$tenant && !empty($customerEmail)) {
            $tenant = Tenant::whereHas('users', function ($q) use ($customerEmail) {
                $q->where('email', strtolower($customerEmail));
            })->first();
        }

        if ($tenant) {
            $updateData = [
                'status' => 'active',
                'onboarding_step' => 'complete',
            ];

            if ($customerCode) {
                $updateData['paystack_customer_id'] = $customerCode;
            }

            $subCode = $data['subscription']['subscription_code'] ?? ($data['subscription_code'] ?? null);
            $emailToken = $data['subscription']['email_token'] ?? ($data['email_token'] ?? null);

            if (empty($subCode) && !empty($customerCode) && !empty($planCode)) {
                try {
                    /** @var \App\Services\Payments\Drivers\PaystackGatewayDriver $driver */
                    $driver = $this->paymentManager->driver('paystack');
                    $authCode = $data['authorization']['authorization_code'] ?? null;
                    $subData = $driver->createSubscription($customerCode, $planCode, $authCode);
                    if ($subData) {
                        $subCode = $subData['subscription_code'] ?? null;
                        $emailToken = $subData['email_token'] ?? null;
                    }
                } catch (\Exception $e) {
                    Log::warning('Paystack webhook subscription auto-creation failed: ' . $e->getMessage());
                }
            }

            if ($subCode) {
                $updateData['paystack_subscription_id'] = $subCode;
            }
            if ($emailToken) {
                $updateData['paystack_email_token'] = $emailToken;
            }

            if (!empty($metaPlanId)) {
                $updateData['plan_id'] = (int) $metaPlanId;
            } elseif ($planCode) {
                $priceObj = PlanPrice::where('paystack_plan_code', $planCode)->first();
                if ($priceObj) {
                    $updateData['plan_id'] = $priceObj->plan_id;
                }
            }

            $tenant->update($updateData);
            Log::info("Tenant {$tenant->id} activated via Paystack Charge Success on plan " . ($updateData['plan_id'] ?? 'N/A'));
        }
    }

    /**
     * Handle recurring subscription creation / enablement.
     */
    protected function handleSubscriptionCreated(array $data): void
    {
        $subscriptionCode = $data['subscription_code'] ?? null;
        $emailToken = $data['email_token'] ?? null;
        $customer = $data['customer'] ?? [];
        $customerCode = $customer['customer_code'] ?? null;
        $customerEmail = $customer['email'] ?? null;
        $planCode = $data['plan']['plan_code'] ?? ($data['plan'] ?? null);

        Log::info("Paystack Subscription Created: Sub Code: {$subscriptionCode}, Customer: {$customerCode}");

        $tenant = null;
        if ($subscriptionCode) {
            $tenant = Tenant::where('paystack_subscription_id', $subscriptionCode)->first();
        }
        if (!$tenant && $customerCode) {
            $tenant = Tenant::where('paystack_customer_id', $customerCode)->first();
        }
        if (!$tenant && !empty($customerEmail)) {
            $tenant = Tenant::whereHas('users', function ($q) use ($customerEmail) {
                $q->where('email', strtolower($customerEmail));
            })->first();
        }

        if ($tenant) {
            $updateData = [
                'status' => 'active',
                'onboarding_step' => 'complete',
            ];

            if ($subscriptionCode) {
                $updateData['paystack_subscription_id'] = $subscriptionCode;
            }
            if ($emailToken) {
                $updateData['paystack_email_token'] = $emailToken;
            }
            if ($customerCode) {
                $updateData['paystack_customer_id'] = $customerCode;
            }

            if ($planCode) {
                $priceObj = PlanPrice::where('paystack_plan_code', $planCode)->first();
                if ($priceObj) {
                    $updateData['plan_id'] = $priceObj->plan_id;
                }
            }

            $tenant->update($updateData);
            Log::info("Tenant {$tenant->id} updated with Paystack subscription {$subscriptionCode}.");
        }
    }

    /**
     * Handle subscription cancellation / disablement.
     */
    protected function handleSubscriptionDisabled(array $data): void
    {
        $subscriptionCode = $data['subscription_code'] ?? null;
        $customerCode = $data['customer']['customer_code'] ?? null;

        $tenant = null;
        if ($subscriptionCode) {
            $tenant = Tenant::where('paystack_subscription_id', $subscriptionCode)->first();
        }
        if (!$tenant && $customerCode) {
            $tenant = Tenant::where('paystack_customer_id', $customerCode)->first();
        }

        if ($tenant) {
            $tenant->update([
                'status' => 'suspended',
                'paystack_subscription_id' => null,
                'paystack_email_token' => null,
            ]);
            Log::info("Tenant {$tenant->id} suspended on Paystack subscription disable.");
        }
    }

    /**
     * Handle invoice payment failure.
     */
    protected function handleInvoicePaymentFailed(array $data): void
    {
        $subscriptionCode = $data['subscription_code'] ?? null;
        $customerCode = $data['customer']['customer_code'] ?? null;

        Log::warning("Paystack Invoice Payment Failed for Sub: {$subscriptionCode}, Customer: {$customerCode}");
    }
}
