<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TenantScopeMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Super Admin management routes are platform-wide and bypass tenant scoping
        if ($request->is('api/admin/*') || $request->is('admin/*')) {
            return $next($request);
        }

        $tenantId = null;

        // 2. Resolve user across guards (Admin, Sanctum bearer token, or stateful session)
        $user = $request->user() ?: auth('admin')->user() ?: auth('sanctum')->user() ?: auth('web')->user();

        if ($user) {
            if (!$request->user()) {
                $request->setUserResolver(fn () => $user);
            }

            if ($user instanceof \App\Models\Admin) {
                $requestedWorkspaceId = $request->header('X-Workspace-ID') 
                    ?? $request->header('X-Tenant-ID') 
                    ?? $request->cookie('whatsomni_workspace_id');
                if ($requestedWorkspaceId) {
                    $tenantId = (int) $requestedWorkspaceId;
                }
            } else {
                $requestedWorkspaceId = $request->header('X-Workspace-ID') 
                    ?? $request->header('X-Tenant-ID') 
                    ?? $request->cookie('whatsomni_workspace_id')
                    ?? ($request->hasSession() ? $request->session()->get('active_tenant_id') : null);

                if (!empty($requestedWorkspaceId) && method_exists($user, 'canAccessTenant') && $user->canAccessTenant($requestedWorkspaceId)) {
                    $tenantId = (int) $requestedWorkspaceId;
                } else {
                    $tenantId = (int) ($request->hasSession() ? $request->session()->get('active_tenant_id', $user->tenant_id ?? null) : ($user->tenant_id ?? null));
                }

                if ($tenantId && $request->hasSession() && $request->session()->get('active_tenant_id') !== $tenantId) {
                    $request->session()->put('active_tenant_id', $tenantId);
                }
            }
        } 
        // 2. Allow X-Tenant-ID header for superadmin operators
        elseif ($request->user('admin') && $request->hasHeader('X-Tenant-ID')) {
            $tenantId = $request->header('X-Tenant-ID');
        }

        if ($tenantId) {
            $tenant = Tenant::with(['currency', 'plan'])->find($tenantId);
            if ($tenant) {
                app()->instance('tenant', $tenant);

                // Dynamically sync user in-memory tenant relation to active workspace
                if ($user) {
                    $user->setRelation('tenant', $tenant);
                    $user->tenant_id = $tenant->id;
                }
            }
        }

        return $next($request);
    }
}
