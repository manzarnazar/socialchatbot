<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Services\EncryptionService;

class TenantGoogleToken extends Model
{
    protected $fillable = [
        'tenant_id',
        'access_token',
        'refresh_token',
        'expires_at',
        'email',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    /**
     * Get decrypted access token.
     */
    public function getDecryptedAccessTokenAttribute(): string
    {
        return EncryptionService::decrypt($this->access_token);
    }

    /**
     * Get decrypted refresh token.
     */
    public function getDecryptedRefreshTokenAttribute(): ?string
    {
        return $this->refresh_token ? EncryptionService::decrypt($this->refresh_token) : null;
    }

    /**
     * Encrypt access token on set.
     */
    public function setAccessTokenAttribute(string $value): void
    {
        $this->attributes['access_token'] = EncryptionService::encrypt($value);
    }

    /**
     * Encrypt refresh token on set.
     */
    public function setRefreshTokenAttribute(?string $value): void
    {
        $this->attributes['refresh_token'] = $value ? EncryptionService::encrypt($value) : null;
    }

    /**
     * Check if expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
