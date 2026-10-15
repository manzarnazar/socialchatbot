<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialPostChannel extends Model
{
    use HasFactory;

    protected $fillable = [
        'social_post_id',
        'channel_connection_id',
        'platform',
        'status',
        'external_post_id',
        'permalink',
        'error_message',
        'attempts',
        'published_at',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'attempts' => 'integer',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(SocialPost::class, 'social_post_id');
    }

    public function channelConnection(): BelongsTo
    {
        return $this->belongsTo(ChannelConnection::class, 'channel_connection_id');
    }
}
