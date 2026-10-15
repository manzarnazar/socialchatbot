<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\TenantUserMembership;
use App\Services\PlanLimitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class WorkspaceController extends Controller
{
    /**
     * List all workspaces accessible to the authenticated user along with quota limits.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $activeTenant = app()->bound('tenant') ? app('tenant') : $user->tenant;

        $allWorkspaces = $user->allWorkspaces();
        $limitCheck = app(PlanLimitService::class)->canCreateWorkspace($user);

        $workspaces = $allWorkspaces->map(function ($t) use ($user, $activeTenant) {
            return [
                'id' => $t->id,
                'company_name' => $t->company_name,
                'team_size' => $t->team_size,
                'industry_category' => $t->industry_category,
                'status' => $t->status,
                'currency' => $t->currency,
                'plan' => $t->plan ? [
                    'id' => $t->plan->id,
                    'name' => $t->plan->name,
                    'max_workspaces' => $t->plan->max_workspaces ?? 1,
                ] : null,
                'is_owner' => (int) $t->owner_id === (int) $user->id,
                'is_current' => (int) $t->id === (int) $activeTenant?->id,
                'created_at' => $t->created_at,
            ];
        });

        return response()->json([
            'current_workspace' => $activeTenant ? [
                'id' => $activeTenant->id,
                'company_name' => $activeTenant->company_name,
                'team_size' => $activeTenant->team_size,
                'industry_category' => $activeTenant->industry_category,
                'status' => $activeTenant->status,
                'plan' => $activeTenant->plan ? [
                    'id' => $activeTenant->plan->id,
                    'name' => $activeTenant->plan->name,
                    'max_workspaces' => $activeTenant->plan->max_workspaces ?? 1,
                ] : null,
            ] : null,
            'workspaces' => $workspaces,
            'can_create_workspace' => $limitCheck['allowed'],
            'limit_reason' => $limitCheck['reason'],
            'limit_code' => $limitCheck['code'],
            'workspaces_limit' => $limitCheck['limit'],
            'workspaces_count' => $limitCheck['current'],
        ]);
    }

    /**
     * Create a new workspace for the tenant owner, enforcing plan limits.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        // 1. Verify owner permission
        if (!$user->isOwner()) {
            return response()->json([
                'message' => 'Only the account owner can create additional workspaces.',
            ], 403);
        }

        // 2. Enforce subscription plan limit
        $limitCheck = app(PlanLimitService::class)->canCreateWorkspace($user);
        if (!$limitCheck['allowed']) {
            return response()->json([
                'message' => $limitCheck['reason'],
                'code' => $limitCheck['code'],
                'limit' => $limitCheck['limit'],
                'current' => $limitCheck['current'],
            ], 422);
        }

        // 3. Validate request
        $validator = Validator::make($request->all(), [
            'company_name' => ['required', 'string', 'max:100'],
            'team_size' => ['nullable', 'string', 'max:50'],
            'industry_category' => ['nullable', 'string', 'max:100'],
            'currency_id' => ['nullable', 'exists:currencies,id'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors(),
            ], 422);
        }

        $primaryTenant = $user->tenant;
        $currencyId = $request->currency_id ?: ($primaryTenant?->currency_id ?: 1);

        try {
            DB::beginTransaction();

            // Create new Workspace (Tenant) inheriting subscription plan from owner
            $newTenant = Tenant::create([
                'owner_id' => $user->id,
                'company_name' => $request->company_name,
                'team_size' => $request->team_size ?: $primaryTenant?->team_size,
                'industry_category' => $request->industry_category ?: $primaryTenant?->industry_category,
                'currency_id' => $currencyId,
                'plan_id' => $primaryTenant?->plan_id,
                'status' => 'active',
                'onboarding_step' => 'complete',
                'default_language' => $primaryTenant?->default_language ?: 'en',
            ]);

            // Create owner membership record
            TenantUserMembership::create([
                'tenant_id' => $newTenant->id,
                'user_id' => $user->id,
                'role_id' => $user->role_id,
                'is_owner' => true,
            ]);

            // Automatically switch active workspace to the new workspace
            $user->tenant_id = $newTenant->id;
            $user->save();
            session(['active_tenant_id' => $newTenant->id]);

            DB::commit();

            return response()->json([
                'message' => 'Workspace created successfully.',
                'workspace' => [
                    'id' => $newTenant->id,
                    'company_name' => $newTenant->company_name,
                    'team_size' => $newTenant->team_size,
                    'industry_category' => $newTenant->industry_category,
                    'status' => $newTenant->status,
                    'is_owner' => true,
                    'is_current' => true,
                ],
            ], 201);

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create workspace: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Switch active workspace session.
     */
    public function switch(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->canAccessTenant($id)) {
            return response()->json([
                'message' => 'Unauthorized workspace access.',
            ], 403);
        }

        $tenant = Tenant::with(['currency', 'plan'])->find($id);
        if (!$tenant) {
            return response()->json([
                'message' => 'Workspace not found.',
            ], 404);
        }

        $user->tenant_id = $tenant->id;
        $user->save();
        session(['active_tenant_id' => $tenant->id]);

        return response()->json([
            'message' => 'Workspace switched successfully.',
            'active_workspace' => [
                'id' => $tenant->id,
                'company_name' => $tenant->company_name,
                'is_owner' => (int) $tenant->owner_id === (int) $user->id,
                'plan' => $tenant->plan ? [
                    'name' => $tenant->plan->name,
                ] : null,
            ],
        ]);
    }
}
