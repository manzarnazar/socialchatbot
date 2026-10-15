<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Plan extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'stripe_product_id',
        'paddle_product_id',
        'mercadopago_plan_id',
        'myfatoorah_plan_id',
        'is_active',
        'trial_days',
        'max_workspaces',
        'max_team_members',
        'max_campaigns',
        'max_integrations',
        'allowed_integrations',
        'own_crm_access',
        'max_channels',
        'allowed_channels',
        'max_automations',
        'max_ecommerce_stores',
        'max_ecommerce_products',
        'monthly_ecommerce_orders',
        'has_abandoned_cart_recovery',
        'has_whatsapp_checkout',
        'max_meta_ad_accounts',
        'max_meta_campaigns',
        'has_click_to_whatsapp_ads',
        'has_meta_lead_sync',
        'monthly_messages_limit',
        'flow_credits',
        'copilot_credits',
        'monthly_ai_tokens',
        'has_flow_templates',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'own_crm_access' => 'boolean',
        'has_flow_templates' => 'boolean',
        'has_abandoned_cart_recovery' => 'boolean',
        'has_whatsapp_checkout' => 'boolean',
        'has_click_to_whatsapp_ads' => 'boolean',
        'has_meta_lead_sync' => 'boolean',
        'trial_days' => 'integer',
        'max_workspaces' => 'integer',
        'max_team_members' => 'integer',
        'max_campaigns' => 'integer',
        'max_integrations' => 'integer',
        'allowed_integrations' => 'array',
        'max_channels' => 'integer',
        'allowed_channels' => 'array',
        'max_automations' => 'integer',
        'max_ecommerce_stores' => 'integer',
        'max_ecommerce_products' => 'integer',
        'monthly_ecommerce_orders' => 'integer',
        'max_meta_ad_accounts' => 'integer',
        'max_meta_campaigns' => 'integer',
        'monthly_messages_limit' => 'integer',
        'flow_credits' => 'integer',
        'copilot_credits' => 'integer',
        'monthly_ai_tokens' => 'integer',
        'sort_order' => 'integer',
    ];

    public function tenants(): HasMany
    {
        return $this->hasMany(Tenant::class);
    }

    public function prices(): HasMany
    {
        return $this->hasMany(PlanPrice::class);
    }
}
