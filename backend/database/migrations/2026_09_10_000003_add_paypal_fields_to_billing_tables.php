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
        Schema::table('plan_prices', function (Blueprint $table) {
            if (!Schema::hasColumn('plan_prices', 'paypal_plan_id')) {
                $table->string('paypal_plan_id')->nullable()->after('flutterwave_plan_id');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('tenants', 'paypal_customer_id')) {
                $table->string('paypal_customer_id')->nullable()->after('flutterwave_subscription_id');
            }
            if (!Schema::hasColumn('tenants', 'paypal_subscription_id')) {
                $table->string('paypal_subscription_id')->nullable()->after('paypal_customer_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plan_prices', function (Blueprint $table) {
            if (Schema::hasColumn('plan_prices', 'paypal_plan_id')) {
                $table->dropColumn('paypal_plan_id');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (Schema::hasColumn('tenants', 'paypal_customer_id')) {
                $table->dropColumn('paypal_customer_id');
            }
            if (Schema::hasColumn('tenants', 'paypal_subscription_id')) {
                $table->dropColumn('paypal_subscription_id');
            }
        });
    }
};
