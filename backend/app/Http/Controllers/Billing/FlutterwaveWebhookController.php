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

class FlutterwaveWebhookController extends Controller
{
    protected PaymentGatewayManager $paymentManager;

    public function __construct(PaymentGatewayManager $paymentManager)
    {
        $this->paymentManager = $paymentManager;
    }

    /**
     * Handle incoming Flutterwave webhook events.
     */
    public function handle(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('verif-hash') ?? $request->header('Verif-Hash');

        /** @var \App\Services\Payments\Drivers\FlutterwaveGatewayDriver $driver */
        $driver = $this->paymentManager->driver('flutterwave');

        if (!$driver->verifyWebhookSignature($payload, $sigHeader)) {
            Log::error('Flutterwave Webhook: Invalid verif-hash signature.');
            return response()->json(['error' => 'Invalid signature'], 400);
        }

        $data = json_decode($payload, true);
        if (!$data || !isset($data['event'])) {
            Log::error('Flutterwave Webhook: Invalid payload format');
            return response()->json(['error' => 'Invalid payload format'], 400);
        }

        $event = $data['event'];
        Log::info("Flutterwave Webhook received: {$event}");

        try {
            switch ($event) {
                case 'charge.completed':
                    $this->handleChargeCompleted($data['data'] ?? []);
                    break;

                case 'subscription.cancelled':
                    $this->handleSubscriptionCancelled($data['data'] ?? []);
                    break;

                default:
                    Log::info("Flutterwave Webhook unhandled event: {$event}");
                    break;
            }

            return response()->json(['status' => 'success']);
        } catch (Exception $e) {
            Log::error("Flutterwave Webhook Processing Error [{$event}]: " . $e->getMessage());
            return response()->json(['error' => 'Webhook processing failed', 'details' => $e->getMessage()], 500);
        }
    }

    /**
     * Handle successful charge event.
     */
    protected function handleChargeCompleted(array $data): void
    {
        if (($data['status'] ?? '') !== 'successful') {
            return;
        }

        $meta = $data['meta'] ?? [];
        $tenantId = $meta['tenant_id'] ?? null;
        $metaPlanId = $meta['plan_id'] ?? null;
        $planId = $data['payment_plan'] ?? null;
        $customer = $data['customer'] ?? [];
        $customerId = isset($customer['id']) ? (string) $customer['id'] : null;
        $customerEmail = $customer['email'] ?? null;
        $subId = isset($data['subscription_id']) ? (string)$data['subscription_id'] : ($planId ? (string)$planId : null);

        Log::info("Flutterwave Charge Completed. Tenant ID: {$tenantId}, Plan: {$planId}, Customer: {$customerId}");

        $tenant = null;
        if ($tenantId) {
            $tenant = Tenant::find($tenantId);
        }
        if (!$tenant && $customerId) {
            $tenant = Tenant::where('flutterwave_customer_id', $customerId)->first();
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

            if ($customerId) {
                $updateData['flutterwave_customer_id'] = $customerId;
            }
            if ($subId) {
                $updateData['flutterwave_subscription_id'] = $subId;
            }

            if (!empty($metaPlanId)) {
                $updateData['plan_id'] = (int) $metaPlanId;
            } elseif ($planId) {
                $priceObj = PlanPrice::where('flutterwave_plan_id', (string)$planId)->first();
                if ($priceObj) {
                    $updateData['plan_id'] = $priceObj->plan_id;
                }
            }

            $tenant->update($updateData);
            Log::info("Tenant {$tenant->id} activated via Flutterwave Charge Completed on plan " . ($updateData['plan_id'] ?? 'N/A'));
        }
    }

    /**
     * Handle subscription cancellation event.
     */
    protected function handleSubscriptionCancelled(array $data): void
    {
        $subId = isset($data['id']) ? (string)$data['id'] : null;
        $customer = $data['customer'] ?? [];
        $customerId = isset($customer['id']) ? (string) $customer['id'] : null;

        $tenant = null;
        if ($subId) {
            $tenant = Tenant::where('flutterwave_subscription_id', $subId)->first();
        }
        if (!$tenant && $customerId) {
            $tenant = Tenant::where('flutterwave_customer_id', $customerId)->first();
        }

        if ($tenant) {
            $tenant->update([
                'status' => 'suspended',
                'flutterwave_subscription_id' => null,
            ]);
            Log::info("Tenant {$tenant->id} suspended on Flutterwave subscription cancellation.");
        }
    }
}
