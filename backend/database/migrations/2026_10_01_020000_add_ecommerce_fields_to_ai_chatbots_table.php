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
        if (Schema::hasTable('ai_chatbots')) {
            Schema::table('ai_chatbots', function (Blueprint $table) {
                if (!Schema::hasColumn('ai_chatbots', 'ecommerce_connection_id')) {
                    $table->unsignedBigInteger('ecommerce_connection_id')->nullable()->after('knowledge_base_id')->index();
                    $table->foreign('ecommerce_connection_id')->references('id')->on('ecommerce_connections')->onDelete('set null');
                }

                if (!Schema::hasColumn('ai_chatbots', 'ecommerce_settings')) {
                    $table->json('ecommerce_settings')->nullable()->after('ecommerce_connection_id');
                }
            });
        }

        if (Schema::hasTable('ai_chatbot_logs')) {
            Schema::table('ai_chatbot_logs', function (Blueprint $table) {
                if (!Schema::hasColumn('ai_chatbot_logs', 'tool_calls')) {
                    $table->json('tool_calls')->nullable()->after('rag_sources');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('ai_chatbots')) {
            Schema::table('ai_chatbots', function (Blueprint $table) {
                if (Schema::hasColumn('ai_chatbots', 'ecommerce_connection_id')) {
                    $table->dropForeign(['ecommerce_connection_id']);
                    $table->dropColumn('ecommerce_connection_id');
                }
                if (Schema::hasColumn('ai_chatbots', 'ecommerce_settings')) {
                    $table->dropColumn('ecommerce_settings');
                }
            });
        }

        if (Schema::hasTable('ai_chatbot_logs')) {
            Schema::table('ai_chatbot_logs', function (Blueprint $table) {
                if (Schema::hasColumn('ai_chatbot_logs', 'tool_calls')) {
                    $table->dropColumn('tool_calls');
                }
            });
        }
    }
};
