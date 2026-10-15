<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AiChatbot extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    protected $table = 'ai_chatbots';

    protected $fillable = [
        'tenant_id',
        'name',
        'avatar',
        'description',
        'system_prompt',
        'temperature',
        'ai_provider_config_id',
        'provider',
        'model',
        'knowledge_base_id',
        'ecommerce_connection_id',
        'ecommerce_settings',
        'status',
        'business_hours',
        'fallback_message',
        'handoff_rules',
        'created_by',
    ];

    protected $appends = [
        'provider_name',
    ];

    protected $casts = [
        'temperature' => 'float',
        'business_hours' => 'array',
        'handoff_rules' => 'array',
        'ecommerce_settings' => 'array',
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

    public function knowledgeBase(): BelongsTo
    {
        return $this->belongsTo(KnowledgeBase::class);
    }

    public function ecommerceConnection(): BelongsTo
    {
        return $this->belongsTo(EcommerceConnection::class, 'ecommerce_connection_id');
    }

    public function isEcommerceEnabled(): bool
    {
        return !empty($this->ecommerce_settings['enabled']);
    }

    public function getEcommerceSetting(string $key, $default = null)
    {
        return $this->ecommerce_settings[$key] ?? $default;
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function channels(): BelongsToMany
    {
        return $this->belongsToMany(
            ChannelConnection::class,
            'ai_chatbot_channels',
            'ai_chatbot_id',
            'channel_connection_id'
        )->withTimestamps();
    }

    public function logs(): HasMany
    {
        return $this->hasMany(AiChatbotLog::class, 'ai_chatbot_id');
    }
}
