<?php

namespace App\Services;

use App\Models\PlatformSetting;
use App\Models\TenantGoogleToken;
use Google\Client as GoogleClient;
use Google\Service\Drive as GoogleDriveService;
use Google\Service\Sheets as GoogleSheetsApi;
use Google\Service\Oauth2 as GoogleOauth2;
use Exception;
use Illuminate\Support\Carbon;

class GoogleSheetsService
{
    /**
     * Get configured Google Client instance.
     */
    public function getClient(TenantGoogleToken $tokenModel = null, string $type = 'sheets'): GoogleClient
    {
        if (!$this->isConfigured()) {
            throw new Exception("Google API client is not configured. Please define Google credentials in Superadmin Integrations settings.");
        }

        $config = PlatformSetting::getSetting('google_app_config') ?: [];
        $redirectUri = !empty($config['redirect_uri']) ? $config['redirect_uri'] : (\App\Providers\AppServiceProvider::getBackendUrl() . '/api/integrations/google/callback');

        $client = new GoogleClient();
        $client->setClientId($config['client_id'] ?? '');
        $client->setClientSecret($config['client_secret'] ?? '');
        $client->setRedirectUri($redirectUri);
        
        $client->addScope('https://www.googleapis.com/auth/userinfo.email');

        if ($type === 'calendar') {
            $client->addScope(\Google\Service\Calendar::CALENDAR);
        } else {
            $client->addScope(GoogleSheetsApi::SPREADSHEETS);
            $client->addScope(GoogleDriveService::DRIVE_METADATA_READONLY);
        }
        
        $client->setAccessType('offline');
        $client->setPrompt('consent');

        if ($tokenModel) {
            $client->setAccessToken([
                'access_token' => $tokenModel->decrypted_access_token,
                'refresh_token' => $tokenModel->decrypted_refresh_token,
                'expires_in' => max(0, $tokenModel->expires_at->timestamp - time()),
                'created' => $tokenModel->created_at->timestamp,
            ]);

            if ($client->isAccessTokenExpired()) {
                $refreshToken = $tokenModel->decrypted_refresh_token;
                if ($refreshToken) {
                    $newTokens = $client->fetchAccessTokenWithRefreshToken($refreshToken);
                    if (isset($newTokens['access_token'])) {
                        $updateData = [
                            'access_token' => $newTokens['access_token'],
                            'expires_at' => Carbon::now()->addSeconds($newTokens['expires_in'] ?? 3600),
                        ];
                        if (!empty($newTokens['refresh_token'])) {
                            $updateData['refresh_token'] = $newTokens['refresh_token'];
                        }
                        $tokenModel->update($updateData);
                    }
                }
            }
        }

        return $client;
    }

    /**
     * Check if Google OAuth credentials are configured.
     */
    public function isConfigured(): bool
    {
        $config = PlatformSetting::getSetting('google_app_config') ?: [];
        return !empty($config['client_id']) && !empty($config['client_secret']);
    }

    /**
     * Get OAuth Redirect URL.
     */
    public function getAuthUrl(int $tenantId, string $type = 'sheets', ?int $userId = null): string
    {
        $client = $this->getClient(null, $type);
        $state = \App\Services\Security\OAuthStateService::generateState($tenantId, $userId ?: 1, 'google', ['type' => $type]);
        $client->setState($state);
        return $client->createAuthUrl();
    }

    /**
     * Exchange code and persist tokens.
     */
    public function handleCallback(string $code, int $tenantId, string $type = 'sheets'): TenantGoogleToken
    {
        $client = $this->getClient(null, $type);
        $payload = $client->fetchAccessTokenWithAuthCode($code);

        if (isset($payload['error'])) {
            throw new Exception("Google OAuth Error: " . ($payload['error_description'] ?? $payload['error']));
        }

        $accessToken = $payload['access_token'];
        $refreshToken = $payload['refresh_token'] ?? null;
        $expiresIn = $payload['expires_in'] ?? 3600;

        // Fetch User Info to save email reference
        $oauth2 = new GoogleOauth2($client);
        $userInfo = $oauth2->userinfo->get();
        $email = $userInfo->getEmail();

        $tokenData = [
            'type' => $type,
            'access_token' => $accessToken,
            'expires_at' => Carbon::now()->addSeconds($expiresIn),
            'email' => $email,
        ];

        if ($refreshToken) {
            $tokenData['refresh_token'] = $refreshToken;
        }

        return TenantGoogleToken::updateOrCreate(
            ['tenant_id' => $tenantId, 'type' => $type],
            $tokenData
        );
    }

    /**
     * List user's spreadsheets from Google Drive.
     */
    public function listSpreadsheets(int $tenantId): array
    {
        $token = TenantGoogleToken::where('tenant_id', $tenantId)->where('type', 'sheets')->first();
        if (!$token) {
            throw new Exception("Google Account not connected.");
        }

        $client = $this->getClient($token, 'sheets');
        $drive = new GoogleDriveService($client);

        $files = [];
        $pageToken = null;

        do {
            $params = [
                'q' => "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
                'fields' => 'nextPageToken, files(id, name)',
                'pageSize' => 100,
            ];
            if ($pageToken) {
                $params['pageToken'] = $pageToken;
            }

            $response = $drive->files->listFiles($params);
            foreach ($response->getFiles() as $file) {
                $files[] = [
                    'id' => $file->getId(),
                    'name' => $file->getName(),
                ];
            }
            $pageToken = $response->getNextPageToken();
        } while ($pageToken && count($files) < 300);

        return $files;
    }

    /**
     * List tabs/sheets inside a spreadsheet.
     */
    public function listSheets(int $tenantId, string $spreadsheetId): array
    {
        $token = TenantGoogleToken::where('tenant_id', $tenantId)->where('type', 'sheets')->first();
        if (!$token) {
            throw new Exception("Google Account not connected.");
        }

        $client = $this->getClient($token, 'sheets');
        $service = new GoogleSheetsApi($client);

        $spreadsheet = $service->spreadsheets->get($spreadsheetId);
        $sheets = [];
        foreach ($spreadsheet->getSheets() as $sheet) {
            $sheets[] = $sheet->getProperties()->getTitle();
        }

        return $sheets;
    }

    /**
     * Helper to safely format sheet range in A1 notation.
     */
    public static function formatSheetRange(string $sheetName, string $cellRange = 'A:ZZ'): string
    {
        $escapedTitle = str_replace("'", "''", $sheetName);
        return "'{$escapedTitle}'!{$cellRange}";
    }

    /**
     * Get rows from a sheet.
     */
    public function getSheetData(int $tenantId, string $spreadsheetId, string $sheetName): array
    {
        $token = TenantGoogleToken::where('tenant_id', $tenantId)->where('type', 'sheets')->first();
        if (!$token) {
            throw new Exception("Google Account not connected.");
        }

        $client = $this->getClient($token, 'sheets');
        $service = new GoogleSheetsApi($client);

        $range = self::formatSheetRange($sheetName, 'A:ZZ');
        $response = $service->spreadsheets_values->get($spreadsheetId, $range);
        
        return $response->getValues() ?: [];
    }

    /**
     * Append row(s) to a Google Sheet tab.
     */
    public function appendRows(int $tenantId, string $spreadsheetId, string $sheetName, array $rows): array
    {
        $token = TenantGoogleToken::where('tenant_id', $tenantId)->where('type', 'sheets')->first();
        if (!$token) {
            throw new Exception("Google Account not connected.");
        }

        $client = $this->getClient($token, 'sheets');
        $service = new GoogleSheetsApi($client);

        $range = self::formatSheetRange($sheetName, 'A:ZZ');
        $body = new \Google\Service\Sheets\ValueRange([
            'values' => $rows
        ]);
        $params = ['valueInputOption' => 'USER_ENTERED'];

        $result = $service->spreadsheets_values->append($spreadsheetId, $range, $body, $params);
        return [
            'updatedRange' => $result->getUpdates()?->getUpdatedRange(),
            'updatedRows' => $result->getUpdates()?->getUpdatedRows(),
        ];
    }
}
