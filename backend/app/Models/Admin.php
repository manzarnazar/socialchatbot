<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Admin extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $table = 'saas_admins';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'role_id',
        'first_name',
        'last_name',
        'email',
        'password',
        'status',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'last_login_at' => 'datetime',
        'password' => 'hashed',
    ];

    /**
     * Relationship: role
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(AdminRole::class, 'role_id');
    }

    /**
     * Check if the admin has a permission.
     */
    public function hasPermission(string $permission): bool
    {
        if (!$this->role) {
            return false;
        }

        $permissions = $this->role->permissions ?? [];

        if (in_array('*', $permissions)) {
            return true;
        }

        return in_array($permission, $permissions);
    }

    /**
     * Relationship: tenant (for compatibility when Admin is acting user)
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * Get dynamic tenant attribute when acting as tenant user.
     */
    public function getTenantAttribute(): ?Tenant
    {
        if ($this->relationLoaded('tenant')) {
            return $this->getRelation('tenant');
        }

        return app()->has('tenant') ? app('tenant') : Tenant::first();
    }

    /**
     * Get dynamic tenant_id attribute when acting as tenant user.
     */
    public function getTenantIdAttribute(): ?int
    {
        return $this->attributes['tenant_id'] ?? (app()->has('tenant') ? app('tenant')->id : Tenant::first()?->id ?? 1);
    }

    /**
     * Superadmin operator can access any tenant context.
     */
    public function canAccessTenant(int|string|null $tenantId = null): bool
    {
        return true;
    }
}
