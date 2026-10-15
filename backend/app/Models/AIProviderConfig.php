<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIProviderConfig extends Model
{
    use HasFactory;

    protected $table = 'ai_provider_configs';

    protected $fillable = [
        'tenant_id',
        'provider_name',
        'api_key',
        'is_active',
        'enabled_models',
        'default_model',
    ];

    protected $casts = [
        'api_key' => 'encrypted',
        'enabled_models' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Get the tenant that owns this configuration.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
