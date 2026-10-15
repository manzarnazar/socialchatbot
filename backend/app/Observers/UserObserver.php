<?php

namespace App\Observers;

use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class UserObserver
{
    /**
     * Handle the User "updated" event.
     */
    public function updated(User $user): void
    {
        // Role change check
        if ($user->isDirty('role_id')) {
            $actor = Auth::guard('admin')->user() ?? Auth::guard('web')->user();

            AuditLog::create([
                'actor_type' => $actor ? get_class($actor) : null,
                'actor_id' => $actor ? $actor->id : null,
                'action' => 'role_change',
                'subject_type' => User::class,
                'subject_id' => $user->id,
                'meta' => [
                    'tenant_id' => $user->tenant_id,
                    'user_email' => $user->email,
                    'old_role_id' => $user->getOriginal('role_id'),
                    'new_role_id' => $user->role_id,
                ],
                'ip_address' => Request::ip(),
            ]);
        }
    }
}
