<?php

use App\Models\PlatformSetting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Google Sheets & Calendar OAuth
        $currentGoogle = PlatformSetting::getSetting('google_app_config');
        if (!$currentGoogle) {
            $clientId = env('GOOGLE_CLIENT_ID', '');
            $clientSecret = env('GOOGLE_CLIENT_SECRET', '');
            $redirectUri = env('GOOGLE_REDIRECT_URI', '');

            if ($clientId || $clientSecret) {
                PlatformSetting::updateOrCreate(
                    ['key' => 'google_app_config'],
                    ['value' => [
                        'client_id' => $clientId ?? '',
                        'client_secret' => $clientSecret ?? '',
                        'redirect_uri' => $redirectUri ?? '',
                    ]]
                );
            }
        } else {
            // Re-save to ensure AES-256 encryption on secrets
            PlatformSetting::updateOrCreate(
                ['key' => 'google_app_config'],
                ['value' => $currentGoogle]
            );
        }

        // 2. HubSpot CRM
        $currentHubSpot = PlatformSetting::getSetting('hubspot_app_config');
        if (!$currentHubSpot) {
            $clientId = env('HUBSPOT_CLIENT_ID', '');
            $clientSecret = env('HUBSPOT_CLIENT_SECRET', '');
            if ($clientId || $clientSecret) {
                PlatformSetting::updateOrCreate(
                    ['key' => 'hubspot_app_config'],
                    ['value' => [
                        'client_id' => $clientId ?? '',
                        'client_secret' => $clientSecret ?? '',
                    ]]
                );
            }
        } else {
            PlatformSetting::updateOrCreate(
                ['key' => 'hubspot_app_config'],
                ['value' => $currentHubSpot]
            );
        }

        // 3. Salesforce CRM
        $currentSalesforce = PlatformSetting::getSetting('salesforce_app_config');
        if (!$currentSalesforce) {
            $clientId = env('SALESFORCE_CLIENT_ID', 'dummy-client-id-for-salesforce-crm');
            $clientSecret = env('SALESFORCE_CLIENT_SECRET', 'dummy-client-secret-for-salesforce-crm');
            if ($clientId || $clientSecret) {
                PlatformSetting::updateOrCreate(
                    ['key' => 'salesforce_app_config'],
                    ['value' => [
                        'client_id' => $clientId ?? '',
                        'client_secret' => $clientSecret ?? '',
                    ]]
                );
            }
        } else {
            PlatformSetting::updateOrCreate(
                ['key' => 'salesforce_app_config'],
                ['value' => $currentSalesforce]
            );
        }

        // 4. Zoho CRM
        $currentZoho = PlatformSetting::getSetting('zoho_app_config');
        if (!$currentZoho) {
            $clientId = env('ZOHO_CLIENT_ID', 'dummy-client-id-for-zoho-crm');
            $clientSecret = env('ZOHO_CLIENT_SECRET', 'dummy-client-secret-for-zoho-crm');
            if ($clientId || $clientSecret) {
                PlatformSetting::updateOrCreate(
                    ['key' => 'zoho_app_config'],
                    ['value' => [
                        'client_id' => $clientId ?? '',
                        'client_secret' => $clientSecret ?? '',
                    ]]
                );
            }
        } else {
            PlatformSetting::updateOrCreate(
                ['key' => 'zoho_app_config'],
                ['value' => $currentZoho]
            );
        }

        // 5. WhatsApp Baileys Worker
        $currentBaileys = PlatformSetting::getSetting('baileys_app_config');
        if (!$currentBaileys) {
            $workerUrl = env('BAILEYS_WORKER_URL', 'http://127.0.0.1:5006');
            $secretToken = env('BAILEYS_SECRET_TOKEN', 'whatsomni_baileys_secret_key');
            PlatformSetting::updateOrCreate(
                ['key' => 'baileys_app_config'],
                ['value' => [
                    'worker_url' => $workerUrl,
                    'secret_token' => $secretToken,
                ]]
            );
        } else {
            PlatformSetting::updateOrCreate(
                ['key' => 'baileys_app_config'],
                ['value' => $currentBaileys]
            );
        }

        // 6. Shopify E-Commerce
        $currentShopify = PlatformSetting::getSetting('shopify_app_config');
        if (!$currentShopify) {
            $clientId = env('SHOPIFY_CLIENT_ID', '');
            $clientSecret = env('SHOPIFY_CLIENT_SECRET', '');
            $scopes = env('SHOPIFY_SCOPES', 'read_products,write_products,read_orders,read_customers,read_checkouts,read_inventory,read_draft_orders');
            PlatformSetting::updateOrCreate(
                ['key' => 'shopify_app_config'],
                ['value' => [
                    'client_id' => $clientId ?? '',
                    'client_secret' => $clientSecret ?? '',
                    'scopes' => $scopes,
                ]]
            );
        } else {
            PlatformSetting::updateOrCreate(
                ['key' => 'shopify_app_config'],
                ['value' => $currentShopify]
            );
        }

        // 7. WooCommerce E-Commerce
        $currentWoo = PlatformSetting::getSetting('woocommerce_app_config');
        if (!$currentWoo) {
            $appName = env('WOOCOMMERCE_APP_NAME', 'WhatsOmni');
            $scopes = env('WOOCOMMERCE_SCOPES', 'read_write');
            PlatformSetting::updateOrCreate(
                ['key' => 'woocommerce_app_config'],
                ['value' => [
                    'app_name' => $appName,
                    'scopes' => $scopes,
                ]]
            );
        } else {
            PlatformSetting::updateOrCreate(
                ['key' => 'woocommerce_app_config'],
                ['value' => $currentWoo]
            );
        }

        // 8. Re-save existing settings to ensure all secrets are AES-256 encrypted
        $settingsToEncrypt = [
            'meta_embedded_config',
            'linkedin_app_config',
            'tiktok_app_config',
            'zoom_app_config',
            'teams_app_config',
            'ai_providers_config',
            'sms_providers_config',
        ];

        foreach ($settingsToEncrypt as $key) {
            $val = PlatformSetting::getSetting($key);
            if ($val !== null) {
                // If it's meta_embedded_config and app_id is empty, try populating from env/facebook keys
                if ($key === 'meta_embedded_config' && is_array($val)) {
                    if (empty($val['app_id'])) {
                        $val['app_id'] = env('FACEBOOK_CLIENT_ID', 'dummy-client-id-for-facebook-meta-login');
                    }
                    if (empty($val['app_secret'])) {
                        $val['app_secret'] = env('FACEBOOK_CLIENT_SECRET', 'dummy-client-secret-for-facebook-meta-login');
                    }
                }

                PlatformSetting::updateOrCreate(
                    ['key' => $key],
                    ['value' => $val]
                );
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Settings remain preserved in soft-deleted or live state
    }
};
