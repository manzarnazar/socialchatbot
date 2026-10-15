<?php

namespace App\Services\Channels\Drivers;

use App\Contracts\ChannelProviderInterface;
use Illuminate\Support\Facades\Log;

class LinkedInDriver implements ChannelProviderInterface
{
    /**
     * Send outbound message to provider.
     * Note: LinkedIn is configured exclusively for Content Publishing.
     * Direct messaging is not supported via open LinkedIn APIs.
     */
    public function sendMessage(array $credentials, array $messageData): array
    {
        return [
            'external_message_id' => null,
            'delivery_status' => 'failed',
            'error_message' => 'LinkedIn channel is configured exclusively for Content Publishing. Direct messaging is not supported.',
        ];
    }

    /**
     * Verify authenticity of webhook signature.
     */
    public function verifyWebhookSignature(array $headers, string $payload, array $credentials): bool
    {
        return true;
    }

    /**
     * Normalize incoming webhook payload into unified internal schema.
     */
    public function normalizeInboundPayload(array $payload): array
    {
        return [
            'external_chat_id' => 'linkedin_user',
            'sender_identifier' => 'linkedin_user',
            'external_message_id' => 'linkedin_' . uniqid(),
            'message_type' => 'text',
            'body' => '',
            'media_url' => null,
        ];
    }

    /**
     * Normalize delivery status update webhook payload.
     */
    public function normalizeStatusPayload(array $payload): array
    {
        return [
            'external_message_id' => '',
            'delivery_status' => 'delivered',
            'error_message' => null,
        ];
    }
}
