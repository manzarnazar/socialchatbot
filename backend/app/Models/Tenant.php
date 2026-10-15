<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'owner_id',
        'company_name',
        'team_size',
        'industry_category',
        'status',
        'trial_ends_at',
        'onboarding_step',
        'currency_id',
        'stripe_customer_id',
        'stripe_subscription_id',
        'razorpay_customer_id',
        'razorpay_subscription_id',
        'paystack_customer_id',
        'paystack_subscription_id',
        'paystack_email_token',
        'flutterwave_customer_id',
        'flutterwave_subscription_id',
        'paypal_customer_id',
        'paypal_subscription_id',
        'paddle_customer_id',
        'paddle_subscription_id',
        'mercadopago_customer_id',
        'mercadopago_subscription_id',
        'myfatoorah_customer_id',
        'myfatoorah_subscription_id',
        'plan_id',
        'used_flow_credits',
        'used_copilot_credits',
        'extra_copilot_credits',
        'default_language',
        'custom_mailer_type',
        'custom_mailer_config',
    ];

    protected $casts = [
        'used_flow_credits' => 'integer',
        'used_copilot_credits' => 'integer',
        'extra_copilot_credits' => 'integer',
        'custom_mailer_config' => 'encrypted:json',
        'trial_ends_at' => 'datetime',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(TenantUserMembership::class, 'tenant_id');
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function socialPosts(): HasMany
    {
        return $this->hasMany(SocialPost::class);
    }

    /**
     * Get maximum Copilot Credits allowed by active plan + extra credited (-1 for unlimited).
     */
    public function getCopilotCreditsLimit(): int
    {
        $extra = (int) ($this->extra_copilot_credits ?? 0);
        if (!$this->plan) {
            return 25 + $extra; // Default trial/free credits
        }
        $base = $this->plan->copilot_credits ?? ($this->plan->flow_credits ?? 100);
        if ($base === -1) {
            return -1; // Unlimited
        }
        return $base + $extra;
    }

    /**
     * Get used Copilot Credits for the current billing cycle.
     */
    public function getUsedCopilotCredits(): int
    {
        return (int) ($this->used_copilot_credits ?? 0);
    }

    /**
     * Get remaining Copilot Credits (-1 for unlimited).
     */
    public function getRemainingCopilotCredits(): int
    {
        $limit = $this->getCopilotCreditsLimit();
        if ($limit === -1) {
            return -1; // Unlimited
        }
        return max(0, $limit - $this->getUsedCopilotCredits());
    }

    /**
     * Check if tenant has available Copilot credits.
     */
    public function hasCopilotCredits(): bool
    {
        $limit = $this->getCopilotCreditsLimit();
        if ($limit === -1) {
            return true; // Unlimited
        }
        return $this->getUsedCopilotCredits() < $limit;
    }

    /**
     * Get maximum connected Ecommerce stores allowed (-1 for unlimited).
     */
    public function getEcommerceStoresLimit(): int
    {
        if (!$this->plan) {
            return -1;
        }
        return (int) ($this->plan->max_ecommerce_stores ?? 1);
    }

    /**
     * Get maximum Ecommerce products in catalog (-1 for unlimited).
     */
    public function getEcommerceProductsLimit(): int
    {
        if (!$this->plan) {
            return -1;
        }
        return (int) ($this->plan->max_ecommerce_products ?? 100);
    }

    /**
     * Get maximum monthly orders processed (-1 for unlimited).
     */
    public function getMonthlyEcommerceOrdersLimit(): int
    {
        if (!$this->plan) {
            return -1;
        }
        return (int) ($this->plan->monthly_ecommerce_orders ?? 100);
    }

    /**
     * Check if Abandoned Cart Recovery is enabled for this tenant's plan.
     */
    public function canUseAbandonedCartRecovery(): bool
    {
        if (!$this->plan) {
            return true;
        }
        return (bool) ($this->plan->has_abandoned_cart_recovery ?? false);
    }

    /**
     * Check if Native WhatsApp Catalog Checkout is enabled for this tenant's plan.
     */
    public function canUseWhatsAppCheckout(): bool
    {
        if (!$this->plan) {
            return true;
        }
        return (bool) ($this->plan->has_whatsapp_checkout ?? false);
    }

    /**
     * Get maximum Meta Ad Accounts (-1 for unlimited).
     */
    public function getMetaAdAccountsLimit(): int
    {
        if (!$this->plan) {
            return 1;
        }
        return (int) ($this->plan->max_meta_ad_accounts ?? 1);
    }

    /**
     * Get maximum active Meta Campaigns (-1 for unlimited).
     */
    public function getMetaCampaignsLimit(): int
    {
        if (!$this->plan) {
            return 2;
        }
        return (int) ($this->plan->max_meta_campaigns ?? 2);
    }

    /**
     * Check if Click-to-WhatsApp Ads with Flows is enabled for this tenant's plan.
     */
    public function canUseClickToWhatsAppAds(): bool
    {
        if (!$this->plan) {
            return false;
        }
        return (bool) ($this->plan->has_click_to_whatsapp_ads ?? false);
    }

    /**
     * Check if Meta Lead Sync to CRM is enabled for this tenant's plan.
     */
    public function canUseMetaLeadSync(): bool
    {
        if (!$this->plan) {
            return false;
        }
        return (bool) ($this->plan->has_meta_lead_sync ?? false);
    }

    /**
     * Get maximum monthly outbound messages allowed (-1 for unlimited / uncapped).
     */
    public function getMonthlyMessagesLimit(): int
    {
        if (!$this->plan) {
            return -1; // Unlimited by default if no plan assigned
        }
        return (int) ($this->plan->monthly_messages_limit ?? -1);
    }

    /**
     * Get count of outbound messages sent by tenant in the current calendar month.
     * Note: Internal conversation notes (type 'note') are excluded from message caps.
     */
    public function getMonthlyOutboundMessagesCount(): int
    {
        return \App\Models\Message::whereHas('conversation', fn($q) => $q->where('tenant_id', $this->id))
            ->where('direction', 'outbound')
            ->where('message_type', '!=', 'note')
            ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->count();
    }

    /**
     * Check if tenant has available outbound message quota.
     */
    public function canSendOutboundMessage(): bool
    {
        $limit = $this->getMonthlyMessagesLimit();
        if ($limit === -1) {
            return true; // Unlimited / Uncapped
        }
        return $this->getMonthlyOutboundMessagesCount() < $limit;
    }

    /**
     * Get maximum channels allowed (-1 for unlimited).
     */
    public function getMaxChannelsLimit(): int
    {
        if (!$this->plan) {
            return $this->status === 'trial' ? 2 : -1;
        }
        return (int) ($this->plan->max_channels ?? -1);
    }

    /**
     * Get maximum team members allowed (-1 for unlimited).
     */
    public function getMaxTeamMembersLimit(): int
    {
        if (!$this->plan) {
            return $this->status === 'trial' ? 3 : -1;
        }
        return (int) ($this->plan->max_team_members ?? -1);
    }

    /**
     * Get maximum campaigns allowed (-1 for unlimited).
     */
    public function getMaxCampaignsLimit(): int
    {
        if (!$this->plan) {
            return $this->status === 'trial' ? 2 : -1;
        }
        return (int) ($this->plan->max_campaigns ?? -1);
    }

    /**
     * Get maximum automations allowed (-1 for unlimited).
     */
    public function getMaxAutomationsLimit(): int
    {
        if (!$this->plan) {
            return $this->status === 'trial' ? 2 : -1;
        }
        return (int) ($this->plan->max_automations ?? -1);
    }

    /**
     * Get maximum integrations allowed (-1 for unlimited).
     */
    public function getMaxIntegrationsLimit(): int
    {
        if (!$this->plan) {
            return $this->status === 'trial' ? 1 : -1;
        }
        return (int) ($this->plan->max_integrations ?? -1);
    }

    /**
     * Get maximum workspaces allowed (-1 for unlimited).
     */
    public function getMaxWorkspacesLimit(): int
    {
        if (!$this->plan) {
            return 1;
        }
        return (int) ($this->plan->max_workspaces ?? 1);
    }

    /**
     * Get flow credits limit (-1 for unlimited).
     */
    public function getFlowCreditsLimit(): int
    {
        if (!$this->plan) {
            return 5;
        }
        return (int) ($this->plan->flow_credits ?? 50);
    }

    /**
     * Get monthly AI tokens limit (-1 for unlimited).
     */
    public function getMonthlyAiTokensLimit(): int
    {
        if (!$this->plan) {
            return 100000;
        }
        return (int) ($this->plan->monthly_ai_tokens ?? 100000);
    }

    /**
     * Check if tenant is currently on an active, non-expired free trial.
     */
    public function onTrial(): bool
    {
        if ($this->status !== 'trial') {
            return false;
        }

        if ($this->trial_ends_at) {
            return $this->trial_ends_at->isFuture();
        }

        $trialDays = $this->plan?->trial_days ?: 14;
        return $this->created_at ? $this->created_at->addDays($trialDays)->isFuture() : true;
    }

    /**
     * Check if tenant's free trial period has ended.
     */
    public function isTrialExpired(): bool
    {
        if ($this->status !== 'trial') {
            return false;
        }

        return !$this->onTrial();
    }

    /**
     * Check if tenant has an active subscription or valid active trial.
     */
    public function hasActiveSubscription(): bool
    {
        if ($this->status === 'active') {
            return true;
        }

        return $this->onTrial();
    }
}

