<?php

namespace App\Services\Security;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class OAuthStateService
{
    /**
     * Generate a cryptographically signed, single-use OAuth state token.
     */
    public static function generateState(int $tenantId, int $userId, string $provider, array $metadata = []): string
    {
        $nonce = Str::random(40);
        $payloadArray = [
            'nonce' => $nonce,
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'provider' => $provider,
            'meta' => $metadata,
            'ts' => time(),
        ];

        $payloadJson = json_encode($payloadArray);
        $payloadB64 = base64_encode($payloadJson);
        $signature = hash_hmac('sha256', $payloadB64, (string)config('app.key'));

        $state = $payloadB64 . '.' . $signature;

        // Store nonce in cache to enforce single-use (anti-replay)
        Cache::put("oauth_state_nonce:{$nonce}", $payloadArray, now()->addMinutes(15));

        return $state;
    }

    /**
     * Validate signature, expiry, and single-use nonce of an OAuth state parameter.
     */
    public static function validateAndConsumeState(?string $state, ?string $expectedProvider = null): ?array
    {
        if (empty($state)) {
            Log::warning("OAuthStateService: Missing state parameter.");
            return null;
        }

        // Support structured payload.signature format
        if (!str_contains($state, '.')) {
            Log::warning("OAuthStateService: Malformed state format without HMAC signature.");
            return null;
        }

        $parts = explode('.', $state, 2);
        if (count($parts) !== 2) {
            return null;
        }

        [$payloadB64, $signature] = $parts;
        $expectedSig = hash_hmac('sha256', $payloadB64, (string)config('app.key'));

        if (!hash_equals($expectedSig, $signature)) {
            Log::warning("OAuthStateService: Invalid HMAC signature on OAuth state.");
            return null;
        }

        $decoded = json_decode(base64_decode($payloadB64), true);
        if (!is_array($decoded) || empty($decoded['nonce']) || empty($decoded['tenant_id'])) {
            Log::warning("OAuthStateService: Invalid decoded state payload.");
            return null;
        }

        // Check age (15-minute max lifetime)
        $timestamp = $decoded['ts'] ?? 0;
        if (time() - $timestamp > 900) {
            Log::warning("OAuthStateService: OAuth state has expired.");
            return null;
        }

        // Check expected provider if specified
        if ($expectedProvider !== null && ($decoded['provider'] ?? '') !== $expectedProvider) {
            Log::warning("OAuthStateService: Provider mismatch. Expected: {$expectedProvider}, got: " . ($decoded['provider'] ?? 'none'));
            return null;
        }

        $nonce = $decoded['nonce'];
        $cacheKey = "oauth_state_nonce:{$nonce}";

        // Verify nonce was issued and consume it (single use)
        if (!Cache::has($cacheKey)) {
            Log::warning("OAuthStateService: OAuth state nonce has already been consumed or was never issued: {$nonce}");
            return null;
        }

        Cache::forget($cacheKey);

        return $decoded;
    }
}
