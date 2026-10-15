<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminNotificationController extends Controller
{
    /**
     * Display a listing of admin notifications.
     */
    public function index(Request $request): JsonResponse
    {
        $notifications = AdminNotification::orderBy('created_at', 'desc')
            ->take(50)
            ->get();

        $unreadCount = AdminNotification::whereNull('read_at')->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark a specific admin notification as read.
     */
    public function markAsRead(Request $request, $id): JsonResponse
    {
        $notification = AdminNotification::findOrFail($id);
        
        if (!$notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        $unreadCount = AdminNotification::whereNull('read_at')->count();

        return response()->json([
            'message' => 'Notification marked as read.',
            'notification' => $notification,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark all admin notifications as read.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        AdminNotification::whereNull('read_at')->update(['read_at' => now()]);

        return response()->json([
            'message' => 'All notifications marked as read.',
            'unread_count' => 0,
        ]);
    }

    /**
     * Remove the specified admin notification.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $notification = AdminNotification::findOrFail($id);
        $notification->delete();

        $unreadCount = AdminNotification::whereNull('read_at')->count();

        return response()->json([
            'message' => 'Notification dismissed.',
            'unread_count' => $unreadCount,
        ]);
    }
}
