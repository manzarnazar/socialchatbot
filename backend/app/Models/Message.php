<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'direction',
        'message_type',
        'sender_identifier',
        'body',
        'media_url',
        'external_message_id',
        'delivery_status',
        'error_message',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    protected static function booted()
    {
        static::updated(function ($message) {
            if ($message->isDirty('delivery_status')) {
                $dispatch = \App\Models\CampaignDispatch::where('message_id', $message->id)->first();
                if ($dispatch) {
                    $newStatus = $message->delivery_status;
                    if ($dispatch->status !== $newStatus && $dispatch->status !== 'replied') {
                        $dispatch->update(['status' => $newStatus]);
                        if ($dispatch->campaign) {
                            $dispatch->campaign->recalculateStats();
                        }
                    }
                }
            }
        });

        static::created(function ($message) {
            if ($message->direction === 'inbound') {
                $conversation = $message->conversation;
                $contactId = $conversation ? $conversation->contact_id : null;
                if ($contactId) {
                    // Check if there is an active sent/delivered campaign dispatch that can be marked as replied
                    $dispatch = \App\Models\CampaignDispatch::where('contact_id', $contactId)
                        ->whereIn('status', ['sent', 'delivered', 'read'])
                        ->latest()
                        ->first();
                    if ($dispatch) {
                        $dispatch->update(['status' => 'replied']);
                        if ($dispatch->campaign) {
                            $dispatch->campaign->recalculateStats();
                        }
                    }
                }
            }
        });
    }
}
