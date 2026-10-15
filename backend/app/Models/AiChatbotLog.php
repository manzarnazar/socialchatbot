<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiChatbotLog extends Model
{
    use HasFactory;

    protected $table = 'ai_chatbot_logs';

    protected $fillable = [
        'ai_chatbot_id',
        'conversation_id',
        'channel_type',
        'inbound_text',
        'outbound_text',
        'rag_sources',
        'tool_calls',
        'tokens_used',
        'latency_ms',
        'status',
        'error_details',
    ];

    protected $casts = [
        'rag_sources' => 'array',
        'tool_calls' => 'array',
        'tokens_used' => 'integer',
        'latency_ms' => 'integer',
    ];

    public function chatbot(): BelongsTo
    {
        return $this->belongsTo(AiChatbot::class, 'ai_chatbot_id');
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'conversation_id');
    }
}
