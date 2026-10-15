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
            if (!Schema::hasColumn('plans', 'allowed_channels')) {
                $table->json('allowed_channels')->nullable()->after('max_channels');
            }
            if (!Schema::hasColumn('plans', 'allowed_integrations')) {
                $table->json('allowed_integrations')->nullable()->after('max_integrations');
            }
            if (!Schema::hasColumn('plans', 'has_flow_templates')) {
                $table->boolean('has_flow_templates')->default(true)->after('flow_credits');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['allowed_channels', 'allowed_integrations', 'has_flow_templates']);
        });
    }
};
