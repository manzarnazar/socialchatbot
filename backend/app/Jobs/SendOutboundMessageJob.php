<?php

namespace App\Jobs;

use App\Models\Message;
use App\Services\Channels\ChannelManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Exception;

class SendOutboundMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $messageId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $messageId)
    {
        $this->messageId = $messageId;
    }

    /**
     * Execute the job.
     */
    public function handle(ChannelManager $channelManager): void
    {
        $message = Message::with('conversation.channelConnection')->find($this->messageId);
        if (!$message) {
            Log::error("SendOutboundMessageJob: Message ID {$this->messageId} not found.");
            return;
        }

        $conversation = $message->conversation;
        $connection = $conversation->channelConnection;

        // Enforce channel-specific opt-out check
        if ($conversation->contact_id) {
            $contact = \App\Models\Contact::find($conversation->contact_id);
            if ($contact && is_array($contact->opted_out_channels) && in_array($connection->channel_type, $contact->opted_out_channels)) {
                $err = "Cannot send message. Contact has opted out of this channel (" . strtoupper($connection->channel_type) . ").";
                $message->update([
                    'delivery_status' => 'failed',
                    'error_message' => $err,
                ]);

                try {
                    broadcast(new \App\Events\MessageStatusUpdated($message))->toOthers();
                } catch (Exception $e) {}

                Log::warning("Channel opt-out enforcement blocked outgoing message ID: {$this->messageId}");
                return;
            }
        }

        // Enforce 24-hour customer support session window for official WhatsApp Cloud API
        if ($connection->channel_type === 'whatsapp' && $message->message_type !== 'template') {
            $lastInbound = Message::where('conversation_id', $conversation->id)
                ->where('direction', 'inbound')
                ->latest()
                ->first();

            if (!$lastInbound || $lastInbound->created_at->addHours(24)->isPast()) {
                $err = "Outside 24-hour customer support window. WhatsApp policy requires a pre-approved template message to open the conversation.";
                $message->update([
                    'delivery_status' => 'failed',
                    'error_message' => $err,
                ]);

                try {
                    broadcast(new \App\Events\MessageStatusUpdated($message))->toOthers();
                } catch (Exception $e) {}

                Log::warning("WhatsApp session window enforcement blocked outgoing message ID: {$this->messageId}");
                return;
            }
        }

        $driver = $channelManager->driver($connection->channel_type);

        try {
            $response = $driver->sendMessage($connection->decrypted_credentials, [
                'connection_id' => $connection->id,
                'to' => $conversation->external_chat_id,
                'external_chat_id' => $conversation->external_chat_id,
                'body' => $message->body,
                'media_url' => $message->media_url,
            ]);

            $message->update([
                'external_message_id' => $response['external_message_id'] ?? null,
                'delivery_status' => $response['delivery_status'] ?? 'sent',
                'error_message' => $response['error_message'] ?? null,
            ]);

            if ($response['delivery_status'] === 'sent') {
                $conversation->update(['last_message_at' => now()]);
            }

            // Dispatch Broadcast event (standard Reverb broadcasting payload)
            try {
                broadcast(new \App\Events\MessageStatusUpdated($message))->toOthers();
            } catch (Exception $e) {
                // If broadcasting is not fully setup locally, catch and log it silently
                Log::debug("Broadcasting MessageStatusUpdated skipped: " . $e->getMessage());
            }

        } catch (Exception $e) {
            Log::error("SendOutboundMessageJob failed: " . $e->getMessage());

            $message->update([
                'delivery_status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            try {
                broadcast(new \App\Events\MessageStatusUpdated($message))->toOthers();
            } catch (Exception $e) {
                Log::debug("Broadcasting MessageStatusUpdated skipped: " . $e->getMessage());
            }
        }
    }
}
