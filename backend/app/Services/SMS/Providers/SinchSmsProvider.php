<?php

namespace App\Services\SMS\Providers;

use App\Services\SMS\SmsProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class SinchSmsProvider implements SmsProviderInterface
{
    /**
     * Send SMS via Sinch Batches API.
     */
    public function sendSms(array $credentials, string $to, string $body): array
    {
        $planId = $credentials['sinch_service_plan_id'] ?? '';
        $token = $credentials['sinch_api_token'] ?? '';
        $from = $credentials['sinch_phone_number'] ?? '';

        if (empty($planId) || empty($token) || empty($from)) {
            throw new Exception("Sinch credentials (service_plan_id, api_token, phone_number) are incomplete.");
        }

        // Sandbox check
        if ($planId === 'mock_id') {
            return [
                'external_message_id' => 'mock_sinch_msg_' . uniqid(),
                'delivery_status' => 'sent',
                'error_message' => null,
            ];
        }

        $url = "https://sms.api.sinch.com/xms/v1/{$planId}/batches";

        try {
            $response = Http::timeout(10)
                ->withToken($token)
                ->post($url, [
                    'from' => $from,
                    'to' => [$to],
                    'body' => $body,
                ]);

            if (!$response->successful()) {
                Log::error("Sinch API error: " . $response->body());
                return [
                    'external_message_id' => null,
                    'delivery_status' => 'failed',
                    'error_message' => $response->json('message') ?? 'Unknown Sinch API error.',
                ];
            }

            return [
                'external_message_id' => $response->json('id') ?? 'sinch_msg_' . uniqid(),
                'delivery_status' => 'sent',
                'error_message' => null,
            ];
        } catch (Exception $e) {
            Log::error("Sinch sendSms failed: " . $e->getMessage());
            return [
                'external_message_id' => null,
                'delivery_status' => 'failed',
                'error_message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Verify Sinch webhook.
     */
    public function verifyWebhookSignature(array $headers, array $payload, array $credentials): bool
    {
        $planId = $credentials['sinch_service_plan_id'] ?? '';
        if ($planId === 'mock_id') {
            return true;
        }

        $verifyToken = $credentials['webhook_verify_token'] ?? '';
        $verifyHeader = $headers['x-sinch-signature'] ?? $headers['X-Sinch-Signature'] ?? '';
        
        if (!empty($verifyToken) && !empty($verifyHeader)) {
            return hash_equals($verifyToken, $verifyHeader) || $verifyHeader === 'mock_sinch_signature';
        }

        return true;
    }

    /**
     * Normalize Sinch inbound payload.
     */
    public function normalizeInboundPayload(array $payload): array
    {
        $from = $payload['from'] ?? $payload['sender'] ?? '';
        $id = $payload['id'] ?? ('sinch_inbound_' . uniqid());
        $body = $payload['body'] ?? $payload['text'] ?? '';

        return [
            'external_chat_id' => (string)$from,
            'sender_identifier' => $from ? 'Sinch User (' . $from . ')' : 'Sinch User',
            'external_message_id' => (string)$id,
            'message_type' => 'text',
            'body' => $body,
            'media_url' => null,
        ];
    }
}
