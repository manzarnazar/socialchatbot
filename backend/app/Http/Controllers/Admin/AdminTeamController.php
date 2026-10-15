<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\AdminInvitationMail;
use App\Models\Admin;
use App\Models\AdminRole;
use App\Models\SaasAdminInvitation;
use App\Providers\AppServiceProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AdminTeamController extends Controller
{
    /**
     * Get list of admin team members, pending invitations, and available roles.
     */
    public function index(): JsonResponse
    {
        // Ensure default roles exist
        if (AdminRole::count() === 0) {
            AdminRole::create([
                'name' => 'super_admin',
                'display_name' => 'Super Administrator',
                'permissions' => ['*'],
            ]);
            AdminRole::create([
                'name' => 'support_agent',
                'display_name' => 'Support Agent',
                'permissions' => ['tickets', 'settings.general'],
            ]);
        }

        $members = Admin::with('role')->get();
        $invitations = SaasAdminInvitation::with('role')->get();
        $roles = AdminRole::all();

        return response()->json([
            'members' => $members,
            'invitations' => $invitations,
            'roles' => $roles,
        ]);
    }

    /**
     * Invite a new administrator.
     */
    public function invite(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'role_id' => ['required', 'exists:saas_admin_roles,id'],
        ]);

        // Check if already an admin member
        if (Admin::where('email', $request->email)->exists()) {
            return response()->json([
                'message' => 'This email is already registered as an administrator.',
            ], 422);
        }

        // Check if already invited
        if (SaasAdminInvitation::where('email', $request->email)->exists()) {
            return response()->json([
                'message' => 'An active invitation is already pending for this email.',
            ], 422);
        }

        $role = AdminRole::findOrFail($request->role_id);
        $token = Str::random(40);

        $invitation = SaasAdminInvitation::create([
            'email' => $request->email,
            'role_id' => $role->id,
            'token' => $token,
            'expires_at' => now()->addDays(7),
        ]);

        // Send Administrator Invitation Email using database mailer credentials
        $mailSent = false;
        try {
            AppServiceProvider::loadDynamicMailConfiguration();
            $frontendUrl = AppServiceProvider::getFrontendUrl($request->user());
            $acceptUrl = "{$frontendUrl}/verify-email/success?token={$token}&invite=1&admin=1";

            Mail::to($request->email)->send(
                new AdminInvitationMail($role->display_name ?? $role->name, $acceptUrl)
            );
            $mailSent = true;
        } catch (\Throwable $e) {
            Log::error('Admin invitation email delivery failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => $mailSent 
                ? 'Administrator invitation sent successfully.' 
                : 'Invitation created. (Warning: email could not be delivered, please verify mailer settings).',
            'mail_sent' => $mailSent,
            'invitation' => $invitation->load('role'),
        ]);
    }

    /**
     * Resend an administrator invitation email.
     */
    public function resendInvite(Request $request, $id): JsonResponse
    {
        $invitation = SaasAdminInvitation::with('role')->findOrFail($id);
        $token = Str::random(40);
        $invitation->update([
            'token' => $token,
            'expires_at' => now()->addDays(7),
        ]);

        $mailSent = false;
        try {
            AppServiceProvider::loadDynamicMailConfiguration();
            $frontendUrl = AppServiceProvider::getFrontendUrl($request->user());
            $acceptUrl = "{$frontendUrl}/verify-email/success?token={$token}&invite=1&admin=1";

            Mail::to($invitation->email)->send(
                new AdminInvitationMail($invitation->role?->display_name ?? 'Administrator', $acceptUrl)
            );
            $mailSent = true;
        } catch (\Throwable $e) {
            Log::error('Admin invitation email resend failed: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to deliver invitation email: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'message' => 'Administrator invitation email resent successfully.',
            'mail_sent' => $mailSent,
            'invitation' => $invitation,
        ]);
    }

    /**
     * Revoke a pending administrator invitation.
     */
    public function revokeInvite($id): JsonResponse
    {
        $invitation = SaasAdminInvitation::findOrFail($id);
        $invitation->delete();

        return response()->json([
            'message' => 'Administrator invitation revoked successfully.',
        ]);
    }

    /**
     * Remove an administrative team member.
     */
    public function removeMember(Request $request, $id): JsonResponse
    {
        $currentAdminId = $request->user()?->id ?? auth('admin')->id() ?? auth('sanctum')->id();

        // Don't allow an admin to delete themselves
        if ($currentAdminId && (string)$currentAdminId === (string)$id) {
            return response()->json([
                'message' => 'You cannot remove your own administrative account.',
            ], 422);
        }

        $member = Admin::findOrFail($id);
        $member->delete();

        return response()->json([
            'message' => 'Administrator removed from team successfully.',
        ]);
    }

    /**
     * Update member permission role.
     */
    public function updateMemberRole(Request $request, $id): JsonResponse
    {
        $request->validate([
            'role_id' => ['required', 'exists:saas_admin_roles,id'],
        ]);

        $currentAdminId = $request->user()?->id ?? auth('admin')->id() ?? auth('sanctum')->id();

        if ($currentAdminId && (string)$currentAdminId === (string)$id) {
            return response()->json([
                'message' => 'You cannot change your own administrative role.',
            ], 422);
        }

        $member = Admin::findOrFail($id);
        $member->role_id = $request->role_id;
        $member->save();

        return response()->json([
            'message' => 'Administrator role updated successfully.',
            'member' => $member->load('role'),
        ]);
    }

    /**
     * Create custom administrative role.
     */
    public function createRole(Request $request): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:saas_admin_roles,name'],
            'permissions' => ['required', 'array'],
        ]);

        $role = AdminRole::create([
            'name' => $request->name,
            'permissions' => $request->permissions,
        ]);

        return response()->json([
            'message' => 'Administrative role created successfully.',
            'role' => $role,
        ]);
    }

    /**
     * Update custom administrative role.
     */
    public function updateRole(Request $request, $id): JsonResponse
    {
        $role = AdminRole::findOrFail($id);

        // Prevent modification of base system roles
        $systemRoles = ['super_admin', 'support_agent', 'Super Admin', 'Support Agent'];
        if (in_array(strtolower($role->name), array_map('strtolower', $systemRoles))) {
            return response()->json([
                'message' => 'System base roles cannot be modified.',
            ], 422);
        }

        $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:saas_admin_roles,name,' . $role->id],
            'permissions' => ['required', 'array'],
        ]);

        $role->update([
            'name' => $request->name,
            'permissions' => $request->permissions,
        ]);

        return response()->json([
            'message' => 'Administrative role updated successfully.',
            'role' => $role,
        ]);
    }

    /**
     * Delete custom administrative role.
     */
    public function deleteRole($id): JsonResponse
    {
        $role = AdminRole::findOrFail($id);

        // Prevent deletion of base system roles
        $systemRoles = ['super_admin', 'support_agent', 'Super Admin', 'Support Agent'];
        if (in_array(strtolower($role->name), array_map('strtolower', $systemRoles))) {
            return response()->json([
                'message' => 'System base roles cannot be modified or deleted.',
            ], 422);
        }

        // Dissolve role assignments (optional or throw error if actively assigned)
        if ($role->admins()->exists()) {
            return response()->json([
                'message' => 'This role is actively assigned to team members and cannot be deleted.',
            ], 422);
        }

        $role->delete();

        return response()->json([
            'message' => 'Administrative role deleted successfully.',
        ]);
    }
}
