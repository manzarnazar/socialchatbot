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
            if (!Schema::hasColumn('plan_prices', 'flutterwave_plan_id')) {
                $table->string('flutterwave_plan_id')->nullable()->after('paystack_plan_code');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('tenants', 'flutterwave_customer_id')) {
                $table->string('flutterwave_customer_id')->nullable()->after('paystack_email_token');
            }
            if (!Schema::hasColumn('tenants', 'flutterwave_subscription_id')) {
                $table->string('flutterwave_subscription_id')->nullable()->after('flutterwave_customer_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plan_prices', function (Blueprint $table) {
            if (Schema::hasColumn('plan_prices', 'flutterwave_plan_id')) {
                $table->dropColumn('flutterwave_plan_id');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (Schema::hasColumn('tenants', 'flutterwave_customer_id')) {
                $table->dropColumn('flutterwave_customer_id');
            }
            if (Schema::hasColumn('tenants', 'flutterwave_subscription_id')) {
                $table->dropColumn('flutterwave_subscription_id');
            }
        });
    }
};
