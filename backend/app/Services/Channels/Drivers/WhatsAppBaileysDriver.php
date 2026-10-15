<?php

namespace App\Services\Channels\Drivers;

use App\Contracts\ChannelProviderInterface;
use App\Models\ChannelConnection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class WhatsAppBaileysDriver implements ChannelProviderInterface
{
    /**
     * Send outbound message to the Baileys worker.
     */
    public function sendMessage(array $credentials, array $messageData): array
    {
        $connectionId = $messageData['connection_id'] ?? $credentials['connection_id'] ?? $credentials['id'] ?? null;
        $to = $messageData['to'] ?? $messageData['external_chat_id'] ?? $messageData['recipient'] ?? '';
        $body = $messageData['body'] ?? '';
        $mediaUrl = $messageData['media_url'] ?? null;

        // If connectionId is not present, resolve from database via verify token
        if (!$connectionId) {
            $verifyToken = $credentials['webhook_verify_token'] ?? null;
            if ($verifyToken) {
                $conn = ChannelConnection::where('channel_type', 'whatsapp_baileys')
                    ->where(function ($q) use ($verifyToken) {
                        $q->where('credentials', 'like', "%{$verifyToken}%");
                    })
                    ->first();
                if ($conn) {
                    $connectionId = $conn->id;
                }
            }
        }

        // Fallback: If still no connectionId, scope by tenant if tenant_id is available
        if (!$connectionId) {
            $tenantId = $credentials['tenant_id'] ?? ($messageData['tenant_id'] ?? null);
            if ($tenantId) {
                $conn = ChannelConnection::where('tenant_id', $tenantId)
                    ->where('channel_type', 'whatsapp_baileys')
                    ->where('status', 'connected')
                    ->first() ?: ChannelConnection::where('tenant_id', $tenantId)->where('channel_type', 'whatsapp_baileys')->first();
                if ($conn) {
                    $connectionId = $conn->id;
                }
            }
        }

        if (!$connectionId) {
            return [
                'external_message_id' => '',
                'delivery_status' => 'failed',
                'error_message' => 'No active WhatsApp Baileys connection found.',
            ];
        }

        $baileysConfig = \App\Models\PlatformSetting::getSetting('baileys_app_config') ?: [];
        $envUrl = getenv('BAILEYS_WORKER_URL') ?: env('BAILEYS_WORKER_URL');
        $envSecret = getenv('BAILEYS_SECRET_TOKEN') ?: env('BAILEYS_SECRET_TOKEN');

        $workerUrl = 'http://127.0.0.1:5006';
        if (!empty($envUrl)) {
            $workerUrl = $envUrl;
        } elseif (!empty($baileysConfig['worker_url'])) {
            $workerUrl = $baileysConfig['worker_url'];
        }

        $secretToken = 'whatsomni_baileys_secret_key';
        if (!empty($envSecret)) {
            $secretToken = $envSecret;
        } elseif (!empty($baileysConfig['secret_token'])) {
            $secretToken = $baileysConfig['secret_token'];
        }

        $workerUrl = rtrim($workerUrl, '/');

        try {
            $response = Http::timeout(15)
                ->withHeaders(['X-Baileys-Secret' => $secretToken])
                ->post("{$workerUrl}/sessions/send", [
                    'connection_id' => $connectionId,
                    'to' => $to,
                    'external_chat_id' => $to,
                    'body' => $body,
                    'media_url' => $mediaUrl,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'external_message_id' => $data['message_id'] ?? uniqid('baileys_'),
                    'delivery_status' => 'sent',
                    'error_message' => null,
                ];
            }

            $errorMsg = $response->json('message') ?? 'Worker failed to send message.';
            return [
                'external_message_id' => '',
                'delivery_status' => 'failed',
                'error_message' => $errorMsg,
            ];
        } catch (Exception $e) {
            Log::error("Baileys sendMessage failed: " . $e->getMessage());
            return [
                'external_message_id' => '',
                'delivery_status' => 'failed',
                'error_message' => 'Baileys worker unreachable: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Verify webhook token signature check.
     */
    public function verifyWebhookSignature(array $headers, string $payload, array $credentials): bool
    {
        $expectedToken = $credentials['webhook_verify_token'] ?? null;
        if (!$expectedToken) {
            return false; 
        }

        // Check verification token header
        $incomingToken = $headers['x-baileys-token'] ?? $headers['X-Baileys-Token'] ?? null;

        return !empty($incomingToken) && hash_equals((string)$expectedToken, (string)$incomingToken);
    }

    /**
     * Normalize incoming payload.
     */
    public function normalizeInboundPayload(array $payload): array
    {
        $rawChatId = $payload['external_chat_id'] ?? '';
        // Strip any :device suffix
        $cleanChatId = explode(':', $rawChatId)[0];
        if (str_ends_with($cleanChatId, '@lid') || str_ends_with($cleanChatId, '@g.us')) {
            // Keep full JID so outbound routing knows exact WhatsApp destination
        } else {
            $cleanChatId = explode('@', $cleanChatId)[0];
            $cleanChatId = preg_replace('/[^0-9]/', '', $cleanChatId);
        }

        return [
            'direction' => $payload['direction'] ?? 'inbound',
            'external_chat_id' => $cleanChatId ?: $rawChatId,
            'sender_identifier' => $payload['sender_identifier'] ?? null,
            'external_message_id' => $payload['external_message_id'] ?? '',
            'message_type' => $payload['message_type'] ?? 'text',
            'body' => $payload['body'] ?? null,
            'media_url' => $payload['media_url'] ?? null,
            'delivery_status' => $payload['delivery_status'] ?? (($payload['direction'] ?? 'inbound') === 'outbound' ? 'sent' : 'delivered'),
        ];
    }

    /**
     * Extract events from webhook payload.
     */
    public function extractEvents(array $payload): array
    {
        if (isset($payload['type']) && $payload['type'] === 'status') {
            return [
                [
                    'type' => 'status',
                    'data' => $payload,
                ]
            ];
        }

        return [
            [
                'type' => 'message',
                'data' => $payload,
            ]
        ];
    }

    /**
     * Normalize delivery status update.
     */
    public function normalizeStatusPayload(array $payload): array
    {
        return [
            'external_message_id' => $payload['external_message_id'] ?? '',
            'delivery_status' => $payload['delivery_status'] ?? 'delivered',
            'error_message' => $payload['error_message'] ?? null,
        ];
    }
}
