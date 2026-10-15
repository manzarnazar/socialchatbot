<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff_members', function (Blueprint $table) {
            if (!Schema::hasColumn('staff_members', 'google_calendar_id')) {
                $table->string('google_calendar_id')->nullable()->after('working_hours');
            }
            if (!Schema::hasColumn('staff_members', 'google_sync_enabled')) {
                $table->boolean('google_sync_enabled')->default(false)->after('google_calendar_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('staff_members', function (Blueprint $table) {
            if (Schema::hasColumn('staff_members', 'google_sync_enabled')) {
                $table->dropColumn('google_sync_enabled');
            }
            if (Schema::hasColumn('staff_members', 'google_calendar_id')) {
                $table->dropColumn('google_calendar_id');
            }
        });
    }
};
