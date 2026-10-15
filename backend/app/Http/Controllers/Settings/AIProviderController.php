<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AIProviderConfig;
use App\Services\AIProviderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Exception;

class AIProviderController extends Controller
{
    protected AIProviderService $aiService;

    public function __construct(AIProviderService $aiService)
    {
        $this->aiService = $aiService;
    }

    /**
     * List all AI providers and highlight currently configured ones.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $operationalModel = $this->aiService->getAiOperationalModel();
        if ($operationalModel === 'master_fixed') {
            return response()->json([
                'operational_model' => 'master_fixed',
                'providers' => [],
            ]);
        }

        $supported = $this->aiService->getSupportedProviders();

        // Load tenant's own configurations
        $configs = AIProviderConfig::where('tenant_id', $tenantId)
            ->get()
            ->keyBy('provider_name');

        $payload = [];
        foreach ($supported as $slug => $details) {
            $config = $configs->get($slug);
            $availableModels = $details['models'] ?? [];

            if ($config) {
                $savedEnabled = is_array($config->enabled_models) ? $config->enabled_models : [];
                $validEnabled = array_values(array_intersect($savedEnabled, $availableModels));
                $enabledModels = !empty($validEnabled) ? $validEnabled : $availableModels;

                $defaultModel = $config->default_model;
                if (!in_array($defaultModel, $enabledModels)) {
                    $defaultModel = $enabledModels[0] ?? null;
                }
            } else {
                $enabledModels = $availableModels;
                $defaultModel = $availableModels[0] ?? null;
            }

            $payload[$slug] = array_merge($details, [
                'is_configured' => !is_null($config),
                'is_active' => $config ? (bool)$config->is_active : false,
                'enabled_models' => $enabledModels,
                'default_model' => $defaultModel,
            ]);
        }

        return response()->json([
            'operational_model' => $operationalModel,
            'providers' => $payload
        ]);
    }

    /**
     * Validate an API key against the provider connection endpoint before saving.
     */
    public function validateKey(Request $request): JsonResponse
    {
        $operationalModel = $this->aiService->getAiOperationalModel();
        if ($operationalModel !== 'byok') {
            return response()->json([
                'message' => 'AI keys are managed centrally by the platform in Master mode.'
            ], 403);
        }

        $request->validate([
            'provider' => ['required', 'string'],
            'api_key' => ['required', 'string'],
        ]);

        $provider = $request->provider;
        $apiKey = $request->api_key;

        // Check if provider is supported
        $supported = $this->aiService->getSupportedProviders();
        if (!array_key_exists($provider, $supported)) {
            return response()->json([
                'success' => false,
                'message' => "AI provider '{$provider}' is not supported by the platform."
            ], 422);
        }

        try {
            $this->aiService->validateKey($provider, $apiKey);
            return response()->json([
                'success' => true,
                'message' => "Connection test passed. The credentials are valid."
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Store or update AI provider configurations.
     */
    public function store(Request $request): JsonResponse
    {
        $operationalModel = $this->aiService->getAiOperationalModel();
        if ($operationalModel !== 'byok') {
            return response()->json([
                'message' => 'AI keys are managed centrally by the platform in Master mode.'
            ], 403);
        }

        $tenantId = $request->user()->tenant_id;

        $request->validate([
            'provider_name' => ['required', 'string'],
            'api_key' => ['nullable', 'string'], // optional if updating other fields only
            'enabled_models' => ['required', 'array', 'min:1'],
            'default_model' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $provider = $request->provider_name;
        $supported = $this->aiService->getSupportedProviders();

        if (!array_key_exists($provider, $supported)) {
            return response()->json([
                'message' => "AI provider '{$provider}' is not supported."
            ], 422);
        }

        // Check model boundaries
        $allowedModels = $supported[$provider]['models'];
        foreach ($request->enabled_models as $model) {
            if (!in_array($model, $allowedModels)) {
                return response()->json([
                    'message' => "Model '{$model}' is not valid for provider '{$provider}'."
                ], 422);
            }
        }

        // Check default model bounds
        if ($request->default_model && !in_array($request->default_model, $request->enabled_models)) {
            return response()->json([
                'message' => "The default model must be one of the selected enabled models."
            ], 422);
        }

        $config = AIProviderConfig::where('tenant_id', $tenantId)
            ->where('provider_name', $provider)
            ->first();

        $apiKey = $request->api_key;

        // If creating new config, api_key is mandatory
        if (!$config && empty($apiKey)) {
            return response()->json([
                'message' => "The api_key field is required to register a new provider."
            ], 422);
        }

        // If key is supplied, run live validation
        if (!empty($apiKey)) {
            try {
                $this->aiService->validateKey($provider, $apiKey);
            } catch (Exception $e) {
                return response()->json([
                    'message' => "API credentials verification failed: " . $e->getMessage()
                ], 422);
            }
        } else {
            // Keep existing key
            $apiKey = $config->api_key;
        }

        // Save config
        $config = AIProviderConfig::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'provider_name' => $provider,
            ],
            [
                'api_key' => $apiKey,
                'enabled_models' => $request->enabled_models,
                'default_model' => $request->default_model ?: ($request->enabled_models[0] ?? null),
                'is_active' => $request->has('is_active') ? (bool)$request->is_active : true,
            ]
        );

        return response()->json([
            'message' => "AI provider '{$provider}' updated successfully.",
            'config' => [
                'provider_name' => $config->provider_name,
                'is_configured' => true,
                'is_active' => $config->is_active,
                'enabled_models' => $config->enabled_models,
                'default_model' => $config->default_model,
            ]
        ]);
    }

    /**
     * Delete AI provider config.
     */
    public function destroy(Request $request, string $provider): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $config = AIProviderConfig::where('tenant_id', $tenantId)
            ->where('provider_name', $provider)
            ->first();

        if (!$config) {
            return response()->json([
                'message' => "No configuration found for provider '{$provider}'."
            ], 404);
        }

        $config->delete();

        return response()->json([
            'message' => "AI provider '{$provider}' configuration removed."
        ]);
    }

    /**
     * Get centralized AI Settings & Feature Routing matrix for tenant.
     */
    public function getSettings(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $operationalModel = $this->aiService->getAiOperationalModel();
        $features = $this->aiService->getFeaturesList();
        $supported = $this->aiService->getSupportedProviders();

        if ($operationalModel === 'master_fixed') {
            $routing = $this->aiService->getAiFeatureRouting();
            $adminKeys = $this->aiService->getAdminProvidersKeys();
            $adminConfigSetting = \App\Models\PlatformSetting::where('key', 'ai_providers_config')->first();
            $adminConfig = $adminConfigSetting && is_array($adminConfigSetting->value) ? $adminConfigSetting->value : [];

            $availableProviders = [];
            foreach ($supported as $slug => $meta) {
                $hasKey = !empty($adminKeys[$slug]);
                $isEnabled = !empty($adminConfig[$slug]['enabled']);
                if ($hasKey || $isEnabled) {
                    $enabledModels = [];
                    if (!empty($adminConfig[$slug]['models']) && is_array($adminConfig[$slug]['models'])) {
                        foreach ($adminConfig[$slug]['models'] as $m) {
                            if (!empty($m['enabled'])) {
                                $enabledModels[] = $m['id'];
                            }
                        }
                    }
                    if (empty($enabledModels)) {
                        $enabledModels = $meta['models'] ?? [];
                    }

                    $availableProviders[] = [
                        'slug' => $slug,
                        'name' => $meta['name'] ?? ucfirst($slug),
                        'enabled_models' => $enabledModels,
                        'default_model' => $enabledModels[0] ?? null,
                    ];
                }
            }

            if (empty($availableProviders)) {
                foreach ($supported as $slug => $meta) {
                    $availableProviders[] = [
                        'slug' => $slug,
                        'name' => $meta['name'] ?? ucfirst($slug),
                        'enabled_models' => $meta['models'] ?? [],
                        'default_model' => ($meta['models'] ?? [])[0] ?? null,
                    ];
                }
            }

            return response()->json([
                'operational_model' => 'master_fixed',
                'features' => $features,
                'routing' => $routing,
                'available_providers' => $availableProviders,
                'safeguards' => $this->aiService->getAiSafeguardsConfig(),
                'is_managed_by_admin' => true,
            ]);
        }

        // BYOK mode: tenant provides own keys and customizes routing
        $routing = $this->aiService->getTenantAiFeatureRouting($tenantId);

        // Get tenant's configured & active BYOK providers
        $activeConfigs = AIProviderConfig::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->get();

        $availableProviders = [];
        foreach ($activeConfigs as $cfg) {
            $slug = strtolower($cfg->provider_name);
            $meta = $supported[$slug] ?? ['name' => ucfirst($slug), 'models' => []];
            $allSupportedModels = $meta['models'] ?? [];
            
            $savedEnabled = is_array($cfg->enabled_models) ? $cfg->enabled_models : [];
            $validEnabled = array_values(array_intersect($savedEnabled, $allSupportedModels));
            $enabledModels = !empty($validEnabled) ? $validEnabled : $allSupportedModels;

            $availableProviders[] = [
                'slug' => $slug,
                'name' => $meta['name'] ?? ucfirst($slug),
                'enabled_models' => $enabledModels,
                'default_model' => in_array($cfg->default_model, $enabledModels) ? $cfg->default_model : ($enabledModels[0] ?? null),
            ];
        }

        return response()->json([
            'operational_model' => 'byok',
            'features' => $features,
            'routing' => $routing,
            'available_providers' => $availableProviders,
            'safeguards' => $this->aiService->getTenantAiSafeguardsConfig($tenantId),
            'is_managed_by_admin' => false,
        ]);
    }

    /**
     * Update centralized AI Settings, Feature Routing, and Safeguards matrix for tenant.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $operationalModel = $this->aiService->getAiOperationalModel();
        if ($operationalModel === 'master_fixed') {
            return response()->json([
                'success' => false,
                'message' => 'AI routing is centrally managed by the platform administrator in Master Fixed mode.',
            ], 403);
        }

        $tenantId = $request->user()->tenant_id;

        $request->validate([
            'routing' => ['nullable', 'array'],
            'safeguards' => ['nullable', 'array'],
        ]);

        if ($request->has('routing') && is_array($request->routing)) {
            $incomingRouting = $request->routing;
            $activeConfigs = AIProviderConfig::where('tenant_id', $tenantId)
                ->where('is_active', true)
                ->get()
                ->keyBy('provider_name');

            $cleanRouting = [];
            foreach ($incomingRouting as $featureId => $route) {
                if (!is_array($route)) continue;

                $provider = strtolower($route['provider'] ?? '');
                $model = $route['model'] ?? null;

                // Verify provider is configured & active for tenant if active configs exist
                if ($activeConfigs->isNotEmpty() && !$activeConfigs->has($provider)) {
                    $fallbackConfig = $activeConfigs->first();
                    $provider = strtolower($fallbackConfig->provider_name);
                    $model = $fallbackConfig->default_model;
                }

                $cleanRouting[$featureId] = [
                    'provider' => $provider,
                    'model' => $model,
                ];
            }

            $this->aiService->setTenantAiFeatureRouting($tenantId, $cleanRouting);
        }

        if ($request->has('safeguards') && is_array($request->safeguards)) {
            $this->aiService->setTenantAiSafeguardsConfig($tenantId, [
                'rate_limit_per_minute_contact' => max(1, (int) ($request->safeguards['rate_limit_per_minute_contact'] ?? 10)),
                'max_input_tokens' => max(100, (int) ($request->safeguards['max_input_tokens'] ?? 2500)),
                'max_output_tokens' => max(50, (int) ($request->safeguards['max_output_tokens'] ?? 500)),
                'on_limit_breached_action' => in_array($request->safeguards['on_limit_breached_action'] ?? '', ['block_fallback', 'simulate_mock']) ? $request->safeguards['on_limit_breached_action'] : 'block_fallback',
                'fallback_message' => (string) ($request->safeguards['fallback_message'] ?? 'AI assistant is temporarily unavailable due to high demand. An agent will assist you shortly.'),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'AI Settings and Safeguards updated successfully.',
            'routing' => $this->aiService->getTenantAiFeatureRouting($tenantId),
            'safeguards' => $this->aiService->getTenantAiSafeguardsConfig($tenantId),
        ]);
    }

    /**
     * Retrieve AI & Token Usage Telemetry for the authenticated tenant.
     */
    public function getUsage(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        if (!$startDate) {
            $startDate = \Illuminate\Support\Carbon::now()->subDays(30)->toDateString();
        }
        if (!$endDate) {
            $endDate = \Illuminate\Support\Carbon::now()->toDateString();
        }

        $start = \Illuminate\Support\Carbon::parse($startDate)->startOfDay();
        $end = \Illuminate\Support\Carbon::parse($endDate)->endOfDay();

        $query = \App\Models\AiUsageLog::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$start, $end]);

        // Summary metrics
        $totalTokens = (int) ($query->sum('total_tokens') ?: 0);
        $promptTokens = (int) ($query->sum('prompt_tokens') ?: 0);
        $completionTokens = (int) ($query->sum('completion_tokens') ?: 0);
        $totalRequests = (int) $query->count();
        $totalCost = (float) round($query->sum('estimated_cost') ?: 0.0, 4);
        $avgLatency = (int) round($query->avg('latency_ms') ?: 0);
        $successRequests = (int) (clone $query)->where('status', 'success')->count();
        $successRate = $totalRequests > 0 ? round(($successRequests / $totalRequests) * 100, 1) : 100.0;
        $distinctModels = (int) $query->distinct('model')->count('model');

        // Daily Time-Series Trend
        $diffInDays = $start->diffInDays($end);
        $trend = [];
        $runningCumulative = 0;

        for ($d = 0; $d <= $diffInDays; $d++) {
            $day = (clone $start)->addDays($d);
            $dayStart = (clone $day)->startOfDay();
            $dayEnd = (clone $day)->endOfDay();

            $dayLogs = \App\Models\AiUsageLog::where('tenant_id', $tenantId)
                ->whereBetween('created_at', [$dayStart, $dayEnd]);

            $dayPrompt = (int) ($dayLogs->sum('prompt_tokens') ?: 0);
            $dayCompletion = (int) ($dayLogs->sum('completion_tokens') ?: 0);
            $dayTotal = $dayPrompt + $dayCompletion;
            $dayReqs = (int) $dayLogs->count();
            $dayCost = (float) round($dayLogs->sum('estimated_cost') ?: 0.0, 4);
            $runningCumulative += $dayTotal;

            $trend[] = [
                'date' => $day->toDateString(),
                'label' => $day->format('d M'),
                'prompt_tokens' => $dayPrompt,
                'completion_tokens' => $dayCompletion,
                'total_tokens' => $dayTotal,
                'cumulative_tokens' => $runningCumulative,
                'requests' => $dayReqs,
                'cost' => $dayCost
            ];
        }

        // Canonical Platform AI Features
        $canonicalFeatures = [
            'copilot' => [
                'name' => 'Copilot Workspace Assistant',
                'description' => 'Autonomous workspace intelligence, automated flow designer, campaign drafting, and CRM reporting',
            ],
            'ai_chatbot' => [
                'name' => 'AI Chatbot',
                'description' => 'Automated conversational AI replies across all connected channels',
            ],
            'flow_ai_prompt' => [
                'name' => 'Flow AI Action Node',
                'description' => 'Generative LLM completions and extractions in Visual Flows',
            ],
            'flow_ai_condition' => [
                'name' => 'Flow AI Intent & Condition',
                'description' => 'Intent classification and sentiment branching in Visual Flows',
            ],
            'knowledge_base_rag' => [
                'name' => 'Knowledge Base RAG',
                'description' => 'Document vectorization and contextual semantic search',
            ],
        ];

        $aliasMap = [
            'copilot' => 'copilot',
            'prompt_to_flow' => 'copilot',
            'prompt_flow' => 'copilot',
            'social_posts' => 'copilot',
            'social_post' => 'copilot',
            'chatbot' => 'ai_chatbot',
            'ai_chatbots' => 'ai_chatbot',
            'agent' => 'ai_chatbot',
            'ai_agents' => 'ai_chatbot',
            'smart_reply' => 'ai_chatbot',
            'campaign' => 'copilot',
            'flow_condition' => 'flow_ai_condition',
            'flow_prompt' => 'flow_ai_prompt',
            'knowledge_rag' => 'knowledge_base_rag',
            'rag_kb' => 'knowledge_base_rag',
            'general' => 'ai_chatbot',
        ];

        $featuresRaw = \App\Models\AiUsageLog::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$start, $end])
            ->select('feature', \Illuminate\Support\Facades\DB::raw('COUNT(*) as requests'), \Illuminate\Support\Facades\DB::raw('SUM(total_tokens) as total_tokens'), \Illuminate\Support\Facades\DB::raw('SUM(estimated_cost) as total_cost'))
            ->groupBy('feature')
            ->get();

        // Group into canonical features
        $featureTotals = [];
        foreach ($canonicalFeatures as $key => $meta) {
            $featureTotals[$key] = [
                'key' => $key,
                'name' => $meta['name'],
                'description' => $meta['description'],
                'requests' => 0,
                'total_tokens' => 0,
                'cost' => 0.0,
                'percentage' => 0.0,
            ];
        }

        foreach ($featuresRaw as $item) {
            $canonicalKey = $aliasMap[$item->feature] ?? (isset($canonicalFeatures[$item->feature]) ? $item->feature : 'ai_chatbot');
            if (isset($featureTotals[$canonicalKey])) {
                $featureTotals[$canonicalKey]['requests'] += (int) $item->requests;
                $featureTotals[$canonicalKey]['total_tokens'] += (int) $item->total_tokens;
                $featureTotals[$canonicalKey]['cost'] += (float) $item->total_cost;
            }
        }

        $featureDistribution = [];
        foreach ($featureTotals as $key => $item) {
            $item['cost'] = (float) round($item['cost'], 4);
            $item['percentage'] = $totalTokens > 0 ? round(($item['total_tokens'] / $totalTokens) * 100, 1) : 0;
            $featureDistribution[] = $item;
        }

        // Model Breakdown
        $modelColors = ['#0A0A0A', '#3DD43D', '#71717A', '#3B82F6', '#F5A623', '#8B5CF6', '#EC4899', '#10B981'];
        $modelsRaw = \App\Models\AiUsageLog::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$start, $end])
            ->select('model', \Illuminate\Support\Facades\DB::raw('COUNT(*) as requests'), \Illuminate\Support\Facades\DB::raw('SUM(total_tokens) as total_tokens'))
            ->groupBy('model')
            ->orderByDesc('total_tokens')
            ->get();

        $modelDistribution = [];
        $idx = 0;
        foreach ($modelsRaw as $m) {
            $modelDistribution[] = [
                'name' => $m->model,
                'value' => (int) $m->total_tokens,
                'requests' => (int) $m->requests,
                'percentage' => $totalTokens > 0 ? round(($m->total_tokens / $totalTokens) * 100, 1) : 0,
                'color' => $modelColors[$idx % count($modelColors)]
            ];
            $idx++;
        }

        // Recent Invocations (Full Telemetry Logs)
        $logs = \App\Models\AiUsageLog::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$start, $end])
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(function ($log) use ($canonicalFeatures, $aliasMap) {
                $canonicalKey = $aliasMap[$log->feature] ?? (isset($canonicalFeatures[$log->feature]) ? $log->feature : 'ai_chatbot');
                $featureName = $canonicalFeatures[$canonicalKey]['name'] ?? 'AI Chatbot';

                return [
                    'id' => $log->id,
                    'feature' => $canonicalKey,
                    'feature_label' => $featureName,
                    'provider' => $log->provider,
                    'model' => $log->model,
                    'prompt_tokens' => $log->prompt_tokens,
                    'completion_tokens' => $log->completion_tokens,
                    'total_tokens' => $log->total_tokens,
                    'estimated_cost' => (float) $log->estimated_cost,
                    'latency_ms' => $log->latency_ms,
                    'status' => $log->status,
                    'created_at' => $log->created_at->toISOString(),
                ];
            });

        return response()->json([
            'summary' => [
                'total_tokens' => $totalTokens,
                'prompt_tokens' => $promptTokens,
                'completion_tokens' => $completionTokens,
                'total_requests' => $totalRequests,
                'total_cost' => $totalCost,
                'avg_latency_ms' => $avgLatency,
                'success_rate' => $successRate,
                'distinct_models' => $distinctModels,
            ],
            'trend' => $trend,
            'feature_distribution' => $featureDistribution,
            'model_distribution' => $modelDistribution,
            'recent_logs' => $logs
        ]);
    }
}
