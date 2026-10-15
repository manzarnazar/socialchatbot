<?php

namespace App\Events;

use App\Models\Conversation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ConversationUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Conversation $conversation;

    /**
     * Create a new event instance.
     */
    public function __construct(Conversation $conversation)
    {
        $this->conversation = $conversation;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("tenant.{$this->conversation->tenant_id}.chats"),
        ];
    }

    /**
     * Broadcast with custom payload details.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->conversation->id,
            'status' => $this->conversation->status,
            'assigned_user_id' => $this->conversation->assigned_user_id,
            'assigned_team_id' => $this->conversation->assigned_team_id,
            'ai_active' => $this->conversation->ai_active,
            'last_message_at' => $this->conversation->last_message_at ? $this->conversation->last_message_at->toIso8601String() : null,
        ];
    }
}
