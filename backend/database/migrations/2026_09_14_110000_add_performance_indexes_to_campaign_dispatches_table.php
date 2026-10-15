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
        Schema::table('campaign_dispatches', function (Blueprint $table) {
            $table->index(['campaign_id', 'status'], 'idx_campaign_dispatches_campaign_status');
            $table->index(['campaign_id', 'contact_id'], 'idx_campaign_dispatches_campaign_contact');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaign_dispatches', function (Blueprint $table) {
            $table->dropIndex('idx_campaign_dispatches_campaign_status');
            $table->dropIndex('idx_campaign_dispatches_campaign_contact');
        });
    }
};
