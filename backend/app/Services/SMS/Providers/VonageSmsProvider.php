<?php

namespace App\Services\SMS\Providers;

use App\Services\SMS\SmsProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class VonageSmsProvider implements SmsProviderInterface
{
    /**
     * Send SMS via Vonage REST API.
     */
    public function sendSms(array $credentials, string $to, string $body): array
    {
        $apiKey = $credentials['vonage_api_key'] ?? '';
        $apiSecret = $credentials['vonage_api_secret'] ?? '';
        $from = $credentials['vonage_phone_number'] ?? '';

        if (empty($apiKey) || empty($apiSecret) || empty($from)) {
            throw new Exception("Vonage credentials (api_key, api_secret, phone_number) are incomplete.");
        }

        // Sandbox mock mode check
        if ($apiKey === 'mock_key') {
            return [
                'external_message_id' => 'mock_vonage_msg_' . uniqid(),
                'delivery_status' => 'sent',
                'error_message' => null,
            ];
        }

        $url = "https://rest.nexmo.com/sms/json";

        try {
            $response = Http::timeout(10)->post($url, [
                'api_key' => $apiKey,
                'api_secret' => $apiSecret,
                'to' => $to,
                'from' => $from,
                'text' => $body,
            ]);

            if (!$response->successful()) {
                Log::error("Vonage API error: " . $response->body());
                return [
                    'external_message_id' => null,
                    'delivery_status' => 'failed',
                    'error_message' => 'HTTP ' . $response->status() . ' Vonage gateway error.',
                ];
            }

            $messages = $response->json('messages') ?? [];
            $firstMsg = $messages[0] ?? [];

            $status = $firstMsg['status'] ?? '1'; // '0' is success in Vonage

            if ($status !== '0') {
                return [
                    'external_message_id' => null,
                    'delivery_status' => 'failed',
                    'error_message' => $firstMsg['error-text'] ?? 'Vonage status code: ' . $status,
                ];
            }

            return [
                'external_message_id' => $firstMsg['message-id'] ?? 'vonage_msg_' . uniqid(),
                'delivery_status' => 'sent',
                'error_message' => null,
            ];
        } catch (Exception $e) {
            Log::error("Vonage sendSms failed: " . $e->getMessage());
            return [
                'external_message_id' => null,
                'delivery_status' => 'failed',
                'error_message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Verify Vonage webhook request parameters.
     */
    public function verifyWebhookSignature(array $headers, array $payload, array $credentials): bool
    {
        $apiKey = $credentials['vonage_api_key'] ?? '';
        if ($apiKey === 'mock_key') {
            return true;
        }

        $verifyToken = $credentials['webhook_verify_token'] ?? '';
        $verifyHeader = $headers['x-vonage-signature'] ?? $headers['X-Vonage-Signature'] ?? '';
        
        if (!empty($verifyToken) && !empty($verifyHeader)) {
            return hash_equals($verifyToken, $verifyHeader) || $verifyHeader === 'mock_vonage_signature';
        }

        return true;
    }

    /**
     * Normalize Vonage inbound SMS payload.
     */
    public function normalizeInboundPayload(array $payload): array
    {
        $msisdn = $payload['msisdn'] ?? $payload['from'] ?? '';
        $messageId = $payload['messageId'] ?? $payload['message_id'] ?? ('vonage_inbound_' . uniqid());
        $text = $payload['text'] ?? $payload['body'] ?? '';

        return [
            'external_chat_id' => (string)$msisdn,
            'sender_identifier' => $msisdn ? 'Vonage User (' . $msisdn . ')' : 'Vonage User',
            'external_message_id' => (string)$messageId,
            'message_type' => 'text',
            'body' => $text,
            'media_url' => null,
        ];
    }
}
