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
        Schema::create('currencies', function (Blueprint $table) {
            $table->id();
            $table->string('code', 3)->unique();
            $table->string('symbol', 10);
            $table->string('name', 50);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('trial_days')->default(0);
            $table->integer('max_team_members')->default(1);
            $table->integer('max_campaigns')->default(0);
            $table->integer('max_integrations')->default(0);
            $table->boolean('own_crm_access')->default(false);
            $table->integer('max_channels')->default(0);
            $table->integer('max_automations')->default(0);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('company_name');
            $table->string('team_size')->nullable();
            $table->string('industry_category')->nullable();
            $table->string('status')->default('trial'); // trial, active, suspended
            $table->string('onboarding_step')->default('1'); // 1, 2, 3, complete
            $table->foreignId('currency_id')->nullable()->constrained('currencies')->nullOnDelete();
            $table->string('stripe_customer_id')->nullable();
            $table->string('stripe_subscription_id')->nullable();
            $table->foreignId('plan_id')->nullable()->constrained('plans')->nullOnDelete();
            $table->string('default_language', 5)->default('en');
            $table->string('custom_mailer_type')->nullable(); // smtp, resend, etc.
            $table->text('custom_mailer_config')->nullable(); // encrypted JSON
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('platform_settings');
        Schema::dropIfExists('tenants');
        Schema::dropIfExists('plans');
        Schema::dropIfExists('currencies');
    }
};
