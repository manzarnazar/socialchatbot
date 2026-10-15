<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Campaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'name',
        'channel_connection_id',
        'audience_filter',
        'source_type',
        'message_template_id',
        'custom_subject',
        'custom_message',
        'media_url',
        'media_type',
        'cta_button_text',
        'cta_button_url',
        'ai_agent_id',
        'flow_id',
        'schedule_type',
        'scheduled_at',
        'status',
        'total_contacts',
        'sent_count',
        'delivered_count',
        'read_count',
        'replied_count',
        'failed_count',
        'error_log',
    ];

    protected $casts = [
        'audience_filter' => 'array',
        'scheduled_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function channelConnection(): BelongsTo
    {
        return $this->belongsTo(ChannelConnection::class);
    }

    public function messageTemplate(): BelongsTo
    {
        return $this->belongsTo(MessageTemplate::class);
    }

    public function aiAgent(): BelongsTo
    {
        return $this->belongsTo(AiAgent::class);
    }

    public function flow(): BelongsTo
    {
        return $this->belongsTo(Flow::class);
    }

    public function dispatches(): HasMany
    {
        return $this->hasMany(CampaignDispatch::class);
    }

    /**
     * Recalculate campaign statistics dynamically from campaign_dispatches.
     */
    public function recalculateStats(): void
    {
        $stats = $this->dispatches()
            ->selectRaw('count(*) as total')
            ->selectRaw('sum(case when status = "sent" then 1 else 0 end) as sent')
            ->selectRaw('sum(case when status = "delivered" then 1 else 0 end) as delivered')
            ->selectRaw('sum(case when status = "read" then 1 else 0 end) as read_count')
            ->selectRaw('sum(case when status = "replied" then 1 else 0 end) as replied')
            ->selectRaw('sum(case when status = "failed" then 1 else 0 end) as failed')
            ->first();

        $this->update([
            'total_contacts' => $stats->total ?: 0,
            'sent_count' => $stats->sent ?: 0,
            'delivered_count' => $stats->delivered ?: 0,
            'read_count' => $stats->read_count ?: 0,
            'replied_count' => $stats->replied ?: 0,
            'failed_count' => $stats->failed ?: 0,
        ]);
    }
}
