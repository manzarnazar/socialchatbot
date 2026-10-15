<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            if (!Schema::hasColumn('appointments', 'user_id')) {
                $table->foreignId('user_id')->nullable()->after('booking_link_id')->constrained('tenant_users')->onDelete('set null');
            }
            if (!Schema::hasColumn('appointments', 'resource_name')) {
                $table->string('resource_name')->nullable()->after('user_id');
            }
        });

        Schema::table('booking_links', function (Blueprint $table) {
            if (!Schema::hasColumn('booking_links', 'user_id')) {
                $table->foreignId('user_id')->nullable()->after('tenant_id')->constrained('tenant_users')->onDelete('set null');
            }
            if (!Schema::hasColumn('booking_links', 'assign_mode')) {
                $table->string('assign_mode')->default('single')->after('is_active');
            }
            if (!Schema::hasColumn('booking_links', 'resource_pool')) {
                $table->json('resource_pool')->nullable()->after('assign_mode');
            }
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            if (Schema::hasColumn('appointments', 'user_id')) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            }
            if (Schema::hasColumn('appointments', 'resource_name')) {
                $table->dropColumn('resource_name');
            }
        });

        Schema::table('booking_links', function (Blueprint $table) {
            if (Schema::hasColumn('booking_links', 'user_id')) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            }
            if (Schema::hasColumn('booking_links', 'assign_mode')) {
                $table->dropColumn('assign_mode');
            }
            if (Schema::hasColumn('booking_links', 'resource_pool')) {
                $table->dropColumn('resource_pool');
            }
        });
    }
};
