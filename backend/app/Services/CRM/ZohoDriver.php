<?php

namespace App\Services\CRM;

use App\Models\Contact;
use App\Models\ContactActivity;
use App\Models\CrmIntegration;
use App\Models\CrmSyncLog;
use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Exception;

class ZohoDriver implements CrmServiceInterface
{
    protected function getCredentials(): array
    {
        $config = PlatformSetting::getSetting('zoho_app_config') ?: [];
        return [
            'client_id' => !empty($config['client_id']) ? $config['client_id'] : (getenv('ZOHO_CLIENT_ID') ?: (string) env('ZOHO_CLIENT_ID', '')),
            'client_secret' => !empty($config['client_secret']) ? $config['client_secret'] : (getenv('ZOHO_CLIENT_SECRET') ?: (string) env('ZOHO_CLIENT_SECRET', '')),
        ];
    }

    public function getAccountsServer(?string $location = null, ?string $server = null): string
    {
        if ($server && str_starts_with($server, 'https://accounts.zoho.')) {
            return rtrim($server, '/');
        }
        $loc = strtolower(trim($location ?? ''));
        return match ($loc) {
            'eu' => 'https://accounts.zoho.eu',
            'in' => 'https://accounts.zoho.in',
            'au', 'com.au' => 'https://accounts.zoho.com.au',
            'jp' => 'https://accounts.zoho.jp',
            'ca' => 'https://accounts.zoho.ca',
            default => 'https://accounts.zoho.com',
        };
    }

    protected function getRedirectUri(): string
    {
        $config = PlatformSetting::getSetting('zoho_app_config') ?: [];
        return !empty($config['redirect_uri']) 
            ? $config['redirect_uri'] 
            : (\App\Providers\AppServiceProvider::getBackendUrl() . '/api/integrations/crm/callback/zoho');
    }

    public function getAuthUrl(int $tenantId): string
    {
        $creds = $this->getCredentials();
        $clientId = $creds['client_id'];
        if (empty($clientId)) {
            throw new Exception("Zoho Integration is not configured. Please define Zoho credentials in Superadmin Integrations settings.");
        }

        $redirectUri = $this->getRedirectUri();
        $config = PlatformSetting::getSetting('zoho_app_config') ?: [];
        $accountsServer = $this->getAccountsServer($config['data_center'] ?? null, $config['accounts_server'] ?? null);

        $state = \App\Services\Security\OAuthStateService::generateState($tenantId, 1, 'zoho');

        return "{$accountsServer}/oauth/v2/auth?" . http_build_query([
            'response_type' => 'code',
            'client_id' => $clientId,
            'scope' => 'ZohoCRM.modules.contacts.ALL',
            'redirect_uri' => $redirectUri,
            'state' => $state,
            'access_type' => 'offline',
            'prompt' => 'consent'
        ]);
    }

    public function handleCallback(string $code, int $tenantId): CrmIntegration
    {
        $creds = $this->getCredentials();
        $clientId = $creds['client_id'];
        $clientSecret = $creds['client_secret'];

        if (empty($clientId) || empty($clientSecret)) {
            throw new Exception("Zoho credentials are not configured. Please define Zoho credentials in Superadmin Integrations settings.");
        }

        $redirectUri = $this->getRedirectUri();

        $req = request();
        $config = PlatformSetting::getSetting('zoho_app_config') ?: [];
        $accountsServer = $this->getAccountsServer(
            $req?->query('location') ?? ($config['data_center'] ?? null),
            $req?->query('accounts-server') ?? ($config['accounts_server'] ?? null)
        );

        $response = Http::asForm()->post("{$accountsServer}/oauth/v2/token", [
            'grant_type' => 'authorization_code',
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri,
            'code' => $code
        ]);

        if (!$response->successful()) {
            throw new Exception("Zoho OAuth exchange failed: " . $response->body());
        }

        $data = $response->json();
        
        return CrmIntegration::updateOrCreate(
            ['tenant_id' => $tenantId, 'provider' => 'zoho'],
            [
                'access_token' => $data['access_token'],
                'refresh_token' => $data['refresh_token'] ?? null,
                'expires_at' => Carbon::now()->addSeconds($data['expires_in'] ?? 3600),
                'email' => 'connected_user@zoho.com',
                'field_mapping' => $this->getDefaultMapping(),
                'sync_direction' => 'bidirectional',
                'last_sync_at' => Carbon::now(),
                'metadata' => [
                    'api_domain' => $data['api_domain'] ?? 'https://www.zohoapis.com',
                    'accounts_server' => $accountsServer,
                ]
            ]
        );
    }

    public function refreshAccessToken(CrmIntegration $integration): string
    {
        if ($integration->expires_at && $integration->expires_at->isFuture()) {
            return $integration->access_token;
        }

        $creds = $this->getCredentials();
        $clientId = $creds['client_id'];
        $clientSecret = $creds['client_secret'];

        if (empty($clientId) || empty($clientSecret) || empty($integration->refresh_token)) {
            throw new Exception("Unable to refresh Zoho token: credentials or refresh token missing.");
        }

        $metadata = $integration->metadata ?? [];
        $accountsServer = $metadata['accounts_server'] ?? 'https://accounts.zoho.com';

        $response = Http::asForm()->post("{$accountsServer}/oauth/v2/token", [
            'grant_type' => 'refresh_token',
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'refresh_token' => $integration->refresh_token
        ]);

        if (!$response->successful()) {
            throw new Exception("Zoho token refresh failed: " . $response->body());
        }

        $data = $response->json();
        $integration->update([
            'access_token' => $data['access_token'],
            'expires_at' => Carbon::now()->addSeconds($data['expires_in'] ?? 3600),
        ]);

        return $data['access_token'];
    }

    public function pushContact(Contact $contact, CrmIntegration $integration): CrmSyncLog
    {
        $accessToken = $this->refreshAccessToken($integration);
        $mapping = $integration->field_mapping ?? $this->getDefaultMapping();
        $metadata = $integration->metadata ?? [];
        $apiDomain = $metadata['api_domain'] ?? 'https://www.zohoapis.com';

        $lastLog = CrmSyncLog::where('crm_integration_id', $integration->id)
            ->where('contact_id', $contact->id)
            ->where('status', 'success')
            ->whereNotNull('external_id')
            ->first();

        $externalId = $lastLog ? $lastLog->external_id : null;

        $properties = [];
        foreach ($mapping as $whatsOmniKey => $zohoKey) {
            if ($whatsOmniKey === 'tags') continue;
            $val = $contact->{$whatsOmniKey};
            if ($val !== null) {
                $properties[$zohoKey] = $val;
            }
        }

        // Zoho CRM strictly requires Last_Name for standard Contacts module
        if (empty($properties['Last_Name'])) {
            $properties['Last_Name'] = !empty($contact->first_name)
                ? $contact->first_name
                : (!empty($contact->phone) ? $contact->phone : '[Unknown]');
        }

        $apiVersion = $metadata['api_version'] ?? 'v3';

        try {
            if ($externalId) {
                $response = Http::withHeaders([
                    'Authorization' => "Zoho-oauthtoken {$accessToken}"
                ])->put("{$apiDomain}/crm/{$apiVersion}/Contacts/{$externalId}", [
                    'data' => [$properties]
                ]);
            } else {
                $response = Http::withHeaders([
                    'Authorization' => "Zoho-oauthtoken {$accessToken}"
                ])->post("{$apiDomain}/crm/{$apiVersion}/Contacts", [
                    'data' => [$properties]
                ]);
            }

            if (!$response->successful()) {
                throw new Exception("Zoho API push failed: " . $response->body());
            }

            $responseData = $response->json();
            $results = $responseData['data'] ?? [];
            if (!empty($results) && isset($results[0]['details']['id'])) {
                $externalId = $results[0]['details']['id'];
            }

            $log = CrmSyncLog::create([
                'tenant_id' => $contact->tenant_id,
                'crm_integration_id' => $integration->id,
                'contact_id' => $contact->id,
                'external_id' => $externalId,
                'action' => 'push',
                'status' => 'success'
            ]);

            ContactActivity::create([
                'tenant_id' => $contact->tenant_id,
                'contact_id' => $contact->id,
                'activity_type' => 'crm_sync',
                'description' => "Synced contact payload to Zoho successfully (External ID: {$externalId})."
            ]);

            return $log;
        } catch (Exception $e) {
            $log = CrmSyncLog::create([
                'tenant_id' => $contact->tenant_id,
                'crm_integration_id' => $integration->id,
                'contact_id' => $contact->id,
                'external_id' => $externalId,
                'action' => 'push',
                'status' => 'failed',
                'error_message' => $e->getMessage()
            ]);

            return $log;
        }
    }

    public function pullContacts(CrmIntegration $integration, string $duplicateStrategy = 'merge'): array
    {
        $accessToken = $this->refreshAccessToken($integration);
        $mapping = $integration->field_mapping ?? $this->getDefaultMapping();
        $metadata = $integration->metadata ?? [];
        $apiDomain = $metadata['api_domain'] ?? 'https://www.zohoapis.com';
        $apiVersion = $metadata['api_version'] ?? 'v3';

        try {
            $pulledContacts = [];
            $page = 1;
            $moreRecords = true;
            $maxPages = 5;

            while ($moreRecords && $page <= $maxPages) {
                $response = Http::withHeaders([
                    'Authorization' => "Zoho-oauthtoken {$accessToken}"
                ])->get("{$apiDomain}/crm/{$apiVersion}/Contacts", [
                    'page' => $page,
                    'per_page' => 100,
                ]);

                if (!$response->successful()) {
                    throw new Exception("Zoho API pull failed: " . $response->body());
                }

                $pageData = $response->json('data') ?? [];
                $pulledContacts = array_merge($pulledContacts, $pageData);

                $info = $response->json('info') ?? [];
                $moreRecords = !empty($info['more_records']);
                $page++;
            }

            $importedCount = 0;
            $mergedCount = 0;

            \App\Observers\ContactObserver::$bypass = true;
            try {
                foreach ($pulledContacts as $zhContact) {
                    $zhId = $zhContact['id'];

                    $contactData = [];
                    foreach ($mapping as $whatsOmniKey => $zohoKey) {
                        if ($whatsOmniKey === 'tags') continue;
                        $contactData[$whatsOmniKey] = $zhContact[$zohoKey] ?? null;
                    }

                    $existingContact = null;
                    if (!empty($contactData['email'])) {
                        $existingContact = Contact::where('tenant_id', $integration->tenant_id)
                            ->where('email', $contactData['email'])
                            ->first();
                    }
                    if (!$existingContact && !empty($contactData['phone'])) {
                        $existingContact = Contact::where('tenant_id', $integration->tenant_id)
                            ->where('phone', $contactData['phone'])
                            ->first();
                    }

                    if ($existingContact && $duplicateStrategy === 'merge') {
                        $toUpdate = [];
                        foreach ($contactData as $k => $v) {
                            if (empty($existingContact->{$k}) && !empty($v)) {
                                $toUpdate[$k] = $v;
                            }
                        }
                        if (!empty($toUpdate)) {
                            $existingContact->update($toUpdate);
                        }
                        $contact = $existingContact;
                        $mergedCount++;
                    } else {
                        $contact = Contact::create(array_merge($contactData, [
                            'tenant_id' => $integration->tenant_id,
                            'lifecycle_stage' => $contactData['lifecycle_stage'] ?? 'lead'
                        ]));
                        $importedCount++;
                    }

                    CrmSyncLog::create([
                        'tenant_id' => $integration->tenant_id,
                        'crm_integration_id' => $integration->id,
                        'contact_id' => $contact->id,
                        'external_id' => $zhId,
                        'action' => 'pull',
                        'status' => 'success'
                    ]);
                }
            } finally {
                \App\Observers\ContactObserver::$bypass = false;
            }

            $integration->update(['last_sync_at' => Carbon::now()]);

            return [
                'success' => true,
                'imported' => $importedCount,
                'merged' => $mergedCount
            ];

        } catch (Exception $e) {
            CrmSyncLog::create([
                'tenant_id' => $integration->tenant_id,
                'crm_integration_id' => $integration->id,
                'action' => 'pull',
                'status' => 'failed',
                'error_message' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    public function getDefaultMapping(): array
    {
        return [
            'first_name' => 'First_Name',
            'last_name' => 'Last_Name',
            'email' => 'Email',
            'phone' => 'Phone',
            'lifecycle_stage' => 'Lead_Source'
        ];
    }
}
