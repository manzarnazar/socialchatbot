<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BookingLink extends Model
{
    protected $fillable = [
        'tenant_id',
        'staff_id',
        'user_id',
        'slug',
        'name',
        'description',
        'duration',
        'buffer_before',
        'buffer_after',
        'working_hours',
        'is_active',
        'assign_mode',
        'resource_pool',
        'location_type',
        'custom_location',
    ];

    protected $casts = [
        'working_hours' => 'array',
        'resource_pool' => 'array',
        'is_active' => 'boolean',
        'duration' => 'integer',
        'buffer_before' => 'integer',
        'buffer_after' => 'integer',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(StaffMember::class, 'staff_id');
    }

    public function staffMember(): BelongsTo
    {
        return $this->belongsTo(StaffMember::class, 'staff_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }
}
