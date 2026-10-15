<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmIntegration extends Model
{
    protected $fillable = [
        'tenant_id',
        'provider',
        'access_token',
        'refresh_token',
        'expires_at',
        'email',
        'field_mapping',
        'metadata',
        'sync_direction',
        'last_sync_at',
    ];

    protected $casts = [
        'access_token' => 'encrypted',
        'refresh_token' => 'encrypted',
        'field_mapping' => 'array',
        'metadata' => 'array',
        'expires_at' => 'datetime',
        'last_sync_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function syncLogs(): HasMany
    {
        return $this->hasMany(CrmSyncLog::class);
    }
}
