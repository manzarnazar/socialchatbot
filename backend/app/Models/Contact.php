<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contact extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'lifecycle_stage',
        'opted_out_channels',
        'custom_fields',
        'tags',
        'is_muted',
    ];

    protected $casts = [
        'opted_out_channels' => 'array',
        'custom_fields' => 'array',
        'tags' => 'array',
        'is_muted' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(ContactActivity::class)->orderBy('created_at', 'desc');
    }
}
