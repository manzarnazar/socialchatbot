<?php

namespace Database\Seeders;

use App\Models\Contact;
use App\Models\Flow;
use App\Models\MetaAd;
use App\Models\MetaAdAccount;
use App\Models\MetaAdInsight;
use App\Models\MetaAdLead;
use App\Models\MetaAdSet;
use App\Models\MetaCampaign;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MetaAdsDummyDataSeeder extends Seeder
{
    /**
     * Seed realistic Meta Ads dummy data for ncodeslab@gmail.com
     */
    public function run(): void
    {
        $user = User::where('email', 'ncodeslab@gmail.com')->first();
        if (!$user) {
            $user = User::first();
        }

        $tenantId = $user ? $user->tenant_id : 1;
        $tenant = Tenant::find($tenantId);

        if (!$tenant) {
            $this->command->error("Tenant ID {$tenantId} not found.");
            return;
        }

        $this->command->info("Seeding Meta Ads dummy data for user {$user->email} (Tenant ID: {$tenantId})...");

        // Optional Flow for linking
        $flow = Flow::where('tenant_id', $tenantId)->first();
        $flowId = $flow ? $flow->id : null;

        DB::transaction(function () use ($tenantId, $flowId) {
            // 1. Clean existing Meta Ads data for clean presentation
            MetaAdLead::where('tenant_id', $tenantId)->delete();
            MetaAdInsight::where('tenant_id', $tenantId)->delete();
            MetaAd::where('tenant_id', $tenantId)->delete();
            MetaAdSet::where('tenant_id', $tenantId)->delete();
            MetaCampaign::where('tenant_id', $tenantId)->delete();
            MetaAdAccount::where('tenant_id', $tenantId)->delete();

            // 2. Create 3 Connected Meta Ad Accounts
            $accountUsd = MetaAdAccount::create([
                'tenant_id' => $tenantId,
                'meta_ad_account_id' => 'act_492019482910',
                'account_name' => 'WhatsOmni Global Growth',
                'account_status' => 'ACTIVE',
                'currency' => 'USD',
                'timezone_name' => 'America/New_York',
                'spend_cap' => 15000.00,
                'amount_spent' => 4892.40,
                'balance' => 0.00,
                'access_token' => 'EAAB_test_system_user_token_growth_usd_9921',
                'is_default' => true,
                'metadata' => [
                    'business_name' => 'N Codes Lab Enterprise',
                    'verified' => true,
                    'pixel_id' => '9827103847192',
                ],
            ]);

            $accountEur = MetaAdAccount::create([
                'tenant_id' => $tenantId,
                'meta_ad_account_id' => 'act_819204820194',
                'account_name' => 'VIP Retargeting & Brand EU',
                'account_status' => 'ACTIVE',
                'currency' => 'EUR',
                'timezone_name' => 'Europe/London',
                'spend_cap' => 8000.00,
                'amount_spent' => 2340.10,
                'balance' => 0.00,
                'access_token' => 'EAAB_test_eu_token_direct_sales_8192',
                'is_default' => false,
                'metadata' => [
                    'business_name' => 'N Codes Lab Europe',
                    'verified' => true,
                ],
            ]);

            $accountCad = MetaAdAccount::create([
                'tenant_id' => $tenantId,
                'meta_ad_account_id' => 'act_302918475820',
                'account_name' => 'Holiday Flash Sale & Performance',
                'account_status' => 'ACTIVE',
                'currency' => 'CAD',
                'timezone_name' => 'America/Toronto',
                'spend_cap' => 12000.00,
                'amount_spent' => 3120.50,
                'balance' => 0.00,
                'access_token' => 'EAAB_test_cad_performance_token_3029',
                'is_default' => false,
                'metadata' => [
                    'business_name' => 'N Codes Lab Canada',
                    'verified' => true,
                ],
            ]);

            // 3. Create Campaigns for Account USD
            $campaign1 = MetaCampaign::create([
                'tenant_id' => $tenantId,
                'meta_ad_account_id' => $accountUsd->id,
                'meta_campaign_id' => 'cmp_6019283748291',
                'name' => 'WhatsApp VIP Acquisition & Lead Gen (Advantage+)',
                'objective' => 'MESSAGES',
                'buying_type' => 'AUCTION',
                'status' => 'ACTIVE',
                'budget_mode' => 'CBO',
                'daily_budget' => 65.00,
                'special_ad_categories' => ['NONE'],
                'metadata' => ['bid_strategy' => 'LOWEST_COST_WITHOUT_CAP'],
            ]);

            $campaign2 = MetaCampaign::create([
                'tenant_id' => $tenantId,
                'meta_ad_account_id' => $accountUsd->id,
                'meta_campaign_id' => 'cmp_7019283748292',
                'name' => 'Festive Flash Sale CTWA Broadcast',
                'objective' => 'MESSAGES',
                'buying_type' => 'AUCTION',
                'status' => 'ACTIVE',
                'budget_mode' => 'CBO',
                'daily_budget' => 45.00,
                'special_ad_categories' => ['NONE'],
                'metadata' => ['bid_strategy' => 'LOWEST_COST_WITHOUT_CAP'],
            ]);

            $campaign3 = MetaCampaign::create([
                'tenant_id' => $tenantId,
                'meta_ad_account_id' => $accountUsd->id,
                'meta_campaign_id' => 'cmp_8019283748293',
                'name' => 'High-Intent Retargeting Direct Chat',
                'objective' => 'MESSAGES',
                'buying_type' => 'AUCTION',
                'status' => 'PAUSED',
                'budget_mode' => 'ABO',
                'daily_budget' => 30.00,
                'special_ad_categories' => ['NONE'],
                'metadata' => ['bid_strategy' => 'COST_CAP'],
            ]);

            // Campaign for Account EUR
            $campaign4 = MetaCampaign::create([
                'tenant_id' => $tenantId,
                'meta_ad_account_id' => $accountEur->id,
                'meta_campaign_id' => 'cmp_9019283748294',
                'name' => 'Enterprise Demo & Consultation Inbound',
                'objective' => 'LEAD_GENERATION',
                'buying_type' => 'AUCTION',
                'status' => 'ACTIVE',
                'budget_mode' => 'CBO',
                'daily_budget' => 50.00,
                'special_ad_categories' => ['NONE'],
                'metadata' => ['bid_strategy' => 'LOWEST_COST_WITHOUT_CAP'],
            ]);

            // Campaign for Account CAD
            $campaign5 = MetaCampaign::create([
                'tenant_id' => $tenantId,
                'meta_ad_account_id' => $accountCad->id,
                'meta_campaign_id' => 'cmp_5019283748295',
                'name' => 'Holiday Direct WhatsApp Shopping Promo',
                'objective' => 'MESSAGES',
                'buying_type' => 'AUCTION',
                'status' => 'ACTIVE',
                'budget_mode' => 'CBO',
                'daily_budget' => 55.00,
                'special_ad_categories' => ['NONE'],
                'metadata' => ['bid_strategy' => 'LOWEST_COST_WITHOUT_CAP'],
            ]);

            // 4. Create Ad Sets
            $adSet1 = MetaAdSet::create([
                'tenant_id' => $tenantId,
                'meta_campaign_id' => $campaign1->id,
                'meta_ad_set_id' => 'adset_1029384756',
                'name' => 'Tier-1 High Income Inbound Buyers (US, GB, CA, AE) - 22-55',
                'status' => 'ACTIVE',
                'optimization_goal' => 'CONVERSATIONS',
                'billing_event' => 'IMPRESSIONS',
                'daily_budget' => 35.00,
                'start_time' => Carbon::now()->subDays(30),
                'destination_type' => 'WHATSAPP',
                'whatsapp_phone_number' => '+15550192834',
                'targeting_spec' => [
                    'locations' => ['US', 'GB', 'CA', 'AE'],
                    'age_min' => 22,
                    'age_max' => 55,
                    'gender' => 'ALL',
                    'interests' => ['E-commerce', 'Online Shopping', 'WhatsApp Marketing', 'Small Business'],
                ],
                'placements_spec' => ['advantage_plus' => true],
            ]);

            $adSet2 = MetaAdSet::create([
                'tenant_id' => $tenantId,
                'meta_campaign_id' => $campaign1->id,
                'meta_ad_set_id' => 'adset_2029384757',
                'name' => 'Lookalike WhatsApp Purchasers (Top 1%)',
                'status' => 'ACTIVE',
                'optimization_goal' => 'CONVERSATIONS',
                'billing_event' => 'IMPRESSIONS',
                'daily_budget' => 30.00,
                'start_time' => Carbon::now()->subDays(25),
                'destination_type' => 'WHATSAPP',
                'whatsapp_phone_number' => '+15550192834',
                'targeting_spec' => [
                    'locations' => ['US', 'CA', 'AU'],
                    'age_min' => 25,
                    'age_max' => 50,
                    'gender' => 'ALL',
                    'interests' => ['Luxury Goods', 'Direct Marketing', 'SaaS & Software'],
                ],
                'placements_spec' => ['advantage_plus' => true],
            ]);

            $adSet3 = MetaAdSet::create([
                'tenant_id' => $tenantId,
                'meta_campaign_id' => $campaign2->id,
                'meta_ad_set_id' => 'adset_3029384758',
                'name' => 'Engaged WhatsApp VIP Subscribers & Promo Seekers',
                'status' => 'ACTIVE',
                'optimization_goal' => 'CONVERSATIONS',
                'billing_event' => 'IMPRESSIONS',
                'daily_budget' => 45.00,
                'start_time' => Carbon::now()->subDays(20),
                'destination_type' => 'WHATSAPP',
                'whatsapp_phone_number' => '+15550192834',
                'targeting_spec' => [
                    'locations' => ['US', 'GB', 'IN', 'AE', 'SA'],
                    'age_min' => 18,
                    'age_max' => 60,
                    'gender' => 'ALL',
                    'interests' => ['Online Shopping', 'Coupons', 'Retail Storefront'],
                ],
                'placements_spec' => ['advantage_plus' => true],
            ]);

            $adSet4 = MetaAdSet::create([
                'tenant_id' => $tenantId,
                'meta_campaign_id' => $campaign3->id,
                'meta_ad_set_id' => 'adset_4029384759',
                'name' => 'Cart Abandoners & Repeat Visitors (14 Days)',
                'status' => 'PAUSED',
                'optimization_goal' => 'CONVERSATIONS',
                'billing_event' => 'IMPRESSIONS',
                'daily_budget' => 30.00,
                'start_time' => Carbon::now()->subDays(15),
                'destination_type' => 'WHATSAPP',
                'whatsapp_phone_number' => '+15550192834',
                'targeting_spec' => [
                    'locations' => ['US', 'CA'],
                    'age_min' => 20,
                    'age_max' => 65,
                    'gender' => 'ALL',
                    'interests' => ['E-commerce'],
                ],
                'placements_spec' => ['advantage_plus' => true],
            ]);

            $adSet5 = MetaAdSet::create([
                'tenant_id' => $tenantId,
                'meta_campaign_id' => $campaign4->id,
                'meta_ad_set_id' => 'adset_5029384760',
                'name' => 'EU B2B Marketing & Sales Directors',
                'status' => 'ACTIVE',
                'optimization_goal' => 'LEAD_GENERATION',
                'billing_event' => 'IMPRESSIONS',
                'daily_budget' => 50.00,
                'start_time' => Carbon::now()->subDays(20),
                'destination_type' => 'WHATSAPP',
                'whatsapp_phone_number' => '+15550192834',
                'targeting_spec' => [
                    'locations' => ['GB', 'DE', 'FR', 'NL'],
                    'age_min' => 28,
                    'age_max' => 58,
                    'gender' => 'ALL',
                    'interests' => ['Digital Advertising', 'Lead Generation', 'SaaS & Software'],
                ],
                'placements_spec' => ['advantage_plus' => true],
            ]);

            $adSet6 = MetaAdSet::create([
                'tenant_id' => $tenantId,
                'meta_campaign_id' => $campaign5->id,
                'meta_ad_set_id' => 'adset_6029384761',
                'name' => 'Canada Omnichannel Mobile Shoppers',
                'status' => 'ACTIVE',
                'optimization_goal' => 'CONVERSATIONS',
                'billing_event' => 'IMPRESSIONS',
                'daily_budget' => 55.00,
                'start_time' => Carbon::now()->subDays(18),
                'destination_type' => 'WHATSAPP',
                'whatsapp_phone_number' => '+15550192834',
                'targeting_spec' => [
                    'locations' => ['CA'],
                    'age_min' => 21,
                    'age_max' => 52,
                    'gender' => 'ALL',
                    'interests' => ['Mobile Shopping', 'Discounts', 'E-commerce'],
                ],
                'placements_spec' => ['advantage_plus' => true],
            ]);

            // 5. Create Ads
            $ad1 = MetaAd::create([
                'tenant_id' => $tenantId,
                'meta_ad_set_id' => $adSet1->id,
                'meta_ad_id' => 'ad_1122334455',
                'name' => 'Claim 25% Off VIP WhatsApp Discount',
                'status' => 'ACTIVE',
                'creative_type' => 'IMAGE',
                'primary_text' => 'Unlock instant VIP access, connect with our concierge team on WhatsApp, and receive your 25% welcome promo code immediately!',
                'headline' => 'Chat Directly With Us on WhatsApp',
                'description' => 'Instant 24/7 automated support & tailored offers',
                'cta_type' => 'WHATSAPP_MESSAGE',
                'media_urls' => ['https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&auto=format&fit=crop&q=80'],
                'welcome_message' => 'Hi there! I saw your ad on Instagram and would like to claim my 25% discount voucher.',
                'linked_flow_id' => $flowId,
                'meta_preview_url' => 'https://facebook.com/ads/preview/demo1',
            ]);

            $ad2 = MetaAd::create([
                'tenant_id' => $tenantId,
                'meta_ad_set_id' => $adSet2->id,
                'meta_ad_id' => 'ad_2233445566',
                'name' => 'Fast 1-on-1 Consultation & Interactive Demo',
                'status' => 'ACTIVE',
                'creative_type' => 'IMAGE',
                'primary_text' => 'Discover how WhatsOmni unifies WhatsApp, Messenger, and Instagram into one high-converting inbox. Start a live interactive demo now!',
                'headline' => 'Book Your 1-on-1 WhatsApp Demo',
                'description' => 'Get real-time answers and guided setup in minutes',
                'cta_type' => 'WHATSAPP_MESSAGE',
                'media_urls' => ['https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop&q=80'],
                'welcome_message' => 'Hello! I want to schedule a live product consultation on WhatsApp.',
                'linked_flow_id' => $flowId,
                'meta_preview_url' => 'https://facebook.com/ads/preview/demo2',
            ]);

            $ad3 = MetaAd::create([
                'tenant_id' => $tenantId,
                'meta_ad_set_id' => $adSet3->id,
                'meta_ad_id' => 'ad_3344556677',
                'name' => 'Early Access VIP Flash Sale',
                'status' => 'ACTIVE',
                'creative_type' => 'IMAGE',
                'primary_text' => 'Exclusive limited-time promo! Send a message on WhatsApp to unlock early bird codes before stock runs out.',
                'headline' => 'Claim Early Bird Flash Sale Code',
                'description' => 'Instant automated WhatsApp code generator',
                'cta_type' => 'WHATSAPP_MESSAGE',
                'media_urls' => ['https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80'],
                'welcome_message' => 'Hi! Please send me the flash sale coupon code.',
                'linked_flow_id' => $flowId,
                'meta_preview_url' => 'https://facebook.com/ads/preview/demo3',
            ]);

            $ad4 = MetaAd::create([
                'tenant_id' => $tenantId,
                'meta_ad_set_id' => $adSet5->id,
                'meta_ad_id' => 'ad_5566778899',
                'name' => 'Enterprise Omnichannel Growth Assessment',
                'status' => 'ACTIVE',
                'creative_type' => 'IMAGE',
                'primary_text' => 'Scale your revenue with automated CTWA funnels and smart team routing. Talk to our enterprise solutions team.',
                'headline' => 'WhatsApp Enterprise Solutions',
                'description' => 'Custom multi-channel enterprise architecture',
                'cta_type' => 'WHATSAPP_MESSAGE',
                'media_urls' => ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'],
                'welcome_message' => 'Hello! We are looking for an enterprise WhatsApp setup.',
                'linked_flow_id' => $flowId,
                'meta_preview_url' => 'https://facebook.com/ads/preview/demo4',
            ]);

            $ad5 = MetaAd::create([
                'tenant_id' => $tenantId,
                'meta_ad_set_id' => $adSet6->id,
                'meta_ad_id' => 'ad_6677889900',
                'name' => 'Holiday Direct Mobile Discount',
                'status' => 'ACTIVE',
                'creative_type' => 'IMAGE',
                'primary_text' => 'Direct WhatsApp customer care and instant shopping checkout. Tap below to start chatting!',
                'headline' => 'Shop on WhatsApp in Seconds',
                'description' => 'Instant catalog browsing & order tracking',
                'cta_type' => 'WHATSAPP_MESSAGE',
                'media_urls' => ['https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&auto=format&fit=crop&q=80'],
                'welcome_message' => 'Hello! I want to browse your holiday products on WhatsApp.',
                'linked_flow_id' => $flowId,
                'meta_preview_url' => 'https://facebook.com/ads/preview/demo5',
            ]);

            // 6. Generate 30 Days of Daily Insights Timeseries for all accounts
            $baseSpend = [85, 92, 110, 105, 125, 140, 130, 115, 120, 145, 160, 150, 135, 140, 155, 170, 165, 150, 160, 175, 190, 185, 170, 180, 195, 210, 205, 190, 200, 220];

            for ($i = 29; $i >= 0; $i--) {
                $dayIndex = 29 - $i;
                $date = Carbon::now()->subDays($i)->toDateString();
                $spend = (float) ($baseSpend[$dayIndex] ?? 120.00);
                $impressions = (int) round($spend * 24.5 + rand(-80, 120));
                $reach = (int) round($impressions * 0.74);
                $clicks = (int) round($impressions * 0.038 + rand(-5, 15));
                $convs = (int) round($clicks * 0.22 + rand(-2, 5));
                $leads = (int) round($convs * 0.45 + rand(0, 3));
                $purchases = (int) round($leads * 0.35 + rand(0, 2));
                $purchaseVal = round($purchases * 75.00 + rand(10, 50), 2);
                $cpr = $convs > 0 ? round($spend / $convs, 2) : 0.00;
                $ctr = $impressions > 0 ? round(($clicks / $impressions) * 100, 2) : 0.00;
                $cpc = $clicks > 0 ? round($spend / $clicks, 2) : 0.00;
                $cpm = $impressions > 0 ? round(($spend / $impressions) * 1000, 2) : 0.00;
                $roas = $spend > 0 ? round($purchaseVal / $spend, 2) : 0.00;

                // Account 1 (USD) Insights
                MetaAdInsight::create([
                    'tenant_id' => $tenantId,
                    'meta_ad_account_id' => $accountUsd->id,
                    'meta_campaign_id' => $campaign1->id,
                    'meta_ad_set_id' => $adSet1->id,
                    'meta_ad_id' => $ad1->id,
                    'date' => $date,
                    'impressions' => $impressions,
                    'reach' => $reach,
                    'spend' => $spend,
                    'clicks' => $clicks,
                    'ctr' => $ctr,
                    'cpc' => $cpc,
                    'cpm' => $cpm,
                    'conversations_started' => $convs,
                    'cost_per_conversation' => $cpr,
                    'leads_count' => $leads,
                    'purchases_count' => $purchases,
                    'purchase_value' => $purchaseVal,
                    'roas' => $roas,
                ]);

                MetaAdInsight::create([
                    'tenant_id' => $tenantId,
                    'meta_ad_account_id' => $accountUsd->id,
                    'meta_campaign_id' => $campaign2->id,
                    'meta_ad_set_id' => $adSet3->id,
                    'meta_ad_id' => $ad3->id,
                    'date' => $date,
                    'impressions' => (int) round($impressions * 0.6),
                    'reach' => (int) round($reach * 0.6),
                    'spend' => round($spend * 0.5, 2),
                    'clicks' => (int) round($clicks * 0.6),
                    'ctr' => $ctr,
                    'cpc' => $cpc,
                    'cpm' => $cpm,
                    'conversations_started' => (int) round($convs * 0.6),
                    'cost_per_conversation' => $cpr,
                    'leads_count' => (int) round($leads * 0.5),
                    'purchases_count' => (int) round($purchases * 0.5),
                    'purchase_value' => round($purchaseVal * 0.5, 2),
                    'roas' => $roas,
                ]);

                // Account 2 (EUR) Insights
                MetaAdInsight::create([
                    'tenant_id' => $tenantId,
                    'meta_ad_account_id' => $accountEur->id,
                    'meta_campaign_id' => $campaign4->id,
                    'meta_ad_set_id' => $adSet5->id,
                    'meta_ad_id' => $ad4->id,
                    'date' => $date,
                    'impressions' => (int) round($impressions * 0.75),
                    'reach' => (int) round($reach * 0.75),
                    'spend' => round($spend * 0.7, 2),
                    'clicks' => (int) round($clicks * 0.75),
                    'ctr' => $ctr,
                    'cpc' => $cpc,
                    'cpm' => $cpm,
                    'conversations_started' => (int) round($convs * 0.7),
                    'cost_per_conversation' => $cpr,
                    'leads_count' => (int) round($leads * 0.7),
                    'purchases_count' => (int) round($purchases * 0.7),
                    'purchase_value' => round($purchaseVal * 0.7, 2),
                    'roas' => $roas,
                ]);

                // Account 3 (CAD) Insights
                MetaAdInsight::create([
                    'tenant_id' => $tenantId,
                    'meta_ad_account_id' => $accountCad->id,
                    'meta_campaign_id' => $campaign5->id,
                    'meta_ad_set_id' => $adSet6->id,
                    'meta_ad_id' => $ad5->id,
                    'date' => $date,
                    'impressions' => (int) round($impressions * 0.85),
                    'reach' => (int) round($reach * 0.85),
                    'spend' => round($spend * 0.8, 2),
                    'clicks' => (int) round($clicks * 0.85),
                    'ctr' => $ctr,
                    'cpc' => $cpc,
                    'cpm' => $cpm,
                    'conversations_started' => (int) round($convs * 0.8),
                    'cost_per_conversation' => $cpr,
                    'leads_count' => (int) round($leads * 0.8),
                    'purchases_count' => (int) round($purchases * 0.8),
                    'purchase_value' => round($purchaseVal * 0.8, 2),
                    'roas' => $roas,
                ]);
            }

            // 7. Seed sample Inbound Leads linked to Contacts
            $sampleContacts = [
                ['first_name' => 'Sarah', 'last_name' => 'Jenkins', 'phone' => '+14158901234', 'email' => 'sarah.jenkins@techcorp.io', 'city' => 'San Francisco', 'query' => 'Looking to connect WhatsApp CTWA ads with our Shopify store.'],
                ['first_name' => 'Alex', 'last_name' => 'Rivera', 'phone' => '+447700900123', 'email' => 'alex.rivera@growthhub.co.uk', 'city' => 'London', 'query' => 'Saw the 25% VIP coupon ad on Instagram, please activate our promo.'],
                ['first_name' => 'Mohammed', 'last_name' => 'Al-Mansoor', 'phone' => '+971501234567', 'email' => 'm.mansoor@dubaimarkets.ae', 'city' => 'Dubai', 'query' => 'Need an enterprise WhatsApp multi-agent setup for real estate.'],
                ['first_name' => 'Elena', 'last_name' => 'Rostova', 'phone' => '+4915123456789', 'email' => 'elena@berlindigital.de', 'city' => 'Berlin', 'query' => 'Claimed festive promo code and requesting catalog download.'],
                ['first_name' => 'David', 'last_name' => 'Kim', 'phone' => '+12125550182', 'email' => 'david.kim@retailnext.com', 'city' => 'New York', 'query' => 'Interested in automated lead qualification flow.'],
            ];

            foreach ($sampleContacts as $idx => $sc) {
                $contact = Contact::updateOrCreate(
                    [
                        'tenant_id' => $tenantId,
                        'phone' => $sc['phone'],
                    ],
                    [
                        'first_name' => $sc['first_name'],
                        'last_name' => $sc['last_name'],
                        'email' => $sc['email'],
                        'tags' => ['Meta Ads Lead', 'CTWA VIP'],
                    ]
                );

                $fullName = $sc['first_name'] . ' ' . $sc['last_name'];
                MetaAdLead::create([
                    'tenant_id' => $tenantId,
                    'meta_ad_id' => ($idx % 2 === 0) ? $ad1->id : $ad2->id,
                    'meta_lead_id' => 'lead_meta_' . ($idx + 1001),
                    'meta_form_id' => 'form_ctwa_' . ($idx + 501),
                    'contact_id' => $contact->id,
                    'form_data' => [
                        'full_name' => $fullName,
                        'phone_number' => $sc['phone'],
                        'email' => $sc['email'],
                        'city' => $sc['city'],
                        'initial_message' => $sc['query'],
                        'ad_name' => ($idx % 2 === 0) ? $ad1->name : $ad2->name,
                    ],
                    'status' => 'CONVERTED',
                ]);
            }
        });

        $this->command->info("Meta Ads dummy data seeded successfully for user {$user->email}!");
    }
}
