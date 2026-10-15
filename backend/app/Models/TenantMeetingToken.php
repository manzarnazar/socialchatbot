<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;
use Carbon\Carbon;

class TenantMeetingToken extends Model
{
    protected $fillable = [
        'tenant_id',
        'provider',
        'access_token',
        'refresh_token',
        'expires_at',
        'email',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Accessor to decrypt access_token.
     */
    public function getDecryptedAccessTokenAttribute(): string
    {
        try {
            return Crypt::decryptString($this->access_token);
        } catch (\Exception $e) {
            return $this->access_token;
        }
    }

    /**
     * Mutator to encrypt access_token.
     */
    public function setAccessTokenAttribute(string $value): void
    {
        $this->attributes['access_token'] = Crypt::encryptString($value);
    }

    /**
     * Accessor to decrypt refresh_token.
     */
    public function getDecryptedRefreshTokenAttribute(): ?string
    {
        if (empty($this->refresh_token)) {
            return null;
        }

        try {
            return Crypt::decryptString($this->refresh_token);
        } catch (\Exception $e) {
            return $this->refresh_token;
        }
    }

    /**
     * Mutator to encrypt refresh_token.
     */
    public function setRefreshTokenAttribute(?string $value): void
    {
        $this->attributes['refresh_token'] = $value ? Crypt::encryptString($value) : null;
    }

    /**
     * Check if token is expired.
     */
    public function isExpired(): bool
    {
        if (!$this->expires_at) {
            return true;
        }

        return Carbon::now()->gte($this->expires_at->copy()->subMinutes(5));
    }
}
