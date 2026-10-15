<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageStatusUpdated implements ShouldBroadcast
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
        $tenantId = $this->message->conversation->tenant_id;
        return [
            new PrivateChannel("tenant.{$tenantId}.chats"),
        ];
    }

    /**
     * Broadcast details.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'conversation_id' => $this->message->conversation_id,
            'external_message_id' => $this->message->external_message_id,
            'delivery_status' => $this->message->delivery_status,
            'error_message' => $this->message->error_message,
            'updated_at' => $this->message->updated_at ? $this->message->updated_at->toIso8601String() : null,
        ];
    }
}
