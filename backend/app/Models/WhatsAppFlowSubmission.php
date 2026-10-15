<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsAppFlowSubmission extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'whatsapp_flow_submissions';

    protected $fillable = [
        'tenant_id',
        'whatsapp_flow_id',
        'contact_id',
        'conversation_id',
        'channel_connection_id',
        'flow_token',
        'response_data',
        'field_labels',
        'external_message_id',
    ];

    protected $casts = [
        'response_data' => 'array',
        'field_labels' => 'array',
    ];

    /**
     * Get the tenant that owns the submission.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the parent WhatsApp Flow.
     */
    public function flow(): BelongsTo
    {
        return $this->belongsTo(WhatsAppFlow::class, 'whatsapp_flow_id');
    }

    /**
     * Get the contact who submitted the form.
     */
    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * Get the conversation where the form was submitted.
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    /**
     * Get the channel connection.
     */
    public function channelConnection(): BelongsTo
    {
        return $this->belongsTo(ChannelConnection::class, 'channel_connection_id');
    }
}
