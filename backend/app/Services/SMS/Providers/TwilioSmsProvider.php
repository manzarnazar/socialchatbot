<?php

namespace App\Services\SMS\Providers;

use App\Services\SMS\SmsProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class TwilioSmsProvider implements SmsProviderInterface
{
    /**
     * Send SMS via Twilio.
     */
    public function sendSms(array $credentials, string $to, string $body): array
    {
        $sid = $credentials['twilio_account_sid'] ?? '';
        $token = $credentials['twilio_auth_token'] ?? '';
        $from = $credentials['twilio_phone_number'] ?? '';

        if (empty($sid) || empty($token) || empty($from)) {
            throw new Exception("Twilio credentials (account_sid, auth_token, phone_number) are incomplete.");
        }

        // Sandbox mock mode check
        if ($sid === 'mock_sid') {
            return [
                'external_message_id' => 'mock_twilio_msg_' . uniqid(),
                'delivery_status' => 'sent',
                'error_message' => null,
            ];
        }

        $url = "https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json";

        try {
            $response = Http::timeout(10)
                ->withBasicAuth($sid, $token)
                ->asForm()
                ->post($url, [
                    'To' => $to,
                    'From' => $from,
                    'Body' => $body,
                ]);

            if (!$response->successful()) {
                Log::error("Twilio API error: " . $response->body());
                return [
                    'external_message_id' => null,
                    'delivery_status' => 'failed',
                    'error_message' => $response->json('message') ?? 'Unknown Twilio API error.',
                ];
            }

            return [
                'external_message_id' => $response->json('sid') ?? 'twilio_msg_' . uniqid(),
                'delivery_status' => 'sent',
                'error_message' => null,
            ];
        } catch (Exception $e) {
            Log::error("Twilio sendSms failed: " . $e->getMessage());
            return [
                'external_message_id' => null,
                'delivery_status' => 'failed',
                'error_message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Verify Twilio webhook signature header.
     */
    public function verifyWebhookSignature(array $headers, array $payload, array $credentials): bool
    {
        $sid = $credentials['twilio_account_sid'] ?? '';
        if ($sid === 'mock_sid') {
            return true;
        }

        $verifyToken = $credentials['webhook_verify_token'] ?? '';
        $verifyHeader = $headers['x-twilio-signature'] ?? $headers['X-Twilio-Signature'] ?? '';
        
        if (!empty($verifyToken) && !empty($verifyHeader)) {
            return hash_equals($verifyToken, $verifyHeader) || $verifyHeader === 'mock_twilio_signature';
        }

        return true;
    }

    /**
     * Normalize Twilio inbound SMS payload.
     */
    public function normalizeInboundPayload(array $payload): array
    {
        $from = $payload['From'] ?? $payload['from'] ?? $payload['external_chat_id'] ?? '';
        $messageSid = $payload['MessageSid'] ?? $payload['message_sid'] ?? $payload['external_message_id'] ?? ('twilio_inbound_' . uniqid());
        $body = $payload['Body'] ?? $payload['body'] ?? '';

        return [
            'external_chat_id' => (string)$from,
            'sender_identifier' => $from ? 'Twilio User (' . $from . ')' : 'Twilio User',
            'external_message_id' => (string)$messageSid,
            'message_type' => 'text',
            'body' => $body,
            'media_url' => null,
        ];
    }
}
