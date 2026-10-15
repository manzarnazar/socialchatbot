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

class HubSpotDriver implements CrmServiceInterface
{
    protected function getCredentials(): array
    {
        $config = PlatformSetting::getSetting('hubspot_app_config') ?: [];
        return [
            'client_id' => !empty($config['client_id']) ? $config['client_id'] : (getenv('HUBSPOT_CLIENT_ID') ?: (string) env('HUBSPOT_CLIENT_ID', '')),
            'client_secret' => !empty($config['client_secret']) ? $config['client_secret'] : (getenv('HUBSPOT_CLIENT_SECRET') ?: (string) env('HUBSPOT_CLIENT_SECRET', '')),
        ];
    }

    protected function getRedirectUri(): string
    {
        $config = PlatformSetting::getSetting('hubspot_app_config') ?: [];
        return !empty($config['redirect_uri']) 
            ? $config['redirect_uri'] 
            : (\App\Providers\AppServiceProvider::getBackendUrl() . '/api/integrations/crm/callback/hubspot');
    }

    public function getAuthUrl(int $tenantId): string
    {
        $creds = $this->getCredentials();
        $clientId = $creds['client_id'];
        if (empty($clientId)) {
            throw new Exception("HubSpot Integration is not configured. Please define HubSpot credentials in Superadmin Integrations settings.");
        }

        $redirectUri = $this->getRedirectUri();
        $scopes = 'crm.objects.contacts.read crm.objects.contacts.write';

        $state = \App\Services\Security\OAuthStateService::generateState($tenantId, 1, 'hubspot');

        return "https://app.hubspot.com/oauth/authorize?" . http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'scope' => $scopes,
            'state' => $state
        ]);
    }

    public function handleCallback(string $code, int $tenantId): CrmIntegration
    {
        $creds = $this->getCredentials();
        $clientId = $creds['client_id'];
        $clientSecret = $creds['client_secret'];

        if (empty($clientId) || empty($clientSecret)) {
            throw new Exception("HubSpot client credentials are not configured. Please define HubSpot credentials in Superadmin Integrations settings.");
        }

        $redirectUri = $this->getRedirectUri();

        $response = Http::asForm()->post("https://api.hubapi.com/oauth/v1/token", [
            'grant_type' => 'authorization_code',
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri,
            'code' => $code
        ]);

        if (!$response->successful()) {
            throw new Exception("HubSpot OAuth token exchange failed: " . ($response->json('message') ?: $response->body()));
        }

        $data = $response->json();
        $accessToken = $data['access_token'];
        $email = 'connected_user@hubspot.com';
        $hubId = null;

        try {
            $infoRes = Http::get("https://api.hubapi.com/oauth/v1/access-tokens/{$accessToken}");
            if ($infoRes->successful()) {
                $info = $infoRes->json();
                $email = $info['user'] ?? $email;
                $hubId = $info['hub_id'] ?? null;
            }
        } catch (\Throwable $e) {
            // Silently fallback if info endpoint unavailable
        }

        return CrmIntegration::updateOrCreate(
            ['tenant_id' => $tenantId, 'provider' => 'hubspot'],
            [
                'access_token' => $accessToken,
                'refresh_token' => $data['refresh_token'] ?? null,
                'expires_at' => Carbon::now()->addSeconds($data['expires_in'] ?? 3600),
                'email' => $email,
                'field_mapping' => $this->getDefaultMapping(),
                'sync_direction' => 'bidirectional',
                'last_sync_at' => Carbon::now(),
                'metadata' => array_filter([
                    'hub_id' => $hubId,
                ]),
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
            throw new Exception("Unable to refresh HubSpot token: credentials or refresh token missing.");
        }

        $response = Http::asForm()->post("https://api.hubapi.com/oauth/v1/token", [
            'grant_type' => 'refresh_token',
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'refresh_token' => $integration->refresh_token
        ]);

        if (!$response->successful()) {
            throw new Exception("HubSpot OAuth token refresh failed: " . $response->body());
        }

        $data = $response->json();
        $integration->update([
            'access_token' => $data['access_token'],
            'refresh_token' => $data['refresh_token'] ?? $integration->refresh_token,
            'expires_at' => Carbon::now()->addSeconds($data['expires_in'] ?? 3600),
        ]);

        return $data['access_token'];
    }

    public function pushContact(Contact $contact, CrmIntegration $integration): CrmSyncLog
    {
        $accessToken = $this->refreshAccessToken($integration);
        $mapping = $integration->field_mapping ?? $this->getDefaultMapping();

        $lastLog = CrmSyncLog::where('crm_integration_id', $integration->id)
            ->where('contact_id', $contact->id)
            ->where('status', 'success')
            ->whereNotNull('external_id')
            ->first();

        $externalId = $lastLog ? $lastLog->external_id : null;

        $properties = [];
        foreach ($mapping as $whatsOmniKey => $hubSpotKey) {
            if ($whatsOmniKey === 'tags') continue;
            $val = $contact->{$whatsOmniKey};
            if ($val !== null) {
                $properties[$hubSpotKey] = $val;
            }
        }

        try {
            if ($externalId) {
                $response = Http::withToken($accessToken)
                    ->patch("https://api.hubapi.com/crm/v3/objects/contacts/{$externalId}", [
                        'properties' => $properties
                    ]);
            } else {
                $response = Http::withToken($accessToken)
                    ->post("https://api.hubapi.com/crm/v3/objects/contacts", [
                        'properties' => $properties
                    ]);

                // Handle 409 Conflict if contact already exists in HubSpot
                if ($response->status() === 409) {
                    $body = $response->body();
                    $existingId = null;
                    if (preg_match('/Existing ID:\s*(\d+)/i', $body, $matches)) {
                        $existingId = $matches[1];
                    } elseif ($response->json('id')) {
                        $existingId = $response->json('id');
                    }
                    if ($existingId) {
                        $response = Http::withToken($accessToken)
                            ->patch("https://api.hubapi.com/crm/v3/objects/contacts/{$existingId}", [
                                'properties' => $properties
                            ]);
                        $externalId = $existingId;
                    }
                }
            }

            if (!$response->successful()) {
                throw new Exception("HubSpot API push failed: " . ($response->json('message') ?: $response->body()));
            }

            $responseData = $response->json();
            $externalId = $responseData['id'] ?? $externalId;

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
                'description' => "Synced contact payload to HubSpot successfully (External ID: {$externalId})."
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

        try {
            $pulledContacts = [];
            $after = null;
            $maxPages = 10;
            $page = 0;

            do {
                $params = [
                    'limit' => 100,
                    'properties' => implode(',', array_values($mapping))
                ];
                if ($after) {
                    $params['after'] = $after;
                }

                $response = Http::withToken($accessToken)
                    ->get("https://api.hubapi.com/crm/v3/objects/contacts", $params);

                if (!$response->successful()) {
                    throw new Exception("HubSpot API pull failed: " . $response->body());
                }

                $results = $response->json('results') ?? [];
                $pulledContacts = array_merge($pulledContacts, $results);

                $after = $response->json('paging.next.after');
                $page++;
            } while ($after && $page < $maxPages);

            $importedCount = 0;
            $mergedCount = 0;

            \App\Observers\ContactObserver::$bypass = true;
            try {
                foreach ($pulledContacts as $hsContact) {
                    $hsId = $hsContact['id'];
                    $props = $hsContact['properties'];

                    $contactData = [];
                    foreach ($mapping as $whatsOmniKey => $hubSpotKey) {
                        if ($whatsOmniKey === 'tags') continue;
                        $contactData[$whatsOmniKey] = $props[$hubSpotKey] ?? null;
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
                        'external_id' => $hsId,
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
            'first_name' => 'firstname',
            'last_name' => 'lastname',
            'email' => 'email',
            'phone' => 'phone',
            'lifecycle_stage' => 'lifecyclestage'
        ];
    }
}
