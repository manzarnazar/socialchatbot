<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AiAgent extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    protected $table = 'ai_agents';

    protected $fillable = [
        'tenant_id',
        'name',
        'type',
        'trigger_type',
        'ai_provider_config_id',
        'provider',
        'model',
        'system_prompt',
        'status',
        'business_hours',
        'fallback_message',
        'handoff_rules',
        'flow_id',
        'knowledge_base_id',
        'created_by',
    ];

    protected $appends = [
        'provider_name',
    ];

    protected $casts = [
        'business_hours' => 'array',
        'handoff_rules' => 'array',
    ];

    public function getProviderNameAttribute(): string
    {
        $aiService = app(\App\Services\AIProviderService::class);
        if ($aiService->getAiOperationalModel() === 'master_fixed') {
            return 'platform';
        }

        if ($this->providerConfig && !empty($this->providerConfig->provider_name)) {
            return $this->providerConfig->provider_name;
        }
        if (!empty($this->attributes['provider'])) {
            return $this->attributes['provider'];
        }
        return 'groq';
    }

    public function providerConfig(): BelongsTo
    {
        return $this->belongsTo(AIProviderConfig::class, 'ai_provider_config_id');
    }

    public function flow(): BelongsTo
    {
        return $this->belongsTo(Flow::class);
    }

    public function knowledgeBase(): BelongsTo
    {
        return $this->belongsTo(KnowledgeBase::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function channels(): BelongsToMany
    {
        return $this->belongsToMany(
            ChannelConnection::class,
            'ai_agent_channels',
            'ai_agent_id',
            'channel_connection_id'
        )->withTimestamps();
    }

    public function logs(): HasMany
    {
        return $this->hasMany(AiAgentLog::class);
    }
}
