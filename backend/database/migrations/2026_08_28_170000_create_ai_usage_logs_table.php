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
        Schema::dropIfExists('ai_usage_logs');

        Schema::create('ai_usage_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('tenant_users')->nullOnDelete();
            $table->string('feature', 64)->default('general')->index(); // chatbot, agent, smart_reply, flow_condition, knowledge_rag, campaign, general
            $table->string('provider', 64)->default('openai')->index(); // openai, anthropic, gemini, groq, deepseek, xai, mistral, openrouter
            $table->string('model', 128)->default('gpt-4o-mini')->index();
            $table->unsignedInteger('prompt_tokens')->default(0);
            $table->unsignedInteger('completion_tokens')->default(0);
            $table->unsignedInteger('total_tokens')->default(0);
            $table->decimal('estimated_cost', 10, 6)->default(0.000000);
            $table->unsignedInteger('latency_ms')->default(0);
            $table->string('status', 32)->default('success')->index(); // success, failed
            $table->text('error_message')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['created_at', 'tenant_id']);
            $table->index(['created_at', 'feature']);
            $table->index(['created_at', 'model']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_usage_logs');
    }
};
