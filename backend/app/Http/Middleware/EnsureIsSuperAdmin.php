<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Admin;

class EnsureIsSuperAdmin
{
    /**
     * Handle an incoming request to ensure the authenticated user is a Super Admin.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth('admin')->user() 
            ?: auth('sanctum')->user() 
            ?: $request->user('admin') 
            ?: $request->user('sanctum') 
            ?: $request->user();

        if (!$user || !($user instanceof Admin) || $user->status !== 'active') {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        // Set default auth guard to admin for downstream controller requests
        auth()->shouldUse('admin');
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}

