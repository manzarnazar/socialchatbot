<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

class Flow extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'trigger_type',
        'trigger_keywords',
        'channel_type',
        'is_active',
        'current_published_version_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'trigger_keywords' => 'array',
    ];

    public function versions(): HasMany
    {
        return $this->hasMany(FlowVersion::class);
    }

    public function publishedVersion(): BelongsTo
    {
        return $this->belongsTo(FlowVersion::class, 'current_published_version_id');
    }

    public function executions(): HasManyThrough
    {
        return $this->hasManyThrough(FlowExecution::class, FlowVersion::class);
    }

    public function channels(): BelongsToMany
    {
        return $this->belongsToMany(
            ChannelConnection::class,
            'flow_channels',
            'flow_id',
            'channel_connection_id'
        )->withPivot('is_active')->withTimestamps();
    }

    public function flowChannels(): HasMany
    {
        return $this->hasMany(FlowChannel::class);
    }
}
