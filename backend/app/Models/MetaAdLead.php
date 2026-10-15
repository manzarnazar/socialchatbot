<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MetaAdLead extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'meta_ad_id',
        'meta_lead_id',
        'meta_form_id',
        'contact_id',
        'form_data',
        'status',
    ];

    protected $casts = [
        'form_data' => 'array',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function ad(): BelongsTo
    {
        return $this->belongsTo(MetaAd::class, 'meta_ad_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }
}
