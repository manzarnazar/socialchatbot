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
            if (!Schema::hasColumn('plans', 'myfatoorah_plan_id')) {
                $table->string('myfatoorah_plan_id')->nullable()->after('mercadopago_plan_id');
            }
        });

        Schema::table('plan_prices', function (Blueprint $table) {
            if (!Schema::hasColumn('plan_prices', 'myfatoorah_plan_id')) {
                $table->string('myfatoorah_plan_id')->nullable()->after('mercadopago_plan_id');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('tenants', 'myfatoorah_customer_id')) {
                $table->string('myfatoorah_customer_id')->nullable()->after('mercadopago_subscription_id');
            }
            if (!Schema::hasColumn('tenants', 'myfatoorah_subscription_id')) {
                $table->string('myfatoorah_subscription_id')->nullable()->after('myfatoorah_customer_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            if (Schema::hasColumn('plans', 'myfatoorah_plan_id')) {
                $table->dropColumn('myfatoorah_plan_id');
            }
        });

        Schema::table('plan_prices', function (Blueprint $table) {
            if (Schema::hasColumn('plan_prices', 'myfatoorah_plan_id')) {
                $table->dropColumn('myfatoorah_plan_id');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (Schema::hasColumn('tenants', 'myfatoorah_customer_id')) {
                $table->dropColumn('myfatoorah_customer_id');
            }
            if (Schema::hasColumn('tenants', 'myfatoorah_subscription_id')) {
                $table->dropColumn('myfatoorah_subscription_id');
            }
        });
    }
};
