<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MessageTemplate extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'message_templates';

    protected $fillable = [
        'tenant_id',
        'channel_connection_id',
        'name',
        'type',
        'category',
        'language',
        'status',
        'meta_template_id',
        'content',
    ];

    protected $casts = [
        'content' => 'array',
    ];

    /**
     * Relationship to channel connection.
     */
    public function channelConnection(): BelongsTo
    {
        return $this->belongsTo(ChannelConnection::class, 'channel_connection_id');
    }
}
