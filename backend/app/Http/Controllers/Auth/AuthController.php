<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    /**
     * Handle user signup and tenant creation.
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'first_name' => ['required', 'string', 'max:50'],
            'last_name' => ['required', 'string', 'max:50'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:tenant_users'],
            'company_name' => ['required', 'string', 'max:100'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'team_size' => ['nullable', 'string'],
            'industry_category' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // 1. Resolve localized currency from tenant IP / location
            $resolvedCurrency = app(\App\Services\GeoIPService::class)->resolveCurrency($request);

            // 2. Create Tenant
            $tenant = Tenant::create([
                'company_name' => $request->company_name,
                'team_size' => $request->team_size,
                'industry_category' => $request->industry_category,
                'currency_id' => $resolvedCurrency->id,
                'status' => 'trial',
                'trial_ends_at' => now()->addDays(14),
                'onboarding_step' => '1', // Start onboarding at step 1
            ]);

            // 2. Create User linked to Tenant
            $ownerRole = DB::table('roles')->whereNull('tenant_id')->where('name', 'owner')->first();
            $user = User::create([
                'tenant_id' => $tenant->id,
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role_id' => $ownerRole ? $ownerRole->id : null,
                'status' => 'pending',
            ]);

            // 3. Send Verification Email (configured to use Resend or SMTP from Phase 0)
            $user->sendEmailVerificationNotification();

            // 4. Create Admin Notification & broadcast event
            try {
                $userName = "{$user->first_name} {$user->last_name}";
                $industry = $tenant->industry_category ?: 'Merchant';
                $adminNotif = \App\Models\AdminNotification::create([
                    'type' => 'new_merchant_signup',
                    'title' => "New Merchant Signup: {$tenant->company_name}",
                    'body' => "{$userName} registered {$tenant->company_name} ({$industry}).",
                    'data' => [
                        'tenant_id' => $tenant->id,
                        'user_id' => $user->id,
                        'company_name' => $tenant->company_name,
                        'email' => $user->email,
                        'action_url' => "/superadmin?search=" . urlencode($tenant->company_name),
                    ],
                ]);
                event(new \App\Events\AdminNotificationBroadcastEvent($adminNotif));
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Failed to dispatch admin notification for merchant signup: ' . $e->getMessage());
            }

            DB::commit();

            return response()->json([
                'message' => 'Registration successful. Verification email has been sent.',
                'email' => $user->email,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Registration failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle user login with Sanctum and rate limiting.
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
        $throttleKey = 'login:' . Str::lower($email) . '|' . $request->ip();

        // 1. Check Rate Limiter
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => 'Too many login attempts. Please try again in ' . ceil($seconds / 60) . ' minutes.',
                'lockout_seconds' => $seconds,
            ], 429);
        }

        // 2. Find User
        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            RateLimiter::hit($throttleKey, 900); // 15-minute lockout backoff window
            
            $attemptsLeft = RateLimiter::remaining($throttleKey, 5);
            return response()->json([
                'message' => 'Invalid login credentials.',
                'attempts_left' => $attemptsLeft,
            ], 401);
        }

        // 3. Validate Account Status
        if ($user->status === 'suspended') {
            return response()->json([
                'message' => 'Your account has been suspended. Please contact support.'
            ], 403);
        }

        if (is_null($user->email_verified_at)) {
            return response()->json([
                'message' => 'Please verify your email before logging in.',
                'email' => $user->email,
                'verified' => false,
            ], 403);
        }

        // 4. Authenticate User
        Auth::login($user, $request->boolean('remember'));

        // Update last login timestamp
        $user->update([
            'last_login_at' => now(),
            'status' => 'active', // Mark active on successful verified login
        ]);

        RateLimiter::clear($throttleKey);

        $request->session()->regenerate();

        // Clean up previous sessions for the same user on the same device/browser footprint
        DB::table('user_sessions')
            ->where('user_id', $user->id)
            ->where('ip_address', $request->ip())
            ->where('user_agent', $request->userAgent())
            ->where('id', '!=', $request->session()->getId())
            ->delete();

        $user->load(['tenant', 'role']);
        $token = $user->createToken('tenant_user')->plainTextToken;

        return response()->json([
            'user' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'tenant_id' => $user->tenant_id,
                'tenant' => $user->tenant,
                'role' => $user->role,
            ],
            'token' => $token,
            'message' => 'Login successful.',
        ])->cookie('whatsomni_logged_in', '1', 120, '/', null, false, false);
    }

    /**
     * Handle user logout and session invalidation.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user('sanctum') ?? $request->user() ?? Auth::guard('web')->user();
        if ($user) {
            $user->currentAccessToken()?->delete();
        }

        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Logged out successfully.'
        ])
        ->cookie('whatsomni_logged_in', '', -1, '/', null, false, false)
        ->cookie('whatsomni_onboarding_completed', '', -1, '/', null, false, false)
        ->cookie('whatsomni_plan_selected', '', -1, '/', null, false, false);
    }
}
