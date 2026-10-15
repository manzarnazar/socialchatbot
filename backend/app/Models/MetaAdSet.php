<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MetaAdSet extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'meta_campaign_id',
        'meta_ad_set_id',
        'name',
        'status',
        'optimization_goal',
        'billing_event',
        'bid_amount',
        'daily_budget',
        'lifetime_budget',
        'start_time',
        'end_time',
        'destination_type',
        'whatsapp_phone_number',
        'targeting_spec',
        'placements_spec',
        'error_message',
        'metadata',
    ];

    protected $casts = [
        'bid_amount' => 'decimal:2',
        'daily_budget' => 'decimal:2',
        'lifetime_budget' => 'decimal:2',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'targeting_spec' => 'array',
        'placements_spec' => 'array',
        'metadata' => 'array',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(MetaCampaign::class, 'meta_campaign_id');
    }

    public function ads(): HasMany
    {
        return $this->hasMany(MetaAd::class);
    }

    public function insights(): HasMany
    {
        return $this->hasMany(MetaAdInsight::class);
    }
}
