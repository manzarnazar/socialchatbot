<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EcommerceAbandonedCart extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'ecommerce_connection_id',
        'contact_id',
        'cart_token',
        'checkout_url',
        'total_price',
        'items_summary',
        'recovery_status',
        'recovered_at',
    ];

    protected $casts = [
        'items_summary' => 'array',
        'total_price' => 'decimal:2',
        'recovered_at' => 'datetime',
    ];

    public function connection(): BelongsTo
    {
        return $this->belongsTo(EcommerceConnection::class, 'ecommerce_connection_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }
}
