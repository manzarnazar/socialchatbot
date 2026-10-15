<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class PasswordResetController extends Controller
{
    /**
     * Send a password reset link to the given user.
     */
    public function sendResetLinkEmail(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors()
            ], 422);
        }

        $email = $request->email;
        $throttleKey = 'forgot-password:' . Str::lower($email) . '|' . $request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 3)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => 'Too many reset requests. Please try again in ' . ceil($seconds / 60) . ' minutes.',
            ], 429);
        }

        RateLimiter::hit($throttleKey, 900); // 15 min lock window

        $user = User::where('email', $email)->first();

        if ($user) {
            // Delete old tokens for this email first
            DB::table('password_resets')->where('email', $email)->delete();

            // Generate new token
            $token = Str::random(60);

            DB::table('password_resets')->insert([
                'email' => $email,
                'token' => Hash::make($token),
                'created_at' => now(),
            ]);

            // Dispatches notification (Phase 1 ResetPasswordNotification using custom mail views)
            $user->sendPasswordResetNotification($token);
        }

        return response()->json([
            'message' => 'If this email is registered in our system, we have sent a reset password link.'
        ]);
    }

    /**
     * Reset the given user's password.
     */
    public function reset(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors()
            ], 422);
        }

        $email = $request->email;
        $user = User::where('email', $email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'Invalid email address.'
            ], 400);
        }

        // Get matching reset records
        $resetRecord = DB::table('password_resets')->where('email', $email)->first();

        if (!$resetRecord) {
            return response()->json([
                'message' => 'Invalid or expired password reset token.'
            ], 400);
        }

        // Check if token is expired (older than 60 mins)
        $createdAt = Carbon::parse($resetRecord->created_at);
        if ($createdAt->addMinutes(60)->isPast()) {
            DB::table('password_resets')->where('email', $email)->delete();
            return response()->json([
                'message' => 'This password reset link has expired.'
            ], 400);
        }

        // Check token hash
        if (!Hash::check($request->token, $resetRecord->token)) {
            return response()->json([
                'message' => 'Invalid or expired password reset token.'
            ], 400);
        }

        try {
            DB::beginTransaction();

            // 1. Reset user password and regenerate remember_token
            $user->forceFill([
                'password' => Hash::make($request->password),
                'remember_token' => Str::random(60),
            ])->save();

            // 2. Invalidate all active sessions for this user
            DB::table('user_sessions')->where('user_id', $user->id)->delete();

            // 3. Clear the password reset record
            DB::table('password_resets')->where('email', $email)->delete();

            DB::commit();

            return response()->json([
                'message' => 'Your password has been reset successfully. Please log in with your new password.'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Password reset failed: ' . $e->getMessage()
            ], 500);
        }
    }
}
