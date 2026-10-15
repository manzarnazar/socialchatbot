<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Exception;

class AdminPaymentGatewayController extends Controller
{
    protected PaymentGatewayManager $paymentManager;

    public function __construct(PaymentGatewayManager $paymentManager)
    {
        $this->paymentManager = $paymentManager;
    }

    /**
     * List all supported payment gateways and masked status.
     */
    public function index(): JsonResponse
    {
        $summary = $this->paymentManager->getAllGatewaysSummary();
        return response()->json($summary);
    }

    /**
     * Save payment gateway configuration.
     */
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'active_gateway' => ['nullable', 'string', 'in:stripe,razorpay,paystack,flutterwave,paypal,paddle,mercadopago,myfatoorah'],
            'gateways' => ['nullable', 'array'],
            'gateways.stripe' => ['nullable', 'array'],
            'gateways.stripe.enabled' => ['nullable', 'boolean'],
            'gateways.stripe.mode' => ['nullable', 'string', 'in:test,live'],
            'gateways.stripe.publishable_key' => ['nullable', 'string'],
            'gateways.stripe.secret_key' => ['nullable', 'string'],
            'gateways.stripe.webhook_secret' => ['nullable', 'string'],
            'gateways.razorpay' => ['nullable', 'array'],
            'gateways.razorpay.enabled' => ['nullable', 'boolean'],
            'gateways.razorpay.mode' => ['nullable', 'string', 'in:test,live'],
            'gateways.razorpay.key_id' => ['nullable', 'string'],
            'gateways.razorpay.key_secret' => ['nullable', 'string'],
            'gateways.razorpay.publishable_key' => ['nullable', 'string'],
            'gateways.razorpay.secret_key' => ['nullable', 'string'],
            'gateways.razorpay.webhook_secret' => ['nullable', 'string'],
            'gateways.paystack' => ['nullable', 'array'],
            'gateways.paystack.enabled' => ['nullable', 'boolean'],
            'gateways.paystack.mode' => ['nullable', 'string', 'in:test,live'],
            'gateways.paystack.public_key' => ['nullable', 'string'],
            'gateways.paystack.publishable_key' => ['nullable', 'string'],
            'gateways.paystack.secret_key' => ['nullable', 'string'],
            'gateways.paystack.webhook_secret' => ['nullable', 'string'],
            'gateways.flutterwave' => ['nullable', 'array'],
            'gateways.flutterwave.enabled' => ['nullable', 'boolean'],
            'gateways.flutterwave.mode' => ['nullable', 'string', 'in:test,live'],
            'gateways.flutterwave.public_key' => ['nullable', 'string'],
            'gateways.flutterwave.publishable_key' => ['nullable', 'string'],
            'gateways.flutterwave.secret_key' => ['nullable', 'string'],
            'gateways.flutterwave.webhook_secret' => ['nullable', 'string'],
            'gateways.paypal' => ['nullable', 'array'],
            'gateways.paypal.enabled' => ['nullable', 'boolean'],
            'gateways.paypal.mode' => ['nullable', 'string', 'in:test,live,sandbox'],
            'gateways.paypal.client_id' => ['nullable', 'string'],
            'gateways.paypal.client_secret' => ['nullable', 'string'],
            'gateways.paypal.webhook_id' => ['nullable', 'string'],
            'gateways.paypal.publishable_key' => ['nullable', 'string'],
            'gateways.paypal.secret_key' => ['nullable', 'string'],
            'gateways.paypal.webhook_secret' => ['nullable', 'string'],
            'gateways.paddle' => ['nullable', 'array'],
            'gateways.paddle.enabled' => ['nullable', 'boolean'],
            'gateways.paddle.mode' => ['nullable', 'string', 'in:sandbox,test,live'],
            'gateways.paddle.client_token' => ['nullable', 'string'],
            'gateways.paddle.api_key' => ['nullable', 'string'],
            'gateways.paddle.webhook_secret' => ['nullable', 'string'],
            'gateways.paddle.vendor_id' => ['nullable', 'string'],
            'gateways.mercadopago' => ['nullable', 'array'],
            'gateways.mercadopago.enabled' => ['nullable', 'boolean'],
            'gateways.mercadopago.mode' => ['nullable', 'string', 'in:test,live,sandbox'],
            'gateways.mercadopago.public_key' => ['nullable', 'string'],
            'gateways.mercadopago.publishable_key' => ['nullable', 'string'],
            'gateways.mercadopago.access_token' => ['nullable', 'string'],
            'gateways.mercadopago.secret_key' => ['nullable', 'string'],
            'gateways.mercadopago.webhook_secret' => ['nullable', 'string'],
            'gateways.myfatoorah' => ['nullable', 'array'],
            'gateways.myfatoorah.enabled' => ['nullable', 'boolean'],
            'gateways.myfatoorah.mode' => ['nullable', 'string', 'in:test,live,sandbox'],
            'gateways.myfatoorah.api_key' => ['nullable', 'string'],
            'gateways.myfatoorah.api_token' => ['nullable', 'string'],
            'gateways.myfatoorah.public_key' => ['nullable', 'string'],
            'gateways.myfatoorah.publishable_key' => ['nullable', 'string'],
            'gateways.myfatoorah.secret_key' => ['nullable', 'string'],
            'gateways.myfatoorah.webhook_secret' => ['nullable', 'string'],
        ]);

        $validated = $request->all();
        $currentConfig = $this->paymentManager->getRawConfig();

        $mergedConfig = [
            'active_gateway' => $validated['active_gateway'] ?? ($currentConfig['active_gateway'] ?? 'stripe'),
            'gateways' => $currentConfig['gateways'] ?? [],
        ];

        foreach (['stripe', 'razorpay', 'paystack', 'flutterwave', 'paypal', 'paddle', 'mercadopago', 'myfatoorah'] as $gw) {
            if (isset($validated['gateways'][$gw])) {
                $incoming = $validated['gateways'][$gw];
                $existing = $mergedConfig['gateways'][$gw] ?? [];

                // Keep existing secrets if user did not re-type (masked values)
                foreach ($incoming as $k => $v) {
                    if (is_string($v) && str_contains($v, '••••••••')) {
                        $incoming[$k] = $existing[$k] ?? '';
                    }
                }

                $mergedConfig['gateways'][$gw] = array_merge($existing, $incoming);
            }
        }

        PlatformSetting::updateOrCreate(
            ['key' => 'payment_gateways_config'],
            ['value' => $mergedConfig]
        );

        return response()->json([
            'success' => true,
            'message' => 'Payment gateway settings saved successfully.',
            'summary' => $this->paymentManager->getAllGatewaysSummary(),
        ]);
    }

    /**
     * Test connection to a specific payment gateway (alias for route).
     */
    public function test(Request $request): JsonResponse
    {
        return $this->testConnection($request);
    }

    /**
     * Test connection to a specific payment gateway.
     */
    public function testConnection(Request $request): JsonResponse
    {
        $request->validate([
            'gateway' => ['required', 'string', 'in:stripe,razorpay,paystack,flutterwave,paypal,paddle,mercadopago,myfatoorah'],
            'credentials' => ['nullable', 'array'],
        ]);

        $gateway = $request->input('gateway');
        $credentials = $request->input('credentials', $request->except(['gateway']));

        try {
            $driver = $this->paymentManager->driver($gateway);
            $result = $driver->testConnection($credentials);

            if ($result['success']) {
                return response()->json($result);
            }

            return response()->json($result, 422);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Connection test failed: ' . $e->getMessage(),
            ], 500);
        }
    }
}
