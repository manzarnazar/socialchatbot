<?php

namespace App\Http\Controllers\RBAC;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\User;
use App\Services\PlanLimitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class TeamAndRoleController extends Controller
{
    protected PlanLimitService $planLimitService;

    public function __construct(PlanLimitService $planLimitService)
    {
        $this->planLimitService = $planLimitService;
    }

    /**
     * Helper to ensure caller has permission to manage team and roles.
     */
    protected function ensureCanManageTeam(Request $request): void
    {
        $user = $request->user();
        if (!$user || (!$user->isOwner() && !$user->hasPermission('team', 'manage') && !$user->hasPermission('team.manage') && !$user->hasPermission('settings', 'manage'))) {
            abort(response()->json([
                'message' => 'Unauthorized action. You do not have permission to manage team roles and members.',
            ], 403));
        }
    }

    /**
     * Lists all teams of the tenant.
     */
    public function listTeams(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $teams = Team::where('tenant_id', $tenant->id)->withCount('users')->get();

        return response()->json(['teams' => $teams]);
    }

    /**
     * Creates a team.
     */
    public function createTeam(Request $request): JsonResponse
    {
        $this->ensureCanManageTeam($request);

        $request->validate([
            'name' => ['required', 'string', 'max:50'],
        ]);

        $tenant = $request->user()->tenant;
        $team = Team::create([
            'tenant_id' => $tenant->id,
            'name' => $request->name,
        ]);

        return response()->json(['message' => 'Team created successfully.', 'team' => $team], 201);
    }

    /**
     * Deletes a team.
     */
    public function deleteTeam(Request $request, $id): JsonResponse
    {
        $this->ensureCanManageTeam($request);

        $tenant = $request->user()->tenant;
        $team = Team::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$team) {
            return response()->json(['message' => 'Team not found.'], 404);
        }

        $team->delete();
        return response()->json(['message' => 'Team deleted successfully.']);
    }

    /**
     * Lists all system and custom roles of the tenant.
     */
    public function listRoles(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $roles = Role::whereNull('tenant_id')
            ->orWhere('tenant_id', $tenant->id)
            ->get();

        return response()->json(['roles' => $roles]);
    }

    /**
     * Creates a custom role.
     */
    public function createRole(Request $request): JsonResponse
    {
        $this->ensureCanManageTeam($request);

        $request->validate([
            'display_name' => ['required', 'string', 'max:50'],
            'permissions' => ['required', 'array'],
        ]);

        $tenant = $request->user()->tenant;
        $roleName = Str::slug($request->display_name);

        // Reserve built-in system role names
        if (in_array(strtolower($roleName), ['owner', 'admin', 'superadmin', 'super_admin'])) {
            return response()->json(['message' => 'The requested role name is reserved by the system.'], 422);
        }

        $role = Role::create([
            'tenant_id' => $tenant->id,
            'name' => $roleName,
            'display_name' => $request->display_name,
            'permissions' => $request->permissions,
        ]);

        return response()->json(['message' => 'Custom role created successfully.', 'role' => $role], 201);
    }

    /**
     * Deletes a custom role.
     */
    public function deleteRole(Request $request, $id): JsonResponse
    {
        $this->ensureCanManageTeam($request);

        $tenant = $request->user()->tenant;
        $role = Role::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$role) {
            return response()->json(['message' => 'Role not found or cannot be deleted.'], 404);
        }

        // Re-assign users under this role to 'agent' system role before deletion
        $agentRole = Role::whereNull('tenant_id')->where('name', 'agent')->first();
        User::where('role_id', $role->id)->update(['role_id' => $agentRole ? $agentRole->id : null]);

        $role->delete();
        return response()->json(['message' => 'Custom role deleted successfully.']);
    }

    /**
     * Lists all members in the tenant workspace.
     */
    public function listMembers(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $members = User::where('tenant_id', $tenant->id)
            ->with(['role', 'teams', 'channelConnections:id,tenant_id,name,channel_type,status'])
            ->get();

        return response()->json(['members' => $members]);
    }

    /**
     * Updates a member's role.
     */
    public function updateMemberRole(Request $request, $id): JsonResponse
    {
        $this->ensureCanManageTeam($request);

        $request->validate([
            'role_id' => ['required', 'exists:roles,id'],
        ]);

        $tenant = $request->user()->tenant;
        $member = User::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$member) {
            return response()->json(['message' => 'Member not found.'], 404);
        }

        // Prevent self-role elevation
        if ($request->user()->id === $member->id && !$request->user()->isOwner()) {
            return response()->json(['message' => 'You cannot modify your own role.'], 403);
        }

        // Ensure target role belongs to system or current tenant
        $targetRole = Role::where(function ($q) use ($tenant) {
            $q->whereNull('tenant_id')->orWhere('tenant_id', $tenant->id);
        })->where('id', $request->role_id)->first();

        if (!$targetRole) {
            return response()->json(['message' => 'Selected role is invalid or belongs to another workspace.'], 422);
        }

        // Owner role is fixed and cannot be assigned via role update
        if ($targetRole->name === 'owner' && !$request->user()->isOwner()) {
            return response()->json(['message' => 'Cannot assign the workspace Owner role.'], 422);
        }

        if ($member->role && $member->role->name === 'owner' && $targetRole->name !== 'owner') {
            return response()->json(['message' => 'The workspace Owner role cannot be changed.'], 422);
        }

        $member->update(['role_id' => $targetRole->id]);
        return response()->json(['message' => 'Member role updated successfully.', 'member' => $member->load(['role', 'channelConnections:id,tenant_id,name,channel_type,status'])]);
    }

    /**
     * Updates a member's team associations.
     */
    public function updateMemberTeams(Request $request, $id): JsonResponse
    {
        $this->ensureCanManageTeam($request);

        $request->validate([
            'team_ids' => ['required', 'array'],
            'team_ids.*' => ['integer', 'exists:teams,id'],
        ]);

        $tenant = $request->user()->tenant;
        $member = User::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$member) {
            return response()->json(['message' => 'Member not found.'], 404);
        }

        // Ensure all teams belong to current tenant
        $validTeamIds = Team::where('tenant_id', $tenant->id)
            ->whereIn('id', $request->team_ids)
            ->pluck('id')
            ->toArray();

        $member->teams()->sync($validTeamIds);
        return response()->json(['message' => 'Member teams updated successfully.', 'member' => $member->load('teams')]);
    }

    /**
     * Updates a member's channel access in the Shared Inbox.
     */
    public function updateMemberChannels(Request $request, $id): JsonResponse
    {
        $this->ensureCanManageTeam($request);

        $request->validate([
            'channel_access_type' => ['required', 'string', 'in:all,custom'],
            'channel_ids' => ['nullable', 'array'],
            'channel_ids.*' => ['integer', 'exists:channel_connections,id'],
        ]);

        $tenant = $request->user()->tenant;
        $member = User::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$member) {
            return response()->json(['message' => 'Member not found.'], 404);
        }

        if ($member->role && $member->role->name === 'owner') {
            return response()->json(['message' => 'Workspace Owner always has access to all channels.'], 422);
        }

        $accessType = $request->channel_access_type;
        $member->update(['channel_access_type' => $accessType]);

        if ($accessType === 'custom') {
            $validIds = \App\Models\ChannelConnection::where('tenant_id', $tenant->id)
                ->whereIn('id', $request->input('channel_ids', []))
                ->pluck('id')
                ->toArray();
            $member->channelConnections()->sync($validIds);
        } else {
            $member->channelConnections()->detach();
        }

        return response()->json([
            'message' => 'Member channel access updated successfully.',
            'member' => $member->load(['role', 'teams', 'channelConnections:id,tenant_id,name,channel_type,status'])
        ]);
    }

    /**
     * Updates assigned members for a specific channel.
     */
    public function updateChannelMembers(Request $request, $id): JsonResponse
    {
        $this->ensureCanManageTeam($request);

        $request->validate([
            'user_ids' => ['required', 'array'],
            'user_ids.*' => ['integer', 'exists:tenant_users,id'],
        ]);

        $tenant = $request->user()->tenant;
        $channel = \App\Models\ChannelConnection::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$channel) {
            return response()->json(['message' => 'Channel connection not found.'], 404);
        }

        $validUserIds = User::where('tenant_id', $tenant->id)
            ->whereIn('id', $request->input('user_ids', []))
            ->pluck('id')
            ->toArray();

        $channel->assignedUsers()->sync($validUserIds);

        return response()->json([
            'message' => 'Channel assigned teammates updated successfully.',
            'channel' => $channel->load('assignedUsers:id,first_name,last_name,email,role_id')
        ]);
    }

    /**
     * Removes a user from the workspace.
     */
    public function removeMember(Request $request, $id): JsonResponse
    {
        $this->ensureCanManageTeam($request);

        $tenant = $request->user()->tenant;
        $member = User::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$member) {
            return response()->json(['message' => 'Member not found.'], 404);
        }

        if ($member->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot remove yourself from the workspace.'], 422);
        }

        if ($member->role && $member->role->name === 'owner') {
            return response()->json(['message' => 'The workspace Owner cannot be removed.'], 422);
        }

        $member->delete();
        return response()->json(['message' => 'Member removed from workspace successfully.']);
    }

    /**
     * Lists all pending invitations.
     */
    public function listInvitations(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $invitations = TeamInvitation::where('tenant_id', $tenant->id)
            ->where('status', 'pending')
            ->with(['role', 'team'])
            ->get();

        return response()->json(['invitations' => $invitations]);
    }

    /**
     * Cancels a pending invitation.
     */
    public function cancelInvitation(Request $request, $id): JsonResponse
    {
        $this->ensureCanManageTeam($request);

        $tenant = $request->user()->tenant;
        $invitation = TeamInvitation::where('tenant_id', $tenant->id)->where('id', $id)->first();

        if (!$invitation) {
            return response()->json(['message' => 'Invitation not found.'], 404);
        }

        $invitation->delete();
        return response()->json(['message' => 'Invitation cancelled successfully.']);
    }

    /**
     * Creates and sends a workspace invitation.
     */
    public function inviteMember(Request $request): JsonResponse
    {
        $this->ensureCanManageTeam($request);

        $request->validate([
            'email' => ['required', 'email'],
            'role_id' => ['required', 'exists:roles,id'],
            'team_id' => ['nullable', 'exists:teams,id'],
            'channel_access_type' => ['nullable', 'string', 'in:all,custom'],
            'assigned_channel_ids' => ['nullable', 'array'],
            'assigned_channel_ids.*' => ['integer', 'exists:channel_connections,id'],
        ]);

        $tenant = $request->user()->tenant;

        // Ensure role belongs to tenant or system
        $role = Role::where(function ($q) use ($tenant) {
            $q->whereNull('tenant_id')->orWhere('tenant_id', $tenant->id);
        })->where('id', $request->role_id)->first();

        if (!$role || $role->name === 'owner') {
            return response()->json(['message' => 'Cannot invite members with an invalid or Owner role.'], 422);
        }

        // Ensure team belongs to tenant if specified
        if ($request->team_id) {
            $teamExists = Team::where('tenant_id', $tenant->id)->where('id', $request->team_id)->exists();
            if (!$teamExists) {
                return response()->json(['message' => 'The selected team is invalid.'], 422);
            }
        }

        // Check if user is already a member
        if (User::where('tenant_id', $tenant->id)->where('email', $request->email)->exists()) {
            return response()->json(['message' => 'User is already a member of this workspace.'], 422);
        }

        // Check if invitation is already pending
        if (TeamInvitation::where('tenant_id', $tenant->id)->where('email', $request->email)->where('status', 'pending')->exists()) {
            return response()->json(['message' => 'An invitation has already been sent to this email.'], 422);
        }

        // Verify Seat Limits using PlanLimitService (counting active members + pending invitations)
        $activeCount = User::where('tenant_id', $tenant->id)->count();
        $pendingCount = TeamInvitation::where('tenant_id', $tenant->id)->where('status', 'pending')->count();
        $totalCount = $activeCount + $pendingCount;

        if (!$this->planLimitService->canUseFeature($tenant, 'team_members', $totalCount)) {
            return response()->json([
                'message' => \App\Services\PlanLimitService::trans('SEAT_LIMIT_REACHED'),
                'code' => 'SEAT_LIMIT_REACHED'
            ], 422);
        }

        $token = Str::random(40);

        $accessType = $request->input('channel_access_type', 'all');
        $validChannelIds = null;
        if ($accessType === 'custom' && $request->has('assigned_channel_ids')) {
            $validChannelIds = \App\Models\ChannelConnection::where('tenant_id', $tenant->id)
                ->whereIn('id', $request->assigned_channel_ids)
                ->pluck('id')
                ->toArray();
        }

        $invitation = TeamInvitation::create([
            'tenant_id' => $tenant->id,
            'email' => $request->email,
            'role_id' => $role->id,
            'team_id' => $request->team_id,
            'channel_access_type' => $accessType,
            'assigned_channel_ids' => $validChannelIds,
            'token' => $token,
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
        ]);

        // Send Email using dynamic database mailer configuration
        $mailSent = false;
        try {
            \App\Providers\AppServiceProvider::loadDynamicMailConfiguration();
            $frontendUrl = \App\Providers\AppServiceProvider::getFrontendUrl($request->user());
            $acceptUrl = "{$frontendUrl}/verify-email/success?token={$token}&invite=1";

            \Illuminate\Support\Facades\Mail::to($request->email)->send(
                new \App\Mail\TeamInvitationMail($tenant->company_name, $acceptUrl)
            );
            $mailSent = true;
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Tenant team invitation email delivery failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => $mailSent 
                ? 'Invitation sent successfully.' 
                : 'Invitation created. (Warning: email could not be delivered, please verify mailer settings).',
            'mail_sent' => $mailSent,
            'invitation' => $invitation->load(['role', 'team'])
        ]);
    }

    /**
     * Resend a pending workspace invitation email.
     */
    public function resendInvitation(Request $request, $id): JsonResponse
    {
        $this->ensureCanManageTeam($request);
        $tenant = $request->user()->tenant;

        $invitation = TeamInvitation::where('tenant_id', $tenant->id)
            ->where('id', $id)
            ->where('status', 'pending')
            ->first();

        if (!$invitation) {
            return response()->json(['message' => 'Pending invitation not found.'], 404);
        }

        $token = Str::random(40);
        $invitation->update([
            'token' => $token,
            'expires_at' => now()->addDays(7),
        ]);

        $mailSent = false;
        try {
            \App\Providers\AppServiceProvider::loadDynamicMailConfiguration();
            $frontendUrl = \App\Providers\AppServiceProvider::getFrontendUrl($request->user());
            $acceptUrl = "{$frontendUrl}/verify-email/success?token={$token}&invite=1";

            \Illuminate\Support\Facades\Mail::to($invitation->email)->send(
                new \App\Mail\TeamInvitationMail($tenant->company_name, $acceptUrl)
            );
            $mailSent = true;
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Tenant invitation email resend failed: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to deliver invitation email: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'message' => 'Invitation email resent successfully.',
            'mail_sent' => $mailSent,
            'invitation' => $invitation->load(['role', 'team']),
        ]);
    }

    /**
     * Public route to verify invitation token details (supports both Tenant and SaaS Admin invitations).
     */
    public function verifyInvitation($token): JsonResponse
    {
        // 1. Check workspace tenant invitation
        $invitation = TeamInvitation::where('token', $token)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->with(['tenant', 'role'])
            ->first();

        if ($invitation) {
            return response()->json([
                'is_admin' => false,
                'email' => $invitation->email,
                'company_name' => $invitation->tenant->company_name,
                'role_name' => $invitation->role?->display_name ?? 'Team Member',
            ]);
        }

        // 2. Check SaaS administrator invitation
        $adminInvitation = \App\Models\SaasAdminInvitation::where('token', $token)
            ->where('expires_at', '>', now())
            ->with('role')
            ->first();

        if ($adminInvitation) {
            $platformName = \App\Models\PlatformSetting::getPlatformName();
            return response()->json([
                'is_admin' => true,
                'email' => $adminInvitation->email,
                'company_name' => $platformName,
                'role_name' => $adminInvitation->role?->display_name ?? 'Administrator',
            ]);
        }

        return response()->json(['message' => 'Invitation is invalid or has expired.'], 404);
    }

    /**
     * Public route to accept invitation, create user, and sign in.
     */
    public function acceptInvitation(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'first_name' => ['required', 'string', 'max:50'],
            'last_name' => ['required', 'string', 'max:50'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        // 1. Check Workspace Tenant Invitation
        $invitation = TeamInvitation::where('token', $request->token)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->first();

        if ($invitation) {
            try {
                DB::beginTransaction();

                // Create user
                $user = User::create([
                    'tenant_id' => $invitation->tenant_id,
                    'first_name' => $request->first_name,
                    'last_name' => $request->last_name,
                    'email' => $invitation->email,
                    'password' => Hash::make($request->password),
                    'role_id' => $invitation->role_id,
                    'channel_access_type' => $invitation->channel_access_type ?? 'all',
                    'status' => 'active',
                    'email_verified_at' => now(),
                ]);

                // Add to team pivot if specified
                if ($invitation->team_id) {
                    $user->teams()->attach($invitation->team_id);
                }

                // Attach assigned channels if custom
                if (($invitation->channel_access_type ?? 'all') === 'custom' && !empty($invitation->assigned_channel_ids)) {
                    $user->channelConnections()->attach($invitation->assigned_channel_ids);
                }

                // Mark invitation accepted
                $invitation->update(['status' => 'accepted']);

                DB::commit();

                // Login
                Auth::login($user);

                return response()->json([
                    'is_admin' => false,
                    'message' => 'Invitation accepted successfully.',
                    'user' => [
                        'id' => $user->id,
                        'first_name' => $user->first_name,
                        'last_name' => $user->last_name,
                        'email' => $user->email,
                        'tenant_id' => $user->tenant_id,
                        'tenant' => $user->tenant,
                        'role' => $user->role,
                    ]
                ])->cookie('whatsomni_logged_in', '1', 120, '/', null, false, false);

            } catch (\Exception $e) {
                DB::rollBack();
                return response()->json(['message' => 'Accept failed: ' . $e->getMessage()], 500);
            }
        }

        // 2. Check SaaS Administrator Invitation
        $adminInvitation = \App\Models\SaasAdminInvitation::where('token', $request->token)
            ->where('expires_at', '>', now())
            ->first();

        if ($adminInvitation) {
            try {
                DB::beginTransaction();

                // Create SaaS Admin user
                $admin = \App\Models\Admin::create([
                    'first_name' => $request->first_name,
                    'last_name' => $request->last_name,
                    'email' => $adminInvitation->email,
                    'password' => Hash::make($request->password),
                    'role_id' => $adminInvitation->role_id,
                    'status' => 'active',
                    'last_login_at' => now(),
                ]);

                // Consume invitation
                $adminInvitation->delete();

                DB::commit();

                Auth::guard('admin')->login($admin);
                if ($request->hasSession()) {
                    $request->session()->regenerate();
                }
                $token = $admin->createToken('saas_admin')->plainTextToken;

                return response()->json([
                    'is_admin' => true,
                    'message' => 'Administrator account activated successfully.',
                    'token' => $token,
                    'admin' => [
                        'id' => $admin->id,
                        'first_name' => $admin->first_name,
                        'last_name' => $admin->last_name,
                        'email' => $admin->email,
                        'status' => $admin->status,
                        'role' => $admin->role,
                    ],
                    'redirect_url' => '/superadmin/dashboard',
                ])->cookie('whatsomni_admin_logged_in', '1', 120, '/', null, false, false);

            } catch (\Exception $e) {
                DB::rollBack();
                return response()->json(['message' => 'Admin accept failed: ' . $e->getMessage()], 500);
            }
        }

        return response()->json(['message' => 'Invitation is invalid or has expired.'], 404);
    }
}
