<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MetaAdAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'meta_ad_account_id',
        'account_name',
        'account_status',
        'currency',
        'timezone_name',
        'spend_cap',
        'amount_spent',
        'balance',
        'access_token',
        'is_default',
        'metadata',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'spend_cap' => 'decimal:2',
        'amount_spent' => 'decimal:2',
        'balance' => 'decimal:2',
        'metadata' => 'array',
    ];

    protected $hidden = [
        'access_token',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(MetaCampaign::class);
    }

    public function insights(): HasMany
    {
        return $this->hasMany(MetaAdInsight::class);
    }
}
