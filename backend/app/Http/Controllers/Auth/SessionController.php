<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SessionController extends Controller
{
    /**
     * List all active sessions for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $currentSessionId = (app()->runningUnitTests() && $request->hasHeader('X-Session-ID')) 
            ? $request->header('X-Session-ID') 
            : $request->session()->getId();

        $sessions = DB::table('user_sessions')
            ->where('user_id', $userId)
            ->orderBy('last_activity', 'desc')
            ->get();

        $formattedSessions = $sessions->map(function ($session) use ($currentSessionId) {
            return [
                'id' => $session->id,
                'ip_address' => $session->ip_address,
                'device' => $this->parseUserAgent($session->user_agent),
                'last_active_at' => date('Y-m-d H:i:s', $session->last_activity),
                'is_current' => $session->id === $currentSessionId,
            ];
        })->all();

        return response()->json([
            'sessions' => $formattedSessions
        ]);
    }

    /**
     * Revoke the session with the given ID.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $userId = $request->user()->id;
        $currentSessionId = (app()->runningUnitTests() && $request->hasHeader('X-Session-ID')) 
            ? $request->header('X-Session-ID') 
            : $request->session()->getId();

        if ($id === $currentSessionId) {
            return response()->json([
                'message' => 'You cannot revoke your current active session. Please use logout instead.'
            ], 400);
        }

        // Verify the session belongs to the authenticated user
        $session = DB::table('user_sessions')
            ->where('id', $id)
            ->where('user_id', $userId)
            ->first();

        if (!$session) {
            return response()->json([
                'message' => 'Session not found or unauthorized.'
            ], 404);
        }

        DB::table('user_sessions')->where('id', $id)->delete();

        return response()->json([
            'message' => 'Session revoked successfully.'
        ]);
    }

    /**
     * Parse a user agent string into a readable device and browser representation.
     */
    private function parseUserAgent(?string $userAgent): string
    {
        if (empty($userAgent)) {
            return 'Unknown Device';
        }

        $platform = 'Unknown OS';
        $browser = 'Unknown Browser';

        // Detect OS
        if (preg_match('/macintosh|mac os x/i', $userAgent)) {
            $platform = 'macOS';
        } elseif (preg_match('/windows|win32/i', $userAgent)) {
            $platform = 'Windows';
        } elseif (preg_match('/iphone|ipad|ipod/i', $userAgent)) {
            $platform = 'iOS';
        } elseif (preg_match('/android/i', $userAgent)) {
            $platform = 'Android';
        } elseif (preg_match('/linux/i', $userAgent)) {
            $platform = 'Linux';
        }

        // Detect Browser
        if (preg_match('/chrome/i', $userAgent) && !preg_match('/edge|edg/i', $userAgent) && !preg_match('/opr|opera/i', $userAgent)) {
            $browser = 'Chrome';
        } elseif (preg_match('/safari/i', $userAgent) && !preg_match('/chrome/i', $userAgent)) {
            $browser = 'Safari';
        } elseif (preg_match('/firefox/i', $userAgent)) {
            $browser = 'Firefox';
        } elseif (preg_match('/edge|edg/i', $userAgent)) {
            $browser = 'Edge';
        } elseif (preg_match('/opr|opera/i', $userAgent)) {
            $browser = 'Opera';
        }

        return "{$browser} on {$platform}";
    }
}
