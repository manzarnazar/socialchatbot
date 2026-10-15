<?php

namespace App\Services\CRM;

use Exception;

class CrmManager
{
    /**
     * Resolve CRM Driver instance.
     */
    public function driver(string $provider): CrmServiceInterface
    {
        return match ($provider) {
            'hubspot' => new HubSpotDriver(),
            'salesforce' => new SalesforceDriver(),
            'zoho' => new ZohoDriver(),
            default => throw new Exception("CRM Provider '{$provider}' is not supported.")
        };
    }
}
