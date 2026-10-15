<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class QuickReply extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    protected $table = 'quick_replies';

    protected $fillable = [
        'tenant_id',
        'created_by',
        'name',
        'shortcut',
        'trigger_keywords',
        'match_type',
        'channel_target_type',
        'body',
        'media_url',
        'media_type',
        'is_active',
        'auto_reply_enabled',
        'usage_count',
        'last_used_at',
    ];

    protected $casts = [
        'trigger_keywords' => 'array',
        'is_active' => 'boolean',
        'auto_reply_enabled' => 'boolean',
        'usage_count' => 'integer',
        'last_used_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function channels(): BelongsToMany
    {
        return $this->belongsToMany(
            ChannelConnection::class,
            'quick_reply_channels',
            'quick_reply_id',
            'channel_connection_id'
        )->withTimestamps();
    }

    public function quickReplyChannels(): HasMany
    {
        return $this->hasMany(QuickReplyChannel::class, 'quick_reply_id');
    }

    /**
     * Check whether this quick reply matches an incoming text message.
     */
    public function matchesText(string $text): bool
    {
        $cleanText = trim(mb_strtolower($text));
        if ($cleanText === '') {
            return false;
        }

        $keywords = is_array($this->trigger_keywords)
            ? $this->trigger_keywords
            : (is_string($this->trigger_keywords) ? json_decode($this->trigger_keywords, true) : []);

        if (!is_array($keywords)) {
            $keywords = [];
        }

        if (!empty($this->shortcut)) {
            $shortcut = trim(mb_strtolower($this->shortcut));
            $shortcutWithoutSlash = ltrim($shortcut, '/');
            if ($shortcut !== '') $keywords[] = $shortcut;
            if ($shortcutWithoutSlash !== '') $keywords[] = $shortcutWithoutSlash;
        }

        $keywords = array_values(array_unique(array_filter(array_map(function ($kw) {
            return is_string($kw) ? trim($kw) : '';
        }, $keywords))));

        if (empty($keywords)) {
            return false;
        }

        $matchType = $this->match_type ?: 'contains';

        foreach ($keywords as $keyword) {
            $kw = mb_strtolower($keyword);
            if ($kw === '') continue;

            if ($matchType === 'exact') {
                if ($cleanText === $kw) {
                    return true;
                }
            } elseif ($matchType === 'starts_with') {
                if (str_starts_with($cleanText, $kw)) {
                    return true;
                }
            } else { // 'contains'
                if (str_contains($cleanText, $kw)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if this quick reply is linked/applicable to the given channel connection.
     */
    public function isApplicableToChannel(int $channelConnectionId): bool
    {
        if ($this->channel_target_type === 'all') {
            return true;
        }

        if ($this->relationLoaded('channels')) {
            return $this->channels->contains('id', $channelConnectionId);
        }

        return $this->channels()->where('channel_connections.id', $channelConnectionId)->exists();
    }
}
