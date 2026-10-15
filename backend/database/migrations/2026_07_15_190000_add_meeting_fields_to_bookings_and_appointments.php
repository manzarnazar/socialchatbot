<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_links', function (Blueprint $table) {
            $table->string('location_type')->default('none')->after('is_active');
            $table->text('custom_location')->nullable()->after('location_type');
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->text('meeting_link')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('booking_links', function (Blueprint $table) {
            $table->dropColumn(['location_type', 'custom_location']);
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('meeting_link');
        });
    }
};
