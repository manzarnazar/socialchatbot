<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiChatbotChannel extends Model
{
    use HasFactory;

    protected $table = 'ai_chatbot_channels';

    protected $fillable = [
        'ai_chatbot_id',
        'channel_connection_id',
    ];

    public function chatbot(): BelongsTo
    {
        return $this->belongsTo(AiChatbot::class, 'ai_chatbot_id');
    }

    public function channel(): BelongsTo
    {
        return $this->belongsTo(ChannelConnection::class, 'channel_connection_id');
    }
}
