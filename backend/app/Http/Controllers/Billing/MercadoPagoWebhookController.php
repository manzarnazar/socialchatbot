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

class MercadoPagoWebhookController extends Controller
{
    protected PaymentGatewayManager $paymentManager;

    public function __construct(PaymentGatewayManager $paymentManager)
    {
        $this->paymentManager = $paymentManager;
    }

    /**
     * Handle incoming Mercado Pago Webhook / IPN events.
     */
    public function handle(Request $request): JsonResponse
    {
        $rawPayload = $request->getContent();
        $headers = $request->headers->all();

        /** @var \App\Services\Payments\Drivers\MercadoPagoGatewayDriver $driver */
        $driver = $this->paymentManager->driver('mercadopago');

        $bodyData = json_decode($rawPayload, true) ?: [];

        // Extract event type and resource ID from JSON body or URL query parameters
        $eventType = $bodyData['type'] ?? ($bodyData['action'] ?? ($request->query('type') ?? $request->query('topic')));
        $dataId = $bodyData['data']['id'] ?? ($request->query('data_id') ?? ($request->query('data.id') ?? ($request->query('id') ?? null)));
        $requestId = $headers['x-request-id'][0] ?? ($headers['x-request-id'] ?? null);

        if (!$driver->verifyWebhookSignature($rawPayload, $headers, $dataId, $requestId)) {
            Log::error('Mercado Pago Webhook: Signature verification failed.');
            return response()->json(['message' => 'Invalid Mercado Pago signature.'], 401);
        }

        Log::info("Mercado Pago Webhook received: Type: '{$eventType}', Data ID: '{$dataId}'");

        if (empty($dataId)) {
            return response()->json(['status' => 'ignored', 'message' => 'No data ID provided.'], 200);
        }

        try {
            switch ($eventType) {
                case 'subscription_preapproval':
                case 'preapproval':
                case 'subscription_preapproval.created':
                case 'subscription_preapproval.updated':
                    $this->handleSubscriptionPreapproval((string)$dataId, $driver);
                    break;

                case 'payment':
                case 'payment.created':
                case 'payment.updated':
                case 'subscription_authorized_payment':
                    $this->handlePayment((string)$dataId, $driver);
                    break;

                default:
                    // If eventType not recognized, attempt subscription lookup then payment lookup
                    try {
                        $this->handleSubscriptionPreapproval((string)$dataId, $driver);
                    } catch (Exception $e) {
                        try {
                            $this->handlePayment((string)$dataId, $driver);
                        } catch (Exception $pEx) {
                            Log::info("Mercado Pago Webhook unhandled event: {$eventType}, ID: {$dataId}");
                        }
                    }
                    break;
            }

            return response()->json(['status' => 'success']);
        } catch (Exception $e) {
            Log::error("Mercado Pago Webhook Processing Error [{$eventType}, ID: {$dataId}]: " . $e->getMessage());
            return response()->json(['error' => 'Webhook processing failed', 'details' => $e->getMessage()], 500);
        }
    }

    /**
     * Handle recurring preapproval subscription event.
     */
    protected function handleSubscriptionPreapproval(string $preapprovalId, \App\Services\Payments\Drivers\MercadoPagoGatewayDriver $driver): void
    {
        $sub = $driver->getSubscription($preapprovalId);
        $status = $sub['status'] ?? '';
        $payerEmail = $sub['payer_email'] ?? ($sub['payer']['email'] ?? null);
        $payerId = isset($sub['payer_id']) ? (string)$sub['payer_id'] : ($sub['payer']['id'] ?? null);
        $planId = $sub['preapproval_plan_id'] ?? null;
        $externalRef = $sub['external_reference'] ?? null;

        Log::info("Mercado Pago Preapproval: ID: {$preapprovalId}, Status: {$status}, Plan: {$planId}, External Ref: {$externalRef}");

        $tenant = null;
        if ($externalRef) {
            if (str_starts_with($externalRef, 'tenant_')) {
                $parts = explode('_', $externalRef);
                $tenantId = (int)($parts[1] ?? 0);
                if ($tenantId > 0) {
                    $tenant = Tenant::find($tenantId);
                }
            } elseif (is_numeric($externalRef)) {
                $tenant = Tenant::find((int)$externalRef);
            }
        }

        if (!$tenant) {
            $tenant = Tenant::where('mercadopago_subscription_id', $preapprovalId)->first();
        }

        if (!$tenant && $payerEmail) {
            $tenant = Tenant::whereHas('owner', fn($q) => $q->where('email', $payerEmail))->first();
        }

        if (!$tenant) {
            Log::warning("Mercado Pago Preapproval: Tenant not found for ID {$preapprovalId}");
            return;
        }

        if (in_array(strtolower($status), ['authorized', 'active'])) {
            $updateData = [
                'status' => 'active',
                'onboarding_step' => 'complete',
                'mercadopago_subscription_id' => $preapprovalId,
            ];

            if ($payerId) {
                $updateData['mercadopago_customer_id'] = (string)$payerId;
            }

            if ($planId) {
                $priceObj = PlanPrice::where('mercadopago_plan_id', $planId)->first();
                if ($priceObj) {
                    $updateData['plan_id'] = $priceObj->plan_id;
                }
            }

            // Fallback: check if price ID is embedded in externalRef
            if (empty($updateData['plan_id']) && $externalRef && str_contains($externalRef, '_price_')) {
                $parts = explode('_price_', $externalRef);
                $priceIdOrVal = $parts[1] ?? null;
                if ($priceIdOrVal) {
                    $priceObj = PlanPrice::where('id', is_numeric($priceIdOrVal) ? (int)$priceIdOrVal : 0)
                        ->orWhere('stripe_price_id', $priceIdOrVal)
                        ->orWhere('mercadopago_plan_id', $priceIdOrVal)
                        ->first();
                    if ($priceObj) {
                        $updateData['plan_id'] = $priceObj->plan_id;
                    }
                }
            }

            $tenant->update($updateData);
            Log::info("Tenant {$tenant->id} activated via Mercado Pago Preapproval ({$preapprovalId}).");
        } elseif (in_array(strtolower($status), ['cancelled', 'paused'])) {
            $tenant->update([
                'status' => 'suspended',
                'mercadopago_subscription_id' => null,
            ]);
            Log::info("Tenant {$tenant->id} suspended on Mercado Pago preapproval {$status} ({$preapprovalId}).");
        }
    }

    /**
     * Handle recurring authorized payment event.
     */
    protected function handlePayment(string $paymentId, \App\Services\Payments\Drivers\MercadoPagoGatewayDriver $driver): void
    {
        $payment = $driver->getPayment($paymentId);
        $status = $payment['status'] ?? '';
        $externalRef = $payment['external_reference'] ?? null;
        $payerEmail = $payment['payer']['email'] ?? null;
        $payerId = isset($payment['payer']['id']) ? (string)$payment['payer']['id'] : null;

        Log::info("Mercado Pago Payment: ID: {$paymentId}, Status: {$status}, External Ref: {$externalRef}");

        if ($status !== 'approved') {
            return;
        }

        $tenant = null;
        if ($externalRef) {
            if (str_starts_with($externalRef, 'tenant_')) {
                $parts = explode('_', $externalRef);
                $tenantId = (int)($parts[1] ?? 0);
                if ($tenantId > 0) {
                    $tenant = Tenant::find($tenantId);
                }
            } elseif (is_numeric($externalRef)) {
                $tenant = Tenant::find((int)$externalRef);
            }
        }

        if (!$tenant && $payerEmail) {
            $tenant = Tenant::whereHas('owner', fn($q) => $q->where('email', $payerEmail))->first();
        }

        if ($tenant) {
            $updateData = [
                'status' => 'active',
            ];
            if ($payerId) {
                $updateData['mercadopago_customer_id'] = (string)$payerId;
            }

            // Resolve plan from external_reference if present
            if ($externalRef && str_contains($externalRef, '_price_')) {
                $parts = explode('_price_', $externalRef);
                $priceIdOrVal = $parts[1] ?? null;
                if ($priceIdOrVal) {
                    $priceObj = PlanPrice::where('id', is_numeric($priceIdOrVal) ? (int)$priceIdOrVal : 0)
                        ->orWhere('stripe_price_id', $priceIdOrVal)
                        ->orWhere('mercadopago_plan_id', $priceIdOrVal)
                        ->first();
                    if ($priceObj) {
                        $updateData['plan_id'] = $priceObj->plan_id;
                    }
                }
            }

            $tenant->update($updateData);
            Log::info("Tenant {$tenant->id} confirmed active on Mercado Pago payment approved ({$paymentId}).");
        }
    }
}
