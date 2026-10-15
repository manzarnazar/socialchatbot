<?php

namespace App\Services\Channels\Drivers;

use App\Contracts\ChannelProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class InstagramDriver implements ChannelProviderInterface
{
    /**
     * Send outbound message via Meta's Graph API.
     */
    public function sendMessage(array $credentials, array $messageData): array
    {
        // 1. Resolve Access Token flexibly across common credential schemas
        $pageAccessToken = $credentials['page_access_token']
            ?? $credentials['access_token']
            ?? $credentials['system_user_access_token']
            ?? $credentials['token']
            ?? null;

        $igId = $credentials['instagram_business_account_id']
            ?? $credentials['instagram_account_id']
            ?? $credentials['ig_id']
            ?? $credentials['page_id']
            ?? null;

        if (!$pageAccessToken) {
            throw new Exception("Instagram configuration access token (page_access_token or access_token) is missing.");
        }

        // 2. Mock / Sandbox environment handling
        if ($pageAccessToken === 'mock_token' || str_starts_with($pageAccessToken, 'mock_') || str_starts_with($pageAccessToken, 'test_')) {
            return [
                'external_message_id' => 'mock_ig_msg_' . uniqid(),
                'delivery_status' => 'sent',
                'error_message' => null,
            ];
        }

        // 3. Resolve Recipient ID
        $recipientId = $messageData['external_chat_id']
            ?? $messageData['to']
            ?? $messageData['recipient']
            ?? null;

        if (!$recipientId) {
            throw new Exception("Recipient external_chat_id is missing.");
        }

        $recipientId = preg_replace('/^ig_/', '', (string)$recipientId);

        $body = trim($messageData['body'] ?? $messageData['caption'] ?? $messageData['text'] ?? '');
        $mediaUrl = $messageData['media_url'] ?? $messageData['url'] ?? null;
        $messageType = $messageData['message_type'] ?? $messageData['type'] ?? null;

        if (empty($body) && empty($mediaUrl)) {
            return [
                'external_message_id' => null,
                'delivery_status' => 'failed',
                'error_message' => 'Message body or media URL is required.',
            ];
        }

        // 4. Meta Graph API Endpoint
        $url = "https://graph.facebook.com/v21.0/me/messages";

        try {
            $lastMessageId = null;

            // 5a. If media is present, send attachment payload first
            if (!empty($mediaUrl)) {
                $mediaType = 'image';
                if ($messageType && in_array($messageType, ['image', 'video', 'audio', 'file'])) {
                    $mediaType = $messageType;
                } else {
                    $ext = strtolower(pathinfo(parse_url($mediaUrl, PHP_URL_PATH) ?? '', PATHINFO_EXTENSION));
                    if (in_array($ext, ['mp4', 'mov', 'avi'])) {
                        $mediaType = 'video';
                    } elseif (in_array($ext, ['mp3', 'wav', 'ogg', 'm4a'])) {
                        $mediaType = 'audio';
                    } elseif (in_array($ext, ['pdf', 'doc', 'docx', 'zip'])) {
                        $mediaType = 'file';
                    }
                }

                $mediaPayload = [
                    'recipient' => [
                        'id' => $recipientId,
                    ],
                    'messaging_type' => 'RESPONSE',
                    'message' => [
                        'attachment' => [
                            'type' => $mediaType,
                            'payload' => [
                                'url' => $mediaUrl,
                                'is_reusable' => true,
                            ],
                        ],
                    ],
                ];

                $mediaResponse = Http::withToken($pageAccessToken)
                    ->timeout(15)
                    ->post($url, $mediaPayload);

                if (!$mediaResponse->successful()) {
                    Log::error("Instagram API media send error: " . $mediaResponse->body());
                    return [
                        'external_message_id' => null,
                        'delivery_status' => 'failed',
                        'error_message' => $mediaResponse->json('error.message') ?? 'Meta API error while sending media attachment.',
                    ];
                }

                $lastMessageId = $mediaResponse->json('message_id');
            }

            // 5b. If text body is present, send text payload
            if (!empty($body)) {
                $textPayload = [
                    'recipient' => [
                        'id' => $recipientId,
                    ],
                    'messaging_type' => 'RESPONSE',
                    'message' => [
                        'text' => $body,
                    ],
                ];

                $textResponse = Http::withToken($pageAccessToken)
                    ->timeout(10)
                    ->post($url, $textPayload);

                if (!$textResponse->successful()) {
                    Log::error("Instagram API text send error: " . $textResponse->body());
                    return [
                        'external_message_id' => $lastMessageId,
                        'delivery_status' => $lastMessageId ? 'sent' : 'failed',
                        'error_message' => $textResponse->json('error.message') ?? 'Meta API error while sending text message.',
                    ];
                }

                $lastMessageId = $textResponse->json('message_id') ?? $lastMessageId;
            }

            return [
                'external_message_id' => $lastMessageId ?? ('ig_msg_' . uniqid()),
                'delivery_status' => 'sent',
                'error_message' => null,
            ];
        } catch (Exception $e) {
            Log::error("Instagram sendMessage failed: " . $e->getMessage());
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
        $appSecret = !empty($credentials['webhook_secret']) ? $credentials['webhook_secret'] : (!empty($credentials['app_secret']) ? $credentials['app_secret'] : '');
        if (empty($appSecret)) {
            $savedSetting = \App\Models\PlatformSetting::getSetting('meta_embedded_config');
            $appSecret = is_array($savedSetting) ? ($savedSetting['app_secret'] ?? '') : '';
            if (empty($appSecret)) {
                $appSecret = \App\Models\PlatformSetting::getSetting('facebook_client_secret') ?: '';
            }
        }

        if (empty($appSecret)) {
            if (app()->environment('production')) {
                Log::error("Instagram webhook verification failed: App Secret is not configured in production.");
                return false;
            }
            Log::warning("Instagram webhook verification skipped in local environment: App Secret is empty.");
            return true;
        }

        $hubSig = $headers['x-hub-signature-256'] ?? $headers['X-Hub-Signature-256'] ?? '';
        if (is_array($hubSig)) {
            $hubSig = $hubSig[0] ?? '';
        }

        if (empty($hubSig)) {
            return false;
        }

        $parts = explode('=', $hubSig);
        if (count($parts) !== 2 || $parts[0] !== 'sha256') {
            return false;
        }

        $expectedSig = hash_hmac('sha256', $payload, $appSecret);
        return hash_equals($expectedSig, $parts[1]);
    }

    /**
     * Extract individual typed events from batched Meta Instagram webhook payload.
     */
    public function extractEvents(array $payload): array
    {
        $events = [];

        if (isset($payload['entry']) && is_array($payload['entry'])) {
            foreach ($payload['entry'] as $entry) {
                // 1. Process messaging events (direct messages, echoes, deliveries, reads, postbacks)
                if (isset($entry['messaging']) && is_array($entry['messaging'])) {
                    foreach ($entry['messaging'] as $item) {
                        if (!empty($item['delivery'])) {
                            $events[] = [
                                'type' => 'status',
                                'data' => [
                                    'delivery' => $item['delivery'],
                                    'messaging' => $item,
                                    'sender' => $item['sender'] ?? [],
                                    'recipient' => $item['recipient'] ?? [],
                                ]
                            ];
                        } elseif (!empty($item['read'])) {
                            $events[] = [
                                'type' => 'status',
                                'data' => [
                                    'read' => $item['read'],
                                    'messaging' => $item,
                                    'sender' => $item['sender'] ?? [],
                                    'recipient' => $item['recipient'] ?? [],
                                ]
                            ];
                        } else {
                            $events[] = [
                                'type' => 'message',
                                'data' => [
                                    'messaging' => $item,
                                    'message' => $item['message'] ?? [],
                                    'postback' => $item['postback'] ?? null,
                                    'sender' => $item['sender'] ?? [],
                                    'recipient' => $item['recipient'] ?? [],
                                ]
                            ];
                        }
                    }
                }

                // 2. Process changes (e.g. comments, statuses)
                if (isset($entry['changes']) && is_array($entry['changes'])) {
                    foreach ($entry['changes'] as $change) {
                        $value = $change['value'] ?? [];
                        if (!empty($value['statuses'])) {
                            foreach ($value['statuses'] as $status) {
                                $events[] = [
                                    'type' => 'status',
                                    'data' => [
                                        'status' => $status,
                                        'change' => $change,
                                    ]
                                ];
                            }
                        } else {
                            $events[] = [
                                'type' => 'message',
                                'data' => [
                                    'change' => $change,
                                    'value' => $value,
                                ]
                            ];
                        }
                    }
                }
            }
        }

        if (empty($events)) {
            $isStatus = isset($payload['delivery_status'])
                || (isset($payload['status']) && !isset($payload['body']) && !isset($payload['text']));

            $events[] = [
                'type' => $isStatus ? 'status' : 'message',
                'data' => $payload,
            ];
        }

        return $events;
    }

    /**
     * Normalize incoming webhook payload into a unified internal schema.
     */
    public function normalizeInboundPayload(array $payload): array
    {
        // 1. Check for direct flat schema (e.g. for mock testing or internal dispatchers)
        if (isset($payload['external_chat_id'])) {
            return [
                'external_chat_id' => (string)preg_replace('/^ig_/', '', (string)$payload['external_chat_id']),
                'sender_identifier' => $payload['sender_identifier'] ?? 'Instagram User',
                'external_message_id' => (string)($payload['external_message_id'] ?? 'ig_msg_' . uniqid()),
                'message_type' => $payload['message_type'] ?? 'text',
                'body' => $payload['body'] ?? '',
                'media_url' => $payload['media_url'] ?? null,
                'direction' => $payload['direction'] ?? 'inbound',
            ];
        }

        // 2. Resolve messaging event across extracted or raw formats
        $messaging = $payload['messaging']
            ?? $payload['entry'][0]['messaging'][0]
            ?? $payload['entry'][0]['changes'][0]['value']
            ?? $payload['value']
            ?? [];

        $senderId = $messaging['sender']['id'] ?? ($payload['sender']['id'] ?? 'unknown_ig_user');
        $recipientId = $messaging['recipient']['id'] ?? ($payload['recipient']['id'] ?? null);
        $message = $messaging['message'] ?? ($payload['message'] ?? []);
        $postback = $messaging['postback'] ?? ($payload['postback'] ?? null);

        $mid = $message['mid'] ?? ($postback['mid'] ?? ('ig_msg_' . uniqid()));
        $text = $message['text'] ?? '';

        // Handle Quick Reply or Postback payload if present
        if (isset($message['quick_reply']['payload'])) {
            $text = $message['quick_reply']['payload'];
        } elseif ($postback) {
            $text = $postback['payload'] ?? ($postback['title'] ?? '');
        }

        $mediaUrl = null;
        $msgType = 'text';
        if (isset($message['attachments'][0])) {
            $attachment = $message['attachments'][0];
            $msgType = $attachment['type'] ?? 'text';
            $mediaUrl = $attachment['payload']['url'] ?? null;
        }

        // Handle Meta Echo event (outbound message sent via Instagram app or Meta Business Suite)
        $isEcho = !empty($message['is_echo']);
        $direction = $isEcho ? 'outbound' : 'inbound';
        $chatId = $isEcho ? ($recipientId ?? $senderId) : $senderId;
        $senderName = $isEcho ? 'Me (Instagram)' : ('Instagram User ' . substr((string)$chatId, -4));

        return [
            'external_chat_id' => (string)$chatId,
            'sender_identifier' => $senderName,
            'external_message_id' => (string)$mid,
            'message_type' => $msgType,
            'body' => $text,
            'media_url' => $mediaUrl,
            'direction' => $direction,
        ];
    }

    /**
     * Normalize delivery status update webhook payload.
     */
    public function normalizeStatusPayload(array $payload): array
    {
        if (isset($payload['external_message_id'])) {
            return [
                'external_message_id' => (string)$payload['external_message_id'],
                'delivery_status' => $payload['delivery_status'] ?? 'delivered',
                'error_message' => $payload['error_message'] ?? null,
            ];
        }

        // 1. Parse Meta Messenger/Instagram delivery receipt (entry[0].messaging[0].delivery or extracted)
        $delivery = $payload['delivery']
            ?? $payload['entry'][0]['messaging'][0]['delivery']
            ?? null;
        if ($delivery) {
            $mid = $delivery['mids'][0] ?? '';
            return [
                'external_message_id' => (string)$mid,
                'delivery_status' => 'delivered',
                'error_message' => null,
            ];
        }

        // 2. Parse Meta Messenger/Instagram read receipt (entry[0].messaging[0].read or extracted)
        $read = $payload['read']
            ?? $payload['entry'][0]['messaging'][0]['read']
            ?? null;
        if ($read) {
            $mid = $read['mid'] ?? '';
            return [
                'external_message_id' => (string)$mid,
                'delivery_status' => 'read',
                'error_message' => null,
            ];
        }

        // 3. Parse official Meta status payload (WhatsApp/Instagram changes[0].value.statuses or extracted)
        $statuses = $payload['status']
            ?? $payload['entry'][0]['changes'][0]['value']['statuses'][0]
            ?? null;
        if ($statuses) {
            $mid = $statuses['id'] ?? '';
            $status = $statuses['status'] ?? 'delivered';
            return [
                'external_message_id' => (string)$mid,
                'delivery_status' => $status,
                'error_message' => $statuses['errors'][0]['message'] ?? null,
            ];
        }

        return [
            'external_message_id' => '',
            'delivery_status' => 'delivered',
            'error_message' => null,
        ];
    }
}
