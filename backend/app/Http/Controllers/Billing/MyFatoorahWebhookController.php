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

class MyFatoorahWebhookController extends Controller
{
    protected PaymentGatewayManager $paymentManager;

    public function __construct(PaymentGatewayManager $paymentManager)
    {
        $this->paymentManager = $paymentManager;
    }

    /**
     * Handle incoming MyFatoorah Webhook / IPN / Callback events.
     */
    public function handle(Request $request): JsonResponse
    {
        $rawPayload = $request->getContent();
        $headers = $request->headers->all();

        /** @var \App\Services\Payments\Drivers\MyFatoorahGatewayDriver $driver */
        $driver = $this->paymentManager->driver('myfatoorah');

        $bodyData = json_decode($rawPayload, true) ?: [];

        // Extract identifiers from JSON body or URL query
        $eventType = $bodyData['Event'] ?? ($bodyData['type'] ?? ($request->query('event') ?? 'PaymentStatusChanged'));
        $dataId = $bodyData['Data']['InvoiceId'] 
            ?? ($bodyData['Data']['PaymentId'] 
            ?? ($bodyData['InvoiceId'] 
            ?? ($bodyData['PaymentId'] 
            ?? ($request->query('paymentId') 
            ?? ($request->query('payment_id') 
            ?? ($request->query('InvoiceId') 
            ?? ($request->query('invoice_id') ?? ($request->query('id') ?? null))))))));

        $recurringId = $bodyData['Data']['RecurringId'] ?? ($bodyData['RecurringId'] ?? ($request->query('recurring_id') ?? null));

        if (!$driver->verifyWebhookSignature($rawPayload, $headers, $dataId)) {
            Log::error('MyFatoorah Webhook: Signature verification failed.');
            return response()->json(['message' => 'Invalid MyFatoorah signature.'], 401);
        }

        Log::info("MyFatoorah Webhook received: Event: '{$eventType}', Data ID: '{$dataId}', Recurring ID: '{$recurringId}'");

        if (empty($dataId) && empty($recurringId)) {
            return response()->json(['status' => 'ignored', 'message' => 'No invoice or payment ID provided.'], 200);
        }

        try {
            if ($eventType === 'RecurringStatusChanged' && !empty($recurringId)) {
                $this->handleRecurringStatusChange((string)$recurringId, $bodyData, $driver);
            } else {
                $this->handlePaymentOrInvoiceStatus((string)$dataId, $bodyData, $driver);
            }

            return response()->json(['status' => 'success']);
        } catch (Exception $e) {
            Log::error("MyFatoorah Webhook Processing Error [Event: {$eventType}, ID: {$dataId}]: " . $e->getMessage());
            return response()->json(['error' => 'Webhook processing failed', 'details' => $e->getMessage()], 500);
        }
    }

    /**
     * Handle payment / invoice status event from MyFatoorah.
     */
    protected function handlePaymentOrInvoiceStatus(string $key, array $bodyData, \App\Services\Payments\Drivers\MyFatoorahGatewayDriver $driver): void
    {
        $statusData = [];
        try {
            $statusData = $driver->getPaymentStatus($key, is_numeric($key) ? 'InvoiceId' : 'PaymentId');
        } catch (Exception $e) {
            Log::warning("MyFatoorah getPaymentStatus query failed for key {$key}: " . $e->getMessage());
            $statusData = $bodyData['Data'] ?? $bodyData;
        }

        $invoiceStatus = $statusData['InvoiceStatus'] ?? ($bodyData['InvoiceStatus'] ?? '');
        $invoiceId = $statusData['InvoiceId'] ?? ($bodyData['InvoiceId'] ?? $key);
        $externalRef = $statusData['CustomerReference'] ?? ($bodyData['CustomerReference'] ?? null);
        $payerEmail = $statusData['CustomerEmail'] ?? ($bodyData['CustomerEmail'] ?? null);
        $recurringId = $statusData['RecurringId'] ?? ($bodyData['RecurringId'] ?? "mf_inv_{$invoiceId}");

        Log::info("MyFatoorah Invoice Status: ID: {$invoiceId}, Status: {$invoiceStatus}, External Ref: {$externalRef}");

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

        if (!$tenant && $recurringId) {
            $tenant = Tenant::where('myfatoorah_subscription_id', $recurringId)
                ->orWhere('myfatoorah_subscription_id', (string)$invoiceId)
                ->first();
        }

        if (!$tenant && $payerEmail) {
            $tenant = Tenant::whereHas('owner', fn($q) => $q->where('email', $payerEmail))->first();
        }

        $userDefinedField = $statusData['UserDefinedField'] ?? ($bodyData['UserDefinedField'] ?? ($bodyData['Data']['UserDefinedField'] ?? null));
        $udf = null;
        if ($userDefinedField) {
            $udf = is_string($userDefinedField) ? json_decode($userDefinedField, true) : $userDefinedField;
            if (is_array($udf) && empty($tenant) && !empty($udf['tenant_id'])) {
                $tenant = Tenant::find((int)$udf['tenant_id']);
            }
        }

        if (!$tenant) {
            Log::warning("MyFatoorah Webhook: Tenant not found for Invoice {$invoiceId}, External Ref: {$externalRef}");
            return;
        }

        if (in_array(strtolower($invoiceStatus), ['paid', 'success', 'captured', 'authorized', 'active'])) {
            $updateData = [
                'status' => 'active',
                'onboarding_step' => 'complete',
                'myfatoorah_subscription_id' => (string)$recurringId,
            ];

            if (!empty($statusData['CustomerId'])) {
                $updateData['myfatoorah_customer_id'] = (string)$statusData['CustomerId'];
            }

            if (is_array($udf)) {
                if (!empty($udf['plan_id'])) {
                    $updateData['plan_id'] = (int)$udf['plan_id'];
                } elseif (!empty($udf['plan_price_id'])) {
                    $priceObj = PlanPrice::find((int)$udf['plan_price_id']);
                    if ($priceObj) {
                        $updateData['plan_id'] = $priceObj->plan_id;
                    }
                }
            }

            if (empty($updateData['plan_id']) && $externalRef && str_contains($externalRef, '_price_')) {
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
            Log::info("Tenant {$tenant->id} activated via MyFatoorah Invoice {$invoiceId}. Plan ID: " . ($updateData['plan_id'] ?? 'unchanged'));
        } elseif (in_array(strtolower($invoiceStatus), ['failed', 'cancelled', 'canceled', 'expired'])) {
            $tenant->update([
                'status' => 'suspended',
                'myfatoorah_subscription_id' => null,
            ]);
            Log::info("Tenant {$tenant->id} suspended on MyFatoorah invoice {$invoiceStatus} ({$invoiceId}).");
        }
    }

    /**
     * Handle recurring subscription status change event from MyFatoorah.
     */
    protected function handleRecurringStatusChange(string $recurringId, array $bodyData, \App\Services\Payments\Drivers\MyFatoorahGatewayDriver $driver): void
    {
        $status = $bodyData['Data']['RecurringStatus'] ?? ($bodyData['Data']['Status'] ?? ($bodyData['RecurringStatus'] ?? ($bodyData['Status'] ?? 'Active')));
        $tenant = Tenant::where('myfatoorah_subscription_id', $recurringId)
            ->orWhere('myfatoorah_subscription_id', str_replace('mf_inv_', '', $recurringId))
            ->first();

        if (!$tenant) {
            $customerRef = $bodyData['Data']['CustomerReference'] ?? ($bodyData['CustomerReference'] ?? null);
            if ($customerRef) {
                if (str_starts_with($customerRef, 'tenant_')) {
                    $parts = explode('_', $customerRef);
                    $tenantId = (int)($parts[1] ?? 0);
                    if ($tenantId > 0) {
                        $tenant = Tenant::find($tenantId);
                    }
                } elseif (is_numeric($customerRef)) {
                    $tenant = Tenant::find((int)$customerRef);
                }
            }
        }

        if (!$tenant) {
            Log::warning("MyFatoorah Recurring Webhook: Tenant not found for Recurring ID {$recurringId}");
            return;
        }

        if (in_array(strtolower($status), ['cancelled', 'canceled', 'suspended', 'stopped', 'expired'])) {
            $tenant->update([
                'status' => 'suspended',
            ]);
            Log::info("Tenant {$tenant->id} suspended on MyFatoorah recurring cancellation ({$recurringId}).");
        } elseif (in_array(strtolower($status), ['active', 'renewed', 'success', 'paid'])) {
            $tenant->update([
                'status' => 'active',
                'myfatoorah_subscription_id' => $recurringId,
            ]);
            Log::info("Tenant {$tenant->id} active on MyFatoorah recurring renewal ({$recurringId}).");
        }
    }
}
