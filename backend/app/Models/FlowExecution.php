<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FlowExecution extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'flow_version_id',
        'contact_id',
        'conversation_id',
        'status',
        'current_node_id',
        'context',
        'resume_after',
        'last_error',
    ];

    protected $casts = [
        'context' => 'array',
        'resume_after' => 'datetime',
    ];

    public function flowVersion(): BelongsTo
    {
        return $this->belongsTo(FlowVersion::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(FlowExecutionLog::class);
    }
}
