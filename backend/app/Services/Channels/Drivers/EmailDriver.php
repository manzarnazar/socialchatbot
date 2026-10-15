<?php

namespace App\Services\Channels\Drivers;

use App\Contracts\ChannelProviderInterface;
use App\Models\Message;
use App\Models\Conversation;
use Illuminate\Support\Str;
use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mailer\Mailer as SymfonyMailer;
use Symfony\Component\Mime\Email;
use Exception;
use Illuminate\Support\Facades\Log;

class EmailDriver implements ChannelProviderInterface
{
    /**
     * Send outbound message via custom dynamic SMTP transport.
     */
    public function sendMessage(array $credentials, array $messageData): array
    {
        $recipient = trim($messageData['external_chat_id'] ?? '');

        // Guard against non-compliant or missing email addresses
        if (empty($recipient) || !filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            Log::warning("EmailDriver rejected invalid recipient address: '{$recipient}'");
            return [
                'external_message_id' => null,
                'delivery_status' => 'failed',
                'error_message' => "Invalid email recipient address: '{$recipient}'",
            ];
        }

        $provider = $credentials['provider'] ?? 'smtp';

        // Unique Message-ID for this email
        $msgId = Str::uuid() . '@whatsomni.io';

        // Extract subject and body
        $subject = trim($messageData['subject'] ?? '');
        $body = $messageData['body'] ?? '';

        if (preg_match('/^Subject:\s*(.*?)\n\n(.*)/s', str_replace("\r", "", $body), $matches)) {
            if (empty($subject)) {
                $subject = trim($matches[1]);
            }
            $body = trim($matches[2]);
        }

        // Find parent conversation to inject threading headers and resolve subject if needed
        $convQuery = Conversation::where('external_chat_id', $recipient)
            ->whereHas('channelConnection', function ($q) {
                $q->where('channel_type', 'email');
            });

        if (!empty($messageData['connection_id'])) {
            $convQuery->where('channel_connection_id', $messageData['connection_id']);
        }

        $conversation = $convQuery->latest()->first();

        if (empty($subject) && $conversation) {
            $lastInbound = Message::where('conversation_id', $conversation->id)
                ->where('direction', 'inbound')
                ->latest()
                ->first();
            if ($lastInbound && preg_match('/^Subject:\s*(.*?)\n\n/s', str_replace("\r", "", $lastInbound->body ?? ''), $subMatches)) {
                $inboundSub = trim($subMatches[1]);
                $subject = str_starts_with(strtolower($inboundSub), 're:') ? $inboundSub : "Re: {$inboundSub}";
            }
        }

        if (empty($subject)) {
            $subject = 'Conversation Reply';
        }

        if ($provider === 'sandbox') {
            return [
                'external_message_id' => $msgId,
                'delivery_status' => 'sent',
                'error_message' => null,
            ];
        }

        try {
            $host = $credentials['smtp_host'] ?? 'localhost';
            $port = (int)($credentials['smtp_port'] ?? 587);
            $user = $credentials['smtp_username'] ?? '';
            $pass = $credentials['smtp_password'] ?? '';
            $encryption = $credentials['smtp_encryption'] ?? 'tls';

            // Symfony Mailer DSN construction
            $scheme = 'smtp';
            if ($encryption === 'ssl') {
                $scheme = 'smtps';
            }

            $dsn = "{$scheme}://" . urlencode($user) . ":" . urlencode($pass) . "@{$host}:{$port}";
            $transport = Transport::fromDsn($dsn);
            $mailer = new SymfonyMailer($transport);

            // Determine if body is HTML formatted or plain text
            $isHtml = (bool) preg_match('/<[a-z][\s\S]*>/i', $body);
            $htmlBody = $isHtml ? $body : nl2br(e($body));
            $textBody = $isHtml ? trim(strip_tags($body)) : $body;

            $email = (new Email())
                ->from($credentials['email_address'] ?? 'support@whatsomni.io')
                ->to($recipient)
                ->subject($subject)
                ->html($htmlBody)
                ->text($textBody);

            $email->getHeaders()->addIdHeader('Message-ID', $msgId);

            if ($conversation) {
                // Look for last message to reply to
                $lastMsg = Message::where('conversation_id', $conversation->id)
                    ->whereNotNull('external_message_id')
                    ->latest()
                    ->first();

                if ($lastMsg && str_contains($lastMsg->external_message_id, '@')) {
                    $cleanLastMsgId = trim($lastMsg->external_message_id, '<>');
                    $email->getHeaders()->addIdHeader('In-Reply-To', $cleanLastMsgId);
                    $email->getHeaders()->addIdHeader('References', $cleanLastMsgId);
                }
            }

            $mailer->send($email);

            return [
                'external_message_id' => $msgId,
                'delivery_status' => 'sent',
                'error_message' => null,
            ];

        } catch (Exception $e) {
            Log::error("EmailDriver sending failed: " . $e->getMessage());
            return [
                'external_message_id' => null,
                'delivery_status' => 'failed',
                'error_message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Verify webhook signature for email providers (Mailgun, Sendgrid, Postmark, custom webhook token).
     */
    public function verifyWebhookSignature(array $headers, string $payload, array $credentials): bool
    {
        $secret = $credentials['webhook_secret'] ?? ($credentials['api_key'] ?? ($credentials['signing_key'] ?? null));

        if (empty($secret)) {
            // If no webhook secret is configured for the email channel, allow standard ingress
            return true;
        }

        // 1. Mailgun signature check
        $data = json_decode($payload, true) ?: [];
        if (isset($data['signature']) && is_array($data['signature'])) {
            $timestamp = $data['signature']['timestamp'] ?? '';
            $token = $data['signature']['token'] ?? '';
            $sig = $data['signature']['signature'] ?? '';
            if ($timestamp && $token && $sig) {
                $expected = hash_hmac('sha256', $timestamp . $token, $secret);
                return hash_equals($expected, $sig);
            }
        }

        // 2. Sendgrid / Generic header token check
        $inboundToken = $headers['x-webhook-secret'][0] 
            ?? ($headers['x-twilio-email-event-webhook-signature'][0] 
            ?? ($headers['x-postmark-server-token'][0] 
            ?? ($headers['authorization'][0] ?? null)));

        if ($inboundToken) {
            if (str_starts_with($inboundToken, 'Bearer ')) {
                $inboundToken = substr($inboundToken, 7);
            }
            return hash_equals((string)$secret, (string)$inboundToken);
        }

        return false;
    }

    /**
     * Normalize incoming email webhooks.
     */
    public function normalizeInboundPayload(array $payload): array
    {
        // Extract headers or raw values
        $from = $payload['external_chat_id'] ?? $payload['from'] ?? $payload['sender'] ?? 'customer@example.com';
        // Extract clean email address if format is "John Doe <john@doe.com>"
        if (preg_match('/<([^>]+)>/', $from, $m)) {
            $from = $m[1];
        }

        $subject = $payload['subject'] ?? '';
        $text = $payload['body'] ?? $payload['text'] ?? $payload['html'] ?? '';

        $bodyText = $subject ? "Subject: {$subject}\n\n{$text}" : $text;

        return [
            'external_chat_id' => (string)trim($from),
            'sender_identifier' => $payload['sender_name'] ?? $payload['sender_identifier'] ?? null,
            'external_message_id' => (string)($payload['message_id'] ?? $payload['Message-ID'] ?? '<inbound-' . uniqid() . '@whatsomni.io>'),
            'message_type' => 'text',
            'body' => $bodyText,
            'media_url' => null,
            'in_reply_to' => $payload['in_reply_to'] ?? $payload['In-Reply-To'] ?? null,
        ];
    }

    /**
     * Normalize status payload updates.
     */
    public function normalizeStatusPayload(array $payload): array
    {
        return [
            'external_message_id' => (string)($payload['external_message_id'] ?? $payload['message_id'] ?? ''),
            'delivery_status' => $payload['delivery_status'] ?? 'delivered',
            'error_message' => $payload['error_message'] ?? null,
        ];
    }
}
