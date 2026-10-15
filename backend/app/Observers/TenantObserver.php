<?php

namespace App\Observers;

use App\Models\Tenant;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class TenantObserver
{
    /**
     * Handle the Tenant "updated" event.
     */
    public function updated(Tenant $tenant): void
    {
        // 1. Plan override check
        if ($tenant->isDirty('plan_id')) {
            $actor = Auth::guard('admin')->user() ?? Auth::guard('web')->user();
            
            AuditLog::create([
                'actor_type' => $actor ? get_class($actor) : null,
                'actor_id' => $actor ? $actor->id : null,
                'action' => 'plan_override',
                'subject_type' => Tenant::class,
                'subject_id' => $tenant->id,
                'meta' => [
                    'old_plan_id' => $tenant->getOriginal('plan_id'),
                    'new_plan_id' => $tenant->plan_id,
                    'company_name' => $tenant->company_name,
                ],
                'ip_address' => Request::ip(),
            ]);
        }

        // 2. Billing change check
        if ($tenant->isDirty('stripe_subscription_id') || $tenant->isDirty('status') || $tenant->isDirty('stripe_customer_id')) {
            $actor = Auth::guard('admin')->user() ?? Auth::guard('web')->user();

            AuditLog::create([
                'actor_type' => $actor ? get_class($actor) : null,
                'actor_id' => $actor ? $actor->id : null,
                'action' => 'billing_change',
                'subject_type' => Tenant::class,
                'subject_id' => $tenant->id,
                'meta' => [
                    'old_status' => $tenant->getOriginal('status'),
                    'new_status' => $tenant->status,
                    'old_stripe_subscription_id' => $tenant->getOriginal('stripe_subscription_id'),
                    'new_stripe_subscription_id' => $tenant->stripe_subscription_id,
                ],
                'ip_address' => Request::ip(),
            ]);
        }
    }
}
