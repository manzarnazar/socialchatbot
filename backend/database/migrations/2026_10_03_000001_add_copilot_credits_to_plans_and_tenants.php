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
            if (!Schema::hasColumn('plans', 'copilot_credits')) {
                $table->integer('copilot_credits')->default(100)->after('flow_credits');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('tenants', 'used_copilot_credits')) {
                $table->integer('used_copilot_credits')->default(0)->after('used_flow_credits');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            if (Schema::hasColumn('plans', 'copilot_credits')) {
                $table->dropColumn('copilot_credits');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (Schema::hasColumn('tenants', 'used_copilot_credits')) {
                $table->dropColumn('used_copilot_credits');
            }
        });
    }
};
