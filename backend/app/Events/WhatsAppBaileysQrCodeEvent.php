<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WhatsAppBaileysQrCodeEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $connectionId;
    public string $qr;

    /**
     * Create a new event instance.
     */
    public function __construct(int $connectionId, string $qr)
    {
        $this->connectionId = $connectionId;
        $this->qr = $qr;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new Channel("channel-connection.{$this->connectionId}")
        ];
    }

    /**
     * Broadcast payload.
     */
    public function broadcastWith(): array
    {
        return [
            'qr' => $this->qr,
        ];
    }

    /**
     * Event name for broadcasting.
     */
    public function broadcastAs(): string
    {
        return 'whatsapp.baileys.qr';
    }
}
