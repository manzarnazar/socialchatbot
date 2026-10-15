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
        Schema::create('ai_agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->string('type')->default('inbound'); // inbound, outbound
            $table->foreignId('ai_provider_config_id')->nullable()->constrained('ai_provider_configs')->nullOnDelete();
            $table->string('model')->nullable();
            $table->text('system_prompt')->nullable();
            $table->string('status')->default('active'); // active, inactive
            $table->json('business_hours')->nullable();
            $table->text('fallback_message')->nullable();
            $table->json('handoff_rules')->nullable();
            $table->foreignId('flow_id')->nullable()->constrained('flows')->nullOnDelete();
            $table->foreignId('knowledge_base_id')->nullable()->constrained('knowledge_bases')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('tenant_users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status']);
        });

        Schema::create('ai_agent_channels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_agent_id')->constrained('ai_agents')->cascadeOnDelete();
            $table->foreignId('channel_connection_id')->constrained('channel_connections')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['ai_agent_id', 'channel_connection_id'], 'agent_channel_unique');
        });

        Schema::create('ai_agent_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_agent_id')->constrained('ai_agents')->cascadeOnDelete();
            $table->foreignId('conversation_id')->nullable()->constrained('conversations')->nullOnDelete();
            $table->integer('request_tokens')->default(0);
            $table->integer('response_tokens')->default(0);
            $table->decimal('estimated_cost', 10, 6)->default(0.000000);
            $table->string('model_used');
            $table->unsignedInteger('latency_ms')->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['ai_agent_id', 'created_at']);
        });

        // Add foreign key constraint to conversations table if not already added
        Schema::table('conversations', function (Blueprint $table) {
            $table->foreign('ai_agent_id')->references('id')->on('ai_agents')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropForeign(['conversations_ai_agent_id_foreign']);
        });

        Schema::dropIfExists('ai_agent_logs');
        Schema::dropIfExists('ai_agent_channels');
        Schema::dropIfExists('ai_agents');
    }
};
