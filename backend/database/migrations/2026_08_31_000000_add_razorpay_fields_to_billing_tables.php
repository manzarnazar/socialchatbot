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
            if (!Schema::hasColumn('plan_prices', 'razorpay_plan_id')) {
                $table->string('razorpay_plan_id')->nullable()->after('stripe_price_id');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('tenants', 'razorpay_customer_id')) {
                $table->string('razorpay_customer_id')->nullable()->after('stripe_customer_id');
            }
            if (!Schema::hasColumn('tenants', 'razorpay_subscription_id')) {
                $table->string('razorpay_subscription_id')->nullable()->after('stripe_subscription_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plan_prices', function (Blueprint $table) {
            if (Schema::hasColumn('plan_prices', 'razorpay_plan_id')) {
                $table->dropColumn('razorpay_plan_id');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (Schema::hasColumn('tenants', 'razorpay_customer_id')) {
                $table->dropColumn('razorpay_customer_id');
            }
            if (Schema::hasColumn('tenants', 'razorpay_subscription_id')) {
                $table->dropColumn('razorpay_subscription_id');
            }
        });
    }
};
