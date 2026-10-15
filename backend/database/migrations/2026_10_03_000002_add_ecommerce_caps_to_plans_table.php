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
            if (!Schema::hasColumn('plans', 'max_ecommerce_stores')) {
                $table->integer('max_ecommerce_stores')->default(1)->after('max_automations');
            }
            if (!Schema::hasColumn('plans', 'max_ecommerce_products')) {
                $table->integer('max_ecommerce_products')->default(100)->after('max_ecommerce_stores');
            }
            if (!Schema::hasColumn('plans', 'monthly_ecommerce_orders')) {
                $table->integer('monthly_ecommerce_orders')->default(100)->after('max_ecommerce_products');
            }
            if (!Schema::hasColumn('plans', 'has_abandoned_cart_recovery')) {
                $table->boolean('has_abandoned_cart_recovery')->default(false)->after('monthly_ecommerce_orders');
            }
            if (!Schema::hasColumn('plans', 'has_whatsapp_checkout')) {
                $table->boolean('has_whatsapp_checkout')->default(false)->after('has_abandoned_cart_recovery');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $columnsToDrop = [];
            foreach ([
                'max_ecommerce_stores',
                'max_ecommerce_products',
                'monthly_ecommerce_orders',
                'has_abandoned_cart_recovery',
                'has_whatsapp_checkout',
            ] as $col) {
                if (Schema::hasColumn('plans', $col)) {
                    $columnsToDrop[] = $col;
                }
            }

            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
