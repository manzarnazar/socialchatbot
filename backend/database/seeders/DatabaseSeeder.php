<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with production-ready defaults.
     */
    public function run(): void
    {
        // 1. Seed Global Currencies
        $currencies = [
            ['code' => 'USD', 'symbol' => '$', 'name' => 'US Dollar', 'is_active' => true, 'is_default' => true, 'payment_gateway' => 'stripe'],
            ['code' => 'EUR', 'symbol' => '€', 'name' => 'Euro', 'is_active' => true, 'is_default' => false, 'payment_gateway' => 'stripe'],
            ['code' => 'GBP', 'symbol' => '£', 'name' => 'British Pound', 'is_active' => true, 'is_default' => false, 'payment_gateway' => 'stripe'],
            ['code' => 'CAD', 'symbol' => 'C$', 'name' => 'Canadian Dollar', 'is_active' => true, 'is_default' => false, 'payment_gateway' => 'stripe'],
            ['code' => 'AUD', 'symbol' => 'A$', 'name' => 'Australian Dollar', 'is_active' => true, 'is_default' => false, 'payment_gateway' => 'stripe'],
            ['code' => 'INR', 'symbol' => '₹', 'name' => 'Indian Rupee', 'is_active' => true, 'is_default' => false, 'payment_gateway' => 'razorpay'],
            ['code' => 'NGN', 'symbol' => '₦', 'name' => 'Nigerian Naira', 'is_active' => true, 'is_default' => false, 'payment_gateway' => 'paystack'],
            ['code' => 'BRL', 'symbol' => 'R$', 'name' => 'Brazilian Real', 'is_active' => true, 'is_default' => false, 'payment_gateway' => 'mercadopago'],
            ['code' => 'AED', 'symbol' => 'د.إ', 'name' => 'UAE Dirham', 'is_active' => true, 'is_default' => false, 'payment_gateway' => 'myfatoorah'],
        ];

        $currencyIds = [];
        foreach ($currencies as $curr) {
            $existing = DB::table('currencies')->where('code', $curr['code'])->first();
            if (!$existing) {
                $id = DB::table('currencies')->insertGetId([
                    'code' => $curr['code'],
                    'symbol' => $curr['symbol'],
                    'name' => $curr['name'],
                    'is_active' => $curr['is_active'],
                    'is_default' => $curr['is_default'],
                    'payment_gateway' => $curr['payment_gateway'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $currencyIds[$curr['code']] = $id;
            } else {
                $currencyIds[$curr['code']] = $existing->id;
            }
        }

        // 2. Seed default system roles (tenant_id = null)
        $roles = [
            'owner' => [
                'display_name' => 'Owner',
                'permissions' => [
                    'dashboard' => ['view'],
                    'inbox' => ['read', 'write'],
                    'contacts' => ['read', 'write'],
                    'campaigns' => ['read', 'write'],
                    'flows' => ['read', 'write'],
                    'settings' => ['read', 'write'],
                ]
            ],
            'admin' => [
                'display_name' => 'Admin',
                'permissions' => [
                    'dashboard' => ['view'],
                    'inbox' => ['read', 'write'],
                    'contacts' => ['read', 'write'],
                    'campaigns' => ['read', 'write'],
                    'flows' => ['read', 'write'],
                    'settings' => ['read', 'write'],
                ]
            ],
            'manager' => [
                'display_name' => 'Manager',
                'permissions' => [
                    'dashboard' => ['view'],
                    'inbox' => ['read', 'write'],
                    'contacts' => ['read', 'write'],
                    'campaigns' => ['read', 'write'],
                    'flows' => ['read', 'write'],
                    'settings' => ['read'],
                ]
            ],
            'agent' => [
                'display_name' => 'Agent',
                'permissions' => [
                    'dashboard' => ['view'],
                    'inbox' => ['read', 'write'],
                    'contacts' => ['read'],
                    'campaigns' => [],
                    'flows' => [],
                    'settings' => [],
                ]
            ],
        ];

        foreach ($roles as $rName => $rMeta) {
            DB::table('roles')->updateOrInsert(
                ['tenant_id' => null, 'name' => $rName],
                [
                    'display_name' => $rMeta['display_name'],
                    'permissions' => json_encode($rMeta['permissions']),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // 3. Seed Super Admin Role & User
        $superAdminRole = DB::table('saas_admin_roles')->where('name', 'Super Admin')->first();
        if (!$superAdminRole) {
            $adminRoleId = DB::table('saas_admin_roles')->insertGetId([
                'name' => 'Super Admin',
                'permissions' => json_encode(['*']),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $adminRoleId = $superAdminRole->id;
        }

        DB::table('saas_admins')->updateOrInsert(
            ['email' => 'admin@whatsomni.com'],
            [
                'role_id' => $adminRoleId,
                'first_name' => 'Super',
                'last_name' => 'Admin',
                'password' => Hash::make('Password123!'),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // 4. Seed Platform Settings
        $defaultPlatformSettings = [
            'ai_operational_model' => 'byok',
            'ai_providers_keys' => [
                'openai' => '',
                'anthropic' => '',
                'gemini' => '',
                'groq' => '',
                'deepseek' => '',
                'xai' => '',
                'mistral' => '',
                'openrouter' => '',
            ],
            'ai_feature_routing' => [
                'prompt_to_flow' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
                'flow_ai_condition' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
                'flow_ai_prompt' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
                'flow_rag_query' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
                'ai_agents' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
                'inbox_smart_reply' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
                'inbox_conversation_summary' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
                'contact_sentiment_analysis' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
                'knowledge_base_rag' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
                'campaign_copywriter' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
            ],
            'branding_name' => 'WhatsOmni',
            'branding_tagline' => 'All-in-One Omnichannel Marketing, CRM & AI Automation Platform',
            'support_email' => 'support@whatsomni.com',
            'channel_connection_modes' => [
                'official_cloud_api' => true,
                'qr_standalone_worker' => true,
            ],
        ];

        foreach ($defaultPlatformSettings as $sKey => $sVal) {
            DB::table('platform_settings')->updateOrInsert(
                ['key' => $sKey],
                [
                    'value' => is_array($sVal) ? json_encode($sVal) : json_encode($sVal),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // 5. Seed Custom CMS Legal Pages
        $defaultPages = [
            [
                'slug' => 'terms',
                'title' => 'Terms of Service',
                'content' => '<h1>Terms & Conditions</h1><p><em>Last updated: October 2026</em></p><p>Please read these Terms & Conditions carefully before using our website and services. By accessing or registering an account, you agree to be bound by these terms.</p><h2>1. Service Terms</h2><p>Our platform provides software-as-a-service tools for multi-channel messaging, visual workflow design, AI agent integration, and customer relationship management.</p><h2>2. User Responsibilities</h2><p>You agree to use the platform in compliance with all applicable local, national, and international laws, as well as channel-specific policies (including WhatsApp Business terms and anti-spam regulations).</p><h2>3. Subscriptions & Billing</h2><p>Platform services are billed on a recurring basis according to your selected plan. You may upgrade, downgrade, or cancel your subscription at any time via your billing settings.</p><h2>4. Limitation of Liability</h2><p>In no event shall the platform be liable for indirect, incidental, or consequential damages arising out of your use or inability to use the service.</p><h2>5. Contact Us</h2><p>For legal inquiries, terms clarification, or notices, contact our compliance team at support@whatsomni.com.</p>',
                'meta_description' => 'Official terms and conditions for using WhatsOmni platform services.',
                'is_published' => true,
            ],
            [
                'slug' => 'privacy',
                'title' => 'Privacy Policy',
                'content' => '<h1>Privacy Policy</h1><p><em>Last updated: October 2026</em></p><p>We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, store, and safeguard information when you use our services.</p><h2>1. Information We Collect</h2><p>We collect information provided directly by you, including your name, email address, phone number, payment details, and workspace configurations, as well as data transmitted via connected messaging channels.</p><h2>2. How We Use Your Data</h2><p>Your data is processed to provide core platform services, manage billing, deliver automated messaging flows, maintain security, and continuously improve customer experience.</p><h2>3. Data Protection & Security</h2><p>All sensitive information, including API keys, tokens, and stored messages, is encrypted at rest and in transit using industry-standard protocols. Access permissions are strictly scoped to authenticated workspace users.</p><h2>4. Contact Us</h2><p>If you have any questions or concerns regarding our privacy practices, please contact our support team at support@whatsomni.com.</p>',
                'meta_description' => 'Learn how WhatsOmni protects and manages your data privacy.',
                'is_published' => true,
            ],
            [
                'slug' => 'about',
                'title' => 'About Us',
                'content' => '<h1>About WhatsOmni</h1><p>WhatsOmni is the next-generation omnichannel marketing, sales CRM, and AI automation platform built for modern businesses, agencies, and SaaS operators.</p><h2>Our Mission</h2><p>Our mission is to empower teams to engage their customers across WhatsApp, Instagram, Messenger, Telegram, and Email with unified conversational context and automated AI assistants.</p><h2>Enterprise Architecture</h2><p>Engineered with sub-second webhook ingestion, multi-tenant workspace isolation, and state-of-the-art conversational workflows.</p>',
                'meta_description' => 'Discover the story, mission, and technology behind WhatsOmni.',
                'is_published' => true,
            ],
            [
                'slug' => 'security',
                'title' => 'Platform Security & Trust Whitepaper',
                'content' => '<h2>Enterprise Trust & Security Architecture</h2><p>Security is fundamental to our omnichannel messaging platform architecture. WhatsOmni enforces multi-layered defense in depth across network, application, and data layers.</p><h2>Key Security Highlights:</h2><ul><li>AES-256 Encryption at rest for all BYOK AI and channel credentials</li><li>Real-time Webhook HMAC-SHA256 signature verification</li><li>Automated CSRF token negotiation & stateful Sanctum session isolation</li><li>Granular Role-Based Access Control (RBAC) with custom permission matrix</li></ul>',
                'meta_description' => 'Discover the enterprise security architecture, AES-256 BYOK encryption, and SOC2 trust standards of WhatsOmni.',
                'is_published' => true,
            ],
            [
                'slug' => 'sla',
                'title' => 'Service Level Agreement & Uptime Guarantee',
                'content' => '<h2>99.9% Uptime Commitment</h2><p>WhatsOmni commits to delivering 99.9% monthly availability across our core API gateway, WebSocket Reverb cluster, and Webhook ingestion engines.</p><h2>Priority Incident Response Times:</h2><ul><li><strong>Critical (Severity 1):</strong> Under 15 minutes</li><li><strong>High (Severity 2):</strong> Under 1 hour</li><li><strong>Standard (Severity 3):</strong> Under 4 hours</li></ul>',
                'meta_description' => 'Understand our 99.9% uptime commitment, incident escalation response times, and SLA guarantee.',
                'is_published' => true,
            ],
        ];

        foreach ($defaultPages as $page) {
            DB::table('custom_pages')->updateOrInsert(
                ['slug' => $page['slug']],
                [
                    'title' => $page['title'],
                    'content' => $page['content'],
                    'meta_description' => $page['meta_description'],
                    'is_published' => $page['is_published'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // 6. Seed Default SaaS Plans & Pricing
        $plans = [
            [
                'name' => 'Starter',
                'description' => 'Essential omnichannel messaging, team collaboration, and automated conversational flows.',
                'is_active' => true,
                'trial_days' => 14,
                'max_team_members' => 3,
                'max_workspaces' => 1,
                'max_campaigns' => 10,
                'max_integrations' => 2,
                'allowed_integrations' => json_encode(['webhook', 'zapier']),
                'own_crm_access' => true,
                'max_channels' => 2,
                'allowed_channels' => json_encode(['whatsapp', 'telegram']),
                'max_automations' => 5,
                'max_ecommerce_stores' => 1,
                'max_ecommerce_products' => 50,
                'monthly_ecommerce_orders' => 100,
                'has_abandoned_cart_recovery' => true,
                'has_whatsapp_checkout' => true,
                'max_meta_ad_accounts' => 1,
                'max_meta_campaigns' => 2,
                'has_click_to_whatsapp_ads' => true,
                'has_meta_lead_sync' => true,
                'monthly_messages_limit' => 5000,
                'flow_credits' => 100,
                'copilot_credits' => 500,
                'monthly_ai_tokens' => 250000,
                'has_flow_templates' => true,
                'sort_order' => 1,
                'monthly_price_usd' => 1900,
                'yearly_price_usd' => 19000,
            ],
            [
                'name' => 'Professional',
                'description' => 'Advanced AI intelligence routing, multi-channel gateways, deal pipelines, and team scalability.',
                'is_active' => true,
                'trial_days' => 14,
                'max_team_members' => 10,
                'max_workspaces' => 3,
                'max_campaigns' => 50,
                'max_integrations' => 10,
                'allowed_integrations' => json_encode(['webhook', 'zapier', 'hubspot', 'salesforce', 'pabbly', 'make']),
                'own_crm_access' => true,
                'max_channels' => 10,
                'allowed_channels' => json_encode(['whatsapp', 'telegram', 'instagram', 'facebook', 'email']),
                'max_automations' => 25,
                'max_ecommerce_stores' => 3,
                'max_ecommerce_products' => 500,
                'monthly_ecommerce_orders' => 1000,
                'has_abandoned_cart_recovery' => true,
                'has_whatsapp_checkout' => true,
                'max_meta_ad_accounts' => 3,
                'max_meta_campaigns' => 10,
                'has_click_to_whatsapp_ads' => true,
                'has_meta_lead_sync' => true,
                'monthly_messages_limit' => 25000,
                'flow_credits' => 500,
                'copilot_credits' => 2500,
                'monthly_ai_tokens' => 1000000,
                'has_flow_templates' => true,
                'sort_order' => 2,
                'monthly_price_usd' => 4900,
                'yearly_price_usd' => 49000,
            ],
            [
                'name' => 'Enterprise',
                'description' => 'High-volume throughput, custom webhooks, dedicated SLAs, unlimited scale, and priority AI execution.',
                'is_active' => true,
                'trial_days' => 30,
                'max_team_members' => 50,
                'max_workspaces' => 10,
                'max_campaigns' => -1,
                'max_integrations' => -1,
                'allowed_integrations' => json_encode(['*']),
                'own_crm_access' => true,
                'max_channels' => 50,
                'allowed_channels' => json_encode(['*']),
                'max_automations' => -1,
                'max_ecommerce_stores' => 10,
                'max_ecommerce_products' => 5000,
                'monthly_ecommerce_orders' => 10000,
                'has_abandoned_cart_recovery' => true,
                'has_whatsapp_checkout' => true,
                'max_meta_ad_accounts' => 10,
                'max_meta_campaigns' => 50,
                'has_click_to_whatsapp_ads' => true,
                'has_meta_lead_sync' => true,
                'monthly_messages_limit' => -1,
                'flow_credits' => 2000,
                'copilot_credits' => 10000,
                'monthly_ai_tokens' => 5000000,
                'has_flow_templates' => true,
                'sort_order' => 3,
                'monthly_price_usd' => 9900,
                'yearly_price_usd' => 99000,
            ],
        ];

        $usdId = $currencyIds['USD'] ?? 1;

        foreach ($plans as $pData) {
            $monthlyPrice = $pData['monthly_price_usd'];
            $yearlyPrice = $pData['yearly_price_usd'];
            unset($pData['monthly_price_usd'], $pData['yearly_price_usd']);

            $existingPlan = DB::table('plans')->where('name', $pData['name'])->first();
            if (!$existingPlan) {
                $pData['created_at'] = now();
                $pData['updated_at'] = now();
                $planId = DB::table('plans')->insertGetId($pData);
            } else {
                $planId = $existingPlan->id;
                DB::table('plans')->where('id', $planId)->update($pData);
            }

            // Seed USD Monthly & Yearly Prices
            DB::table('plan_prices')->updateOrInsert(
                ['plan_id' => $planId, 'currency_id' => $usdId, 'billing_interval' => 'month'],
                [
                    'amount' => $monthlyPrice,
                    'stripe_price_id' => 'price_' . strtolower($pData['name']) . '_monthly',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            DB::table('plan_prices')->updateOrInsert(
                ['plan_id' => $planId, 'currency_id' => $usdId, 'billing_interval' => 'year'],
                [
                    'amount' => $yearlyPrice,
                    'stripe_price_id' => 'price_' . strtolower($pData['name']) . '_yearly',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // 7. Seed Pre-Built Flow Templates
        $this->call(FlowTemplateSeeder::class);
    }
}