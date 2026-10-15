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
            if (!Schema::hasColumn('plans', 'max_meta_ad_accounts')) {
                $table->integer('max_meta_ad_accounts')->default(1)->after('has_whatsapp_checkout');
            }
            if (!Schema::hasColumn('plans', 'max_meta_campaigns')) {
                $table->integer('max_meta_campaigns')->default(2)->after('max_meta_ad_accounts');
            }
            if (!Schema::hasColumn('plans', 'has_click_to_whatsapp_ads')) {
                $table->boolean('has_click_to_whatsapp_ads')->default(false)->after('max_meta_campaigns');
            }
            if (!Schema::hasColumn('plans', 'has_meta_lead_sync')) {
                $table->boolean('has_meta_lead_sync')->default(false)->after('has_click_to_whatsapp_ads');
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
                'max_meta_ad_accounts',
                'max_meta_campaigns',
                'has_click_to_whatsapp_ads',
                'has_meta_lead_sync',
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
