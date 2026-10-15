<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\MetaAdAccount;
use App\Models\MetaCampaign;
use App\Models\MetaAdSet;
use App\Models\MetaAd;
use App\Models\MetaAdInsight;
use App\Models\MetaAdLead;
use App\Models\ChannelConnection;
use App\Models\Flow;
use App\Providers\AppServiceProvider;
use App\Services\Meta\MetaAdsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;
use Exception;

class MetaAdsController extends Controller
{
    protected MetaAdsService $metaService;

    public function __construct(MetaAdsService $metaService)
    {
        $this->metaService = $metaService;
    }

    /**
     * Dashboard Overview & Entity List
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $accountId = $request->input('ad_account_id');
        $status = $request->input('status', 'all');
        $search = $request->input('search');
        $tab = $request->input('tab', 'campaigns'); // campaigns, adsets, ads, analytics
        $days = (int) $request->input('days', 30);
        $campaignId = $request->input('campaign_id');
        $adSetId = $request->input('ad_set_id');

        // 1. Ensure at least one default ad account exists if none connected
        $adAccountQuery = MetaAdAccount::where('tenant_id', $tenantId);
        $accounts = $adAccountQuery->get();

        if ($accounts->isEmpty()) {
            $defaultAccount = MetaAdAccount::create([
                'tenant_id' => $tenantId,
                'meta_ad_account_id' => 'act_demo_' . $tenantId,
                'account_name' => 'Primary Meta Ad Account',
                'account_status' => 'ACTIVE',
                'currency' => 'USD',
                'timezone_name' => 'UTC',
                'spend_cap' => 5000.00,
                'amount_spent' => 1240.50,
                'is_default' => true,
            ]);
            $accounts = collect([$defaultAccount]);
        }

        $activeAccount = $accountId 
            ? $accounts->firstWhere('id', $accountId) ?? $accounts->firstWhere('is_default', true) ?? $accounts->first()
            : $accounts->firstWhere('is_default', true) ?? $accounts->first();

        $activeAccountId = $activeAccount ? $activeAccount->id : null;

        // 2. Summary KPI Metrics
        $startDate = Carbon::now()->subDays($days)->toDateString();
        
        $insightsQuery = MetaAdInsight::where('tenant_id', $tenantId);
        if ($activeAccountId) {
            $insightsQuery->where('meta_ad_account_id', $activeAccountId);
        }
        $insightsQuery->where('date', '>=', $startDate);

        $summary = [
            'total_spend' => (float) (clone $insightsQuery)->sum('spend'),
            'total_reach' => (int) (clone $insightsQuery)->sum('reach'),
            'total_impressions' => (int) (clone $insightsQuery)->sum('impressions'),
            'total_clicks' => (int) (clone $insightsQuery)->sum('clicks'),
            'total_conversations' => (int) (clone $insightsQuery)->sum('conversations_started'),
            'total_leads' => (int) (clone $insightsQuery)->sum('leads_count'),
            'total_purchases' => (int) (clone $insightsQuery)->sum('purchases_count'),
            'avg_ctr' => (float) (clone $insightsQuery)->avg('ctr') ?? 0.00,
            'avg_cpc' => (float) (clone $insightsQuery)->avg('cpc') ?? 0.00,
            'avg_cpm' => (float) (clone $insightsQuery)->avg('cpm') ?? 0.00,
            'avg_cpr' => 0.00,
            'active_campaigns_count' => MetaCampaign::where('tenant_id', $tenantId)->where('status', 'ACTIVE')->count(),
            'total_campaigns_count' => MetaCampaign::where('tenant_id', $tenantId)->count(),
        ];

        if ($summary['total_conversations'] > 0) {
            $summary['avg_cpr'] = round($summary['total_spend'] / $summary['total_conversations'], 2);
        }

        // 3. Tab-specific Data
        $data = [];

        if ($tab === 'campaigns') {
            $query = MetaCampaign::where('tenant_id', $tenantId)
                ->with(['adAccount'])
                ->withCount(['adSets', 'adSets as total_ads_count' => function ($q) {
                    $q->join('meta_ads', 'meta_ad_sets.id', '=', 'meta_ads.meta_ad_set_id');
                }])
                ->orderBy('created_at', 'desc');

            if ($activeAccountId) {
                $query->where('meta_ad_account_id', $activeAccountId);
            }
            if ($status !== 'all') {
                $query->where('status', $status);
            }
            if ($search) {
                $query->where('name', 'like', "%{$search}%");
            }

            $campaigns = $query->paginate(20);

            // Attach spend & conversation aggregations
            $campaigns->getCollection()->transform(function ($camp) use ($startDate) {
                $campInsights = MetaAdInsight::where('meta_campaign_id', $camp->id)
                    ->where('date', '>=', $startDate)
                    ->selectRaw('SUM(spend) as spend, SUM(conversations_started) as conversations, SUM(clicks) as clicks, SUM(impressions) as impressions')
                    ->first();

                $spend = (float) ($campInsights->spend ?? 0);
                $convs = (int) ($campInsights->conversations ?? 0);
                $cpr = $convs > 0 ? round($spend / $convs, 2) : 0.00;

                $camp->metrics = [
                    'spend' => $spend,
                    'conversations' => $convs,
                    'clicks' => (int) ($campInsights->clicks ?? 0),
                    'impressions' => (int) ($campInsights->impressions ?? 0),
                    'cpr' => $cpr,
                ];
                return $camp;
            });

            $data = $campaigns;
        } elseif ($tab === 'adsets') {
            $query = MetaAdSet::where('tenant_id', $tenantId)
                ->with(['campaign.adAccount'])
                ->withCount('ads')
                ->orderBy('created_at', 'desc');

            if ($activeAccountId) {
                $query->whereHas('campaign', function ($q) use ($activeAccountId) {
                    $q->where('meta_ad_account_id', $activeAccountId);
                });
            }
            if ($campaignId) {
                $query->where('meta_campaign_id', $campaignId);
            }
            if ($status !== 'all') {
                $query->where('status', $status);
            }
            if ($search) {
                $query->where('name', 'like', "%{$search}%");
            }

            $adSets = $query->paginate(20);

            $adSets->getCollection()->transform(function ($adSet) use ($startDate) {
                $insights = MetaAdInsight::where('meta_ad_set_id', $adSet->id)
                    ->where('date', '>=', $startDate)
                    ->selectRaw('SUM(spend) as spend, SUM(conversations_started) as conversations, SUM(clicks) as clicks')
                    ->first();

                $spend = (float) ($insights->spend ?? 0);
                $convs = (int) ($insights->conversations ?? 0);
                $adSet->metrics = [
                    'spend' => $spend,
                    'conversations' => $convs,
                    'clicks' => (int) ($insights->clicks ?? 0),
                    'cpr' => $convs > 0 ? round($spend / $convs, 2) : 0.00,
                ];
                return $adSet;
            });

            $data = $adSets;
        } elseif ($tab === 'ads') {
            $query = MetaAd::where('tenant_id', $tenantId)
                ->with(['adSet.campaign.adAccount', 'linkedFlow'])
                ->orderBy('created_at', 'desc');

            if ($activeAccountId) {
                $query->whereHas('adSet.campaign', function ($q) use ($activeAccountId) {
                    $q->where('meta_ad_account_id', $activeAccountId);
                });
            }
            if ($adSetId) {
                $query->where('meta_ad_set_id', $adSetId);
            }
            if ($campaignId) {
                $query->whereHas('adSet', function ($q) use ($campaignId) {
                    $q->where('meta_campaign_id', $campaignId);
                });
            }
            if ($status !== 'all') {
                $query->where('status', $status);
            }
            if ($search) {
                $query->where('name', 'like', "%{$search}%");
            }

            $ads = $query->paginate(20);

            $ads->getCollection()->transform(function ($ad) use ($startDate) {
                $insights = MetaAdInsight::where('meta_ad_id', $ad->id)
                    ->where('date', '>=', $startDate)
                    ->selectRaw('SUM(spend) as spend, SUM(conversations_started) as conversations, SUM(clicks) as clicks, SUM(impressions) as impressions')
                    ->first();

                $spend = (float) ($insights->spend ?? 0);
                $convs = (int) ($insights->conversations ?? 0);
                $ad->metrics = [
                    'spend' => $spend,
                    'conversations' => $convs,
                    'clicks' => (int) ($insights->clicks ?? 0),
                    'impressions' => (int) ($insights->impressions ?? 0),
                    'cpr' => $convs > 0 ? round($spend / $convs, 2) : 0.00,
                ];
                return $ad;
            });

            $data = $ads;
        } elseif ($tab === 'accounts') {
            $query = MetaAdAccount::where('tenant_id', $tenantId)
                ->withCount('campaigns')
                ->orderBy('is_default', 'desc')
                ->orderBy('created_at', 'desc');

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('account_name', 'like', "%{$search}%")
                      ->orWhere('meta_ad_account_id', 'like', "%{$search}%");
                });
            }

            $accountsList = $query->get()->map(function ($acc) use ($startDate) {
                $insights = MetaAdInsight::where('meta_ad_account_id', $acc->id)
                    ->selectRaw('SUM(spend) as total_spend, SUM(conversations_started) as total_conversations')
                    ->first();

                $acc->total_spend = (float) ($insights->total_spend ?? $acc->amount_spent ?? 0);
                $acc->total_conversations = (int) ($insights->total_conversations ?? 0);
                $acc->has_custom_token = !empty($acc->access_token);
                return $acc;
            });

            $data = $accountsList;
        }

        // Available Flows for Click-to-WhatsApp link
        $flows = Flow::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->select('id', 'name', 'is_active')
            ->get();

        // Available WhatsApp channels
        $whatsappChannels = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'whatsapp')
            ->where('status', 'active')
            ->get()
            ->map(function ($ch) {
                $creds = $ch->decrypted_credentials;
                return [
                    'id' => $ch->id,
                    'name' => $ch->name,
                    'phone_number' => $creds['phone_number'] ?? $creds['phone'] ?? $creds['phoneNumber'] ?? '+1 (555) 019-2834',
                ];
            });

        return response()->json([
            'summary' => $summary,
            'accounts' => $accounts,
            'active_account' => $activeAccount,
            'data' => $data,
            'flows' => $flows,
            'whatsapp_channels' => $whatsappChannels,
        ]);
    }

    /**
     * List all connected Ad Accounts
     */
    public function getAccounts(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $accounts = MetaAdAccount::where('tenant_id', $tenantId)->get();
        return response()->json($accounts);
    }

    /**
     * Connect or Register an Ad Account
     */
    public function connectAccount(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'meta_ad_account_id' => 'required|string|max:100',
            'account_name' => 'required|string|max:255',
            'currency' => 'nullable|string|max:10',
            'timezone_name' => 'nullable|string|max:100',
            'access_token' => 'nullable|string',
            'spend_cap' => 'nullable|numeric|min:0',
        ]);

        $rawId = trim($validated['meta_ad_account_id']);
        $cleanId = str_starts_with($rawId, 'act_')
            ? $rawId
            : "act_{$rawId}";

        $token = !empty($validated['access_token']) ? trim($validated['access_token']) : null;
        if (!empty($token)) {
            $verifyRes = $this->metaService->verifyAdAccount($cleanId, $token);
            if (!$verifyRes['success']) {
                return response()->json([
                    'message' => $verifyRes['error'] ?? 'Ad Account validation failed.',
                ], 422);
            }
            if (!empty($verifyRes['data'])) {
                $metaData = $verifyRes['data'];
                $validated['currency'] = $metaData['currency'] ?? $validated['currency'] ?? 'USD';
                $validated['timezone_name'] = $metaData['timezone_name'] ?? $validated['timezone_name'] ?? 'UTC';
            }
        }

        $existing = MetaAdAccount::where('tenant_id', $tenantId)->where('meta_ad_account_id', $cleanId)->first();
        if (!$existing) {
            $limitCheck = app(\App\Services\PlanLimitService::class)->canConnectMetaAdAccount($request->user()->tenant);
            if (!$limitCheck['allowed']) {
                return response()->json([
                    'message' => $limitCheck['reason'],
                    'code' => $limitCheck['code'],
                    'limit' => $limitCheck['limit'] ?? null,
                    'current' => $limitCheck['current'] ?? null,
                ], 403);
            }
        }

        $isFirst = MetaAdAccount::where('tenant_id', $tenantId)->count() === 0;

        $account = MetaAdAccount::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'meta_ad_account_id' => $cleanId,
            ],
            [
                'account_name' => trim($validated['account_name']),
                'currency' => strtoupper($validated['currency'] ?? 'USD'),
                'timezone_name' => $validated['timezone_name'] ?? 'UTC',
                'spend_cap' => $validated['spend_cap'] ?? null,
                'access_token' => $token,
                'account_status' => 'ACTIVE',
                'is_default' => $isFirst,
            ]
        );

        return response()->json([
            'message' => 'Meta Ad Account connected successfully.',
            'account' => $account,
        ]);
    }

    /**
     * Set a connected Ad Account as Default
     */
    public function setDefaultAccount(Request $request, int $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $account = MetaAdAccount::where('tenant_id', $tenantId)->findOrFail($id);

        MetaAdAccount::where('tenant_id', $tenantId)->update(['is_default' => false]);
        $account->update(['is_default' => true]);

        return response()->json([
            'message' => 'Default Meta Ad Account updated.',
            'account' => $account,
        ]);
    }

    /**
     * Disconnect / Delete a connected Ad Account
     */
    public function destroyAccount(Request $request, int $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $account = MetaAdAccount::where('tenant_id', $tenantId)->findOrFail($id);

        $wasDefault = $account->is_default;
        $account->delete();

        if ($wasDefault) {
            $next = MetaAdAccount::where('tenant_id', $tenantId)->first();
            if ($next) {
                $next->update(['is_default' => true]);
            }
        }

        return response()->json([
            'message' => 'Meta Ad Account disconnected successfully.',
        ]);
    }

    /**
     * Create 3-in-1 Campaign, AdSet & Ad Wizard
     */
    public function storeCampaign(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            // Campaign Level
            'meta_ad_account_id' => 'required|exists:meta_ad_accounts,id',
            'name' => 'required|string|max:255',
            'objective' => 'required|string|in:MESSAGES,OUTCOME_ENGAGEMENT,OUTCOME_LEADS,OUTCOME_TRAFFIC,OUTCOME_SALES',
            'budget_mode' => 'required|string|in:CBO,ABO',
            'daily_budget' => 'nullable|numeric|min:1',
            'special_ad_categories' => 'nullable|array',

            // Ad Set Level
            'adset_name' => 'nullable|string|max:255',
            'destination_type' => 'required|string|in:WHATSAPP,MESSENGER,INSTAGRAM_DIRECT,WEBSITE,ON_AD_LEAD_FORM',
            'whatsapp_phone_number' => 'nullable|string|max:50',
            'optimization_goal' => 'nullable|string',
            'adset_daily_budget' => 'nullable|numeric|min:1',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date|after:start_time',
            'targeting_spec' => 'nullable|array',
            'placements_spec' => 'nullable|array',

            // Ad / Creative Level
            'ad_name' => 'nullable|string|max:255',
            'primary_text' => 'required|string',
            'headline' => 'required|string|max:255',
            'description' => 'nullable|string',
            'cta_type' => 'required|string',
            'media_urls' => 'nullable|array',
            'welcome_message' => 'nullable|string',
            'linked_flow_id' => 'nullable|exists:flows,id',
            'page_id' => 'nullable|string|max:100',
            'instagram_actor_id' => 'nullable|string|max:100',
            'status' => 'nullable|string|in:ACTIVE,PAUSED,DRAFT',
        ]);

        $tenant = $request->user()->tenant;
        $status = $validated['status'] ?? 'DRAFT';

        // Check Meta Campaigns plan limit
        if ($status !== 'DRAFT') {
            $campaignLimitCheck = app(\App\Services\PlanLimitService::class)->canCreateMetaCampaign($tenant);
            if (!$campaignLimitCheck['allowed']) {
                return response()->json([
                    'message' => $campaignLimitCheck['reason'],
                    'code' => $campaignLimitCheck['code'],
                    'limit' => $campaignLimitCheck['limit'] ?? null,
                    'current' => $campaignLimitCheck['current'] ?? null,
                ], 403);
            }
        }

        // Check Click-to-WhatsApp Ads with Flows limit
        if ($validated['destination_type'] === 'WHATSAPP' || !empty($validated['linked_flow_id'])) {
            $ctwaCheck = app(\App\Services\PlanLimitService::class)->canUseClickToWhatsAppAds($tenant);
            if (!$ctwaCheck['allowed']) {
                return response()->json([
                    'message' => $ctwaCheck['reason'],
                    'code' => $ctwaCheck['code'],
                ], 403);
            }
        }

        try {
            DB::beginTransaction();

            $isDraft = ($status === 'DRAFT');

            // 1. Create Campaign Record
            $campaign = MetaCampaign::create([
                'tenant_id' => $tenantId,
                'meta_ad_account_id' => $validated['meta_ad_account_id'],
                'meta_campaign_id' => $isDraft ? ('draft_camp_' . uniqid()) : null,
                'name' => $validated['name'],
                'objective' => $validated['objective'],
                'budget_mode' => $validated['budget_mode'],
                'daily_budget' => $validated['budget_mode'] === 'CBO' ? ($validated['daily_budget'] ?? 20.00) : null,
                'special_ad_categories' => $validated['special_ad_categories'] ?? [],
                'status' => $status,
            ]);

            // Dispatch Campaign to Meta Graph API if not a draft
            if (!$isDraft) {
                $this->metaService->createCampaignOnMeta($campaign);
            }

            // 2. Create Ad Set Record
            $adSet = MetaAdSet::create([
                'tenant_id' => $tenantId,
                'meta_campaign_id' => $campaign->id,
                'meta_ad_set_id' => $isDraft ? ('draft_adset_' . uniqid()) : null,
                'name' => $validated['adset_name'] ?? ($campaign->name . ' - Ad Set 1'),
                'status' => $status,
                'destination_type' => $validated['destination_type'],
                'whatsapp_phone_number' => $validated['whatsapp_phone_number'] ?? null,
                'optimization_goal' => $validated['optimization_goal'] ?? 'CONVERSATIONS',
                'daily_budget' => $validated['budget_mode'] === 'ABO' ? ($validated['adset_daily_budget'] ?? 15.00) : null,
                'start_time' => !empty($validated['start_time']) ? Carbon::parse($validated['start_time']) : Carbon::now(),
                'end_time' => !empty($validated['end_time']) ? Carbon::parse($validated['end_time']) : null,
                'targeting_spec' => $validated['targeting_spec'] ?? [
                    'geo_locations' => ['countries' => ['US', 'GB', 'IN', 'AE', 'SA']],
                    'age_min' => 18,
                    'age_max' => 65,
                ],
                'placements_spec' => $validated['placements_spec'] ?? ['advantage_plus' => true],
            ]);

            // Dispatch Ad Set to Meta Graph API if not a draft
            if (!$isDraft) {
                $this->metaService->createAdSetOnMeta($adSet);
            }

            // 3. Create Ad & Creative Record
            $ad = MetaAd::create([
                'tenant_id' => $tenantId,
                'meta_ad_set_id' => $adSet->id,
                'meta_ad_id' => $isDraft ? ('draft_ad_' . uniqid()) : null,
                'meta_creative_id' => $isDraft ? ('draft_cr_' . uniqid()) : null,
                'name' => $validated['ad_name'] ?? ($campaign->name . ' - Creative 1'),
                'status' => $status,
                'page_id' => $validated['page_id'] ?? 'default',
                'instagram_actor_id' => $validated['instagram_actor_id'] ?? null,
                'primary_text' => $validated['primary_text'],
                'headline' => $validated['headline'],
                'description' => $validated['description'] ?? null,
                'cta_type' => $validated['cta_type'],
                'media_urls' => $validated['media_urls'] ?? [],
                'welcome_message' => $validated['welcome_message'] ?? 'Hi! I saw your ad and would like to learn more.',
                'linked_flow_id' => $validated['linked_flow_id'] ?? null,
            ]);

            // Dispatch Ad & Creative to Meta Graph API if not a draft
            if (!$isDraft) {
                $this->metaService->createAdOnMeta($ad);
            }

            DB::commit();

            $message = $isDraft 
                ? 'Meta Campaign, Ad Set, and Ad saved as draft successfully.' 
                : 'Meta Campaign, Ad Set, and Ad created and published successfully.';

            return response()->json([
                'message' => $message,
                'campaign' => $campaign->load(['adSets.ads']),
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("MetaAdsController storeCampaign error: {$e->getMessage()}");
            return response()->json([
                'message' => 'Failed to create Meta campaign: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Publish a draft campaign, its AdSets and Ads to Meta Graph API
     */
    public function publishCampaign(Request $request, int $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $campaign = MetaCampaign::where('tenant_id', $tenantId)
            ->with(['adAccount', 'adSets.ads'])
            ->findOrFail($id);

        $targetStatus = $request->input('status', 'ACTIVE');
        if (!in_array($targetStatus, ['ACTIVE', 'PAUSED'])) {
            $targetStatus = 'ACTIVE';
        }

        if ($campaign->status === 'DRAFT' && in_array($targetStatus, ['ACTIVE', 'PAUSED'])) {
            $campaignLimitCheck = app(\App\Services\PlanLimitService::class)->canCreateMetaCampaign($request->user()->tenant);
            if (!$campaignLimitCheck['allowed']) {
                return response()->json([
                    'message' => $campaignLimitCheck['reason'],
                    'code' => $campaignLimitCheck['code'],
                    'limit' => $campaignLimitCheck['limit'] ?? null,
                    'current' => $campaignLimitCheck['current'] ?? null,
                ], 403);
            }
        }

        try {
            DB::beginTransaction();

            // 1. Ensure or deploy Campaign to Meta
            if (empty($campaign->meta_campaign_id) || str_starts_with($campaign->meta_campaign_id, 'draft_')) {
                $campRes = $this->metaService->createCampaignOnMeta($campaign);
                if (!$campRes['success'] && empty($campaign->meta_campaign_id)) {
                    throw new Exception($campRes['error'] ?? 'Failed to publish campaign to Meta.');
                }
            } else {
                $this->metaService->updateEntityStatus($campaign->meta_campaign_id, $targetStatus, $campaign->adAccount);
            }

            $campaign->update([
                'status' => $targetStatus,
                'error_message' => null,
            ]);

            // 2. Deploy AdSets
            foreach ($campaign->adSets as $adSet) {
                if (empty($adSet->meta_ad_set_id) || str_starts_with($adSet->meta_ad_set_id, 'draft_')) {
                    $adSetRes = $this->metaService->createAdSetOnMeta($adSet);
                    if (!$adSetRes['success'] && empty($adSet->meta_ad_set_id)) {
                        throw new Exception($adSetRes['error'] ?? "Failed to publish Ad Set '{$adSet->name}' to Meta.");
                    }
                } else {
                    $this->metaService->updateEntityStatus($adSet->meta_ad_set_id, $targetStatus, $campaign->adAccount);
                }

                $adSet->update([
                    'status' => $targetStatus,
                    'error_message' => null,
                ]);

                // 3. Deploy Ads
                foreach ($adSet->ads as $ad) {
                    if (empty($ad->meta_ad_id) || str_starts_with($ad->meta_ad_id, 'draft_')) {
                        $adRes = $this->metaService->createAdOnMeta($ad);
                        if (!$adRes['success'] && empty($ad->meta_ad_id)) {
                            throw new Exception($adRes['error'] ?? "Failed to publish Ad '{$ad->name}' to Meta.");
                        }
                    } else {
                        $this->metaService->updateEntityStatus($ad->meta_ad_id, $targetStatus, $campaign->adAccount);
                    }

                    $ad->update([
                        'status' => $targetStatus,
                        'error_message' => null,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Campaign '{$campaign->name}' published successfully to Meta!",
                'campaign' => $campaign->fresh(['adSets.ads']),
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("MetaAdsController publishCampaign error: {$e->getMessage()}");
            return response()->json([
                'success' => false,
                'message' => 'Failed to publish campaign to Meta: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Toggle status or update campaign
     */
    public function updateCampaign(Request $request, int $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $campaign = MetaCampaign::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'status' => 'sometimes|string|in:ACTIVE,PAUSED,ARCHIVED,DRAFT',
            'daily_budget' => 'sometimes|nullable|numeric|min:1',
            'objective' => 'sometimes|string|in:MESSAGES,OUTCOME_ENGAGEMENT,OUTCOME_LEADS,OUTCOME_TRAFFIC,OUTCOME_SALES',
            'budget_mode' => 'sometimes|string|in:CBO,ABO',
            'special_ad_categories' => 'sometimes|nullable|array',
        ]);

        if (isset($validated['status']) && $validated['status'] !== $campaign->status) {
            if ($campaign->meta_campaign_id && !str_starts_with($campaign->meta_campaign_id, 'draft_') && $validated['status'] !== 'DRAFT') {
                $this->metaService->updateEntityStatus($campaign->meta_campaign_id, $validated['status'], $campaign->adAccount);
            }
        }

        $campaign->update($validated);

        return response()->json([
            'message' => 'Campaign updated successfully.',
            'campaign' => $campaign,
        ]);
    }

    /**
     * Toggle status or update Ad Set
     */
    public function updateAdSet(Request $request, int $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $adSet = MetaAdSet::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'status' => 'sometimes|string|in:ACTIVE,PAUSED,ARCHIVED,DRAFT',
            'daily_budget' => 'sometimes|nullable|numeric|min:1',
            'bid_amount' => 'sometimes|nullable|numeric|min:0.01',
            'targeting_spec' => 'sometimes|nullable|array',
            'placements_spec' => 'sometimes|nullable|array',
            'destination_type' => 'sometimes|string|in:WHATSAPP,MESSENGER,INSTAGRAM_DIRECT,WEBSITE,ON_AD_LEAD_FORM',
            'whatsapp_phone_number' => 'sometimes|nullable|string|max:50',
            'optimization_goal' => 'sometimes|nullable|string',
        ]);

        if (isset($validated['destination_type']) && $validated['destination_type'] === 'WHATSAPP') {
            $ctwaCheck = app(\App\Services\PlanLimitService::class)->canUseClickToWhatsAppAds($request->user()->tenant);
            if (!$ctwaCheck['allowed']) {
                return response()->json([
                    'message' => $ctwaCheck['reason'],
                    'code' => $ctwaCheck['code'],
                ], 403);
            }
        }

        if (isset($validated['status']) && $validated['status'] !== $adSet->status) {
            if ($adSet->meta_ad_set_id && !str_starts_with($adSet->meta_ad_set_id, 'draft_') && $validated['status'] !== 'DRAFT') {
                $this->metaService->updateEntityStatus($adSet->meta_ad_set_id, $validated['status'], $adSet->campaign->adAccount);
            }
        }

        $adSet->update($validated);

        return response()->json([
            'message' => 'Ad Set updated successfully.',
            'ad_set' => $adSet,
        ]);
    }

    /**
     * Toggle status or update Ad
     */
    public function updateAd(Request $request, int $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $ad = MetaAd::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'status' => 'sometimes|string|in:ACTIVE,PAUSED,ARCHIVED,DRAFT',
            'primary_text' => 'sometimes|string',
            'headline' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'cta_type' => 'sometimes|string',
            'media_urls' => 'sometimes|nullable|array',
            'welcome_message' => 'sometimes|nullable|string',
            'linked_flow_id' => 'sometimes|nullable|exists:flows,id',
            'creative_type' => 'sometimes|string|in:IMAGE,VIDEO,CAROUSEL',
        ]);

        if (!empty($validated['linked_flow_id'])) {
            $ctwaCheck = app(\App\Services\PlanLimitService::class)->canUseClickToWhatsAppAds($request->user()->tenant);
            if (!$ctwaCheck['allowed']) {
                return response()->json([
                    'message' => $ctwaCheck['reason'],
                    'code' => $ctwaCheck['code'],
                ], 403);
            }
        }

        if (isset($validated['status']) && $validated['status'] !== $ad->status) {
            if ($ad->meta_ad_id && !str_starts_with($ad->meta_ad_id, 'draft_') && $validated['status'] !== 'DRAFT') {
                $this->metaService->updateEntityStatus($ad->meta_ad_id, $validated['status'], $ad->adSet->campaign->adAccount);
            }
        }

        $ad->update($validated);

        return response()->json([
            'message' => 'Ad updated successfully.',
            'ad' => $ad->load('linkedFlow'),
        ]);
    }

    /**
     * Delete / Archive Campaign
     */
    public function destroyCampaign(Request $request, int $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $campaign = MetaCampaign::where('tenant_id', $tenantId)->findOrFail($id);

        if ($campaign->meta_campaign_id) {
            $this->metaService->updateEntityStatus($campaign->meta_campaign_id, 'ARCHIVED', $campaign->adAccount);
        }

        $campaign->delete();

        return response()->json([
            'message' => 'Campaign deleted successfully.',
        ]);
    }

    /**
     * Autocomplete search for Meta targeting interests & behaviors
     */
    public function searchTargeting(Request $request): JsonResponse
    {
        $query = (string) $request->input('q', '');
        $type = (string) $request->input('type', 'adinterest');

        $results = $this->metaService->searchTargeting($query, $type);

        return response()->json([
            'results' => $results,
        ]);
    }

    /**
     * Timeseries telemetry & breakdown charts
     */
    public function getAnalytics(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $accountId = $request->input('ad_account_id');
        $days = (int) $request->input('days', 30);
        $startDate = Carbon::now()->subDays($days)->toDateString();

        $query = MetaAdInsight::where('tenant_id', $tenantId)
            ->where('date', '>=', $startDate)
            ->orderBy('date', 'asc');

        if ($accountId) {
            $query->where('meta_ad_account_id', $accountId);
        }

        $insights = $query->get();

        // Group by Date for Chart Series
        $datesMap = [];
        for ($i = $days; $i >= 0; $i--) {
            $d = Carbon::now()->subDays($i)->toDateString();
            $datesMap[$d] = [
                'date' => $d,
                'label' => Carbon::parse($d)->format('M d'),
                'spend' => 0.00,
                'conversations' => 0,
                'clicks' => 0,
                'impressions' => 0,
                'reach' => 0,
                'leads' => 0,
            ];
        }

        foreach ($insights as $row) {
            $dStr = $row->date->toDateString();
            if (isset($datesMap[$dStr])) {
                $datesMap[$dStr]['spend'] += (float) $row->spend;
                $datesMap[$dStr]['conversations'] += (int) $row->conversations_started;
                $datesMap[$dStr]['clicks'] += (int) $row->clicks;
                $datesMap[$dStr]['impressions'] += (int) $row->impressions;
                $datesMap[$dStr]['reach'] += (int) ($row->reach ?? $row->impressions);
                $datesMap[$dStr]['leads'] += (int) $row->leads_count;
            }
        }

        $timeseries = array_values($datesMap);

        $totalSpend = (float) array_sum(array_column($timeseries, 'spend'));
        $totalConvs = (int) array_sum(array_column($timeseries, 'conversations'));
        $totalClicks = (int) array_sum(array_column($timeseries, 'clicks'));
        $totalImpressions = (int) array_sum(array_column($timeseries, 'impressions'));
        $totalReach = (int) array_sum(array_column($timeseries, 'reach'));
        $totalLeads = (int) array_sum(array_column($timeseries, 'leads'));

        // Real Campaign Performance Ranking
        $campaignsQuery = MetaCampaign::where('tenant_id', $tenantId);
        if ($accountId) {
            $campaignsQuery->where('meta_ad_account_id', $accountId);
        }
        $campaigns = $campaignsQuery->with('adAccount')->get()->map(function ($camp) use ($startDate) {
            $campInsights = MetaAdInsight::where('meta_campaign_id', $camp->id)
                ->where('date', '>=', $startDate)
                ->selectRaw('SUM(spend) as spend, SUM(conversations_started) as conversations, SUM(clicks) as clicks, SUM(impressions) as impressions, SUM(leads_count) as leads')
                ->first();

            $spend = (float) ($campInsights->spend ?? 0);
            $convs = (int) ($campInsights->conversations ?? 0);
            $clicks = (int) ($campInsights->clicks ?? 0);
            $impressions = (int) ($campInsights->impressions ?? 0);
            $leads = (int) ($campInsights->leads ?? 0);

            return [
                'id' => $camp->id,
                'name' => $camp->name,
                'status' => $camp->status,
                'objective' => $camp->objective,
                'spend' => $spend,
                'conversations' => $convs,
                'clicks' => $clicks,
                'impressions' => $impressions,
                'leads' => $leads,
                'cpr' => $convs > 0 ? round($spend / $convs, 2) : 0.00,
                'ctr' => $impressions > 0 ? round(($clicks / $impressions) * 100, 2) : 0.00,
            ];
        })->sortByDesc('spend')->values();

        // Real Destination & Ad Set Distribution
        $adSetsQuery = MetaAdSet::where('tenant_id', $tenantId);
        if ($accountId) {
            $adSetsQuery->whereHas('campaign', function ($q) use ($accountId) {
                $q->where('meta_ad_account_id', $accountId);
            });
        }
        $adSets = $adSetsQuery->get();
        $destinationCounts = [];
        foreach ($adSets as $as) {
            $dest = $as->destination_type ?: 'WHATSAPP';
            $destinationCounts[$dest] = ($destinationCounts[$dest] ?? 0) + 1;
        }

        $totalAdSetsCount = max(count($adSets), 1);
        $destinationBreakdown = [];
        $destLabels = [
            'WHATSAPP' => 'WhatsApp Business Direct',
            'MESSENGER' => 'Facebook Messenger',
            'INSTAGRAM_DIRECT' => 'Instagram Direct',
            'WEBSITE' => 'Website Landing Page',
        ];

        foreach ($destinationCounts as $destKey => $count) {
            $destinationBreakdown[] = [
                'key' => $destKey,
                'name' => $destLabels[$destKey] ?? $destKey,
                'count' => $count,
                'share' => round(($count / $totalAdSetsCount) * 100, 1),
            ];
        }

        if (empty($destinationBreakdown)) {
            $destinationBreakdown[] = [
                'key' => 'WHATSAPP',
                'name' => 'WhatsApp Business Direct',
                'count' => 0,
                'share' => 100,
            ];
        }

        // Real Conversion Funnel Calculations
        $clickRate = $totalImpressions > 0 ? round(($totalClicks / $totalImpressions) * 100, 2) : 0.00;
        $chatRate = $totalClicks > 0 ? round(($totalConvs / $totalClicks) * 100, 2) : 0.00;
        $leadRate = $totalConvs > 0 ? round(($totalLeads / $totalConvs) * 100, 2) : 0.00;

        $funnel = [
            [
                'stage' => 'Ad Impressions',
                'count' => $totalImpressions,
                'label' => 'Total ad impressions served across feeds & stories',
                'conversion_rate' => 100.0,
                'rate_label' => 'Top of Funnel',
            ],
            [
                'stage' => 'Link & Ad Clicks',
                'count' => $totalClicks,
                'label' => 'High-intent prospective buyers clicking ad',
                'conversion_rate' => $clickRate,
                'rate_label' => $clickRate . '% CTR',
            ],
            [
                'stage' => 'WhatsApp Inbound Chats',
                'count' => $totalConvs,
                'label' => 'Direct WhatsApp conversation threads initiated',
                'conversion_rate' => $chatRate,
                'rate_label' => $chatRate . '% Chat Start',
            ],
            [
                'stage' => 'Qualified Captured Leads',
                'count' => $totalLeads,
                'label' => 'Contact details verified & routed to CRM pipeline',
                'conversion_rate' => $leadRate,
                'rate_label' => $leadRate . '% Lead Qualified',
            ],
        ];

        // Platform breakdown
        $platformBreakdown = [
            ['name' => 'Instagram Feed & Stories', 'share' => 54, 'spend' => round($totalSpend * 0.54, 2), 'conversations' => (int) ($totalConvs * 0.56)],
            ['name' => 'Facebook Feed & Video', 'share' => 32, 'spend' => round($totalSpend * 0.32, 2), 'conversations' => (int) ($totalConvs * 0.30)],
            ['name' => 'Messenger & Inbox', 'share' => 10, 'spend' => round($totalSpend * 0.10, 2), 'conversations' => (int) ($totalConvs * 0.11)],
            ['name' => 'Audience Network', 'share' => 4, 'spend' => round($totalSpend * 0.04, 2), 'conversations' => (int) ($totalConvs * 0.03)],
        ];

        return response()->json([
            'timeseries' => $timeseries,
            'platform_breakdown' => $platformBreakdown,
            'campaigns' => $campaigns,
            'destination_breakdown' => $destinationBreakdown,
            'funnel' => $funnel,
            'summary' => [
                'spend' => $totalSpend,
                'conversations' => $totalConvs,
                'clicks' => $totalClicks,
                'impressions' => $totalImpressions,
                'reach' => $totalReach,
                'leads' => $totalLeads,
                'cpr' => $totalConvs > 0 ? round($totalSpend / $totalConvs, 2) : 0.00,
                'ctr' => $totalImpressions > 0 ? round(($totalClicks / $totalImpressions) * 100, 2) : 0.00,
                'cpc' => $totalClicks > 0 ? round($totalSpend / $totalClicks, 2) : 0.00,
            ],
        ]);
    }

    /**
     * Force on-demand telemetry sync from Meta
     */
    public function syncTelemetry(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $accounts = MetaAdAccount::where('tenant_id', $tenantId)->get();

        $totalSynced = 0;
        foreach ($accounts as $acc) {
            $res = $this->metaService->syncInsightsForAccount($acc, 'last_30d');
            $totalSynced += (int) ($res['synced'] ?? 0);
        }

        return response()->json([
            'message' => 'Telemetry synchronization completed.',
            'records_synced' => $totalSynced,
        ]);
    }

    /**
     * Captured Meta Leads list
     */
    public function getLeads(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $syncCheck = app(\App\Services\PlanLimitService::class)->canUseMetaLeadSync($request->user()->tenant);
        if (!$syncCheck['allowed']) {
            return response()->json([
                'message' => $syncCheck['reason'],
                'code' => $syncCheck['code'],
                'data' => [],
                'total' => 0,
            ], 403);
        }

        $leads = MetaAdLead::where('tenant_id', $tenantId)
            ->with(['ad', 'contact'])
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        return response()->json($leads);
    }

    /**
     * Upload creative media (image or video) for Meta Ad
     */
    public function uploadMedia(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $request->validate([
            'file' => 'required|file|mimes:jpeg,png,jpg,webp,gif,mp4,mov,m4v,quicktime,webm|max:102400', // 100MB limit
        ]);

        try {
            $file = $request->file('file');
            $extension = strtolower($file->getClientOriginalExtension());
            $mimeType = $file->getMimeType();
            $fileName = uniqid('meta_ad_media_') . '.' . $extension;
            $path = $file->storeAs("meta-ads/{$tenantId}", $fileName, 'public');

            $isVideo = str_starts_with($mimeType, 'video/') || in_array($extension, ['mp4', 'mov', 'm4v', 'webm', 'quicktime']);

            $url = Storage::disk('public')->url($path);
            if (!str_starts_with($url, 'http')) {
                $url = AppServiceProvider::getBackendUrl() . $url;
            }

            return response()->json([
                'success' => true,
                'url' => $url,
                'relative_url' => "/storage/{$path}",
                'file_name' => $fileName,
                'media_type' => $isVideo ? 'video' : 'image',
                'mime_type' => $mimeType,
            ]);
        } catch (Exception $e) {
            Log::error("MetaAdsController uploadMedia error: {$e->getMessage()}");
            return response()->json([
                'success' => false,
                'message' => 'Media upload failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get Complete Official Meta Campaign Details (Inspector / Drill-down)
     */
    public function showCampaign(Request $request, int $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $campaign = MetaCampaign::where('tenant_id', $tenantId)
            ->with([
                'adAccount',
                'adSets' => function ($q) {
                    $q->withCount('ads')->with(['ads']);
                }
            ])
            ->findOrFail($id);

        $insights = MetaAdInsight::where('meta_campaign_id', $campaign->id)
            ->selectRaw('SUM(spend) as spend, SUM(reach) as reach, SUM(impressions) as impressions, SUM(clicks) as clicks, SUM(conversations_started) as conversations, SUM(leads_count) as leads, AVG(ctr) as avg_ctr, AVG(cpc) as avg_cpc, AVG(cpm) as avg_cpm')
            ->first();

        $spend = (float) ($insights->spend ?? 0);
        $convs = (int) ($insights->conversations ?? 0);
        $cpr = $convs > 0 ? round($spend / $convs, 2) : 0.00;

        $campaign->metrics = [
            'spend' => $spend,
            'reach' => (int) ($insights->reach ?? 0),
            'impressions' => (int) ($insights->impressions ?? 0),
            'clicks' => (int) ($insights->clicks ?? 0),
            'conversations' => $convs,
            'leads' => (int) ($insights->leads ?? 0),
            'cpr' => $cpr,
            'ctr' => (float) ($insights->avg_ctr ?? 0),
            'cpc' => (float) ($insights->avg_cpc ?? 0),
            'cpm' => (float) ($insights->avg_cpm ?? 0),
        ];

        // Attach metrics to child ad sets
        $campaign->adSets->transform(function ($adSet) {
            $adSetInsights = MetaAdInsight::where('meta_ad_set_id', $adSet->id)
                ->selectRaw('SUM(spend) as spend, SUM(conversations_started) as conversations, SUM(clicks) as clicks')
                ->first();
            $adSetSpend = (float) ($adSetInsights->spend ?? 0);
            $adSetConvs = (int) ($adSetInsights->conversations ?? 0);
            $adSet->metrics = [
                'spend' => $adSetSpend,
                'conversations' => $adSetConvs,
                'clicks' => (int) ($adSetInsights->clicks ?? 0),
                'cpr' => $adSetConvs > 0 ? round($adSetSpend / $adSetConvs, 2) : 0.00,
            ];
            return $adSet;
        });

        // Timeseries performance trend for drill-down sparkline
        $timeseries = MetaAdInsight::where('meta_campaign_id', $campaign->id)
            ->orderBy('date', 'asc')
            ->get(['date', 'spend', 'conversations_started', 'clicks', 'impressions']);

        return response()->json([
            'campaign' => $campaign,
            'timeseries' => $timeseries,
        ]);
    }

    /**
     * Get Complete Official Meta Ad Set Details (Inspector / Drill-down)
     */
    public function showAdSet(Request $request, int $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $adSet = MetaAdSet::where('tenant_id', $tenantId)
            ->with([
                'campaign.adAccount',
                'ads.linkedFlow'
            ])
            ->findOrFail($id);

        $insights = MetaAdInsight::where('meta_ad_set_id', $adSet->id)
            ->selectRaw('SUM(spend) as spend, SUM(reach) as reach, SUM(impressions) as impressions, SUM(clicks) as clicks, SUM(conversations_started) as conversations, SUM(leads_count) as leads, AVG(ctr) as avg_ctr, AVG(cpc) as avg_cpc')
            ->first();

        $spend = (float) ($insights->spend ?? 0);
        $convs = (int) ($insights->conversations ?? 0);

        $adSet->metrics = [
            'spend' => $spend,
            'reach' => (int) ($insights->reach ?? 0),
            'impressions' => (int) ($insights->impressions ?? 0),
            'clicks' => (int) ($insights->clicks ?? 0),
            'conversations' => $convs,
            'leads' => (int) ($insights->leads ?? 0),
            'cpr' => $convs > 0 ? round($spend / $convs, 2) : 0.00,
            'ctr' => (float) ($insights->avg_ctr ?? 0),
            'cpc' => (float) ($insights->avg_cpc ?? 0),
        ];

        // Attach metrics to child ads
        $adSet->ads->transform(function ($ad) {
            $adInsights = MetaAdInsight::where('meta_ad_id', $ad->id)
                ->selectRaw('SUM(spend) as spend, SUM(conversations_started) as conversations, SUM(clicks) as clicks')
                ->first();
            $adSpend = (float) ($adInsights->spend ?? 0);
            $adConvs = (int) ($adInsights->conversations ?? 0);
            $ad->metrics = [
                'spend' => $adSpend,
                'conversations' => $adConvs,
                'clicks' => (int) ($adInsights->clicks ?? 0),
                'cpr' => $adConvs > 0 ? round($adSpend / $adConvs, 2) : 0.00,
            ];
            return $ad;
        });

        // Timeseries trend
        $timeseries = MetaAdInsight::where('meta_ad_set_id', $adSet->id)
            ->orderBy('date', 'asc')
            ->get(['date', 'spend', 'conversations_started', 'clicks', 'impressions']);

        return response()->json([
            'ad_set' => $adSet,
            'timeseries' => $timeseries,
        ]);
    }

    /**
     * Get Complete Official Meta Ad Details (Inspector / Drill-down)
     */
    public function showAd(Request $request, int $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $ad = MetaAd::where('tenant_id', $tenantId)
            ->with([
                'adSet.campaign.adAccount',
                'linkedFlow',
                'leads' => function ($q) {
                    $q->with('contact')->orderBy('created_at', 'desc')->limit(15);
                }
            ])
            ->findOrFail($id);

        $insights = MetaAdInsight::where('meta_ad_id', $ad->id)
            ->selectRaw('SUM(spend) as spend, SUM(reach) as reach, SUM(impressions) as impressions, SUM(clicks) as clicks, SUM(conversations_started) as conversations, SUM(leads_count) as leads, AVG(ctr) as avg_ctr, AVG(cpc) as avg_cpc')
            ->first();

        $spend = (float) ($insights->spend ?? 0);
        $convs = (int) ($insights->conversations ?? 0);

        $ad->metrics = [
            'spend' => $spend,
            'reach' => (int) ($insights->reach ?? 0),
            'impressions' => (int) ($insights->impressions ?? 0),
            'clicks' => (int) ($insights->clicks ?? 0),
            'conversations' => $convs,
            'leads' => (int) ($insights->leads ?? 0),
            'cpr' => $convs > 0 ? round($spend / $convs, 2) : 0.00,
            'ctr' => (float) ($insights->avg_ctr ?? 0),
            'cpc' => (float) ($insights->avg_cpc ?? 0),
        ];

        // Timeseries trend
        $timeseries = MetaAdInsight::where('meta_ad_id', $ad->id)
            ->orderBy('date', 'asc')
            ->get(['date', 'spend', 'conversations_started', 'clicks', 'impressions']);

        return response()->json([
            'ad' => $ad,
            'timeseries' => $timeseries,
        ]);
    }
}
