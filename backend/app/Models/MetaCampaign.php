<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MetaCampaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'meta_ad_account_id',
        'meta_campaign_id',
        'name',
        'objective',
        'buying_type',
        'status',
        'budget_mode',
        'daily_budget',
        'lifetime_budget',
        'special_ad_categories',
        'error_message',
        'metadata',
    ];

    protected $casts = [
        'daily_budget' => 'decimal:2',
        'lifetime_budget' => 'decimal:2',
        'special_ad_categories' => 'array',
        'metadata' => 'array',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function adAccount(): BelongsTo
    {
        return $this->belongsTo(MetaAdAccount::class, 'meta_ad_account_id');
    }

    public function adSets(): HasMany
    {
        return $this->hasMany(MetaAdSet::class);
    }

    public function insights(): HasMany
    {
        return $this->hasMany(MetaAdInsight::class);
    }
}
