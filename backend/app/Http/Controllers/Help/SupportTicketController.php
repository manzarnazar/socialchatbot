<?php

namespace App\Http\Controllers\Help;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Models\SupportTicketMessage;
use App\Models\AdminNotification;
use App\Events\AdminNotificationBroadcastEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupportTicketController extends Controller
{
    /**
     * Display a listing of the tenant's support tickets with optional filtering.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = SupportTicket::where('tenant_id', $user->tenant_id)
            ->with(['user:id,first_name,last_name'])
            ->orderBy('updated_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('id', $search);
            });
        }

        $tickets = $query->paginate(15);

        return response()->json([
            'tickets' => $tickets,
        ]);
    }

    /**
     * Store a newly created support ticket in storage.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'priority' => ['required', 'string', 'in:low,medium,high'],
            'type' => ['required', 'string', 'in:billing,technical,general,feedback'],
        ]);

        $ticket = DB::transaction(function () use ($request, $user) {
            $ticket = SupportTicket::create([
                'tenant_id' => $user->tenant_id,
                'user_id' => $user->id,
                'subject' => $request->subject,
                'description' => $request->description,
                'type' => $request->type,
                'priority' => $request->priority,
                'status' => 'open',
            ]);

            // Add the initial description as the first message thread item
            SupportTicketMessage::create([
                'support_ticket_id' => $ticket->id,
                'user_id' => $user->id,
                'message' => $request->description,
                'is_admin_reply' => false,
            ]);

            // Create admin notification & broadcast
            try {
                $tenantName = $user->tenant ? $user->tenant->company_name : "Tenant #{$user->tenant_id}";
                $userName = "{$user->first_name} {$user->last_name}";
                $adminNotif = AdminNotification::create([
                    'type' => 'support_ticket_created',
                    'title' => "New Support Ticket #{$ticket->id}",
                    'body' => "{$userName} ({$tenantName}) created ticket: \"{$ticket->subject}\"",
                    'data' => [
                        'ticket_id' => $ticket->id,
                        'tenant_id' => $user->tenant_id,
                        'user_name' => $userName,
                        'company_name' => $tenantName,
                        'priority' => $ticket->priority,
                        'action_url' => "/superadmin/tickets?ticketId={$ticket->id}",
                    ],
                ]);
                event(new AdminNotificationBroadcastEvent($adminNotif));
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Failed to dispatch admin notification for ticket creation: ' . $e->getMessage());
            }

            return $ticket;
        });

        return response()->json([
            'message' => 'Support ticket created successfully.',
            'ticket' => $ticket->load(['user:id,first_name,last_name', 'messages']),
        ], 201);
    }

    /**
     * Display the specified support ticket with messages.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $ticket = SupportTicket::where('tenant_id', $user->tenant_id)
            ->with(['user:id,first_name,last_name', 'messages.user:id,first_name,last_name'])
            ->findOrFail($id);

        return response()->json([
            'ticket' => $ticket,
        ]);
    }

    /**
     * Add a message reply to the specified support ticket thread.
     */
    public function reply(Request $request, $id)
    {
        $user = $request->user();
        $ticket = SupportTicket::where('tenant_id', $user->tenant_id)
            ->findOrFail($id);

        $request->validate([
            'message' => ['required', 'string'],
        ]);

        $message = DB::transaction(function () use ($request, $ticket, $user) {
            // Update ticket status to open when user sends a new reply to keep admin updated
            if ($ticket->status === 'resolved' || $ticket->status === 'closed') {
                $ticket->update(['status' => 'open']);
            } else {
                $ticket->touch(); // touch updated_at timestamp
            }

            $createdMsg = SupportTicketMessage::create([
                'support_ticket_id' => $ticket->id,
                'user_id' => $user->id,
                'message' => $request->message,
                'is_admin_reply' => false,
            ]);

            // Create admin notification & broadcast for tenant reply
            try {
                $userName = "{$user->first_name} {$user->last_name}";
                $adminNotif = AdminNotification::create([
                    'type' => 'support_ticket_reply',
                    'title' => "New Reply on Ticket #{$ticket->id}",
                    'body' => "{$userName} replied to \"{$ticket->subject}\"",
                    'data' => [
                        'ticket_id' => $ticket->id,
                        'tenant_id' => $user->tenant_id,
                        'user_name' => $userName,
                        'action_url' => "/superadmin/tickets?ticketId={$ticket->id}",
                    ],
                ]);
                event(new AdminNotificationBroadcastEvent($adminNotif));
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Failed to dispatch admin notification for ticket reply: ' . $e->getMessage());
            }

            return $createdMsg;
        });

        return response()->json([
            'message' => 'Reply posted successfully.',
            'reply' => $message->load('user:id,first_name,last_name'),
        ]);
    }

    /**
     * Update status (e.g. close or resolve) of the specified support ticket by tenant.
     */
    public function updateStatus(Request $request, $id)
    {
        $user = $request->user();
        $ticket = SupportTicket::where('tenant_id', $user->tenant_id)->findOrFail($id);

        $request->validate([
            'status' => ['required', 'string', 'in:open,in_progress,resolved,closed'],
        ]);

        $ticket->update([
            'status' => $request->status,
        ]);

        return response()->json([
            'message' => 'Ticket status updated successfully.',
            'ticket' => $ticket,
        ]);
    }

    /**
     * Close the specified support ticket by tenant.
     */
    public function close(Request $request, $id)
    {
        $user = $request->user();
        $ticket = SupportTicket::where('tenant_id', $user->tenant_id)->findOrFail($id);

        $ticket->update([
            'status' => 'closed',
        ]);

        return response()->json([
            'message' => 'Ticket closed successfully.',
            'ticket' => $ticket,
        ]);
    }
}
