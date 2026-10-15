<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\AiChatbot;
use App\Models\AiChatbotLog;
use App\Models\AIProviderConfig;
use App\Models\ChannelConnection;
use App\Models\KnowledgeBase;
use App\Models\PlatformSetting;
use App\Services\AIProviderService;
use App\Services\RAGService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class AiChatbotController extends Controller
{
    /**
     * List all chatbots for the tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $chatbots = AiChatbot::where('tenant_id', $tenantId)
            ->with(['channels', 'knowledgeBase', 'providerConfig', 'creator', 'ecommerceConnection'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($chatbots);
    }

    /**
     * Get available AI providers and allowed models for the tenant.
     */
    public function providerConfigs(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $aiService = app(AIProviderService::class);
        $operationalModel = $aiService->getAiOperationalModel();

        $configs = AIProviderConfig::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->get();

        // Master Fixed defaults
        $platformDefault = [
            'id' => null,
            'provider_name' => 'groq',
            'model' => 'llama-3.3-70b-versatile',
            'is_default' => true,
            'operational_model' => $operationalModel,
        ];

        // Available models list by provider
        $modelsByProvider = [
            'groq' => [
                ['id' => 'openai/gpt-oss-120b', 'name' => 'GPT OSS 120B (High Capability)'],
                ['id' => 'openai/gpt-oss-20b', 'name' => 'GPT OSS 20B (Ultra Fast)'],
                ['id' => 'qwen/qwen3.8-27b', 'name' => 'Qwen 3.8 27B (Multilingual & Reasoning)'],
                ['id' => 'groq/compound', 'name' => 'Groq Compound (Agentic Routing)'],
                ['id' => 'llama-3.3-70b-versatile', 'name' => 'Llama 3.3 70B Versatile'],
            ],
            'openai' => [
                ['id' => 'gpt-4o-mini', 'name' => 'GPT-4o Mini (Fast & Affordable)'],
                ['id' => 'gpt-4o', 'name' => 'GPT-4o (Omni Flagship)'],
                ['id' => 'gpt-4.1', 'name' => 'GPT-4.1 (Flagship)'],
                ['id' => 'gpt-4.1-mini', 'name' => 'GPT-4.1 Mini'],
                ['id' => 'o3-mini', 'name' => 'o3-mini (Fast Reasoning)'],
                ['id' => 'o1', 'name' => 'o1 (Full Reasoning)'],
            ],
            'anthropic' => [
                ['id' => 'claude-3-7-sonnet-20250219', 'name' => 'Claude 3.7 Sonnet (Hybrid Reasoning)'],
                ['id' => 'claude-3-5-sonnet-20241022', 'name' => 'Claude 3.5 Sonnet (Advanced Reasoning)'],
                ['id' => 'claude-3-5-haiku-20241022', 'name' => 'Claude 3.5 Haiku (Ultra Fast)'],
                ['id' => 'claude-3-opus-20240229', 'name' => 'Claude 3 Opus'],
            ],
            'gemini' => [
                ['id' => 'gemini-2.0-flash', 'name' => 'Gemini 2.0 Flash (Next-Gen Multimodal)'],
                ['id' => 'gemini-2.0-flash-lite', 'name' => 'Gemini 2.0 Flash Lite (Cost-Efficient)'],
                ['id' => 'gemini-1.5-flash', 'name' => 'Gemini 1.5 Flash (Low Latency)'],
                ['id' => 'gemini-1.5-pro', 'name' => 'Gemini 1.5 Pro (Large Context)'],
            ],
            'deepseek' => [
                ['id' => 'deepseek-chat', 'name' => 'DeepSeek V3 (Chat)'],
                ['id' => 'deepseek-reasoner', 'name' => 'DeepSeek R1 (Reasoning)'],
            ],
            'xai' => [
                ['id' => 'grok-2-1212', 'name' => 'Grok 2'],
                ['id' => 'grok-2-vision-1212', 'name' => 'Grok 2 Vision'],
                ['id' => 'grok-2-latest', 'name' => 'Grok 2 (Latest)'],
            ],
            'mistral' => [
                ['id' => 'mistral-large-latest', 'name' => 'Mistral Large'],
                ['id' => 'mistral-small-latest', 'name' => 'Mistral Small'],
                ['id' => 'codestral-latest', 'name' => 'Codestral'],
                ['id' => 'pixtral-12b-2409', 'name' => 'Pixtral 12B (Vision)'],
            ],
            'openrouter' => [
                ['id' => 'openai/gpt-4o', 'name' => 'GPT-4o (OpenRouter)'],
                ['id' => 'openai/gpt-4o-mini', 'name' => 'GPT-4o Mini (OpenRouter)'],
                ['id' => 'anthropic/claude-3.7-sonnet', 'name' => 'Claude 3.7 Sonnet (OpenRouter)'],
                ['id' => 'deepseek/deepseek-r1', 'name' => 'DeepSeek R1 (OpenRouter)'],
                ['id' => 'google/gemini-2.0-flash-001', 'name' => 'Gemini 2.0 Flash (OpenRouter)'],
                ['id' => 'meta-llama/llama-3.3-70b-instruct', 'name' => 'Llama 3.3 70B (OpenRouter)'],
            ],
        ];

        return response()->json([
            'operational_model' => $operationalModel,
            'platform_default' => $platformDefault,
            'configs' => $configs,
            'models_by_provider' => $modelsByProvider,
        ]);
    }

    /**
     * Create a new AI ChatBot.
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $request->validate([
            'name' => 'required|string|max:255',
            'avatar' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'system_prompt' => 'required|string|max:10000',
            'temperature' => 'nullable|numeric|min:0|max:1',
            'ai_provider_config_id' => 'nullable|integer',
            'provider' => 'nullable|string|max:50',
            'model' => 'nullable|string|max:100',
            'knowledge_base_id' => 'nullable|integer',
            'ecommerce_connection_id' => 'nullable|integer',
            'ecommerce_settings' => 'nullable|array',
            'status' => 'nullable|in:active,inactive',
            'business_hours' => 'nullable|array',
            'fallback_message' => 'nullable|string|max:1000',
            'handoff_rules' => 'nullable|array',
            'channel_ids' => 'nullable|array',
            'channel_ids.*' => 'integer',
        ]);

        $status = $request->input('status', 'active');
        $channelIds = $request->input('channel_ids', []);

        // Validate channel conflicts if creating active chatbot
        if ($status === 'active' && !empty($channelIds)) {
            $conflictBot = AiChatbot::where('tenant_id', $tenantId)
                ->where('status', 'active')
                ->whereHas('channels', function ($q) use ($channelIds) {
                    $q->whereIn('channel_connections.id', $channelIds);
                })
                ->with('channels')
                ->first();

            if ($conflictBot) {
                return response()->json([
                    'message' => "Another active AI ChatBot ('{$conflictBot->name}') is already connected to one or more of the selected channels.",
                ], 422);
            }
        }

        DB::beginTransaction();
        try {
            $chatbot = AiChatbot::create([
                'tenant_id' => $tenantId,
                'name' => trim($request->input('name')),
                'avatar' => $request->input('avatar'),
                'description' => trim($request->input('description', '')),
                'system_prompt' => trim($request->input('system_prompt')),
                'temperature' => $request->input('temperature', 0.70),
                'ai_provider_config_id' => $request->input('ai_provider_config_id'),
                'provider' => $request->input('provider', 'groq'),
                'model' => $request->input('model', 'llama-3.3-70b-versatile'),
                'knowledge_base_id' => $request->input('knowledge_base_id'),
                'ecommerce_connection_id' => $request->input('ecommerce_connection_id'),
                'ecommerce_settings' => $request->input('ecommerce_settings'),
                'status' => $status,
                'business_hours' => $request->input('business_hours'),
                'fallback_message' => $request->input('fallback_message'),
                'handoff_rules' => $request->input('handoff_rules'),
                'created_by' => $request->user()->id,
            ]);

            if (!empty($channelIds)) {
                $chatbot->channels()->sync($channelIds);
            }

            DB::commit();

            return response()->json($chatbot->load(['channels', 'knowledgeBase', 'providerConfig', 'creator', 'ecommerceConnection']), 201);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("AiChatbotController@store error: " . $e->getMessage());
            return response()->json(['message' => 'Failed to create AI ChatBot: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Show single AI ChatBot.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $chatbot = AiChatbot::where('tenant_id', $tenantId)
            ->with(['channels', 'knowledgeBase', 'providerConfig', 'creator', 'ecommerceConnection'])
            ->findOrFail($id);

        return response()->json($chatbot);
    }

    /**
     * Update an AI ChatBot.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $chatbot = AiChatbot::where('tenant_id', $tenantId)->findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'avatar' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'system_prompt' => 'sometimes|required|string|max:10000',
            'temperature' => 'nullable|numeric|min:0|max:1',
            'ai_provider_config_id' => 'nullable|integer',
            'provider' => 'nullable|string|max:50',
            'model' => 'nullable|string|max:100',
            'knowledge_base_id' => 'nullable|integer',
            'ecommerce_connection_id' => 'nullable|integer',
            'ecommerce_settings' => 'nullable|array',
            'status' => 'nullable|in:active,inactive',
            'business_hours' => 'nullable|array',
            'fallback_message' => 'nullable|string|max:1000',
            'handoff_rules' => 'nullable|array',
            'channel_ids' => 'nullable|array',
            'channel_ids.*' => 'integer',
        ]);

        $status = $request->input('status', $chatbot->status);
        $channelIds = $request->has('channel_ids') ? $request->input('channel_ids', []) : null;

        // Check channel conflicts if setting to active with channels
        if ($status === 'active' && $channelIds !== null && !empty($channelIds)) {
            $conflictBot = AiChatbot::where('tenant_id', $tenantId)
                ->where('id', '!=', $chatbot->id)
                ->where('status', 'active')
                ->whereHas('channels', function ($q) use ($channelIds) {
                    $q->whereIn('channel_connections.id', $channelIds);
                })
                ->with('channels')
                ->first();

            if ($conflictBot) {
                return response()->json([
                    'message' => "Another active AI ChatBot ('{$conflictBot->name}') is already connected to one or more of the selected channels.",
                ], 422);
            }
        }

        DB::beginTransaction();
        try {
            $chatbot->fill($request->only([
                'name',
                'avatar',
                'description',
                'system_prompt',
                'temperature',
                'ai_provider_config_id',
                'provider',
                'model',
                'knowledge_base_id',
                'ecommerce_connection_id',
                'ecommerce_settings',
                'status',
                'business_hours',
                'fallback_message',
                'handoff_rules',
            ]));

            $chatbot->save();

            if ($channelIds !== null) {
                $chatbot->channels()->sync($channelIds);
            }

            DB::commit();

            return response()->json($chatbot->load(['channels', 'knowledgeBase', 'providerConfig', 'creator', 'ecommerceConnection']));
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("AiChatbotController@update error: " . $e->getMessage());
            return response()->json(['message' => 'Failed to update AI ChatBot: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete an AI ChatBot.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $chatbot = AiChatbot::where('tenant_id', $tenantId)->findOrFail($id);

        $chatbot->channels()->detach();
        $chatbot->delete();

        return response()->json(['message' => 'AI ChatBot deleted successfully']);
    }

    /**
     * Activity logs for this ChatBot.
     */
    public function logs(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $chatbot = AiChatbot::where('tenant_id', $tenantId)->findOrFail($id);

        $logs = AiChatbotLog::where('ai_chatbot_id', $chatbot->id)
            ->with(['conversation'])
            ->orderBy('id', 'desc')
            ->paginate(20);

        return response()->json($logs);
    }

    /**
     * Test query sandbox simulation.
     */
    public function test(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $chatbot = AiChatbot::where('tenant_id', $tenantId)->findOrFail($id);

        $request->validate([
            'query' => 'required|string|max:2000',
        ]);

        $startTime = microtime(true);
        $userQuery = trim($request->input('query'));
        $ragContext = '';
        $matchedSources = [];

        // 1. Semantic RAG retrieval if Knowledge Base is attached
        if ($chatbot->knowledge_base_id) {
            try {
                $ragService = app(RAGService::class);
                $chunks = $ragService->searchSimilarChunks($chatbot->knowledge_base_id, $userQuery, 3);
                foreach ($chunks as $chunk) {
                    $chunkContent = $chunk->content ?? '';
                    $ragContext .= "Context excerpt:\n" . $chunkContent . "\n\n";
                    $matchedSources[] = [
                        'id' => $chunk->id,
                        'source' => $chunk->source->source_name ?? ($chunk->source->name ?? 'Knowledge Document'),
                        'snippet' => substr($chunkContent, 0, 120) . '...',
                    ];
                }
            } catch (Exception $e) {
                Log::warning("Sandbox RAG search failed: " . $e->getMessage());
            }
        }

        // 2. Customer context & System instructions
        $ecommerceToolService = app(\App\Services\AiEcommerceToolService::class);
        $customerContext = '';
        if ($chatbot->isEcommerceEnabled()) {
            // Provide realistic sandbox customer context for playground testing
            $customerContext = "\nSANDBOX CUSTOMER CONTEXT:\n- Name: Alex Mercer (Test Contact)\n- Email: alex.mercer@example.com\n- Phone: +1-555-0192\n- Recent Order: #1001 (Status: Shipped, Tracking: FX-884920412, Total: $199.99)\n";
        }

        $fullSystemPrompt = $chatbot->system_prompt;
        if (!empty($ragContext)) {
            $fullSystemPrompt .= "\n\nUse the following verified knowledge base documents to accurately answer the user's questions:\n" . $ragContext;
        }
        if (!empty($customerContext)) {
            $fullSystemPrompt .= "\n\n" . $customerContext;
        }

        // 3. Call LLM with tool calling support
        $aiService = app(AIProviderService::class);
        $messages = [
            ['role' => 'system', 'content' => $fullSystemPrompt],
            ['role' => 'user', 'content' => $userQuery],
        ];

        try {
            $resolvedAI = $aiService->resolveAIExecution(
                $tenantId,
                'ai_chatbot',
                $chatbot->providerConfig?->provider_name ?: $chatbot->provider,
                $chatbot->model
            );

            if (!empty($resolvedAI['is_blocked'])) {
                $latencyMs = (int) round((microtime(true) - $startTime) * 1000);
                return response()->json([
                    'success' => true,
                    'reply' => $resolvedAI['fallback_message'] ?: 'AI token limit reached for the current billing cycle.',
                    'latency_ms' => $latencyMs,
                    'matched_sources' => $matchedSources,
                    'tool_calls' => [],
                    'provider' => $resolvedAI['provider'] ?? 'system',
                    'model' => $resolvedAI['model'] ?? 'default',
                    'is_safeguard_blocked' => true,
                    'block_reason' => $resolvedAI['block_reason'] ?? 'quota_exceeded',
                ]);
            }

            $provider = $resolvedAI['provider'] ?: ($chatbot->provider ?: 'groq');
            $apiKey = $resolvedAI['api_key'];
            $model = $resolvedAI['model'] ?: ($chatbot->model ?: 'llama-3.3-70b-versatile');

            $tools = [];
            if ($chatbot->isEcommerceEnabled()) {
                $tools = $ecommerceToolService->getToolDefinitions($chatbot->ecommerce_settings);
            }

            $reply = '';
            $executedToolCalls = [];

            if (!empty($tools)) {
                $loopCount = 0;
                while ($loopCount < 3) {
                    $loopCount++;
                    $res = $aiService->generateCompletionWithTools(
                        $provider,
                        $apiKey,
                        $model,
                        $messages,
                        $tools,
                        (float) ($chatbot->temperature ?: 0.70),
                        'ai_chatbot',
                        $tenantId
                    );

                    if (!empty($res['tool_calls'])) {
                        $messages[] = [
                            'role' => 'assistant',
                            'content' => $res['content'] ?? null,
                            'tool_calls' => $res['tool_calls']
                        ];

                        foreach ($res['tool_calls'] as $tc) {
                            $toolName = $tc['name'] ?? ($tc['function']['name'] ?? '');
                            $args = $tc['arguments'] ?? ($tc['function']['arguments'] ?? []);
                            if (is_string($args)) {
                                $args = json_decode($args, true) ?: [];
                            }

                            $resultText = $ecommerceToolService->executeTool(
                                $toolName,
                                $args,
                                $tenantId,
                                $chatbot->ecommerce_connection_id,
                                null,
                                $chatbot->ecommerce_settings
                            );

                            $executedToolCalls[] = [
                                'name' => $toolName,
                                'arguments' => $args,
                                'result' => json_decode($resultText, true) ?: $resultText,
                            ];

                            $messages[] = [
                                'role' => 'tool',
                                'tool_call_id' => $tc['id'] ?? ('call_' . uniqid()),
                                'name' => $toolName,
                                'content' => $resultText
                            ];
                        }
                    } else {
                        $reply = $res['content'] ?? 'Hello! How can I assist you with our catalog or your orders today?';
                        break;
                    }
                }

                if (empty($reply)) {
                    $reply = $aiService->generateCompletion(
                        $provider,
                        $apiKey,
                        $model,
                        $messages,
                        (float) ($chatbot->temperature ?: 0.70),
                        'ai_chatbot',
                        $tenantId
                    );
                }
            } else {
                $reply = $aiService->generateCompletion(
                    $provider,
                    $apiKey,
                    $model,
                    $messages,
                    (float) ($chatbot->temperature ?: 0.70),
                    'ai_chatbot',
                    $tenantId
                );
            }

            $latencyMs = (int) round((microtime(true) - $startTime) * 1000);

            return response()->json([
                'success' => true,
                'reply' => $reply,
                'latency_ms' => $latencyMs,
                'matched_sources' => $matchedSources,
                'tool_calls' => $executedToolCalls,
                'provider' => $provider,
                'model' => $model,
            ]);
        } catch (Exception $e) {
            $latencyMs = (int) round((microtime(true) - $startTime) * 1000);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'latency_ms' => $latencyMs,
            ], 500);
        }
    }
}
