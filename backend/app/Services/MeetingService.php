<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\PlatformSetting;
use App\Models\TenantMeetingToken;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Exception;

class MeetingService
{
    /**
     * Get Zoom platform credentials from database (PlatformSetting).
     */
    public static function getZoomCredentials(): array
    {
        $setting = PlatformSetting::getSetting('zoom_app_config');
        $dbClientId = is_array($setting) ? ($setting['client_id'] ?? null) : null;
        $dbClientSecret = is_array($setting) ? ($setting['client_secret'] ?? null) : null;
        $dbRedirectUri = is_array($setting) ? ($setting['redirect_uri'] ?? null) : null;

        $defaultRedirectUri = \App\Providers\AppServiceProvider::getBackendUrl() . '/api/integrations/meetings/callback';

        $clientId = !empty(trim($dbClientId ?? '')) ? trim($dbClientId) : '';
        $clientSecret = !empty(trim($dbClientSecret ?? '')) ? trim($dbClientSecret) : '';
        $redirectUri = !empty(trim($dbRedirectUri ?? '')) ? trim($dbRedirectUri) : $defaultRedirectUri;

        $hasDbConfig = !empty(trim($dbClientId ?? '')) && !empty(trim($dbClientSecret ?? ''));

        return [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri,
            'source' => $hasDbConfig ? 'database' : 'none',
            'is_configured' => $hasDbConfig,
        ];
    }

    /**
     * Get Microsoft Teams platform credentials from database (PlatformSetting).
     */
    public static function getTeamsCredentials(): array
    {
        $setting = PlatformSetting::getSetting('teams_app_config');
        $dbClientId = is_array($setting) ? ($setting['client_id'] ?? null) : null;
        $dbClientSecret = is_array($setting) ? ($setting['client_secret'] ?? null) : null;
        $dbTenantId = is_array($setting) ? ($setting['tenant_id'] ?? null) : null;
        $dbRedirectUri = is_array($setting) ? ($setting['redirect_uri'] ?? null) : null;

        $defaultRedirectUri = \App\Providers\AppServiceProvider::getBackendUrl() . '/api/integrations/meetings/callback';

        $clientId = !empty(trim($dbClientId ?? '')) ? trim($dbClientId) : '';
        $clientSecret = !empty(trim($dbClientSecret ?? '')) ? trim($dbClientSecret) : '';
        $tenantId = !empty(trim($dbTenantId ?? '')) ? trim($dbTenantId) : 'common';
        $redirectUri = !empty(trim($dbRedirectUri ?? '')) ? trim($dbRedirectUri) : $defaultRedirectUri;

        $hasDbConfig = !empty(trim($dbClientId ?? '')) && !empty(trim($dbClientSecret ?? ''));

        return [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'tenant_id' => $tenantId,
            'redirect_uri' => $redirectUri,
            'source' => $hasDbConfig ? 'database' : 'none',
            'is_configured' => $hasDbConfig,
        ];
    }

    /**
     * Generate meeting join link for an appointment.
     */
    public function generateMeetingLink(Appointment $appointment): ?string
    {
        $link = $appointment->bookingLink;
        if (!$link) {
            return null;
        }

        $locationType = $link->location_type;

        if ($locationType === 'custom') {
            return $link->custom_location;
        }

        if ($locationType === 'zoom') {
            return $this->createZoomMeeting($appointment);
        }

        if ($locationType === 'teams') {
            return $this->createTeamsMeeting($appointment);
        }

        return null;
    }

    /**
     * Zoom OAuth URL.
     */
    public function getZoomAuthUrl(int $tenantId): string
    {
        $creds = self::getZoomCredentials();
        $clientId = $creds['client_id'];
        $redirectUri = $creds['redirect_uri'];
        $state = \App\Services\Security\OAuthStateService::generateState($tenantId, 1, 'zoom');

        return "https://zoom.us/oauth/authorize?" . http_build_query([
            'client_id' => $clientId,
            'response_type' => 'code',
            'redirect_uri' => $redirectUri,
            'scope' => 'meeting:write:admin meeting:write user:read',
            'state' => $state,
        ]);
    }

    /**
     * Microsoft Teams OAuth URL.
     */
    public function getTeamsAuthUrl(int $tenantId): string
    {
        $creds = self::getTeamsCredentials();
        $clientId = $creds['client_id'];
        $tenantIdAuth = (!empty($creds['tenant_id']) && $creds['tenant_id'] !== 'common') ? $creds['tenant_id'] : 'organizations';
        $redirectUri = $creds['redirect_uri'];
        $state = \App\Services\Security\OAuthStateService::generateState($tenantId, 1, 'teams');

        return "https://login.microsoftonline.com/{$tenantIdAuth}/oauth2/v2.0/authorize?" . http_build_query([
            'client_id' => $clientId,
            'response_type' => 'code',
            'redirect_uri' => $redirectUri,
            'response_mode' => 'query',
            'scope' => 'User.Read OnlineMeetings.ReadWrite offline_access',
            'state' => $state,
        ]);
    }

    /**
     * Exchange callback code for Zoom credentials.
     */
    public function exchangeZoomToken(string $code, int $tenantId): TenantMeetingToken
    {
        $creds = self::getZoomCredentials();
        $clientId = $creds['client_id'] ?: 'zoom_client_id_dummy';
        $clientSecret = $creds['client_secret'] ?: 'zoom_client_secret_dummy';
        $redirectUri = $creds['redirect_uri'];

        $response = Http::asForm()
            ->withBasicAuth($clientId, $clientSecret)
            ->post('https://zoom.us/oauth/token', [
                'grant_type' => 'authorization_code',
                'code' => $code,
                'redirect_uri' => $redirectUri,
            ]);

        if (!$response->successful()) {
            throw new Exception("Zoom token exchange failed: " . $response->body());
        }

        $data = $response->json();

        // Fetch User Info
        $userResponse = Http::withToken($data['access_token'])
            ->get('https://api.zoom.us/v2/users/me');
        $email = $userResponse->successful() ? $userResponse->json('email') : null;

        return TenantMeetingToken::updateOrCreate(
            ['tenant_id' => $tenantId, 'provider' => 'zoom'],
            [
                'access_token' => $data['access_token'],
                'refresh_token' => $data['refresh_token'] ?? null,
                'expires_at' => Carbon::now()->addSeconds($data['expires_in'] ?? 3600),
                'email' => $email,
            ]
        );
    }

    /**
     * Exchange callback code for Teams credentials.
     */
    public function exchangeTeamsToken(string $code, int $tenantId): TenantMeetingToken
    {
        $creds = self::getTeamsCredentials();
        $clientId = $creds['client_id'] ?: 'teams_client_id_dummy';
        $clientSecret = $creds['client_secret'] ?: 'teams_client_secret_dummy';
        $tenantIdAuth = $creds['tenant_id'] ?: 'common';
        $redirectUri = $creds['redirect_uri'];

        $response = Http::asForm()->post("https://login.microsoftonline.com/{$tenantIdAuth}/oauth2/v2.0/token", [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $redirectUri,
        ]);

        if (!$response->successful()) {
            throw new Exception("Teams token exchange failed: " . $response->body());
        }

        $data = $response->json();

        // Fetch User Info
        $userResponse = Http::withToken($data['access_token'])
            ->get('https://graph.microsoft.com/v1.0/me');
        $email = $userResponse->successful() ? ($userResponse->json('mail') ?? $userResponse->json('userPrincipalName')) : null;

        return TenantMeetingToken::updateOrCreate(
            ['tenant_id' => $tenantId, 'provider' => 'teams'],
            [
                'access_token' => $data['access_token'],
                'refresh_token' => $data['refresh_token'] ?? null,
                'expires_at' => Carbon::now()->addSeconds($data['expires_in'] ?? 3600),
                'email' => $email,
            ]
        );
    }

    /**
     * Create Zoom Meeting.
     */
    protected function createZoomMeeting(Appointment $appointment): ?string
    {
        try {
            $token = TenantMeetingToken::where('tenant_id', $appointment->tenant_id)
                ->where('provider', 'zoom')
                ->first();

            if (!$token) {
                Log::warning("Zoom not connected for tenant {$appointment->tenant_id}");
                return null;
            }

            $accessToken = $this->getZoomAccessToken($token);
            $durationMinutes = $appointment->bookingLink ? $appointment->bookingLink->duration : 30;

            $response = Http::withToken($accessToken)
                ->post('https://api.zoom.us/v2/users/me/meetings', [
                    'topic' => $appointment->bookingLink ? $appointment->bookingLink->name : 'WhatsOmni Appointment',
                    'type' => 2, // Scheduled Meeting
                    'start_time' => $appointment->start_time->toIso8601String(),
                    'duration' => $durationMinutes,
                    'timezone' => 'UTC',
                    'settings' => [
                        'host_video' => true,
                        'participant_video' => true,
                        'join_before_host' => true,
                        'waiting_room' => false,
                        'mute_upon_entry' => false,
                    ],
                ]);

            if ($response->successful()) {
                return $response->json('join_url');
            }

            Log::error("Zoom meeting creation failed: " . $response->body());
            return null;
        } catch (Exception $e) {
            Log::error("createZoomMeeting exception: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Create Microsoft Teams Meeting.
     */
    protected function createTeamsMeeting(Appointment $appointment): ?string
    {
        try {
            $token = TenantMeetingToken::where('tenant_id', $appointment->tenant_id)
                ->where('provider', 'teams')
                ->first();

            if (!$token) {
                Log::warning("Teams not connected for tenant {$appointment->tenant_id}");
                return null;
            }

            $accessToken = $this->getTeamsAccessToken($token);

            $startTime = $appointment->start_time;
            $durationMinutes = $appointment->bookingLink ? $appointment->bookingLink->duration : 30;
            $endTime = $appointment->end_time ?: $startTime->copy()->addMinutes($durationMinutes);

            $payload = [
                'startDateTime' => $startTime->toIso8601String(),
                'endDateTime' => $endTime->toIso8601String(),
                'subject' => $appointment->bookingLink ? $appointment->bookingLink->name : 'WhatsOmni Appointment',
            ];

            if ($appointment->contact && !empty($appointment->contact->email)) {
                $payload['participants'] = [
                    'attendees' => [
                        [
                            'emailAddress' => [
                                'address' => $appointment->contact->email,
                                'name' => trim("{$appointment->contact->first_name} {$appointment->contact->last_name}") ?: null,
                            ],
                            'role' => 'attendee',
                        ]
                    ]
                ];
            }

            $response = Http::withToken($accessToken)
                ->post('https://graph.microsoft.com/v1.0/me/onlineMeetings', $payload);

            if ($response->successful()) {
                return $response->json('joinWebUrl');
            }

            Log::error("Teams meeting creation failed: " . $response->body());
            return null;
        } catch (Exception $e) {
            Log::error("createTeamsMeeting exception: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Delete/Cancel a scheduled meeting from Zoom or Microsoft Teams.
     */
    public function deleteMeeting(Appointment $appointment): void
    {
        try {
            $meetLink = $appointment->meeting_link;
            if (empty($meetLink)) {
                return;
            }

            // 1. Zoom Meeting Cancellation
            if (str_contains($meetLink, 'zoom.us')) {
                if (preg_match('/\/j\/(\d+)/', $meetLink, $matches) || preg_match('/meetings\/(\d+)/', $meetLink, $matches)) {
                    $meetingId = $matches[1];
                    $token = TenantMeetingToken::where('tenant_id', $appointment->tenant_id)
                        ->where('provider', 'zoom')
                        ->first();
                    if ($token) {
                        $accessToken = $this->getZoomAccessToken($token);
                        $delRes = Http::withToken($accessToken)
                            ->delete("https://api.zoom.us/v2/meetings/{$meetingId}");
                        if (!$delRes->successful() && $delRes->status() !== 404) {
                            Log::warning("Zoom meeting deletion returned status {$delRes->status()}: " . $delRes->body());
                        }
                    }
                }
            }

            // 2. Microsoft Teams Meeting Cancellation
            if (str_contains($meetLink, 'teams.microsoft.com') || str_contains($meetLink, 'teams.live.com')) {
                $token = TenantMeetingToken::where('tenant_id', $appointment->tenant_id)
                    ->where('provider', 'teams')
                    ->first();
                if ($token) {
                    $accessToken = $this->getTeamsAccessToken($token);
                    if (preg_match('/\/meet\/([a-zA-Z0-9_\-]+)/', $meetLink, $matches)) {
                        $meetingId = $matches[1];
                        Http::withToken($accessToken)
                            ->delete("https://graph.microsoft.com/v1.0/me/onlineMeetings/{$meetingId}");
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::error("Failed to delete meeting on appointment cancellation: " . $e->getMessage());
        }
    }

    /**
     * Ensure valid Zoom access token.
     */
    protected function getZoomAccessToken(TenantMeetingToken $token): string
    {
        if (!$token->isExpired()) {
            return $token->decrypted_access_token;
        }

        $creds = self::getZoomCredentials();
        $clientId = $creds['client_id'] ?: 'zoom_client_id_dummy';
        $clientSecret = $creds['client_secret'] ?: 'zoom_client_secret_dummy';

        $response = Http::asForm()
            ->withBasicAuth($clientId, $clientSecret)
            ->post('https://zoom.us/oauth/token', [
                'grant_type' => 'refresh_token',
                'refresh_token' => $token->decrypted_refresh_token,
            ]);

        if ($response->successful()) {
            $data = $response->json();
            $token->update([
                'access_token' => $data['access_token'],
                'refresh_token' => $data['refresh_token'] ?? $token->decrypted_refresh_token,
                'expires_at' => Carbon::now()->addSeconds($data['expires_in'] ?? 3600),
            ]);
            return $data['access_token'];
        }

        throw new Exception("Zoom refresh token failed: " . $response->body());
    }

    /**
     * Ensure valid Teams access token.
     */
    protected function getTeamsAccessToken(TenantMeetingToken $token): string
    {
        if (!$token->isExpired()) {
            return $token->decrypted_access_token;
        }

        $creds = self::getTeamsCredentials();
        $clientId = $creds['client_id'] ?: 'teams_client_id_dummy';
        $clientSecret = $creds['client_secret'] ?: 'teams_client_secret_dummy';
        $tenantIdAuth = $creds['tenant_id'] ?: 'common';

        $response = Http::asForm()
            ->post("https://login.microsoftonline.com/{$tenantIdAuth}/oauth2/v2.0/token", [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'grant_type' => 'refresh_token',
                'refresh_token' => $token->decrypted_refresh_token,
            ]);

        if ($response->successful()) {
            $data = $response->json();
            $token->update([
                'access_token' => $data['access_token'],
                'refresh_token' => $data['refresh_token'] ?? $token->decrypted_refresh_token,
                'expires_at' => Carbon::now()->addSeconds($data['expires_in'] ?? 3600),
            ]);
            return $data['access_token'];
        }

        throw new Exception("Teams refresh token failed: " . $response->body());
    }
}
