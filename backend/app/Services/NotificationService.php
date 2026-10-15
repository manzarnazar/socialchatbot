<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use App\Events\NotificationBroadcastEvent;

class NotificationService
{
    public static function createAndBroadcast(int $tenantId, ?int $userId, string $title, string $body, string $type, ?array $metadata = null)
    {
        if ($userId) {
            $notification = Notification::create([
                'tenant_id' => $tenantId,
                'user_id' => $userId,
                'title' => $title,
                'body' => $body,
                'type' => $type,
                'metadata' => $metadata,
            ]);

            try {
                broadcast(new NotificationBroadcastEvent($notification));
            } catch (\Exception $e) {
                // Ignore socket dispatch issues in tests/dev environments
            }
        } else {
            // Find all active users of the tenant to notify
            $users = User::where('tenant_id', $tenantId)->where('status', 'active')->get();
            foreach ($users as $user) {
                self::createAndBroadcast($tenantId, $user->id, $title, $body, $type, $metadata);
            }
        }
    }
}
