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

class SalesforceDriver implements CrmServiceInterface
{
    protected function getCredentials(): array
    {
        $config = PlatformSetting::getSetting('salesforce_app_config') ?: [];
        return [
            'client_id' => !empty($config['client_id']) ? $config['client_id'] : (getenv('SALESFORCE_CLIENT_ID') ?: (string) env('SALESFORCE_CLIENT_ID', '')),
            'client_secret' => !empty($config['client_secret']) ? $config['client_secret'] : (getenv('SALESFORCE_CLIENT_SECRET') ?: (string) env('SALESFORCE_CLIENT_SECRET', '')),
        ];
    }

    protected function getRedirectUri(): string
    {
        $config = PlatformSetting::getSetting('salesforce_app_config') ?: [];
        return !empty($config['redirect_uri']) 
            ? $config['redirect_uri'] 
            : (\App\Providers\AppServiceProvider::getBackendUrl() . '/api/integrations/crm/callback/salesforce');
    }

    public function getAuthUrl(int $tenantId): string
    {
        $creds = $this->getCredentials();
        $clientId = $creds['client_id'];
        if (empty($clientId)) {
            throw new Exception("Salesforce Integration is not configured. Please define Salesforce credentials in Superadmin Integrations settings.");
        }

        $redirectUri = $this->getRedirectUri();

        $config = PlatformSetting::getSetting('salesforce_app_config') ?: [];
        $loginUrl = !empty($config['is_sandbox']) ? 'https://test.salesforce.com' : 'https://login.salesforce.com';
        $state = \App\Services\Security\OAuthStateService::generateState($tenantId, 1, 'salesforce');

        return "{$loginUrl}/services/oauth2/authorize?" . http_build_query([
            'response_type' => 'code',
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'scope' => 'api refresh_token offline_access',
            'state' => $state
        ]);
    }

    public function handleCallback(string $code, int $tenantId): CrmIntegration
    {
        $creds = $this->getCredentials();
        $clientId = $creds['client_id'];
        $clientSecret = $creds['client_secret'];

        if (empty($clientId) || empty($clientSecret)) {
            throw new Exception("Salesforce credentials are not configured. Please define Salesforce credentials in Superadmin Integrations settings.");
        }

        $redirectUri = $this->getRedirectUri();
        $config = PlatformSetting::getSetting('salesforce_app_config') ?: [];
        $loginUrl = !empty($config['is_sandbox']) ? 'https://test.salesforce.com' : 'https://login.salesforce.com';

        $response = Http::asForm()->post("{$loginUrl}/services/oauth2/token", [
            'grant_type' => 'authorization_code',
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri,
            'code' => $code
        ]);

        if (!$response->successful()) {
            throw new Exception("Salesforce OAuth exchange failed: " . $response->body());
        }

        $data = $response->json();
        
        return CrmIntegration::updateOrCreate(
            ['tenant_id' => $tenantId, 'provider' => 'salesforce'],
            [
                'access_token' => $data['access_token'],
                'refresh_token' => $data['refresh_token'] ?? null,
                'expires_at' => Carbon::now()->addHour(),
                'email' => 'connected_user@salesforce.com',
                'field_mapping' => $this->getDefaultMapping(),
                'sync_direction' => 'bidirectional',
                'last_sync_at' => Carbon::now(),
                'metadata' => [
                    'instance_url' => $data['instance_url'] ?? 'https://login.salesforce.com'
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
            throw new Exception("Unable to refresh Salesforce token: credentials or refresh token missing.");
        }

        $response = Http::asForm()->post("https://login.salesforce.com/services/oauth2/token", [
            'grant_type' => 'refresh_token',
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'refresh_token' => $integration->refresh_token
        ]);

        if (!$response->successful()) {
            throw new Exception("Salesforce token refresh failed: " . $response->body());
        }

        $data = $response->json();
        $integration->update([
            'access_token' => $data['access_token'],
            'expires_at' => Carbon::now()->addHour(),
        ]);

        return $data['access_token'];
    }

    public function pushContact(Contact $contact, CrmIntegration $integration): CrmSyncLog
    {
        $accessToken = $this->refreshAccessToken($integration);
        $mapping = $integration->field_mapping ?? $this->getDefaultMapping();
        $metadata = $integration->metadata ?? [];
        $instanceUrl = $metadata['instance_url'] ?? 'https://login.salesforce.com';

        $lastLog = CrmSyncLog::where('crm_integration_id', $integration->id)
            ->where('contact_id', $contact->id)
            ->where('status', 'success')
            ->whereNotNull('external_id')
            ->first();

        $externalId = $lastLog ? $lastLog->external_id : null;

        $properties = [];
        foreach ($mapping as $whatsOmniKey => $salesforceKey) {
            if ($whatsOmniKey === 'tags') continue;
            $val = $contact->{$whatsOmniKey};
            if ($val !== null) {
                $properties[$salesforceKey] = $val;
            }
        }

        // Salesforce Contact sObject strictly mandates LastName
        if (empty($properties['LastName'])) {
            $properties['LastName'] = !empty($contact->first_name)
                ? $contact->first_name
                : (!empty($contact->phone) ? $contact->phone : '[Unknown]');
        }

        try {
            if ($externalId) {
                $response = Http::withToken($accessToken)
                    ->patch("{$instanceUrl}/services/data/v57.0/sobjects/Contact/{$externalId}", $properties);
            } else {
                $response = Http::withToken($accessToken)
                    ->post("{$instanceUrl}/services/data/v57.0/sobjects/Contact", $properties);
            }

            if (!$response->successful()) {
                throw new Exception("Salesforce API push failed: " . $response->body());
            }

            if (!$externalId) {
                $responseData = $response->json();
                $externalId = $responseData['id'] ?? null;
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
                'description' => "Synced contact payload to Salesforce successfully (External ID: {$externalId})."
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
        $instanceUrl = $metadata['instance_url'] ?? 'https://login.salesforce.com';

        try {
            $fields = array_values($mapping);
            if (!in_array('Id', $fields)) {
                $fields[] = 'Id';
            }
            $soql = "SELECT " . implode(',', $fields) . " FROM Contact LIMIT 100";
            $response = Http::withToken($accessToken)
                ->get("{$instanceUrl}/services/data/v57.0/query", [
                    'q' => $soql
                ]);

            if (!$response->successful()) {
                throw new Exception("Salesforce API pull failed: " . $response->body());
            }

            $pulledContacts = $response->json('records') ?? [];
            $nextUrl = $response->json('nextRecordsUrl');
            $maxPages = 5;
            $pages = 0;

            while ($nextUrl && $pages < $maxPages) {
                $nextRes = Http::withToken($accessToken)->get("{$instanceUrl}{$nextUrl}");
                if ($nextRes->successful()) {
                    $nextRecords = $nextRes->json('records') ?? [];
                    $pulledContacts = array_merge($pulledContacts, $nextRecords);
                    $nextUrl = $nextRes->json('nextRecordsUrl');
                    $pages++;
                } else {
                    break;
                }
            }

            $importedCount = 0;
            $mergedCount = 0;

            \App\Observers\ContactObserver::$bypass = true;
            try {
                foreach ($pulledContacts as $sfContact) {
                    $sfId = $sfContact['Id'];

                    $contactData = [];
                    foreach ($mapping as $whatsOmniKey => $salesforceKey) {
                        if ($whatsOmniKey === 'tags') continue;
                        $contactData[$whatsOmniKey] = $sfContact[$salesforceKey] ?? null;
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
                        'external_id' => $sfId,
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
            'first_name' => 'FirstName',
            'last_name' => 'LastName',
            'email' => 'Email',
            'phone' => 'Phone',
            'lifecycle_stage' => 'LeadSource'
        ];
    }
}
