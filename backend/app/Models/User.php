<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'tenant_users';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'tenant_id',
        'first_name',
        'last_name',
        'email',
        'password',
        'role_id',
        'channel_access_type',
        'status',
        'language',
        'email_verified_at',
        'last_login_at',
    ];

    protected $appends = [
        'accessible_channel_ids',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Get the tenant that owns the user.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get all workspaces owned by this user.
     */
    public function ownedTenants(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Tenant::class, 'owner_id');
    }

    /**
     * Get workspace memberships for this user.
     */
    public function workspaceMemberships(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(TenantUserMembership::class, 'user_id');
    }

    /**
     * Check if user is an account owner.
     */
    public function isOwner(): bool
    {
        if ($this->role && $this->role->name === 'owner') {
            return true;
        }

        if ($this->role_id === null && $this->tenant_id) {
            return true;
        }

        return $this->ownedTenants()->exists();
    }

    /**
     * Check if the user has access to a specific tenant workspace.
     */
    public function canAccessTenant(int|string|null $tenantId = null): bool
    {
        if (empty($tenantId)) {
            return false;
        }

        if ((int) $this->tenant_id === (int) $tenantId) {
            return true;
        }

        if ($this->ownedTenants()->where('id', $tenantId)->exists()) {
            return true;
        }

        return $this->workspaceMemberships()->where('tenant_id', $tenantId)->exists();
    }

    /**
     * Get all accessible workspaces for this user.
     */
    public function allWorkspaces(): \Illuminate\Support\Collection
    {
        // 1. Owned tenants
        $owned = $this->ownedTenants()->with(['currency', 'plan'])->get();

        // 2. Memberships
        $membershipTenantIds = $this->workspaceMemberships()->pluck('tenant_id')->toArray();
        $membershipTenants = Tenant::with(['currency', 'plan'])->whereIn('id', $membershipTenantIds)->get();

        // 3. Primary tenant fallback
        $primaryTenant = $this->tenant()->with(['currency', 'plan'])->get();

        return $owned->merge($membershipTenants)->merge($primaryTenant)->unique('id')->values();
    }

    /**
     * Get the role associated with the user.
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Get the teams associated with the user.
     */
    public function teams(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'team_tenant_user', 'tenant_user_id', 'team_id')
                    ->withTimestamps();
    }

    /**
     * Get the channels specifically assigned to this user.
     */
    public function channelConnections(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(ChannelConnection::class, 'channel_connection_tenant_user', 'tenant_user_id', 'channel_connection_id')
                    ->withTimestamps();
    }

    /**
     * Get accessible channel IDs for the user in Shared Inbox.
     * Returns null if user has unrestricted access (owner, admin, or channel_access_type === 'all').
     * Returns array of channel IDs if user is restricted to specific channels.
     */
    public function getAccessibleChannelIds(): ?array
    {
        // Owner and Admin roles have full oversight
        if ($this->role && in_array($this->role->name, ['owner', 'admin'])) {
            return null;
        }

        // Default 'all' access allows all tenant channels
        if ($this->channel_access_type !== 'custom') {
            return null;
        }

        return $this->channelConnections()->pluck('channel_connections.id')->toArray();
    }

    public function getAccessibleChannelIdsAttribute(): ?array
    {
        return $this->getAccessibleChannelIds();
    }

    /**
     * Check if the user has a specific permission.
     */
    public function hasPermission(string $module, ?string $action = null): bool
    {
        // Owner has absolute clearance
        if ($this->isOwner()) {
            return true;
        }

        if (!$this->role || !$this->role->permissions) {
            return false;
        }

        if ($action === null && str_contains($module, '.')) {
            [$module, $action] = explode('.', $module, 2);
        }

        $action = $action ?: 'view';
        $permissions = $this->role->permissions;

        // Support wildcard '*' permission
        if (in_array('*', $permissions, true) || (isset($permissions['*']) && (in_array('*', (array)$permissions['*']) || in_array($action, (array)$permissions['*'])))) {
            return true;
        }

        if (!isset($permissions[$module])) {
            return false;
        }

        if (is_array($permissions[$module])) {
            return in_array($action, $permissions[$module]) || in_array('*', $permissions[$module]);
        }

        return (bool)$permissions[$module];
    }

    /**
     * Send the email verification notification.
     *
     * @return void
     */
    public function sendEmailVerificationNotification()
    {
        $this->notify(new \App\Notifications\VerifyEmailNotification);
    }

    /**
     * Send the password reset notification.
     *
     * @param  string  $token
     * @return void
     */
    public function sendPasswordResetNotification($token)
    {
        $this->notify(new \App\Notifications\ResetPasswordNotification($token));
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'user_id');
    }

    public function bookingLinks()
    {
        return $this->hasMany(BookingLink::class, 'user_id');
    }
}
