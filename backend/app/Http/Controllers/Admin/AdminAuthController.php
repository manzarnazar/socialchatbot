<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AdminAuthController extends Controller
{
    /**
     * Handle Admin Login
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors()
            ], 422);
        }

        $email = $request->email;
        $throttleKey = 'admin_login:' . Str::lower($email) . '|' . $request->ip();

        // 1. Rate Limiting Check
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => 'Too many login attempts. Please try again in ' . ceil($seconds / 60) . ' minutes.',
                'lockout_seconds' => $seconds,
            ], 429);
        }

        // 2. Find SaaS Admin
        $admin = Admin::where('email', $email)->first();

        if (!$admin || !Hash::check($request->password, $admin->password)) {
            RateLimiter::hit($throttleKey, 900); // 15-minute lockout window
            $attemptsLeft = RateLimiter::remaining($throttleKey, 5);

            // Log failed login attempt
            \App\Models\AuditLog::create([
                'actor_type' => 'App\Models\Admin',
                'actor_id' => $admin ? $admin->id : 0,
                'action' => 'admin_login_failed',
                'subject_type' => 'App\Models\Admin',
                'subject_id' => $admin ? $admin->id : null,
                'meta' => [
                    'email' => $email,
                    'ip_address' => $request->ip(),
                    'attempts_left' => $attemptsLeft,
                ],
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'message' => 'Invalid login credentials.',
                'attempts_left' => $attemptsLeft,
            ], 401);
        }

        // 3. Check Admin Status
        if ($admin->status === 'suspended') {
            return response()->json([
                'message' => 'Your administrator account has been suspended.'
            ], 403);
        }

        // 4. Perform Login
        Auth::guard('admin')->login($admin, $request->boolean('remember'));

        // Update last login
        $admin->update([
            'last_login_at' => now(),
        ]);

        // Log successful admin login
        \App\Models\AuditLog::create([
            'actor_type' => 'App\Models\Admin',
            'actor_id' => $admin->id,
            'action' => 'admin_login_success',
            'subject_type' => 'App\Models\Admin',
            'subject_id' => $admin->id,
            'meta' => [
                'email' => $admin->email,
                'user_agent' => $request->userAgent(),
            ],
            'ip_address' => $request->ip(),
        ]);

        RateLimiter::clear($throttleKey);

        $request->session()->regenerate();
        $token = $admin->createToken('saas_admin')->plainTextToken;

        // Attach non-httpOnly cookie so Next.js middleware knows the session is active
        return response()->json([
            'admin' => [
                'id' => $admin->id,
                'first_name' => $admin->first_name,
                'last_name' => $admin->last_name,
                'email' => $admin->email,
            ],
            'token' => $token,
            'message' => 'Login successful.',
        ])->cookie('whatsomni_admin_logged_in', '1', 120, '/', null, $request->secure(), false);
    }

    /**
     * Retrieve the current admin details.
     */
    public function me(Request $request): JsonResponse
    {
        $admin = $request->user('admin') ?: auth('sanctum')->user() ?: auth('admin')->user();

        if (!$admin) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        return response()->json([
            'admin' => [
                'id' => $admin->id,
                'first_name' => $admin->first_name,
                'last_name' => $admin->last_name,
                'email' => $admin->email,
            ]
        ]);
    }

    /**
     * Handle Admin Logout
     */
    public function logout(Request $request): JsonResponse
    {
        $admin = $request->user('admin') ?: auth('sanctum')->user() ?: auth('admin')->user();

        if ($admin) {
            $admin->currentAccessToken()?->delete();
            \App\Models\AuditLog::create([
                'actor_type' => 'App\Models\Admin',
                'actor_id' => $admin->id,
                'action' => 'admin_logout',
                'subject_type' => 'App\Models\Admin',
                'subject_id' => $admin->id,
                'meta' => [
                    'email' => $admin->email,
                ],
                'ip_address' => $request->ip(),
            ]);
        }

        Auth::guard('admin')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        // Expire the login status indicator cookie
        return response()->json([
            'message' => 'Logged out successfully.'
        ])->cookie('whatsomni_admin_logged_in', '', -1, '/', null, false, false);
    }

    /**
     * Update currently logged in admin profile.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $admin = $request->user('admin') ?: auth('sanctum')->user() ?: auth('admin')->user();

        if (!$admin) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'first_name' => ['nullable', 'string', 'max:50'],
            'last_name' => ['nullable', 'string', 'max:50'],
            'current_password' => ['required_with:password', 'nullable', 'string'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        if ($request->filled('password')) {
            if (!Hash::check($request->current_password, $admin->password)) {
                return response()->json([
                    'message' => 'Current password confirmation does not match.'
                ], 422);
            }
            $admin->password = Hash::make($request->password);
        }

        if ($request->has('first_name')) {
            $admin->first_name = $request->first_name;
        }

        if ($request->has('last_name')) {
            $admin->last_name = $request->last_name;
        }

        $admin->save();

        \App\Models\AuditLog::create([
            'actor_type' => 'App\Models\Admin',
            'actor_id' => $admin->id,
            'action' => 'admin_profile_updated',
            'subject_type' => 'App\Models\Admin',
            'subject_id' => $admin->id,
            'meta' => [
                'password_changed' => $request->filled('password'),
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'admin' => [
                'id' => $admin->id,
                'first_name' => $admin->first_name,
                'last_name' => $admin->last_name,
                'email' => $admin->email,
            ]
        ]);
    }
}
