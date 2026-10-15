<?php

namespace App\Services\Channels\Drivers;

use App\Contracts\ChannelProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class TelegramDriver implements ChannelProviderInterface
{
    /**
     * Send outbound message via Telegram Bot API.
     */
    public function sendMessage(array $credentials, array $messageData): array
    {
        $token = $credentials['token'] ?? null;

        if (!$token) {
            throw new Exception("Telegram configuration key (token) is missing.");
        }

        if ($token === 'mock_token') {
            return [
                'external_message_id' => 'mock_tg_msg_' . uniqid(),
                'delivery_status' => 'sent',
                'error_message' => null,
            ];
        }

        $chatId = $messageData['external_chat_id'];
        $body = $messageData['body'] ?? '';
        $mediaUrl = $messageData['media_url'] ?? null;


        if ($mediaUrl) {
            $ext = strtolower(pathinfo(parse_url($mediaUrl, PHP_URL_PATH), PATHINFO_EXTENSION));
            $isPhoto = !in_array($ext, ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip', 'rar']);

            if ($isPhoto) {
                $url = "https://api.telegram.org/bot{$token}/sendPhoto";
                $payload = [
                    'chat_id' => $chatId,
                    'photo' => $mediaUrl,
                    'caption' => $body,
                ];
            } else {
                $url = "https://api.telegram.org/bot{$token}/sendDocument";
                $payload = [
                    'chat_id' => $chatId,
                    'document' => $mediaUrl,
                    'caption' => $body,
                ];
            }
        } else {
            $url = "https://api.telegram.org/bot{$token}/sendMessage";
            $payload = [
                'chat_id' => $chatId,
                'text' => $body,
            ];
        }

        try {
            $response = Http::timeout(10)->post($url, $payload);

            if (!$response->successful()) {
                Log::error("Telegram Bot API returned error: " . $response->body());
                return [
                    'external_message_id' => null,
                    'delivery_status' => 'failed',
                    'error_message' => $response->json('description') ?? 'Unknown Telegram API error.',
                ];
            }

            return [
                'external_message_id' => $response->json('result.message_id') ?? 'tg_msg_' . uniqid(),
                'delivery_status' => 'sent',
                'error_message' => null,
            ];
        } catch (Exception $e) {
            Log::error("Telegram sendMessage failed: " . $e->getMessage());
            return [
                'external_message_id' => null,
                'delivery_status' => 'failed',
                'error_message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Verify authenticity of webhook signature.
     */
    public function verifyWebhookSignature(array $headers, string $payload, array $credentials): bool
    {
        $token = $credentials['token'] ?? '';

        $secretToken = $credentials['secret_token'] ?? null;
        if (empty($secretToken)) {
            return true; // fallback if not configured
        }

        $secretHeader = $headers['x-telegram-bot-api-secret-token'] ?? $headers['X-Telegram-Bot-Api-Secret-Token'] ?? '';
        return hash_equals($secretToken, $secretHeader);
    }

    /**
     * Normalize incoming webhook payload into a unified internal schema.
     */
    public function normalizeInboundPayload(array $payload): array
    {

        // Check for direct flat schema (e.g. for mock testing or internal dispatchers)
        if (isset($payload['external_chat_id'])) {
            return [
                'external_chat_id' => (string)$payload['external_chat_id'],
                'sender_identifier' => $payload['sender_identifier'] ?? 'Telegram User',
                'external_message_id' => (string)($payload['external_message_id'] ?? 'tg_msg_' . uniqid()),
                'message_type' => $payload['message_type'] ?? 'text',
                'body' => $payload['body'] ?? '',
                'media_url' => $payload['media_url'] ?? null,
            ];
        }

        // Standard Telegram Bot API Update format
        $message = $payload['message'] ?? [];
        $chat = $message['chat'] ?? [];
        $from = $message['from'] ?? [];
        $chatId = $chat['id'] ?? 'unknown_tg_chat';
        $messageId = $message['message_id'] ?? 'tg_msg_' . uniqid();
        $text = $message['text'] ?? '';

        // Generate dynamic sender name
        $firstName = $from['first_name'] ?? '';
        $lastName = $from['last_name'] ?? '';
        $username = $from['username'] ?? '';
        
        $senderName = trim($firstName . ' ' . $lastName);
        if (empty($senderName)) {
            $senderName = !empty($username) ? $username : 'Telegram User';
        }

        $mediaUrl = null;
        $msgType = 'text';

        // Check for photo attachments
        if (isset($message['photo']) && is_array($message['photo'])) {
            $msgType = 'image';
            // Get the highest resolution photo item
            $photoItem = end($message['photo']);
            $mediaUrl = $photoItem['file_id'] ?? null; // Store file_id as fallback media URL
        } elseif (isset($message['document'])) {
            $msgType = 'file';
            $mediaUrl = $message['document']['file_id'] ?? null;
        }

        return [
            'external_chat_id' => (string)$chatId,
            'sender_identifier' => $senderName,
            'external_message_id' => (string)$messageId,
            'message_type' => $msgType,
            'body' => $text,
            'media_url' => $mediaUrl,
        ];
    }

    /**
     * Normalize delivery status update webhook payload.
     */
    public function normalizeStatusPayload(array $payload): array
    {
        return [
            'external_message_id' => (string)($payload['external_message_id'] ?? ''),
            'delivery_status' => $payload['delivery_status'] ?? 'delivered',
            'error_message' => $payload['error_message'] ?? null,
        ];
    }
}
