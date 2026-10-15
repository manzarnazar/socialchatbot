<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AuditLog extends Model
{
    use HasFactory;

    protected $table = 'audit_logs';

    // Disables auto-managing updated_at since it only tracks creation
    public $timestamps = false;

    protected $fillable = [
        'actor_type',
        'actor_id',
        'action',
        'subject_type',
        'subject_id',
        'meta',
        'ip_address',
        'created_at',
    ];

    protected $casts = [
        'meta' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * Morph relationship to get the actor (Admin or User)
     */
    public function actor(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Morph relationship to get the subject of the action (Tenant, Plan, etc.)
     */
    public function subject(): MorphTo
    {
        return $this->morphTo();
    }
}
