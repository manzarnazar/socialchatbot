<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create ai_chatbots table
        if (!Schema::hasTable('ai_chatbots')) {
            Schema::create('ai_chatbots', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id')->index();
                $table->string('name');
                $table->string('avatar')->nullable();
                $table->text('description')->nullable();
                $table->longText('system_prompt');
                $table->decimal('temperature', 3, 2)->default(0.70);
                $table->unsignedBigInteger('ai_provider_config_id')->nullable()->index();
                $table->string('provider')->nullable();
                $table->string('model')->nullable();
                $table->unsignedBigInteger('knowledge_base_id')->nullable()->index();
                $table->enum('status', ['active', 'inactive'])->default('active');
                $table->json('business_hours')->nullable();
                $table->text('fallback_message')->nullable();
                $table->json('handoff_rules')->nullable();
                $table->unsignedBigInteger('created_by')->nullable()->index();
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('knowledge_base_id')->references('id')->on('knowledge_bases')->onDelete('set null');
                $table->foreign('ai_provider_config_id')->references('id')->on('ai_provider_configs')->onDelete('set null');
                $table->foreign('created_by')->references('id')->on('tenant_users')->onDelete('set null');
            });
        }

        // 2. Create ai_chatbot_channels pivot table
        if (!Schema::hasTable('ai_chatbot_channels')) {
            Schema::create('ai_chatbot_channels', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ai_chatbot_id')->index();
                $table->unsignedBigInteger('channel_connection_id')->index();
                $table->timestamps();

                $table->foreign('ai_chatbot_id')->references('id')->on('ai_chatbots')->onDelete('cascade');
                $table->foreign('channel_connection_id')->references('id')->on('channel_connections')->onDelete('cascade');
                $table->unique(['ai_chatbot_id', 'channel_connection_id'], 'chatbot_channel_unique');
            });
        }

        // 3. Create ai_chatbot_logs table
        if (!Schema::hasTable('ai_chatbot_logs')) {
            Schema::create('ai_chatbot_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ai_chatbot_id')->index();
                $table->unsignedBigInteger('conversation_id')->nullable()->index();
                $table->string('channel_type')->nullable();
                $table->text('inbound_text')->nullable();
                $table->longText('outbound_text')->nullable();
                $table->json('rag_sources')->nullable();
                $table->unsignedInteger('tokens_used')->default(0);
                $table->unsignedInteger('latency_ms')->default(0);
                $table->string('status')->default('success');
                $table->text('error_details')->nullable();
                $table->timestamps();

                $table->foreign('ai_chatbot_id')->references('id')->on('ai_chatbots')->onDelete('cascade');
                $table->foreign('conversation_id')->references('id')->on('conversations')->onDelete('set null');
            });
        }

        // 4. Backfill existing AI Agents data into AI Chatbots if any exist
        if (Schema::hasTable('ai_agents') && Schema::hasTable('ai_chatbots')) {
            $agents = DB::table('ai_agents')->get();
            foreach ($agents as $agent) {
                $exists = DB::table('ai_chatbots')->where('id', $agent->id)->exists();
                if (!$exists) {
                    DB::table('ai_chatbots')->insert([
                        'id' => $agent->id,
                        'tenant_id' => $agent->tenant_id,
                        'name' => $agent->name ?: 'AI ChatBot',
                        'avatar' => null,
                        'description' => $agent->type ?: null,
                        'system_prompt' => $agent->system_prompt ?: 'You are a helpful customer service assistant for our business.',
                        'temperature' => 0.70,
                        'ai_provider_config_id' => $agent->ai_provider_config_id ?? null,
                        'provider' => $agent->provider ?? null,
                        'model' => $agent->model ?? null,
                        'knowledge_base_id' => $agent->knowledge_base_id ?? null,
                        'status' => in_array($agent->status, ['active', 'inactive']) ? $agent->status : 'active',
                        'business_hours' => $agent->business_hours ?? null,
                        'fallback_message' => $agent->fallback_message ?? null,
                        'handoff_rules' => $agent->handoff_rules ?? null,
                        'created_by' => $agent->created_by ?? null,
                        'created_at' => $agent->created_at ?? now(),
                        'updated_at' => $agent->updated_at ?? now(),
                        'deleted_at' => $agent->deleted_at ?? null,
                    ]);
                }
            }

            // Backfill channels
            if (Schema::hasTable('ai_agent_channels') && Schema::hasTable('ai_chatbot_channels')) {
                $agentChannels = DB::table('ai_agent_channels')->get();
                foreach ($agentChannels as $ac) {
                    $exists = DB::table('ai_chatbot_channels')
                        ->where('ai_chatbot_id', $ac->ai_agent_id)
                        ->where('channel_connection_id', $ac->channel_connection_id)
                        ->exists();
                    if (!$exists) {
                        DB::table('ai_chatbot_channels')->insert([
                            'ai_chatbot_id' => $ac->ai_agent_id,
                            'channel_connection_id' => $ac->channel_connection_id,
                            'created_at' => $ac->created_at ?? now(),
                            'updated_at' => $ac->updated_at ?? now(),
                        ]);
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_chatbot_logs');
        Schema::dropIfExists('ai_chatbot_channels');
        Schema::dropIfExists('ai_chatbots');
    }
};
