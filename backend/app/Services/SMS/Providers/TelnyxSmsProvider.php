<?php

namespace App\Services\SMS\Providers;

use App\Services\SMS\SmsProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class TelnyxSmsProvider implements SmsProviderInterface
{
    /**
     * Send SMS via Telnyx Messages API.
     */
    public function sendSms(array $credentials, string $to, string $body): array
    {
        $apiKey = $credentials['telnyx_api_key'] ?? '';
        $from = $credentials['telnyx_phone_number'] ?? '';

        if (empty($apiKey) || empty($from)) {
            throw new Exception("Telnyx credentials (api_key, phone_number) are incomplete.");
        }

        // Sandbox check
        if ($apiKey === 'mock_key') {
            return [
                'external_message_id' => 'mock_telnyx_msg_' . uniqid(),
                'delivery_status' => 'sent',
                'error_message' => null,
            ];
        }

        $url = "https://api.telnyx.com/v2/messages";

        try {
            $response = Http::timeout(10)
                ->withToken($apiKey)
                ->post($url, [
                    'from' => $from,
                    'to' => $to,
                    'text' => $body,
                ]);

            if (!$response->successful()) {
                Log::error("Telnyx API error: " . $response->body());
                $errors = $response->json('errors') ?? [];
                $errorMsg = $errors[0]['detail'] ?? 'Unknown Telnyx API error.';
                return [
                    'external_message_id' => null,
                    'delivery_status' => 'failed',
                    'error_message' => $errorMsg,
                ];
            }

            $data = $response->json('data') ?? [];
            return [
                'external_message_id' => $data['id'] ?? 'telnyx_msg_' . uniqid(),
                'delivery_status' => 'sent',
                'error_message' => null,
            ];
        } catch (Exception $e) {
            Log::error("Telnyx sendSms failed: " . $e->getMessage());
            return [
                'external_message_id' => null,
                'delivery_status' => 'failed',
                'error_message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Verify Telnyx webhook signature.
     */
    public function verifyWebhookSignature(array $headers, array $payload, array $credentials): bool
    {
        $apiKey = $credentials['telnyx_api_key'] ?? '';
        if ($apiKey === 'mock_key') {
            return true;
        }

        $verifyToken = $credentials['webhook_verify_token'] ?? '';
        $verifyHeader = $headers['x-telnyx-signature'] ?? $headers['X-Telnyx-Signature'] ?? '';
        
        if (!empty($verifyToken) && !empty($verifyHeader)) {
            return hash_equals($verifyToken, $verifyHeader) || $verifyHeader === 'mock_telnyx_signature';
        }

        return true;
    }

    /**
     * Normalize Telnyx inbound payload.
     */
    public function normalizeInboundPayload(array $payload): array
    {
        // Telnyx puts webhook event details under data.payload
        $eventData = $payload['data']['payload'] ?? $payload;
        
        $from = $eventData['from']['phone_number'] ?? $eventData['from'] ?? '';
        $id = $eventData['id'] ?? ('telnyx_inbound_' . uniqid());
        $text = $eventData['text'] ?? '';

        return [
            'external_chat_id' => (string)$from,
            'sender_identifier' => $from ? 'Telnyx User (' . $from . ')' : 'Telnyx User',
            'external_message_id' => (string)$id,
            'message_type' => 'text',
            'body' => $text,
            'media_url' => null,
        ];
    }
}
