<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EcommerceConnection extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'platform',
        'store_url',
        'credentials',
        'status',
        'webhook_secret',
        'last_synced_at',
    ];

    protected $casts = [
        'credentials' => 'encrypted:array',
        'last_synced_at' => 'datetime',
    ];

    protected $appends = [
        'provider',
    ];

    public function getProviderAttribute(): string
    {
        return $this->platform ?? '';
    }

    public function orders(): HasMany
    {
        return $this->hasMany(EcommerceOrder::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(EcommerceProduct::class);
    }
}
