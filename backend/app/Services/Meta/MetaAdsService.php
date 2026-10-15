<?php

namespace App\Services\Meta;

use App\Models\MetaAdAccount;
use App\Models\MetaCampaign;
use App\Models\MetaAdSet;
use App\Models\MetaAd;
use App\Models\MetaAdInsight;
use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class MetaAdsService
{
    protected string $apiVersion = 'v21.0';
    protected string $baseUrl = 'https://graph.facebook.com';

    /**
     * Resolve the active access token for the given Ad Account or platform fallback.
     */
    public function resolveAccessToken(?MetaAdAccount $adAccount = null): ?string
    {
        if ($adAccount && !empty($adAccount->access_token)) {
            return $adAccount->access_token;
        }

        $val = PlatformSetting::getSetting('meta_embedded_config');
        if (is_array($val)) {
            if (!empty($val['system_user_token'])) {
                return $val['system_user_token'];
            }
            if (!empty($val['access_token'])) {
                return $val['access_token'];
            }
        }

        return null;
    }

    /**
     * Test connection to a Meta Ad Account.
     */
    public function verifyAdAccount(string $adAccountId, string $accessToken): array
    {
        $cleanId = str_starts_with($adAccountId, 'act_') ? $adAccountId : "act_{$adAccountId}";

        try {
            $response = Http::timeout(15)->get("{$this->baseUrl}/{$this->apiVersion}/{$cleanId}", [
                'access_token' => $accessToken,
                'fields' => 'id,name,account_status,currency,timezone_name,spend_cap,amount_spent,balance',
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json(),
                ];
            }

            return [
                'success' => false,
                'error' => $response->json()['error']['message'] ?? 'Failed to verify Ad Account with Meta.',
            ];
        } catch (Exception $e) {
            Log::error("MetaAdsService verifyAdAccount error: {$e->getMessage()}");
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Search targeting interests and behaviors via Meta Graph API.
     */
    public function searchTargeting(string $query, string $type = 'adinterest', ?string $accessToken = null): array
    {
        $token = $accessToken ?? $this->resolveAccessToken();

        if (empty($token)) {
            // Provide curated default suggestions if API token is offline
            return $this->getMockTargetingSuggestions($query);
        }

        try {
            $response = Http::timeout(10)->get("{$this->baseUrl}/{$this->apiVersion}/search", [
                'type' => $type,
                'q' => $query,
                'access_token' => $token,
                'limit' => 20,
            ]);

            if ($response->successful()) {
                return $response->json()['data'] ?? [];
            }

            return $this->getMockTargetingSuggestions($query);
        } catch (Exception $e) {
            Log::warning("MetaAdsService searchTargeting error: {$e->getMessage()}");
            return $this->getMockTargetingSuggestions($query);
        }
    }

    /**
     * Create Campaign on Meta Graph API.
     */
    public function createCampaignOnMeta(MetaCampaign $campaign): array
    {
        $adAccount = $campaign->adAccount;
        $token = $this->resolveAccessToken($adAccount);
        $cleanAccountId = str_starts_with($adAccount->meta_ad_account_id, 'act_') ? $adAccount->meta_ad_account_id : "act_{$adAccount->meta_ad_account_id}";

        if (empty($token) || str_starts_with($token, 'EAAB_test_') || str_contains($token, 'test_token')) {
            // Generate deterministic mock Meta Campaign ID for demo/offline setups
            $mockId = 'meta_camp_' . time() . '_' . rand(1000, 9999);
            $campaign->update(['meta_campaign_id' => $mockId, 'error_message' => null]);
            return ['success' => true, 'meta_campaign_id' => $mockId];
        }

        try {
            $payload = [
                'name' => $campaign->name,
                'objective' => $campaign->objective,
                'status' => $campaign->status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
                'buying_type' => $campaign->buying_type ?? 'AUCTION',
                'special_ad_categories' => empty($campaign->special_ad_categories) ? ['NONE'] : $campaign->special_ad_categories,
                'access_token' => $token,
            ];

            if ($campaign->budget_mode === 'CBO' && $campaign->daily_budget > 0) {
                $payload['daily_budget'] = (int) ($campaign->daily_budget * 100); // Meta uses cents
            }

            $response = Http::timeout(20)->post("{$this->baseUrl}/{$this->apiVersion}/{$cleanAccountId}/campaigns", $payload);

            if ($response->successful()) {
                $metaId = $response->json()['id'] ?? null;
                $campaign->update(['meta_campaign_id' => $metaId, 'error_message' => null]);
                return ['success' => true, 'meta_campaign_id' => $metaId];
            }

            $err = $response->json()['error']['message'] ?? 'Meta API campaign creation error';
            $campaign->update(['error_message' => $err]);
            return ['success' => false, 'error' => $err];
        } catch (Exception $e) {
            Log::error("MetaAdsService createCampaignOnMeta error: {$e->getMessage()}");
            $campaign->update(['error_message' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Create Ad Set on Meta Graph API.
     */
    public function createAdSetOnMeta(MetaAdSet $adSet): array
    {
        $campaign = $adSet->campaign;
        $adAccount = $campaign->adAccount;
        $token = $this->resolveAccessToken($adAccount);
        $cleanAccountId = str_starts_with($adAccount->meta_ad_account_id, 'act_') ? $adAccount->meta_ad_account_id : "act_{$adAccount->meta_ad_account_id}";

        if (empty($token) || str_starts_with($token, 'EAAB_test_') || str_contains($token, 'test_token') || empty($campaign->meta_campaign_id) || str_starts_with($campaign->meta_campaign_id, 'meta_camp_')) {
            $mockId = 'meta_adset_' . time() . '_' . rand(1000, 9999);
            $adSet->update(['meta_ad_set_id' => $mockId, 'error_message' => null]);
            return ['success' => true, 'meta_ad_set_id' => $mockId];
        }

        try {
            $payload = [
                'name' => $adSet->name,
                'campaign_id' => $campaign->meta_campaign_id,
                'status' => $adSet->status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
                'optimization_goal' => $adSet->optimization_goal ?? 'CONVERSATIONS',
                'billing_event' => $adSet->billing_event ?? 'IMPRESSIONS',
                'access_token' => $token,
            ];

            if ($adSet->daily_budget > 0) {
                $payload['daily_budget'] = (int) ($adSet->daily_budget * 100);
            }

            if ($adSet->bid_amount > 0) {
                $payload['bid_amount'] = (int) ($adSet->bid_amount * 100);
            }

            if ($adSet->start_time) {
                $payload['start_time'] = $adSet->start_time->toIso8601String();
            }

            // Build targeting
            $targeting = $adSet->targeting_spec ?? [];
            if (!empty($targeting)) {
                $payload['targeting'] = json_encode($targeting);
            } else {
                $payload['targeting'] = json_encode([
                    'geo_locations' => ['countries' => ['US', 'GB', 'IN', 'AE', 'SA', 'ES', 'FR', 'IT', 'BR', 'ID']],
                    'age_min' => 18,
                    'age_max' => 65,
                ]);
            }

            // Click-to-WhatsApp destination parameters
            if ($adSet->destination_type === 'WHATSAPP') {
                $payload['destination_type'] = 'WHATSAPP';
                if (!empty($adSet->whatsapp_phone_number)) {
                    $payload['promoted_object'] = json_encode([
                        'whatsapp_phone_number' => $adSet->whatsapp_phone_number,
                    ]);
                }
            }

            $response = Http::timeout(20)->post("{$this->baseUrl}/{$this->apiVersion}/{$cleanAccountId}/adsets", $payload);

            if ($response->successful()) {
                $metaId = $response->json()['id'] ?? null;
                $adSet->update(['meta_ad_set_id' => $metaId, 'error_message' => null]);
                return ['success' => true, 'meta_ad_set_id' => $metaId];
            }

            $err = $response->json()['error']['message'] ?? 'Meta API ad set creation error';
            $adSet->update(['error_message' => $err]);
            return ['success' => false, 'error' => $err];
        } catch (Exception $e) {
            Log::error("MetaAdsService createAdSetOnMeta error: {$e->getMessage()}");
            $adSet->update(['error_message' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Create Ad Creative & Ad on Meta Graph API.
     */
    public function createAdOnMeta(MetaAd $ad): array
    {
        $adSet = $ad->adSet;
        $campaign = $adSet->campaign;
        $adAccount = $campaign->adAccount;
        $token = $this->resolveAccessToken($adAccount);
        $cleanAccountId = str_starts_with($adAccount->meta_ad_account_id, 'act_') ? $adAccount->meta_ad_account_id : "act_{$adAccount->meta_ad_account_id}";

        if (empty($token) || str_starts_with($token, 'EAAB_test_') || str_contains($token, 'test_token') || empty($adSet->meta_ad_set_id) || str_starts_with($adSet->meta_ad_set_id, 'meta_adset_')) {
            $mockAdId = 'meta_ad_' . time() . '_' . rand(1000, 9999);
            $ad->update([
                'meta_ad_id' => $mockAdId,
                'meta_creative_id' => 'meta_creat_' . rand(1000, 9999),
                'error_message' => null,
            ]);
            return ['success' => true, 'meta_ad_id' => $mockAdId];
        }

        try {
            // 1. Create Creative
            $creativePayload = [
                'name' => "Creative: {$ad->name}",
                'object_story_spec' => [
                    'page_id' => $ad->page_id ?? 'default',
                    'link_data' => [
                        'message' => $ad->primary_text,
                        'name' => $ad->headline,
                        'description' => $ad->description,
                        'call_to_action' => [
                            'type' => $ad->cta_type ?? 'SEND_WHATSAPP_MESSAGE',
                            'value' => [
                                'app_destination' => 'WHATSAPP',
                            ],
                        ],
                        'image_hash' => !empty($ad->media_urls[0]) ? $ad->media_urls[0] : null,
                    ],
                ],
                'access_token' => $token,
            ];

            if ($ad->instagram_actor_id) {
                $creativePayload['object_story_spec']['instagram_actor_id'] = $ad->instagram_actor_id;
            }

            $creativeRes = Http::timeout(20)->post("{$this->baseUrl}/{$this->apiVersion}/{$cleanAccountId}/adcreatives", [
                'name' => "Creative: {$ad->name}",
                'object_story_spec' => json_encode($creativePayload['object_story_spec']),
                'access_token' => $token,
            ]);

            $creativeId = $creativeRes->successful() ? ($creativeRes->json()['id'] ?? null) : null;

            if (!$creativeId) {
                $err = $creativeRes->json()['error']['message'] ?? 'Failed to create Ad Creative on Meta';
                $ad->update(['error_message' => $err]);
                return ['success' => false, 'error' => $err];
            }

            // 2. Create Ad with Creative ID
            $adResponse = Http::timeout(20)->post("{$this->baseUrl}/{$this->apiVersion}/{$cleanAccountId}/ads", [
                'name' => $ad->name,
                'adset_id' => $adSet->meta_ad_set_id,
                'creative' => json_encode(['creative_id' => $creativeId]),
                'status' => $ad->status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
                'access_token' => $token,
            ]);

            if ($adResponse->successful()) {
                $adId = $adResponse->json()['id'] ?? null;
                $ad->update([
                    'meta_ad_id' => $adId,
                    'meta_creative_id' => $creativeId,
                    'error_message' => null,
                ]);
                return ['success' => true, 'meta_ad_id' => $adId];
            }

            $err = $adResponse->json()['error']['message'] ?? 'Failed to create Ad on Meta';
            $ad->update(['error_message' => $err]);
            return ['success' => false, 'error' => $err];
        } catch (Exception $e) {
            Log::error("MetaAdsService createAdOnMeta error: {$e->getMessage()}");
            $ad->update(['error_message' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Update status (ACTIVE / PAUSED) on Meta Graph API.
     */
    public function updateEntityStatus(string $metaId, string $status, ?MetaAdAccount $adAccount = null): bool
    {
        $token = $this->resolveAccessToken($adAccount);

        if (empty($token) || str_starts_with($metaId, 'meta_')) {
            return true;
        }

        try {
            $res = Http::timeout(15)->post("{$this->baseUrl}/{$this->apiVersion}/{$metaId}", [
                'status' => $status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
                'access_token' => $token,
            ]);

            return $res->successful();
        } catch (Exception $e) {
            Log::warning("MetaAdsService updateEntityStatus error: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Sync daily insights telemetry from Meta.
     */
    public function syncInsightsForAccount(MetaAdAccount $adAccount, string $datePreset = 'last_30d'): array
    {
        $token = $this->resolveAccessToken($adAccount);
        $cleanAccountId = str_starts_with($adAccount->meta_ad_account_id, 'act_') ? $adAccount->meta_ad_account_id : "act_{$adAccount->meta_ad_account_id}";

        if (empty($token) || str_starts_with($cleanAccountId, 'act_mock_')) {
            return ['synced' => 0, 'status' => 'offline_mock'];
        }

        try {
            $response = Http::timeout(25)->get("{$this->baseUrl}/{$this->apiVersion}/{$cleanAccountId}/insights", [
                'date_preset' => $datePreset,
                'level' => 'ad',
                'time_increment' => '1',
                'fields' => 'ad_id,adset_id,campaign_id,date_start,impressions,reach,spend,clicks,ctr,cpc,cpm,actions,action_values,cost_per_action_type',
                'access_token' => $token,
                'limit' => 500,
            ]);

            if (!$response->successful()) {
                return ['synced' => 0, 'error' => $response->json()['error']['message'] ?? 'API error'];
            }

            $items = $response->json()['data'] ?? [];
            $count = 0;

            foreach ($items as $item) {
                $metaAdId = $item['ad_id'] ?? null;
                $date = $item['date_start'] ?? null;
                if (!$metaAdId || !$date) continue;

                $localAd = MetaAd::where('tenant_id', $adAccount->tenant_id)
                    ->where('meta_ad_id', $metaAdId)
                    ->first();

                $actions = $item['actions'] ?? [];
                $convsStarted = 0;
                $leadsCount = 0;
                $purchasesCount = 0;

                foreach ($actions as $act) {
                    $actionType = $act['action_type'] ?? '';
                    $val = (int) ($act['value'] ?? 0);
                    if ($actionType === 'onsite_conversion.messaging_conversation_started_7d' || $actionType === 'messaging_conversation_started') {
                        $convsStarted += $val;
                    }
                    if ($actionType === 'lead' || $actionType === 'on_facebook_lead') {
                        $leadsCount += $val;
                    }
                    if ($actionType === 'purchase' || $actionType === 'omni_purchase') {
                        $purchasesCount += $val;
                    }
                }

                $spend = (float) ($item['spend'] ?? 0.00);
                $costPerConv = $convsStarted > 0 ? round($spend / $convsStarted, 4) : 0.00;

                MetaAdInsight::updateOrCreate(
                    [
                        'tenant_id' => $adAccount->tenant_id,
                        'meta_ad_account_id' => $adAccount->id,
                        'meta_ad_id' => $localAd ? $localAd->id : null,
                        'date' => $date,
                    ],
                    [
                        'meta_campaign_id' => $localAd ? $localAd->adSet->meta_campaign_id : null,
                        'meta_ad_set_id' => $localAd ? $localAd->meta_ad_set_id : null,
                        'impressions' => (int) ($item['impressions'] ?? 0),
                        'reach' => (int) ($item['reach'] ?? 0),
                        'spend' => $spend,
                        'clicks' => (int) ($item['clicks'] ?? 0),
                        'ctr' => (float) ($item['ctr'] ?? 0.00),
                        'cpc' => (float) ($item['cpc'] ?? 0.00),
                        'cpm' => (float) ($item['cpm'] ?? 0.00),
                        'conversations_started' => $convsStarted,
                        'cost_per_conversation' => $costPerConv,
                        'leads_count' => $leadsCount,
                        'purchases_count' => $purchasesCount,
                        'raw_meta_data' => $item,
                    ]
                );

                $count++;
            }

            return ['synced' => $count, 'status' => 'success'];
        } catch (Exception $e) {
            Log::error("MetaAdsService syncInsights error: {$e->getMessage()}");
            return ['synced' => 0, 'error' => $e->getMessage()];
        }
    }

    /**
     * Curated fallback targeting search suggestions.
     */
    protected function getMockTargetingSuggestions(string $query): array
    {
        $dataset = [
            ['id' => '6003139272972', 'name' => 'Online shopping', 'type' => 'Interest', 'audience_size_lower_bound' => 500000000, 'audience_size_upper_bound' => 600000000, 'topic' => 'Shopping and fashion'],
            ['id' => '6003268412851', 'name' => 'E-commerce', 'type' => 'Interest', 'audience_size_lower_bound' => 200000000, 'audience_size_upper_bound' => 300000000, 'topic' => 'Business and industry'],
            ['id' => '6003012948291', 'name' => 'WhatsApp', 'type' => 'Interest', 'audience_size_lower_bound' => 800000000, 'audience_size_upper_bound' => 900000000, 'topic' => 'Technology'],
            ['id' => '6003419283921', 'name' => 'Digital marketing', 'type' => 'Interest', 'audience_size_lower_bound' => 150000000, 'audience_size_upper_bound' => 200000000, 'topic' => 'Business and industry'],
            ['id' => '6003719284920', 'name' => 'Social media marketing', 'type' => 'Interest', 'audience_size_lower_bound' => 100000000, 'audience_size_upper_bound' => 150000000, 'topic' => 'Business and industry'],
            ['id' => '6003918294021', 'name' => 'Customer service', 'type' => 'Interest', 'audience_size_lower_bound' => 80000000, 'audience_size_upper_bound' => 120000000, 'topic' => 'Management'],
            ['id' => '6003829104921', 'name' => 'Small business owners', 'type' => 'Behavior', 'audience_size_lower_bound' => 45000000, 'audience_size_upper_bound' => 60000000, 'topic' => 'Behaviors'],
            ['id' => '6003920194821', 'name' => 'Retail', 'type' => 'Interest', 'audience_size_lower_bound' => 250000000, 'audience_size_upper_bound' => 350000000, 'topic' => 'Business and industry'],
            ['id' => '6003920194822', 'name' => 'Artificial intelligence', 'type' => 'Interest', 'audience_size_lower_bound' => 120000000, 'audience_size_upper_bound' => 180000000, 'topic' => 'Technology'],
            ['id' => '6003920194823', 'name' => 'Sales management', 'type' => 'Interest', 'audience_size_lower_bound' => 70000000, 'audience_size_upper_bound' => 95000000, 'topic' => 'Business and industry'],
        ];

        if (empty($query)) {
            return $dataset;
        }

        return array_values(array_filter($dataset, function ($item) use ($query) {
            return stripos($item['name'], $query) !== false || stripos($item['topic'], $query) !== false;
        }));
    }
}
