<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiAgentLog extends Model
{
    use HasFactory;

    protected $table = 'ai_agent_logs';

    public $timestamps = false; // Custom created_at only

    protected $fillable = [
        'ai_agent_id',
        'conversation_id',
        'request_tokens',
        'response_tokens',
        'estimated_cost',
        'model_used',
        'latency_ms',
    ];

    public function getModelUsedAttribute($value): string
    {
        $aiService = app(\App\Services\AIProviderService::class);
        if ($aiService->getAiOperationalModel() === 'master_fixed') {
            return 'WhatsOmni Enterprise AI';
        }
        return $value ?: 'WhatsOmni Enterprise AI';
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(AiAgent::class, 'ai_agent_id');
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}
