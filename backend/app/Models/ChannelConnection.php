<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Services\EncryptionService;

class ChannelConnection extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'channel_type',
        'name',
        'status',
        'credentials',
    ];

    /**
     * Get decrypted credentials as array.
     */
    public function getDecryptedCredentialsAttribute(): array
    {
        return $this->credentials ? json_decode(EncryptionService::decrypt($this->credentials), true) : [];
    }

    /**
     * Encrypt credentials array on set.
     */
    public function setCredentialsAttribute(array $value): void
    {
        $this->attributes['credentials'] = EncryptionService::encrypt(json_encode($value));
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    public function socialPostChannels(): HasMany
    {
        return $this->hasMany(SocialPostChannel::class);
    }

    public function socialPosts()
    {
        return $this->belongsToMany(SocialPost::class, 'social_post_channels')
            ->withPivot(['id', 'platform', 'status', 'external_post_id', 'permalink', 'error_message', 'published_at'])
            ->withTimestamps();
    }

    public function assignedUsers()
    {
        return $this->belongsToMany(User::class, 'channel_connection_tenant_user', 'channel_connection_id', 'tenant_user_id')
            ->withTimestamps();
    }
}
