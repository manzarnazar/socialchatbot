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
        // 1. Add trigger_keywords and channel_type to flows table if missing
        Schema::table('flows', function (Blueprint $table) {
            if (!Schema::hasColumn('flows', 'trigger_keywords')) {
                $table->json('trigger_keywords')->nullable()->after('trigger_type');
            }
            if (!Schema::hasColumn('flows', 'channel_type')) {
                $table->string('channel_type', 50)->default('omnichannel')->after('trigger_type');
            }
        });

        // 2. Create flow_channels pivot table
        if (!Schema::hasTable('flow_channels')) {
            Schema::create('flow_channels', function (Blueprint $table) {
                $table->id();
                $table->foreignId('flow_id')->constrained('flows')->cascadeOnDelete();
                $table->foreignId('channel_connection_id')->constrained('channel_connections')->cascadeOnDelete();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->unique(['flow_id', 'channel_connection_id']);
                $table->index(['flow_id', 'is_active']);
                $table->index(['channel_connection_id', 'is_active']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('flow_channels');

        Schema::table('flows', function (Blueprint $table) {
            if (Schema::hasColumn('flows', 'trigger_keywords')) {
                $table->dropColumn('trigger_keywords');
            }
            if (Schema::hasColumn('flows', 'channel_type')) {
                $table->dropColumn('channel_type');
            }
        });
    }
};
