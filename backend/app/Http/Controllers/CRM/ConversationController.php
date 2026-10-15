<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Channels\ChannelManager;
use App\Jobs\ProcessInboundMessageJob;
use App\Events\MessageReceived;
use App\Events\ConversationUpdated;
use App\Providers\AppServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Illuminate\Support\Carbon;
use Exception;

class ConversationController extends Controller
{
    /**
     * Ensure the authenticated user has permission to access this conversation's channel.
     */
    private function ensureChannelAccess(Request $request, Conversation $conversation): void
    {
        $accessibleIds = $request->user()->getAccessibleChannelIds();
        if ($accessibleIds !== null && !in_array($conversation->channel_connection_id, $accessibleIds)) {
            abort(response()->json(['message' => 'You do not have access to this channel.'], 403));
        }
    }

    /**
     * List all conversations for the tenant, filtered by status and accessible channels.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = $user->tenant_id;

        $query = Conversation::where('tenant_id', $tenantId)
            ->with(['contact', 'channelConnection'])
            ->withCount(['messages as unread_count' => function ($q) {
                $q->where('direction', 'inbound')->where('delivery_status', '!=', 'read');
            }]);

        // Channel access restriction for team members
        $accessibleIds = $user->getAccessibleChannelIds();
        if ($accessibleIds !== null) {
            $query->whereIn('channel_connection_id', $accessibleIds);
        }

        if ($request->has('status') && !empty($request->status)) {
            $query->where('status', $request->status);
        }

        if ($request->has('assigned_user_id')) {
            $val = $request->assigned_user_id;
            if ($val === 'unassigned') {
                $query->whereNull('assigned_user_id');
            } elseif (!empty($val)) {
                $query->where('assigned_user_id', $val);
            }
        }

        if ($request->has('assigned_team_id') && !empty($request->assigned_team_id)) {
            $query->where('assigned_team_id', $request->assigned_team_id);
        }

        $conversations = $query->orderBy('last_message_at', 'desc')->get();

        // Map last message manually to keep it lightweight and fast
        $conversations->each(function ($conv) {
            $conv->last_message = $conv->messages()->latest()->first();
        });

        return response()->json($conversations);
    }

    /**
     * Show single conversation details.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $conversation = Conversation::where('tenant_id', $tenantId)
            ->with(['contact', 'channelConnection', 'assignedUser', 'assignedTeam'])
            ->findOrFail($id);

        $this->ensureChannelAccess($request, $conversation);

        return response()->json($conversation);
    }

    /**
     * Update conversation properties (routing, assignee, status, etc.).
     */
    public function update(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $conversation = Conversation::where('tenant_id', $tenantId)->findOrFail($id);
        $this->ensureChannelAccess($request, $conversation);

        $data = $request->validate([
            'status' => 'nullable|string|in:open,pending,resolved',
            'assigned_user_id' => [
                'nullable',
                'integer',
                Rule::exists('tenant_users', 'id')->where('tenant_id', $tenantId)
            ],
            'assigned_team_id' => [
                'nullable',
                'integer',
                Rule::exists('teams', 'id')->where('tenant_id', $tenantId)
            ],
            'ai_active' => 'nullable|boolean',
        ]);

        $oldAssignedUser = $conversation->assigned_user_id;

        // Explicit nullability support for clearing assignees
        if ($request->has('assigned_user_id') && is_null($request->input('assigned_user_id'))) {
            $conversation->assigned_user_id = null;
        }
        if ($request->has('assigned_team_id') && is_null($request->input('assigned_team_id'))) {
            $conversation->assigned_team_id = null;
        }

        $conversation->update(array_filter($data, function ($val) {
            return $val !== null;
        }));

        // If AI auto-reply is disabled, cancel any active or waiting flow executions for this conversation
        if ($request->has('ai_active') && !$request->input('ai_active')) {
            \App\Models\FlowExecution::where('contact_id', $conversation->contact_id)
                ->whereIn('status', ['running', 'paused_waiting_reply'])
                ->update(['status' => 'cancelled']);
        }

        if (isset($data['assigned_user_id']) && $data['assigned_user_id'] != $oldAssignedUser) {
            \App\Services\NotificationService::createAndBroadcast(
                $tenantId,
                $data['assigned_user_id'],
                'Conversation Assigned',
                'A new conversation has been assigned to you.',
                'assignment',
                ['conversation_id' => $conversation->id]
            );
        }

        try {
            broadcast(new ConversationUpdated($conversation))->toOthers();
        } catch (Exception $e) {}

        return response()->json([
            'message' => 'Conversation updated successfully.',
            'conversation' => $conversation->load(['contact', 'channelConnection', 'assignedUser', 'assignedTeam']),
        ]);
    }

    /**
     * List message log for conversation.
     */
    public function messages(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $conversation = Conversation::where('tenant_id', $tenantId)->findOrFail($id);
        $this->ensureChannelAccess($request, $conversation);

        $messages = $conversation->messages()
            ->orderBy('created_at', 'asc')
            ->get();

        // Mark inbound messages as read
        $conversation->messages()
            ->where('direction', 'inbound')
            ->where('delivery_status', '!=', 'read')
            ->update(['delivery_status' => 'read']);

        return response()->json($messages);
    }

    /**
     * Send outbound message via connection driver.
     */
    public function sendMessage(Request $request, $id, ChannelManager $channelManager): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $conversation = Conversation::where('tenant_id', $tenantId)->findOrFail($id);
        $this->ensureChannelAccess($request, $conversation);
        $connection = $conversation->channelConnection;

        $request->validate([
            'body' => 'nullable|string',
            'media_url' => 'nullable|string',
            'media_file' => 'nullable|file|mimes:jpg,jpeg,png,gif,webp,pdf,mp3,mp4,wav,ogg,doc,docx|max:10240',
        ]);

        if (empty($request->input('body')) && !$request->has('media_url') && !$request->hasFile('media_file')) {
            return response()->json(['message' => 'Message body or attachment is required.'], 422);
        }

        // Check if tenant has reached monthly outbound messages cap
        $tenant = $request->user()->tenant;
        $limitCheck = app(\App\Services\PlanLimitService::class)->canSendOutboundMessage($tenant);
        if (!$limitCheck['allowed']) {
            return response()->json([
                'message' => $limitCheck['reason'],
                'code' => $limitCheck['code'],
                'limit' => $limitCheck['limit'] ?? null,
                'current' => $limitCheck['current'] ?? null,
            ], 403);
        }

        $body = $request->input('body', '');
        $mediaUrl = $request->input('media_url');

        if ($request->hasFile('media_file')) {
            $path = $request->file('media_file')->store('media', 'public');
            $mediaUrl = AppServiceProvider::getBackendUrl() . '/storage/' . $path;
        }

        $credentials = $connection->decrypted_credentials;
        $driver = $channelManager->driver($connection->channel_type);

        try {
            $res = $driver->sendMessage($credentials, [
                'connection_id' => $connection->id,
                'external_chat_id' => $conversation->external_chat_id,
                'to' => $conversation->external_chat_id,
                'body' => $body,
                'media_url' => $mediaUrl,
            ]);

            $message = Message::create([
                'conversation_id' => $conversation->id,
                'direction' => 'outbound',
                'message_type' => $mediaUrl ? 'image' : 'text',
                'sender_identifier' => $request->user()->email,
                'body' => $body,
                'media_url' => $mediaUrl,
                'external_message_id' => $res['external_message_id'] ?? 'out_' . uniqid() . '@whatsomni.io',
                'delivery_status' => $res['delivery_status'] ?? 'sent',
                'error_message' => $res['error_message'] ?? null,
            ]);

            // Automatically pause AI bot when human operator manually intervenes in chat
            $conversation->update([
                'last_message_at' => Carbon::now(),
                'ai_active' => false
            ]);

            // Broadcast message sent
            try {
                broadcast(new MessageReceived($message));
            } catch (Exception $e) {}

            // Micro-interaction: Mock connections automatically respond after 1.5 seconds
            if ($connection->channel_type === 'mock') {
                $mockReplies = [
                    "Hello! Thanks for your response. Let me know how else I can assist.",
                    "I received your message! We will process this details shortly.",
                    "This is an automated simulation response. Real-time broadcast successfully synchronized!"
                ];
                $randomReply = $mockReplies[array_rand($mockReplies)];

                ProcessInboundMessageJob::dispatch($connection->id, [
                    'external_chat_id' => $conversation->external_chat_id,
                    'sender_identifier' => $conversation->contact->first_name ?: 'Test User',
                    'external_message_id' => 'mock_inbound_' . uniqid(),
                    'message_type' => 'text',
                    'body' => $randomReply,
                ])->delay(now()->addMilliseconds(1500));
            }

            return response()->json($message);

        } catch (Exception $e) {
            return response()->json([
                'message' => 'Failed to send message: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store internal note in thread log.
     */
    public function storeNote(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $conversation = Conversation::where('tenant_id', $tenantId)->findOrFail($id);
        $this->ensureChannelAccess($request, $conversation);

        $request->validate([
            'body' => 'required|string',
        ]);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'direction' => 'outbound',
            'message_type' => 'note',
            'sender_identifier' => $request->user()->first_name . ' ' . $request->user()->last_name,
            'body' => $request->input('body'),
            'delivery_status' => 'read',
        ]);

        $conversation->update(['last_message_at' => Carbon::now()]);

        // Parse mentions in note: e.g. @user@example.com
        preg_match_all('/@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4})/', $message->body, $matches);
        $emails = array_unique($matches[1] ?? []);
        foreach ($emails as $email) {
            $user = \App\Models\User::where('tenant_id', $tenantId)->where('email', $email)->first();
            if ($user && $user->id !== $request->user()->id) {
                \App\Services\NotificationService::createAndBroadcast(
                    $tenantId,
                    $user->id,
                    'You were mentioned',
                    "{$request->user()->first_name} mentioned you in a conversation note.",
                    'mention',
                    ['conversation_id' => $conversation->id, 'message_id' => $message->id]
                );
            }
        }

        try {
            broadcast(new MessageReceived($message))->toOthers();
        } catch (Exception $e) {}

        return response()->json($message);
    }

    /**
     * Start a new conversation manually.
     */
    public function startConversation(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $request->validate([
            'contact_id' => 'required|integer',
            'channel_connection_id' => 'required|integer',
        ]);

        $contactId = $request->input('contact_id');
        $channelConnectionId = $request->input('channel_connection_id');

        $contact = \App\Models\Contact::where('tenant_id', $tenantId)->findOrFail($contactId);
        $connection = \App\Models\ChannelConnection::where('tenant_id', $tenantId)->findOrFail($channelConnectionId);

        $accessibleIds = $request->user()->getAccessibleChannelIds();
        if ($accessibleIds !== null && !in_array($channelConnectionId, $accessibleIds)) {
            return response()->json(['message' => 'You do not have access to start conversations on this channel.'], 403);
        }

        $externalChatId = '';
        $type = strtolower($connection->channel_type);
        if ($type === 'email') {
            $externalChatId = $contact->email;
            if (empty($externalChatId)) {
                return response()->json(['message' => 'Contact does not have an email address configured.'], 422);
            }
        } else {
            $externalChatId = $contact->phone ?? $contact->email ?? 'cust_' . $contact->id;
        }

        $conversation = Conversation::firstOrCreate([
            'tenant_id' => $tenantId,
            'contact_id' => $contactId,
            'channel_connection_id' => $channelConnectionId,
        ], [
            'external_chat_id' => $externalChatId,
            'status' => 'open',
            'last_message_at' => Carbon::now(),
            'ai_active' => false,
        ]);

        if ($conversation->status !== 'open') {
            $conversation->update(['status' => 'open']);
        }

        $conversation->load(['contact', 'channelConnection']);
        $conversation->unread_count = 0;
        $conversation->last_message = $conversation->messages()->latest()->first();

        try {
            broadcast(new ConversationUpdated($conversation))->toOthers();
        } catch (Exception $e) {}

        return response()->json($conversation);
    }

    /**
     * Delete a conversation.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $conversation = Conversation::where('tenant_id', $tenantId)->findOrFail($id);
        $this->ensureChannelAccess($request, $conversation);

        $conversation->messages()->delete();
        $conversation->delete();

        return response()->json([
            'message' => 'Conversation deleted successfully'
        ]);
    }
}
