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
        Schema::table('conversations', function (Blueprint $table) {
            $table->string('status')->default('open')->after('external_chat_id'); // open, pending, resolved
            $table->unsignedBigInteger('assigned_user_id')->nullable()->after('status');
            $table->unsignedBigInteger('assigned_team_id')->nullable()->after('assigned_user_id');
            $table->boolean('ai_active')->default(false)->after('assigned_team_id');
            $table->unsignedBigInteger('ai_agent_id')->nullable()->after('ai_active');

            $table->foreign('assigned_user_id')->references('id')->on('tenant_users')->onDelete('set null');
            $table->foreign('assigned_team_id')->references('id')->on('teams')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropForeign(['conversations_assigned_user_id_foreign']);
            $table->dropForeign(['conversations_assigned_team_id_foreign']);

            $table->dropColumn(['status', 'assigned_user_id', 'assigned_team_id', 'ai_active', 'ai_agent_id']);
        });
    }
};
