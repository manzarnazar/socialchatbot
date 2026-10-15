<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Tenant;
use App\Models\Role;
use App\Models\TenantUserMembership;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class AdminUserController extends Controller
{
    /**
     * Display a listing of the tenant users with pagination, search, and filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with(['tenant', 'role']);

        // Search name or email or company workspace name
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhereHas('tenant', function ($tQuery) use ($search) {
                      $tQuery->where('company_name', 'like', "%{$search}%");
                  });
            });
        }

        // Filter by Status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter by Tenant ID
        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->tenant_id);
        }

        $users = $query->orderBy('created_at', 'desc')->paginate(10);

        // Load roles and tenants lists for select options
        $roles = Role::whereNull('tenant_id')->orWhereIn('tenant_id', function($q) {
            $q->select('id')->from('tenants');
        })->get();
        
        $tenants = Tenant::orderBy('company_name', 'asc')->get(['id', 'company_name']);

        return response()->json([
            'users' => $users,
            'roles' => $roles,
            'tenants' => $tenants,
        ]);
    }

    /**
     * Display the specified tenant user details.
     */
    public function show($id): JsonResponse
    {
        $user = User::with(['tenant', 'role'])->findOrFail($id);

        return response()->json([
            'user' => $user,
        ]);
    }

    /**
     * Store a newly created tenant user in database.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'tenant_id' => ['required', 'exists:tenants,id'],
            'first_name' => ['required', 'string', 'max:50'],
            'last_name' => ['required', 'string', 'max:50'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:tenant_users,email'],
            'password' => ['required', Password::defaults()],
            'role_id' => ['required', 'exists:roles,id'],
            'status' => ['required', 'string', 'in:active,pending,suspended'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = User::create([
                'tenant_id' => $request->tenant_id,
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role_id' => $request->role_id,
                'status' => $request->status,
                'email_verified_at' => ($request->status === 'active') ? now() : null,
            ]);

            // Synchronize workspace membership
            TenantUserMembership::updateOrCreate(
                [
                    'tenant_id' => $user->tenant_id,
                    'user_id' => $user->id,
                ],
                [
                    'role_id' => $user->role_id,
                    'is_owner' => $user->isOwner(),
                ]
            );

            // Dispatch verification email if pending
            if ($request->status === 'pending') {
                try {
                    $user->sendEmailVerificationNotification();
                } catch (\Exception $e) {
                    // Log mail server failure but don't fail user creation
                    \Illuminate\Support\Facades\Log::warning('Admin failed to send user verification mail: ' . $e->getMessage());
                }
            }

            return response()->json([
                'message' => 'User created successfully.',
                'user' => $user->load(['tenant', 'role']),
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to create user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified tenant user details in database.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'tenant_id' => ['required', 'exists:tenants,id'],
            'first_name' => ['required', 'string', 'max:50'],
            'last_name' => ['required', 'string', 'max:50'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:tenant_users,email,' . $id],
            'password' => ['nullable', Password::defaults()],
            'role_id' => ['required', 'exists:roles,id'],
            'status' => ['required', 'string', 'in:active,pending,suspended'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user->tenant_id = $request->tenant_id;
            $user->first_name = $request->first_name;
            $user->last_name = $request->last_name;
            $user->email = $request->email;
            $user->role_id = $request->role_id;
            $user->status = $request->status;

            if ($request->filled('password')) {
                $user->password = Hash::make($request->password);
            }

            if ($request->status === 'active' && is_null($user->email_verified_at)) {
                $user->email_verified_at = now();
            }

            $user->save();

            // Synchronize workspace membership
            TenantUserMembership::updateOrCreate(
                [
                    'tenant_id' => $user->tenant_id,
                    'user_id' => $user->id,
                ],
                [
                    'role_id' => $user->role_id,
                    'is_owner' => $user->isOwner(),
                ]
            );

            return response()->json([
                'message' => 'User details updated successfully.',
                'user' => $user->load(['tenant', 'role']),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified tenant user from database.
     */
    public function destroy($id): JsonResponse
    {
        $user = User::findOrFail($id);

        try {
            // Delete personal access tokens, active sessions, and memberships
            $user->tokens()->delete();
            \Illuminate\Support\Facades\DB::table('user_sessions')->where('user_id', $user->id)->delete();
            TenantUserMembership::where('user_id', $user->id)->delete();
            
            // Soft delete user
            $user->delete();

            return response()->json([
                'message' => 'User deleted successfully.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to delete user: ' . $e->getMessage()
            ], 500);
        }
    }
}

