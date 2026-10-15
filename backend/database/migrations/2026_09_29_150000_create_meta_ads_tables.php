<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Meta Ad Accounts
        Schema::create('meta_ad_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('meta_ad_account_id')->index(); // e.g. act_123456789
            $table->string('account_name');
            $table->string('account_status')->default('ACTIVE'); // ACTIVE, DISABLED, UNSETTLED, PENDING_REVIEW
            $table->string('currency', 10)->default('USD');
            $table->string('timezone_name')->default('UTC');
            $table->decimal('spend_cap', 14, 2)->nullable();
            $table->decimal('amount_spent', 14, 2)->default(0.00);
            $table->decimal('balance', 14, 2)->default(0.00);
            $table->text('access_token')->nullable();
            $table->boolean('is_default')->default(false);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'meta_ad_account_id']);
        });

        // 2. Meta Campaigns
        Schema::create('meta_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('meta_ad_account_id')->constrained('meta_ad_accounts')->cascadeOnDelete();
            $table->string('meta_campaign_id')->nullable()->index();
            $table->string('name');
            $table->string('objective')->default('MESSAGES'); // MESSAGES, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_TRAFFIC, OUTCOME_SALES
            $table->string('buying_type')->default('AUCTION');
            $table->string('status')->default('PAUSED'); // ACTIVE, PAUSED, ARCHIVED, DELETED
            $table->string('budget_mode')->default('ABO'); // CBO, ABO
            $table->decimal('daily_budget', 14, 2)->nullable();
            $table->decimal('lifetime_budget', 14, 2)->nullable();
            $table->json('special_ad_categories')->nullable();
            $table->text('error_message')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        // 3. Meta Ad Sets
        Schema::create('meta_ad_sets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('meta_campaign_id')->constrained('meta_campaigns')->cascadeOnDelete();
            $table->string('meta_ad_set_id')->nullable()->index();
            $table->string('name');
            $table->string('status')->default('PAUSED'); // ACTIVE, PAUSED, ARCHIVED, DELETED
            $table->string('optimization_goal')->default('CONVERSATIONS'); // CONVERSATIONS, LINK_CLICKS, IMPRESSIONS, LEAD_GENERATION, OFFSITE_CONVERSIONS
            $table->string('billing_event')->default('IMPRESSIONS'); // IMPRESSIONS, LINK_CLICKS
            $table->decimal('bid_amount', 14, 2)->nullable();
            $table->decimal('daily_budget', 14, 2)->nullable();
            $table->decimal('lifetime_budget', 14, 2)->nullable();
            $table->timestamp('start_time')->nullable();
            $table->timestamp('end_time')->nullable();
            $table->string('destination_type')->default('WHATSAPP'); // WHATSAPP, MESSENGER, INSTAGRAM_DIRECT, WEBSITE, ON_AD_LEAD_FORM
            $table->string('whatsapp_phone_number')->nullable();
            $table->json('targeting_spec')->nullable(); // Geo, age, gender, interests, behaviors, custom audiences
            $table->json('placements_spec')->nullable(); // Advantage+ or Manual placements
            $table->text('error_message')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        // 4. Meta Ads & Creatives
        Schema::create('meta_ads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('meta_ad_set_id')->constrained('meta_ad_sets')->cascadeOnDelete();
            $table->string('meta_ad_id')->nullable()->index();
            $table->string('meta_creative_id')->nullable();
            $table->string('name');
            $table->string('status')->default('PAUSED'); // ACTIVE, PAUSED, ARCHIVED, DELETED, DISAPPROVED, PENDING_REVIEW
            $table->string('page_id')->nullable();
            $table->string('instagram_actor_id')->nullable();
            $table->string('creative_type')->default('IMAGE'); // IMAGE, VIDEO, CAROUSEL
            $table->text('primary_text')->nullable();
            $table->string('headline')->nullable();
            $table->text('description')->nullable();
            $table->string('cta_type')->default('SEND_WHATSAPP_MESSAGE'); // SEND_WHATSAPP_MESSAGE, MESSAGE_PAGE, LEARN_MORE, SIGN_UP, SHOP_NOW, CONTACT_US, GET_OFFER
            $table->json('media_urls')->nullable();
            $table->text('welcome_message')->nullable();
            $table->foreignId('linked_flow_id')->nullable()->constrained('flows')->nullOnDelete();
            $table->string('meta_preview_url')->nullable();
            $table->text('error_message')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        // 5. Meta Ad Insights (Telemetry & Performance Metrics)
        Schema::create('meta_ad_insights', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('meta_ad_account_id')->constrained('meta_ad_accounts')->cascadeOnDelete();
            $table->foreignId('meta_campaign_id')->nullable()->constrained('meta_campaigns')->cascadeOnDelete();
            $table->foreignId('meta_ad_set_id')->nullable()->constrained('meta_ad_sets')->cascadeOnDelete();
            $table->foreignId('meta_ad_id')->nullable()->constrained('meta_ads')->cascadeOnDelete();
            $table->date('date')->index();
            $table->unsignedBigInteger('impressions')->default(0);
            $table->unsignedBigInteger('reach')->default(0);
            $table->decimal('spend', 14, 2)->default(0.00);
            $table->unsignedBigInteger('clicks')->default(0);
            $table->decimal('ctr', 8, 4)->default(0.0000);
            $table->decimal('cpc', 14, 4)->default(0.0000);
            $table->decimal('cpm', 14, 4)->default(0.0000);
            $table->unsignedInteger('conversations_started')->default(0);
            $table->decimal('cost_per_conversation', 14, 4)->default(0.0000);
            $table->unsignedInteger('leads_count')->default(0);
            $table->unsignedInteger('purchases_count')->default(0);
            $table->decimal('purchase_value', 14, 2)->default(0.00);
            $table->decimal('roas', 8, 2)->default(0.00);
            $table->json('raw_meta_data')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'date']);
        });

        // 6. Meta Ad Leads (Captured from Lead Forms)
        Schema::create('meta_ad_leads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('meta_ad_id')->nullable()->constrained('meta_ads')->nullOnDelete();
            $table->string('meta_lead_id')->index();
            $table->string('meta_form_id')->nullable();
            $table->foreignId('contact_id')->nullable()->constrained('contacts')->nullOnDelete();
            $table->json('form_data');
            $table->string('status')->default('NEW'); // NEW, SYNCED_TO_CRM, CONTACTED, CONVERTED
            $table->timestamps();

            $table->unique(['tenant_id', 'meta_lead_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('meta_ad_leads');
        Schema::dropIfExists('meta_ad_insights');
        Schema::dropIfExists('meta_ads');
        Schema::dropIfExists('meta_ad_sets');
        Schema::dropIfExists('meta_campaigns');
        Schema::dropIfExists('meta_ad_accounts');
    }
};
