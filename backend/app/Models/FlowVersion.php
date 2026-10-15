<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FlowVersion extends Model
{
    use HasFactory;

    protected $fillable = [
        'flow_id',
        'version_number',
        'definition',
        'is_published',
        'created_by',
    ];

    protected $casts = [
        'definition' => 'array',
        'is_published' => 'boolean',
    ];

    public function flow(): BelongsTo
    {
        return $this->belongsTo(Flow::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
