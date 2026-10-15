<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageReceived implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Message $message;

    /**
     * Create a new event instance.
     */
    public function __construct(Message $message)
    {
        $this->message = $message;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        $conversation = $this->message->conversation;
        if (!$conversation) {
            return [];
        }
        $tenantId = $conversation->tenant_id;
        $channelId = $conversation->channel_connection_id;

        $channels = [
            new PrivateChannel("tenant.{$tenantId}.chats"),
            new PrivateChannel("tenant.{$tenantId}.conversation.{$conversation->id}"),
        ];

        if ($channelId) {
            $channels[] = new PrivateChannel("tenant.{$tenantId}.channel.{$channelId}");
        }

        return $channels;
    }

    /**
     * Broadcast with custom payload details.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'conversation_id' => $this->message->conversation_id,
            'direction' => $this->message->direction,
            'message_type' => $this->message->message_type,
            'sender_identifier' => $this->message->sender_identifier,
            'body' => $this->message->body,
            'media_url' => $this->message->media_url,
            'external_message_id' => $this->message->external_message_id,
            'delivery_status' => $this->message->delivery_status,
            'created_at' => $this->message->created_at ? $this->message->created_at->toIso8601String() : null,
        ];
    }
}
