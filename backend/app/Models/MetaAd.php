<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MetaAd extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'meta_ad_set_id',
        'meta_ad_id',
        'meta_creative_id',
        'name',
        'status',
        'page_id',
        'instagram_actor_id',
        'creative_type',
        'primary_text',
        'headline',
        'description',
        'cta_type',
        'media_urls',
        'welcome_message',
        'linked_flow_id',
        'meta_preview_url',
        'error_message',
        'metadata',
    ];

    protected $casts = [
        'media_urls' => 'array',
        'metadata' => 'array',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function adSet(): BelongsTo
    {
        return $this->belongsTo(MetaAdSet::class, 'meta_ad_set_id');
    }

    public function linkedFlow(): BelongsTo
    {
        return $this->belongsTo(Flow::class, 'linked_flow_id');
    }

    public function insights(): HasMany
    {
        return $this->hasMany(MetaAdInsight::class);
    }

    public function leads(): HasMany
    {
        return $this->hasMany(MetaAdLead::class);
    }
}
