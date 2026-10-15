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

class PaddleWebhookController extends Controller
{
    protected PaymentGatewayManager $paymentManager;

    public function __construct(PaymentGatewayManager $paymentManager)
    {
        $this->paymentManager = $paymentManager;
    }

    /**
     * Handle incoming Paddle webhook events.
     */
    public function handle(Request $request): JsonResponse
    {
        $rawPayload = $request->getContent();
        $headers = $request->headers->all();

        /** @var \App\Services\Payments\Drivers\PaddleGatewayDriver $driver */
        $driver = $this->paymentManager->driver('paddle');

        if (!$driver->verifyWebhookSignature($rawPayload, $headers)) {
            Log::error('Paddle Webhook: Invalid webhook signature verification.');
            return response()->json(['message' => 'Invalid Paddle webhook signature.'], 401);
        }

        $data = json_decode($rawPayload, true);
        if (!$data || !isset($data['event_type'])) {
            Log::error('Paddle Webhook: Missing or invalid event_type');
            return response()->json(['error' => 'Invalid payload format'], 400);
        }

        $eventType = $data['event_type'];
        $eventData = $data['data'] ?? [];
        Log::info("Paddle Webhook received: {$eventType}");

        try {
            switch ($eventType) {
                case 'subscription.created':
                case 'subscription.activated':
                case 'subscription.resumed':
                case 'subscription.updated':
                    $this->handleSubscriptionUpdated($eventData);
                    break;

                case 'subscription.canceled':
                case 'subscription.paused':
                case 'subscription.past_due':
                    $this->handleSubscriptionDisabled($eventData);
                    break;

                case 'transaction.completed':
                    $this->handleTransactionCompleted($eventData);
                    break;

                default:
                    Log::info("Paddle Webhook unhandled event: {$eventType}");
                    break;
            }

            return response()->json(['status' => 'success']);
        } catch (Exception $e) {
            Log::error("Paddle Webhook Processing Error [{$eventType}]: " . $e->getMessage());
            return response()->json(['error' => 'Webhook processing failed', 'details' => $e->getMessage()], 500);
        }
    }

    /**
     * Handle subscription created, activated, or updated.
     */
    protected function handleSubscriptionUpdated(array $resource): void
    {
        $subscriptionId = $resource['id'] ?? null;
        $customerId = $resource['customer_id'] ?? null;
        $tenantId = $resource['custom_data']['tenant_id'] ?? null;
        $priceId = $resource['items'][0]['price']['id'] ?? null;

        Log::info("Paddle Subscription Updated: Sub ID: {$subscriptionId}, Tenant ID: {$tenantId}, Customer: {$customerId}, Price: {$priceId}");

        $tenant = null;
        if ($tenantId) {
            $tenant = Tenant::find($tenantId);
        }
        if (!$tenant && $subscriptionId) {
            $tenant = Tenant::where('paddle_subscription_id', $subscriptionId)->first();
        }
        if (!$tenant && $customerId) {
            $tenant = Tenant::where('paddle_customer_id', $customerId)->first();
        }

        if ($tenant) {
            $updateData = [
                'status' => 'active',
                'onboarding_step' => 'complete',
            ];

            if ($subscriptionId) {
                $updateData['paddle_subscription_id'] = $subscriptionId;
            }
            if ($customerId) {
                $updateData['paddle_customer_id'] = $customerId;
            }

            if ($priceId) {
                $priceObj = PlanPrice::where('paddle_price_id', $priceId)->first();
                if ($priceObj) {
                    $updateData['plan_id'] = $priceObj->plan_id;
                }
            }

            $tenant->update($updateData);
            Log::info("Tenant {$tenant->id} activated via Paddle Subscription ({$subscriptionId}) on plan " . ($updateData['plan_id'] ?? 'current'));
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
            $tenant = Tenant::where('paddle_subscription_id', $subscriptionId)->first();
        }

        if ($tenant) {
            $tenant->update([
                'status' => 'suspended',
                'paddle_subscription_id' => null,
            ]);
            Log::info("Tenant {$tenant->id} suspended on Paddle subscription cancel/suspend ({$subscriptionId}).");
        }
    }

    /**
     * Handle transaction completed.
     */
    protected function handleTransactionCompleted(array $resource): void
    {
        $subscriptionId = $resource['subscription_id'] ?? null;
        $customerId = $resource['customer_id'] ?? null;
        $tenantId = $resource['custom_data']['tenant_id'] ?? null;
        $priceId = $resource['items'][0]['price']['id'] ?? null;

        $tenant = null;
        if ($tenantId) {
            $tenant = Tenant::find($tenantId);
        }
        if (!$tenant && $subscriptionId) {
            $tenant = Tenant::where('paddle_subscription_id', $subscriptionId)->first();
        }
        if (!$tenant && $customerId) {
            $tenant = Tenant::where('paddle_customer_id', $customerId)->first();
        }

        if ($tenant) {
            $updateData = [
                'status' => 'active',
            ];
            if ($subscriptionId) {
                $updateData['paddle_subscription_id'] = $subscriptionId;
            }
            if ($customerId) {
                $updateData['paddle_customer_id'] = $customerId;
            }
            if ($priceId) {
                $priceObj = PlanPrice::where('paddle_price_id', $priceId)->first();
                if ($priceObj) {
                    $updateData['plan_id'] = $priceObj->plan_id;
                }
            }
            $tenant->update($updateData);
            Log::info("Tenant {$tenant->id} confirmed active on Paddle transaction completed (Sub: {$subscriptionId}).");
        }
    }
}
