<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanPrice extends Model
{
    use HasFactory;

    protected $table = 'plan_prices';

    protected $fillable = [
        'plan_id',
        'currency_id',
        'amount',
        'stripe_price_id',
        'razorpay_plan_id',
        'paystack_plan_code',
        'flutterwave_plan_id',
        'paypal_plan_id',
        'paddle_price_id',
        'mercadopago_plan_id',
        'myfatoorah_plan_id',
        'billing_interval',
    ];

    /**
     * Relationship: plan
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    /**
     * Relationship: currency
     */
    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }
}
