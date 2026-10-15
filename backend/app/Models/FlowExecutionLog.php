<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FlowExecutionLog extends Model
{
    use HasFactory;

    // Disabling standard timestamps, since we only track created_at
    public $timestamps = false;

    protected $fillable = [
        'flow_execution_id',
        'node_id',
        'node_type',
        'node_title',
        'status',
        'execution_time_ms',
        'details',
        'error_message',
    ];

    protected $casts = [
        'details' => 'array',
    ];

    public function execution(): BelongsTo
    {
        return $this->belongsTo(FlowExecution::class, 'flow_execution_id');
    }
}
