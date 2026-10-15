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
        Schema::table('plans', function (Blueprint $table) {
            if (!Schema::hasColumn('plans', 'paddle_product_id')) {
                $table->string('paddle_product_id')->nullable()->after('stripe_product_id');
            }
        });

        Schema::table('plan_prices', function (Blueprint $table) {
            if (!Schema::hasColumn('plan_prices', 'paddle_price_id')) {
                $table->string('paddle_price_id')->nullable()->after('paypal_plan_id');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('tenants', 'paddle_customer_id')) {
                $table->string('paddle_customer_id')->nullable()->after('paypal_subscription_id');
            }
            if (!Schema::hasColumn('tenants', 'paddle_subscription_id')) {
                $table->string('paddle_subscription_id')->nullable()->after('paddle_customer_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            if (Schema::hasColumn('plans', 'paddle_product_id')) {
                $table->dropColumn('paddle_product_id');
            }
        });

        Schema::table('plan_prices', function (Blueprint $table) {
            if (Schema::hasColumn('plan_prices', 'paddle_price_id')) {
                $table->dropColumn('paddle_price_id');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (Schema::hasColumn('tenants', 'paddle_customer_id')) {
                $table->dropColumn('paddle_customer_id');
            }
            if (Schema::hasColumn('tenants', 'paddle_subscription_id')) {
                $table->dropColumn('paddle_subscription_id');
            }
        });
    }
};
