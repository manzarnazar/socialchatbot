<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\PlatformSetting;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Initial AI Operational Model (default: byok)
        if (!PlatformSetting::where('key', 'ai_operational_model')->exists()) {
            PlatformSetting::create([
                'key' => 'ai_operational_model',
                'value' => 'byok',
            ]);
        }

        // 2. Initial Admin Provider Keys (empty map)
        if (!PlatformSetting::where('key', 'ai_providers_keys')->exists()) {
            PlatformSetting::create([
                'key' => 'ai_providers_keys',
                'value' => [
                    'openai' => '',
                    'anthropic' => '',
                    'gemini' => '',
                    'groq' => '',
                    'deepseek' => '',
                    'xai' => '',
                    'mistral' => '',
                    'openrouter' => '',
                ],
            ]);
        }

        // 3. Initial AI Feature Routing Matrix
        $defaultRouting = [
            'prompt_to_flow' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
            'flow_ai_condition' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
            'flow_ai_prompt' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
            'flow_rag_query' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
            'ai_agents' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
            'inbox_smart_reply' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
            'inbox_conversation_summary' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
            'contact_sentiment_analysis' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
            'knowledge_base_rag' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
            'campaign_copywriter' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
        ];

        if (!PlatformSetting::where('key', 'ai_feature_routing')->exists()) {
            PlatformSetting::create([
                'key' => 'ai_feature_routing',
                'value' => $defaultRouting,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        PlatformSetting::whereIn('key', [
            'ai_operational_model',
            'ai_providers_keys',
            'ai_feature_routing',
        ])->delete();
    }
};
