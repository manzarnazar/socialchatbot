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
        if (!Schema::hasTable('ecommerce_products')) {
            Schema::create('ecommerce_products', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->foreignId('ecommerce_connection_id')->constrained('ecommerce_connections')->cascadeOnDelete();
                $table->string('external_product_id')->index();
                $table->string('title');
                $table->string('handle')->nullable();
                $table->longText('description')->nullable();
                $table->decimal('price', 10, 2)->default(0.00);
                $table->decimal('compare_at_price', 10, 2)->nullable();
                $table->string('currency', 10)->default('USD');
                $table->string('sku')->nullable()->index();
                $table->integer('stock_quantity')->default(0);
                $table->string('status', 30)->default('active'); // active, draft, archived, out_of_stock
                $table->text('image_url')->nullable();
                $table->json('images')->nullable();
                $table->json('variants')->nullable();
                $table->json('categories')->nullable();
                $table->string('external_url')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->unique(['tenant_id', 'ecommerce_connection_id', 'external_product_id'], 'ecomm_prod_tenant_conn_ext_unique');
                $table->index(['tenant_id', 'status']);
                $table->index(['tenant_id', 'price']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ecommerce_products');
    }
};
