<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MetaAdInsight extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'meta_ad_account_id',
        'meta_campaign_id',
        'meta_ad_set_id',
        'meta_ad_id',
        'date',
        'impressions',
        'reach',
        'spend',
        'clicks',
        'ctr',
        'cpc',
        'cpm',
        'conversations_started',
        'cost_per_conversation',
        'leads_count',
        'purchases_count',
        'purchase_value',
        'roas',
        'raw_meta_data',
    ];

    protected $casts = [
        'date' => 'date',
        'impressions' => 'integer',
        'reach' => 'integer',
        'spend' => 'decimal:2',
        'clicks' => 'integer',
        'ctr' => 'decimal:4',
        'cpc' => 'decimal:4',
        'cpm' => 'decimal:4',
        'conversations_started' => 'integer',
        'cost_per_conversation' => 'decimal:4',
        'leads_count' => 'integer',
        'purchases_count' => 'integer',
        'purchase_value' => 'decimal:2',
        'roas' => 'decimal:2',
        'raw_meta_data' => 'array',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function adAccount(): BelongsTo
    {
        return $this->belongsTo(MetaAdAccount::class, 'meta_ad_account_id');
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(MetaCampaign::class, 'meta_campaign_id');
    }

    public function adSet(): BelongsTo
    {
        return $this->belongsTo(MetaAdSet::class, 'meta_ad_set_id');
    }

    public function ad(): BelongsTo
    {
        return $this->belongsTo(MetaAd::class, 'meta_ad_id');
    }
}
