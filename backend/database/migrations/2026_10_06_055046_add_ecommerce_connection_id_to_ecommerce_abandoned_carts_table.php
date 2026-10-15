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
        Schema::table('ecommerce_abandoned_carts', function (Blueprint $table) {
            if (!Schema::hasColumn('ecommerce_abandoned_carts', 'ecommerce_connection_id')) {
                $table->foreignId('ecommerce_connection_id')
                    ->nullable()
                    ->after('tenant_id')
                    ->constrained('ecommerce_connections')
                    ->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ecommerce_abandoned_carts', function (Blueprint $table) {
            if (Schema::hasColumn('ecommerce_abandoned_carts', 'ecommerce_connection_id')) {
                $table->dropForeign(['ecommerce_connection_id']);
                $table->dropColumn('ecommerce_connection_id');
            }
        });
    }
};
