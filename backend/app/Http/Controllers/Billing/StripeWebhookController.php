<?php

namespace App\Http\Controllers\Billing;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\PlanPrice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class StripeWebhookController extends Controller
{
    /**
     * Handle incoming Stripe webhook events.
     */
    public function handle(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        
        /** @var \App\Services\Payments\Drivers\StripeGatewayDriver $stripeDriver */
        $stripeDriver = app(\App\Services\Payments\PaymentGatewayManager::class)->driver('stripe');
        $endpointSecret = $stripeDriver->getWebhookSecret();

        try {
            if ($endpointSecret && $sigHeader) {
                // Production signature verification
                $event = \Stripe\Webhook::constructEvent(
                    $payload, $sigHeader, $endpointSecret
                );
            } else {
                // Development/testing fallback
                $event = \Stripe\Event::constructFrom(
                    json_decode($payload, true)
                );
            }
        } catch (\UnexpectedValueException $e) {
            Log::error('Stripe Webhook: Invalid payload - ' . $e->getMessage());
            return response()->json(['error' => 'Invalid payload'], 400);
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            Log::error('Stripe Webhook: Invalid signature - ' . $e->getMessage());
            return response()->json(['error' => 'Invalid signature'], 400);
        }

        $eventType = $event->type;
        Log::info("Stripe Webhook received: {$eventType}");

        try {
            switch ($eventType) {
                case 'checkout.session.completed':
                    $this->handleCheckoutSessionCompleted($event->data->object);
                    break;

                case 'customer.subscription.updated':
                    $this->handleSubscriptionUpdated($event->data->object);
                    break;

                case 'customer.subscription.deleted':
                    $this->handleSubscriptionDeleted($event->data->object);
                    break;

                case 'invoice.payment_failed':
                    $this->handleInvoicePaymentFailed($event->data->object);
                    break;

                case 'invoice.paid':
                    $this->handleInvoicePaid($event->data->object);
                    break;

                default:
                    Log::info("Stripe Webhook unhandled: {$eventType}");
                    break;
            }
        } catch (\Exception $e) {
            Log::error("Stripe Webhook Processing Error [{$eventType}]: " . $e->getMessage());
            return response()->json(['error' => 'Handler failed: ' . $e->getMessage()], 500);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Process checkout.session.completed.
     */
    protected function handleCheckoutSessionCompleted(object $session): void
    {
        $tenantId = $session->metadata->tenant_id ?? null;
        $planId = $session->metadata->plan_id ?? null;
        $customerId = $session->customer ?? null;
        $subscriptionId = $session->subscription ?? null;

        Log::info("Checkout Session Completed. Tenant ID: {$tenantId}, Plan ID: {$planId}, Customer ID: {$customerId}, Subscription ID: {$subscriptionId}");

        $tenant = null;
        if ($tenantId) {
            $tenant = Tenant::find($tenantId);
        }
        if (!$tenant && $customerId) {
            $tenant = Tenant::where('stripe_customer_id', $customerId)->first();
        }

        if ($tenant) {
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
            if ($planId) {
                $updateData['plan_id'] = (int) $planId;
            }

            // If plan_id not in session metadata, look up from Stripe subscription metadata or price
            if (empty($updateData['plan_id'])) {
                $stripeDriver = app(\App\Services\Payments\PaymentGatewayManager::class)->driver('stripe');
                $stripeClient = $stripeDriver->getClient();
                if ($stripeClient && $subscriptionId) {
                    try {
                        $subscription = $stripeClient->subscriptions->retrieve($subscriptionId);
                        if (!empty($subscription->metadata->plan_id)) {
                            $updateData['plan_id'] = (int) $subscription->metadata->plan_id;
                        } else {
                            $priceId = $subscription->items->data[0]->price->id ?? null;
                            if ($priceId) {
                                $price = PlanPrice::where('stripe_price_id', $priceId)->first();
                                if ($price) {
                                    $updateData['plan_id'] = $price->plan_id;
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        Log::warning("Could not sync subscription details from Stripe on checkout completion: " . $e->getMessage());
                    }
                }
            }

            $tenant->update($updateData);
        } else {
            Log::warning("Tenant not found for Stripe customer: {$customerId}");
        }
    }

    /**
     * Process customer.subscription.updated.
     */
    protected function handleSubscriptionUpdated(object $subscription): void
    {
        $subscriptionId = $subscription->id;
        $customerId = $subscription->customer;
        $priceId = $subscription->items->data[0]->price->id ?? null;
        $stripeStatus = $subscription->status;

        Log::info("Subscription Updated. Subscription ID: {$subscriptionId}, Price ID: {$priceId}, Status: {$stripeStatus}");

        $tenant = Tenant::where('stripe_subscription_id', $subscriptionId)
            ->orWhere('stripe_customer_id', $customerId)
            ->first();

        if ($tenant) {
            $updateData = [];

            // Sync plan tier
            if ($priceId) {
                $price = PlanPrice::where('stripe_price_id', $priceId)->first();
                if ($price) {
                    $updateData['plan_id'] = $price->plan_id;
                }
            }

            // Sync billing status
            if (in_array($stripeStatus, ['active', 'trialing'])) {
                $updateData['status'] = 'active';
            } elseif (in_array($stripeStatus, ['past_due', 'unpaid', 'incomplete_expired'])) {
                $updateData['status'] = 'suspended';
            }

            $tenant->update($updateData);
        } else {
            Log::warning("Tenant not found for updated subscription: {$subscriptionId}");
        }
    }

    /**
     * Process customer.subscription.deleted.
     */
    protected function handleSubscriptionDeleted(object $subscription): void
    {
        $subscriptionId = $subscription->id;

        Log::info("Subscription Deleted. Subscription ID: {$subscriptionId}");

        $tenant = Tenant::where('stripe_subscription_id', $subscriptionId)->first();

        if ($tenant) {
            $tenant->update([
                'stripe_subscription_id' => null,
                'plan_id' => null,
                'status' => 'suspended', // suspend immediately on cancel expiration
            ]);
        }
    }

    /**
     * Process invoice.payment_failed.
     */
    protected function handleInvoicePaymentFailed(object $invoice): void
    {
        $customerId = $invoice->customer;
        $subscriptionId = $invoice->subscription;

        Log::info("Invoice Payment Failed. Customer ID: {$customerId}, Subscription ID: {$subscriptionId}");

        $tenant = Tenant::where('stripe_customer_id', $customerId)
            ->orWhere('stripe_subscription_id', $subscriptionId)
            ->first();

        if ($tenant) {
            $tenant->update([
                'status' => 'suspended',
            ]);

            // Broadcast payment failure warning to all tenant workspace members
            \App\Services\NotificationService::createAndBroadcast(
                $tenant->id,
                null,
                'Payment Failed',
                "Your latest invoice payment failed. Your workspace subscription has been suspended.",
                'payment_failed'
            );
        }
    }

    /**
     * Process invoice.paid.
     */
    protected function handleInvoicePaid(object $invoice): void
    {
        $customerId = $invoice->customer;
        $subscriptionId = $invoice->subscription;

        Log::info("Invoice Payment Paid. Customer: {$customerId}, Subscription: {$subscriptionId}");

        $tenant = Tenant::where('stripe_customer_id', $customerId)
            ->orWhere('stripe_subscription_id', $subscriptionId)
            ->first();

        if ($tenant) {
            $tenant->update([
                'status' => 'active',
            ]);
        }
    }
}
