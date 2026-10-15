<?php

namespace App\Services\CRM;

use App\Models\Contact;
use App\Models\CrmIntegration;
use App\Models\CrmSyncLog;

interface CrmServiceInterface
{
    /**
     * Get OAuth Redirect URL for connection setup.
     */
    public function getAuthUrl(int $tenantId): string;

    /**
     * Handle exchanging callback code for auth tokens.
     */
    public function handleCallback(string $code, int $tenantId): CrmIntegration;

    /**
     * Refresh connection access token if necessary.
     */
    public function refreshAccessToken(CrmIntegration $integration): string;

    /**
     * Push a contact record to the CRM.
     */
    public function pushContact(Contact $contact, CrmIntegration $integration): CrmSyncLog;

    /**
     * Pull contact records from the CRM and insert/merge into local DB.
     */
    public function pullContacts(CrmIntegration $integration, string $duplicateStrategy = 'merge'): array;

    /**
     * Get default column key mapping config.
     */
    public function getDefaultMapping(): array;
}
