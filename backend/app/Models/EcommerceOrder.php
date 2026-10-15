<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EcommerceOrder extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'contact_id',
        'ecommerce_connection_id',
        'external_order_id',
        'order_number',
        'customer_name',
        'customer_email',
        'customer_phone',
        'total_price',
        'subtotal_price',
        'total_tax',
        'total_discounts',
        'currency',
        'financial_status',
        'fulfillment_status',
        'status',
        'tracking_number',
        'tracking_url',
        'items_count',
        'items_summary',
        'line_items',
        'shipping_address',
        'billing_address',
        'external_created_at',
        'metadata',
    ];

    protected $casts = [
        'items_summary' => 'array',
        'line_items' => 'array',
        'shipping_address' => 'array',
        'billing_address' => 'array',
        'metadata' => 'array',
        'external_created_at' => 'datetime',
        'total_price' => 'decimal:2',
        'subtotal_price' => 'decimal:2',
        'total_tax' => 'decimal:2',
        'total_discounts' => 'decimal:2',
        'items_count' => 'integer',
    ];

    public function connection(): BelongsTo
    {
        return $this->belongsTo(EcommerceConnection::class, 'ecommerce_connection_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'contact_id');
    }
}
