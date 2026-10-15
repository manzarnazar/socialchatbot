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
            if (!Schema::hasColumn('plans', 'mercadopago_plan_id')) {
                $table->string('mercadopago_plan_id')->nullable()->after('paddle_product_id');
            }
        });

        Schema::table('plan_prices', function (Blueprint $table) {
            if (!Schema::hasColumn('plan_prices', 'mercadopago_plan_id')) {
                $table->string('mercadopago_plan_id')->nullable()->after('paddle_price_id');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('tenants', 'mercadopago_customer_id')) {
                $table->string('mercadopago_customer_id')->nullable()->after('paddle_subscription_id');
            }
            if (!Schema::hasColumn('tenants', 'mercadopago_subscription_id')) {
                $table->string('mercadopago_subscription_id')->nullable()->after('mercadopago_customer_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            if (Schema::hasColumn('plans', 'mercadopago_plan_id')) {
                $table->dropColumn('mercadopago_plan_id');
            }
        });

        Schema::table('plan_prices', function (Blueprint $table) {
            if (Schema::hasColumn('plan_prices', 'mercadopago_plan_id')) {
                $table->dropColumn('mercadopago_plan_id');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (Schema::hasColumn('tenants', 'mercadopago_customer_id')) {
                $table->dropColumn('mercadopago_customer_id');
            }
            if (Schema::hasColumn('tenants', 'mercadopago_subscription_id')) {
                $table->dropColumn('mercadopago_subscription_id');
            }
        });
    }
};
