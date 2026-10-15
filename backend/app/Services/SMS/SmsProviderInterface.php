<?php

namespace App\Services\SMS;

interface SmsProviderInterface
{
    /**
     * Send an SMS message.
     */
    public function sendSms(array $credentials, string $to, string $body): array;

    /**
     * Verify incoming webhook signature from provider.
     */
    public function verifyWebhookSignature(array $headers, array $payload, array $credentials): bool;

    /**
     * Normalize incoming webhook message payload.
     */
    public function normalizeInboundPayload(array $payload): array;
}
