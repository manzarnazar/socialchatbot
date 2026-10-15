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
            if (!Schema::hasColumn('plan_prices', 'paystack_plan_code')) {
                $table->string('paystack_plan_code')->nullable()->after('razorpay_plan_id');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('tenants', 'paystack_customer_id')) {
                $table->string('paystack_customer_id')->nullable()->after('razorpay_customer_id');
            }
            if (!Schema::hasColumn('tenants', 'paystack_subscription_id')) {
                $table->string('paystack_subscription_id')->nullable()->after('razorpay_subscription_id');
            }
            if (!Schema::hasColumn('tenants', 'paystack_email_token')) {
                $table->string('paystack_email_token')->nullable()->after('paystack_subscription_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plan_prices', function (Blueprint $table) {
            if (Schema::hasColumn('plan_prices', 'paystack_plan_code')) {
                $table->dropColumn('paystack_plan_code');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (Schema::hasColumn('tenants', 'paystack_customer_id')) {
                $table->dropColumn('paystack_customer_id');
            }
            if (Schema::hasColumn('tenants', 'paystack_subscription_id')) {
                $table->dropColumn('paystack_subscription_id');
            }
            if (Schema::hasColumn('tenants', 'paystack_email_token')) {
                $table->dropColumn('paystack_email_token');
            }
        });
    }
};
