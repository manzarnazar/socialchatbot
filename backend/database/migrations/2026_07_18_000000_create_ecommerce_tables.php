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
        Schema::create('ecommerce_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('platform'); // shopify | woocommerce
            $table->string('store_url')->index();
            $table->text('credentials'); // encrypted JSON
            $table->string('status')->default('active'); // active | disconnected
            $table->string('webhook_secret')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();
        });

        Schema::create('ecommerce_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ecommerce_connection_id')->constrained('ecommerce_connections')->cascadeOnDelete();
            $table->string('external_order_id')->index();
            $table->string('order_number')->index();
            $table->string('customer_email')->index();
            $table->string('customer_phone')->nullable()->index();
            $table->decimal('total_price', 10, 2);
            $table->string('financial_status'); // paid, pending, refunded
            $table->string('fulfillment_status'); // fulfilled, unfulfilled
            $table->string('tracking_number')->nullable();
            $table->string('tracking_url')->nullable();
            $table->json('items_summary');
            $table->timestamp('external_created_at');
            $table->timestamps();
        });

        Schema::create('ecommerce_abandoned_carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->string('cart_token')->unique()->index();
            $table->text('checkout_url');
            $table->decimal('total_price', 10, 2);
            $table->json('items_summary');
            $table->string('recovery_status')->default('pending'); // pending | recovered | expired
            $table->timestamp('recovered_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ecommerce_abandoned_carts');
        Schema::dropIfExists('ecommerce_orders');
        Schema::dropIfExists('ecommerce_connections');
    }
};
