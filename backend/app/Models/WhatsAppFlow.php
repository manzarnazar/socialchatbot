<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class WhatsAppFlow extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    protected $table = 'whatsapp_flows';

    protected $fillable = [
        'tenant_id',
        'channel_connection_id',
        'created_by',
        'name',
        'description',
        'meta_flow_id',
        'status', // DRAFT, SUBMITTED, PUBLISHED, DEPRECATED, BLOCKED, REJECTED
        'categories',
        'flow_json',
        'ui_schema',
        'endpoint_uri',
        'preview_url',
        'is_active',
        'sync_status',
        'sync_error_message',
        'submissions_count',
        'last_synced_at',
    ];

    protected $casts = [
        'categories' => 'array',
        'flow_json' => 'array',
        'ui_schema' => 'array',
        'is_active' => 'boolean',
        'submissions_count' => 'integer',
        'last_synced_at' => 'datetime',
    ];

    /**
     * Get the tenant that owns the WhatsApp Flow.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the bound WhatsApp Channel Connection.
     */
    public function channelConnection(): BelongsTo
    {
        return $this->belongsTo(ChannelConnection::class, 'channel_connection_id');
    }

    /**
     * Get the user who created this Flow.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get all submissions for this Flow.
     */
    public function submissions(): HasMany
    {
        return $this->hasMany(WhatsAppFlowSubmission::class, 'whatsapp_flow_id');
    }

    /**
     * Check if flow is approved & published on Meta.
     */
    public function isPublished(): bool
    {
        return strtoupper($this->status) === 'PUBLISHED';
    }

    /**
     * Scope for active published flows.
     */
    public function scopePublished($query)
    {
        return $query->where('status', 'PUBLISHED')->where('is_active', true);
    }

    /**
     * Generate Meta Flow JSON specification if not explicitly stored.
     */
    public function toMetaFlowJson(): array
    {
        if (!empty($this->flow_json)) {
            return $this->flow_json;
        }

        // Return a valid default Meta Flow JSON (version 6.0)
        return [
            'version' => '6.0',
            'screens' => [
                [
                    'id' => 'SCREEN_ONE',
                    'title' => $this->name,
                    'data' => (object)[],
                    'terminal' => true,
                    'layout' => [
                        'type' => 'SingleColumnLayout',
                        'children' => [
                            [
                                'type' => 'TextHeading',
                                'text' => $this->name,
                            ],
                            [
                                'type' => 'TextBody',
                                'text' => $this->description ?: 'Please fill out the information below.',
                            ],
                            [
                                'type' => 'Footer',
                                'label' => 'Submit',
                                'on-click-action' => [
                                    'name' => 'complete',
                                    'payload' => (object)[]
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ];
    }
}
