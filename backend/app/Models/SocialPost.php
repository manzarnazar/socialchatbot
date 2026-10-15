<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class SocialPost extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'title',
        'content',
        'media_urls',
        'post_type',
        'timing_type',
        'scheduled_at',
        'published_at',
        'status',
        'ai_prompt',
        'ai_model',
        'metadata',
    ];

    protected $casts = [
        'media_urls' => 'array',
        'metadata' => 'array',
        'scheduled_at' => 'datetime',
        'published_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function postChannels(): HasMany
    {
        return $this->hasMany(SocialPostChannel::class);
    }

    public function channels(): BelongsToMany
    {
        return $this->belongsToMany(ChannelConnection::class, 'social_post_channels')
            ->withPivot(['id', 'platform', 'status', 'external_post_id', 'permalink', 'error_message', 'attempts', 'published_at'])
            ->withTimestamps();
    }
}
