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
        Schema::table('ecommerce_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('ecommerce_orders', 'customer_name')) {
                $table->string('customer_name')->nullable()->after('customer_email');
            }
            if (!Schema::hasColumn('ecommerce_orders', 'currency')) {
                $table->string('currency', 10)->default('USD')->after('total_price');
            }
            if (!Schema::hasColumn('ecommerce_orders', 'subtotal_price')) {
                $table->decimal('subtotal_price', 10, 2)->nullable()->after('total_price');
            }
            if (!Schema::hasColumn('ecommerce_orders', 'total_tax')) {
                $table->decimal('total_tax', 10, 2)->nullable()->after('subtotal_price');
            }
            if (!Schema::hasColumn('ecommerce_orders', 'total_discounts')) {
                $table->decimal('total_discounts', 10, 2)->nullable()->after('total_tax');
            }
            if (!Schema::hasColumn('ecommerce_orders', 'items_count')) {
                $table->integer('items_count')->default(1)->after('items_summary');
            }
            if (!Schema::hasColumn('ecommerce_orders', 'line_items')) {
                $table->json('line_items')->nullable()->after('items_count');
            }
            if (!Schema::hasColumn('ecommerce_orders', 'shipping_address')) {
                $table->json('shipping_address')->nullable()->after('line_items');
            }
            if (!Schema::hasColumn('ecommerce_orders', 'billing_address')) {
                $table->json('billing_address')->nullable()->after('shipping_address');
            }
            if (!Schema::hasColumn('ecommerce_orders', 'status')) {
                $table->string('status')->default('open')->after('fulfillment_status'); // open, completed, cancelled, processing
            }
            if (!Schema::hasColumn('ecommerce_orders', 'metadata')) {
                $table->json('metadata')->nullable()->after('external_created_at');
            }
            if (!Schema::hasColumn('ecommerce_orders', 'contact_id')) {
                $table->foreignId('contact_id')->nullable()->after('tenant_id')->constrained('contacts')->nullOnDelete();
            }
            if (!Schema::hasColumn('ecommerce_orders', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ecommerce_orders', function (Blueprint $table) {
            $columnsToDrop = [
                'customer_name', 'currency', 'subtotal_price', 'total_tax',
                'total_discounts', 'items_count', 'line_items', 'shipping_address',
                'billing_address', 'status', 'metadata', 'contact_id', 'deleted_at'
            ];
            foreach ($columnsToDrop as $col) {
                if (Schema::hasColumn('ecommerce_orders', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
