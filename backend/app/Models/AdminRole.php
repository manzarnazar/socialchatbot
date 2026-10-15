<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AdminRole extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'saas_admin_roles';

    protected $fillable = [
        'name',
        'permissions',
    ];

    protected $casts = [
        'permissions' => 'array',
    ];

    protected $appends = ['display_name'];

    public function getDisplayNameAttribute(): string
    {
        return ucwords(str_replace(['_', '-'], ' ', $this->name));
    }

    /**
     * Relationship: admins
     */
    public function admins(): HasMany
    {
        return $this->hasMany(Admin::class, 'role_id');
    }
}
