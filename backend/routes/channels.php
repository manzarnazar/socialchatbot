<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('tenant.{tenantId}.chats', function ($user, $tenantId) {
    if ((int) $user->tenant_id !== (int) $tenantId) {
        return false;
    }
    // Only unrestricted agents and owners can subscribe to global chats feed
    if (isset($user->channel_access_type) && $user->channel_access_type === 'custom') {
        return false;
    }
    return true;
});

Broadcast::channel('tenant.{tenantId}.channel.{channelId}', function ($user, $tenantId, $channelId) {
    if ((int) $user->tenant_id !== (int) $tenantId) {
        return false;
    }
    if (method_exists($user, 'isOwner') && $user->isOwner()) {
        return true;
    }
    if (($user->channel_access_type ?? 'all') !== 'custom') {
        return true;
    }
    $accessible = method_exists($user, 'getAccessibleChannelIds') ? $user->getAccessibleChannelIds() : null;
    return $accessible === null || in_array((int)$channelId, $accessible, true);
});

Broadcast::channel('tenant.{tenantId}.conversation.{convId}', function ($user, $tenantId, $convId) {
    if ((int) $user->tenant_id !== (int) $tenantId) {
        return false;
    }
    $conv = \App\Models\Conversation::where('tenant_id', $tenantId)->find($convId);
    if (!$conv) {
        return false;
    }
    if (method_exists($user, 'isOwner') && $user->isOwner()) {
        return true;
    }
    if (($user->channel_access_type ?? 'all') !== 'custom') {
        return true;
    }
    $accessible = method_exists($user, 'getAccessibleChannelIds') ? $user->getAccessibleChannelIds() : null;
    return $accessible === null || in_array((int)$conv->channel_connection_id, $accessible, true);
});

Broadcast::channel('tenant.{tenantId}', function ($user, $tenantId) {
    return (int) $user->tenant_id === (int) $tenantId;
});

Broadcast::channel('tenant.{tenantId}.user.{userId}', function ($user, $tenantId, $userId) {
    return (int) $user->tenant_id === (int) $tenantId && (int) $user->id === (int) $userId;
});

Broadcast::channel('admin.notifications', function ($user) {
    return $user instanceof \App\Models\Admin;
}, ['guards' => ['admin', 'sanctum']]);
