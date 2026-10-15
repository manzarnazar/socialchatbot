<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\QuickReply;
use App\Models\ChannelConnection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Exception;

class QuickReplyController extends Controller
{
    /**
     * Display a listing of quick replies for the current tenant.
     */
    public function index(Request $request)
    {
        $tenantId = $request->user()->tenant_id;

        $query = QuickReply::where('tenant_id', $tenantId)
            ->with(['channels:id,name,channel_type,status', 'creator:id,first_name,last_name,email'])
            ->latest();

        // 1. Search Query Filter
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('shortcut', 'like', "%{$search}%")
                  ->orWhere('body', 'like', "%{$search}%")
                  ->orWhere('trigger_keywords', 'like', "%{$search}%");
            });
        }

        // 2. Status Filter
        if ($request->filled('status') && $request->status !== 'all') {
            if ($request->status === 'active') {
                $query->where('is_active', true);
            } elseif ($request->status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        // 3. Channel Filter
        if ($request->filled('channel_id') && $request->channel_id !== 'all') {
            $channelId = (int) $request->channel_id;
            $query->where(function ($q) use ($channelId) {
                $q->where('channel_target_type', 'all')
                  ->orWhereHas('channels', function ($cq) use ($channelId) {
                      $cq->where('channel_connections.id', $channelId);
                  });
            });
        }

        $quickReplies = $query->get();

        // Calculate summary statistics
        $allTenantReplies = QuickReply::where('tenant_id', $tenantId)->get();
        $stats = [
            'total' => $allTenantReplies->count(),
            'active' => $allTenantReplies->where('is_active', true)->count(),
            'auto_reply_count' => $allTenantReplies->where('auto_reply_enabled', true)->where('is_active', true)->count(),
            'total_usage' => $allTenantReplies->sum('usage_count'),
        ];

        return response()->json([
            'quick_replies' => $quickReplies,
            'stats' => $stats,
        ]);
    }

    /**
     * Store a newly created quick reply.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'shortcut' => ['nullable', 'string', 'max:100'],
            'trigger_keywords' => ['nullable', 'array'],
            'trigger_keywords.*' => ['string', 'max:100'],
            'match_type' => ['nullable', 'string', 'in:contains,exact,starts_with'],
            'channel_target_type' => ['required', 'string', 'in:all,custom'],
            'channel_ids' => ['nullable', 'array'],
            'channel_ids.*' => ['integer', 'exists:channel_connections,id'],
            'body' => ['required', 'string'],
            'media_url' => ['nullable', 'string', 'max:2048'],
            'media_type' => ['nullable', 'string', 'in:image,video,document,audio'],
            'is_active' => ['nullable', 'boolean'],
            'auto_reply_enabled' => ['nullable', 'boolean'],
        ]);

        $tenantId = $request->user()->tenant_id;

        // Clean shortcut
        $shortcut = !empty($validated['shortcut']) ? trim($validated['shortcut']) : null;

        $quickReply = QuickReply::create([
            'tenant_id' => $tenantId,
            'created_by' => $request->user()->id,
            'name' => $validated['name'],
            'shortcut' => $shortcut,
            'trigger_keywords' => $validated['trigger_keywords'] ?? [],
            'match_type' => $validated['match_type'] ?? 'contains',
            'channel_target_type' => $validated['channel_target_type'],
            'body' => $validated['body'],
            'media_url' => $validated['media_url'] ?? null,
            'media_type' => $validated['media_type'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'auto_reply_enabled' => $validated['auto_reply_enabled'] ?? true,
            'usage_count' => 0,
        ]);

        if ($validated['channel_target_type'] === 'custom' && !empty($validated['channel_ids'])) {
            $quickReply->channels()->sync($validated['channel_ids']);
        }

        return response()->json([
            'message' => 'Quick reply created successfully.',
            'quick_reply' => $quickReply->load(['channels:id,name,channel_type,status', 'creator:id,first_name,last_name,email']),
        ], 201);
    }

    /**
     * Display the specified quick reply.
     */
    public function show(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $quickReply = QuickReply::where('tenant_id', $tenantId)
            ->with(['channels:id,name,channel_type,status', 'creator:id,first_name,last_name,email'])
            ->findOrFail($id);

        return response()->json([
            'quick_reply' => $quickReply,
        ]);
    }

    /**
     * Update the specified quick reply.
     */
    public function update(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $quickReply = QuickReply::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'shortcut' => ['nullable', 'string', 'max:100'],
            'trigger_keywords' => ['nullable', 'array'],
            'trigger_keywords.*' => ['string', 'max:100'],
            'match_type' => ['nullable', 'string', 'in:contains,exact,starts_with'],
            'channel_target_type' => ['required', 'string', 'in:all,custom'],
            'channel_ids' => ['nullable', 'array'],
            'channel_ids.*' => ['integer', 'exists:channel_connections,id'],
            'body' => ['required', 'string'],
            'media_url' => ['nullable', 'string', 'max:2048'],
            'media_type' => ['nullable', 'string', 'in:image,video,document,audio'],
            'is_active' => ['nullable', 'boolean'],
            'auto_reply_enabled' => ['nullable', 'boolean'],
        ]);

        $shortcut = !empty($validated['shortcut']) ? trim($validated['shortcut']) : null;

        $quickReply->update([
            'name' => $validated['name'],
            'shortcut' => $shortcut,
            'trigger_keywords' => $validated['trigger_keywords'] ?? [],
            'match_type' => $validated['match_type'] ?? 'contains',
            'channel_target_type' => $validated['channel_target_type'],
            'body' => $validated['body'],
            'media_url' => $validated['media_url'] ?? null,
            'media_type' => $validated['media_type'] ?? null,
            'is_active' => $validated['is_active'] ?? $quickReply->is_active,
            'auto_reply_enabled' => $validated['auto_reply_enabled'] ?? $quickReply->auto_reply_enabled,
        ]);

        if ($validated['channel_target_type'] === 'custom') {
            $quickReply->channels()->sync($validated['channel_ids'] ?? []);
        } else {
            $quickReply->channels()->detach();
        }

        return response()->json([
            'message' => 'Quick reply updated successfully.',
            'quick_reply' => $quickReply->fresh(['channels:id,name,channel_type,status', 'creator:id,first_name,last_name,email']),
        ]);
    }

    /**
     * Toggle the active status of a quick reply.
     */
    public function toggleActive(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $quickReply = QuickReply::where('tenant_id', $tenantId)->findOrFail($id);

        $quickReply->is_active = !$quickReply->is_active;
        $quickReply->save();

        return response()->json([
            'message' => 'Quick reply status updated successfully.',
            'quick_reply' => $quickReply->fresh(['channels:id,name,channel_type,status', 'creator:id,first_name,last_name,email']),
            'is_active' => $quickReply->is_active,
        ]);
    }

    /**
     * Remove the specified quick reply from storage.
     */
    public function destroy(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $quickReply = QuickReply::where('tenant_id', $tenantId)->findOrFail($id);

        $quickReply->channels()->detach();
        $quickReply->delete();

        return response()->json([
            'message' => 'Quick reply deleted successfully.',
        ]);
    }

    /**
     * Upload an attachment media file for quick reply.
     */
    public function uploadMedia(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'max:20480'], // max 20MB
        ]);

        $file = $request->file('file');
        $mime = $file->getMimeType();

        $mediaType = 'document';
        if (str_starts_with($mime, 'image/')) {
            $mediaType = 'image';
        } elseif (str_starts_with($mime, 'video/')) {
            $mediaType = 'video';
        } elseif (str_starts_with($mime, 'audio/')) {
            $mediaType = 'audio';
        }

        $filename = uniqid('qr_') . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('media/quick-replies', $filename, 'public');

        $url = asset('storage/' . $path);

        return response()->json([
            'url' => $url,
            'media_type' => $mediaType,
            'filename' => $file->getClientOriginalName(),
        ]);
    }
}
