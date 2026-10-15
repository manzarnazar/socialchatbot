<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuickReplyChannel extends Model
{
    use HasFactory;

    protected $table = 'quick_reply_channels';

    protected $fillable = [
        'quick_reply_id',
        'channel_connection_id',
    ];

    public function quickReply(): BelongsTo
    {
        return $this->belongsTo(QuickReply::class, 'quick_reply_id');
    }

    public function channel(): BelongsTo
    {
        return $this->belongsTo(ChannelConnection::class, 'channel_connection_id');
    }
}
