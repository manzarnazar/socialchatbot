<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Providers\AppServiceProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class VerificationController extends Controller
{
    /**
     * Mark the authenticated user's email address as verified.
     */
    public function verify(Request $request): RedirectResponse
    {
        $user = User::findOrFail($request->route('id'));

        $frontendUrl = AppServiceProvider::getFrontendUrl($user);
        $locale = $user->language_preference ?? 'en';

        // Check if the hash matches the email hash
        if (!hash_equals((string) $request->route('hash'), sha1($user->getEmailForVerification()))) {
            return redirect()->to("{$frontendUrl}/{$locale}/login?error=invalid_verification_hash");
        }

        // Check if the signed URL is valid
        if (!$request->hasValidSignature()) {
            return redirect()->to("{$frontendUrl}/{$locale}/login?error=expired_verification_link");
        }

        if ($user->hasVerifiedEmail()) {
            Auth::login($user, true);
            $request->session()->regenerate();
            $onboardingStep = $user->tenant ? $user->tenant->onboarding_step : '1';
            $targetPath = $onboardingStep === 'complete' ? '/dashboard' : '/onboarding';
            return redirect()->to("{$frontendUrl}/{$locale}{$targetPath}?verified=already")
                ->cookie('whatsomni_logged_in', '1', 120, '/', null, false, false);
        }

        if ($user->markEmailAsVerified()) {
            $user->update([
                'status' => 'active'
            ]);
        }

        // Log the user in statefully
        Auth::login($user, true);
        $request->session()->regenerate();

        return redirect()->to("{$frontendUrl}/{$locale}/verify-email/success")
            ->cookie('whatsomni_logged_in', '1', 120, '/', null, false, false);
    }

    /**
     * Resend the email verification notification.
     */
    public function resend(Request $request): JsonResponse
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
        $user = User::where('email', $email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'If this email is registered, we have sent a verification link.'
            ]);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'This email address is already verified.'
            ], 400);
        }

        $throttleKey = 'resend-verification:' . Str::lower($email) . '|' . $request->ip();

        // 60-second cooldown rate limit
        if (RateLimiter::tooManyAttempts($throttleKey, 1)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => 'Please wait ' . $seconds . ' seconds before requesting another email verification link.',
                'cooldown_seconds' => $seconds,
            ], 429);
        }

        RateLimiter::hit($throttleKey, 60);

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Verification link has been resent to your email address.'
        ]);
    }
}
