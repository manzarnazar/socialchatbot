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
        // 1. Pivot table for assigning channels to team members
        Schema::create('channel_connection_tenant_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_user_id')->constrained('tenant_users')->cascadeOnDelete();
            $table->foreignId('channel_connection_id')->constrained('channel_connections')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['tenant_user_id', 'channel_connection_id'], 'chan_conn_user_unique');
        });

        // 2. Add channel_access_type to tenant_users
        Schema::table('tenant_users', function (Blueprint $table) {
            $table->string('channel_access_type')->default('all')->after('role_id'); // 'all' or 'custom'
        });

        // 3. Add channel assignment fields to team_invitations
        Schema::table('team_invitations', function (Blueprint $table) {
            $table->string('channel_access_type')->default('all')->after('role_id');
            $table->json('assigned_channel_ids')->nullable()->after('channel_access_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('team_invitations', function (Blueprint $table) {
            $table->dropColumn(['channel_access_type', 'assigned_channel_ids']);
        });

        Schema::table('tenant_users', function (Blueprint $table) {
            $table->dropColumn('channel_access_type');
        });

        Schema::dropIfExists('channel_connection_tenant_user');
    }
};
