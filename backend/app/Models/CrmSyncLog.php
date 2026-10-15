<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmSyncLog extends Model
{
    protected $fillable = [
        'tenant_id',
        'crm_integration_id',
        'contact_id',
        'external_id',
        'action',
        'status',
        'error_message',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function crmIntegration(): BelongsTo
    {
        return $this->belongsTo(CrmIntegration::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }
}
