<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StaffMember extends Model
{
    use HasFactory;

    protected $table = 'staff_members';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'name',
        'email',
        'phone',
        'title',
        'type', // 'staff' | 'resource'
        'color',
        'avatar_url',
        'working_hours',
        'google_calendar_id',
        'google_sync_enabled',
        'is_active',
    ];

    protected $casts = [
        'working_hours' => 'array',
        'google_sync_enabled' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'staff_id');
    }

    public function bookingLinks()
    {
        return $this->hasMany(BookingLink::class, 'staff_id');
    }
}
