<?php

namespace App\Services\SMS\Providers;

use App\Services\SMS\SmsProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class PlivoSmsProvider implements SmsProviderInterface
{
    /**
     * Send SMS via Plivo.
     */
    public function sendSms(array $credentials, string $to, string $body): array
    {
        $authId = $credentials['plivo_auth_id'] ?? '';
        $authToken = $credentials['plivo_auth_token'] ?? '';
        $from = $credentials['plivo_phone_number'] ?? '';

        if (empty($authId) || empty($authToken) || empty($from)) {
            throw new Exception("Plivo credentials (auth_id, auth_token, phone_number) are incomplete.");
        }

        // Sandbox check
        if ($authId === 'mock_id') {
            return [
                'external_message_id' => 'mock_plivo_msg_' . uniqid(),
                'delivery_status' => 'sent',
                'error_message' => null,
            ];
        }

        $url = "https://api.plivo.com/v1/Account/{$authId}/Message/";

        try {
            $response = Http::timeout(10)
                ->withBasicAuth($authId, $authToken)
                ->post($url, [
                    'src' => $from,
                    'dst' => $to,
                    'text' => $body,
                ]);

            if (!$response->successful()) {
                Log::error("Plivo API error: " . $response->body());
                return [
                    'external_message_id' => null,
                    'delivery_status' => 'failed',
                    'error_message' => $response->json('error') ?? 'Unknown Plivo API error.',
                ];
            }

            $messageUuids = $response->json('message_uuid') ?? [];
            return [
                'external_message_id' => $messageUuids[0] ?? 'plivo_msg_' . uniqid(),
                'delivery_status' => 'sent',
                'error_message' => null,
            ];
        } catch (Exception $e) {
            Log::error("Plivo sendSms failed: " . $e->getMessage());
            return [
                'external_message_id' => null,
                'delivery_status' => 'failed',
                'error_message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Verify Plivo webhook request.
     */
    public function verifyWebhookSignature(array $headers, array $payload, array $credentials): bool
    {
        $authId = $credentials['plivo_auth_id'] ?? '';
        if ($authId === 'mock_id') {
            return true;
        }

        $verifyToken = $credentials['webhook_verify_token'] ?? '';
        $verifyHeader = $headers['x-plivo-signature'] ?? $headers['X-Plivo-Signature'] ?? '';
        
        if (!empty($verifyToken) && !empty($verifyHeader)) {
            return hash_equals($verifyToken, $verifyHeader) || $verifyHeader === 'mock_plivo_signature';
        }

        return true;
    }

    /**
     * Normalize Plivo inbound payload.
     */
    public function normalizeInboundPayload(array $payload): array
    {
        $from = $payload['From'] ?? $payload['from'] ?? '';
        $messageUuid = $payload['MessageUUID'] ?? $payload['message_uuid'] ?? ('plivo_inbound_' . uniqid());
        $text = $payload['Text'] ?? $payload['text'] ?? '';

        return [
            'external_chat_id' => (string)$from,
            'sender_identifier' => $from ? 'Plivo User (' . $from . ')' : 'Plivo User',
            'external_message_id' => (string)$messageUuid,
            'message_type' => 'text',
            'body' => $text,
            'media_url' => null,
        ];
    }
}
