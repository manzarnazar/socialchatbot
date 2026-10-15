<?php

namespace App\Contracts;

interface ChannelProviderInterface
{
    /**
     * Send outbound message to provider.
     * Must return array with keys:
     * - external_message_id (string)
     * - delivery_status (string: sent, failed)
     * - error_message (string, nullable)
     */
    public function sendMessage(array $credentials, array $messageData): array;

    /**
     * Verify authenticity of webhook signature.
     */
    public function verifyWebhookSignature(array $headers, string $payload, array $credentials): bool;

    /**
     * Normalize incoming webhook payload into a unified internal schema.
     * Must return array containing:
     * - external_chat_id (string)
     * - sender_identifier (string, nullable)
     * - external_message_id (string)
     * - message_type (string: text, image, etc)
     * - body (string, nullable)
     * - media_url (string, nullable)
     */
    public function normalizeInboundPayload(array $payload): array;

    /**
     * Normalize delivery status update webhook payload.
     * Must return array containing:
     * - external_message_id (string)
     * - delivery_status (string: delivered, read, failed)
     * - error_message (string, nullable)
     */
    public function normalizeStatusPayload(array $payload): array;
}
