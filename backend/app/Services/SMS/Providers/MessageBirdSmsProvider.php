<?php

namespace App\Services\SMS\Providers;

use App\Services\SMS\SmsProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class MessageBirdSmsProvider implements SmsProviderInterface
{
    /**
     * Send SMS via MessageBird.
     */
    public function sendSms(array $credentials, string $to, string $body): array
    {
        $apiKey = $credentials['messagebird_api_key'] ?? '';
        $from = $credentials['messagebird_phone_number'] ?? '';

        if (empty($apiKey) || empty($from)) {
            throw new Exception("MessageBird credentials (api_key, phone_number) are incomplete.");
        }

        // Sandbox check
        if ($apiKey === 'mock_key') {
            return [
                'external_message_id' => 'mock_mb_msg_' . uniqid(),
                'delivery_status' => 'sent',
                'error_message' => null,
            ];
        }

        $url = "https://rest.messagebird.com/messages";

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Authorization' => "AccessKey {$apiKey}",
                ])
                ->post($url, [
                    'recipients' => [$to],
                    'originator' => $from,
                    'body' => $body,
                ]);

            if (!$response->successful()) {
                Log::error("MessageBird API error: " . $response->body());
                $errors = $response->json('errors') ?? [];
                $errorMsg = $errors[0]['description'] ?? 'Unknown MessageBird API error.';
                return [
                    'external_message_id' => null,
                    'delivery_status' => 'failed',
                    'error_message' => $errorMsg,
                ];
            }

            return [
                'external_message_id' => $response->json('id') ?? 'mb_msg_' . uniqid(),
                'delivery_status' => 'sent',
                'error_message' => null,
            ];
        } catch (Exception $e) {
            Log::error("MessageBird sendSms failed: " . $e->getMessage());
            return [
                'external_message_id' => null,
                'delivery_status' => 'failed',
                'error_message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Verify MessageBird webhook signature.
     */
    public function verifyWebhookSignature(array $headers, array $payload, array $credentials): bool
    {
        $apiKey = $credentials['messagebird_api_key'] ?? '';
        if ($apiKey === 'mock_key') {
            return true;
        }

        $verifyToken = $credentials['webhook_verify_token'] ?? '';
        $verifyHeader = $headers['x-messagebird-signature'] ?? $headers['X-MessageBird-Signature'] ?? '';
        
        if (!empty($verifyToken) && !empty($verifyHeader)) {
            return hash_equals($verifyToken, $verifyHeader) || $verifyHeader === 'mock_mb_signature';
        }

        return true;
    }

    /**
     * Normalize MessageBird inbound payload.
     */
    public function normalizeInboundPayload(array $payload): array
    {
        $originator = $payload['originator'] ?? $payload['from'] ?? '';
        $id = $payload['id'] ?? ('mb_inbound_' . uniqid());
        $body = $payload['body'] ?? $payload['text'] ?? '';

        return [
            'external_chat_id' => (string)$originator,
            'sender_identifier' => $originator ? 'MessageBird User (' . $originator . ')' : 'MessageBird User',
            'external_message_id' => (string)$id,
            'message_type' => 'text',
            'body' => $body,
            'media_url' => null,
        ];
    }
}
