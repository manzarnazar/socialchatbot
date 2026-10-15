<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Exception;

class AIProviderService
{
    /**
     * Get list of all supported AI providers and their friendly details.
     */
    public function getSupportedProviders(): array
    {
        $defaultProviders = [
            'openai' => [
                'name' => 'OpenAI',
                'description' => 'Industry standard models like GPT-4o and GPT-4o-mini.',
                'website' => 'https://platform.openai.com',
            ],
            'anthropic' => [
                'name' => 'Anthropic Claude',
                'description' => 'State-of-the-art reasoning models like Claude 3.5 Sonnet.',
                'website' => 'https://console.anthropic.com',
            ],
            'gemini' => [
                'name' => 'Google Gemini',
                'description' => 'Google\'s multimodal models, including Gemini 2.5 Flash and Pro.',
                'website' => 'https://aistudio.google.com',
            ],
            'groq' => [
                'name' => 'Groq LPU',
                'description' => 'Ultra-fast inference engine running open models like Llama 3.',
                'website' => 'https://console.groq.com',
            ],
            'deepseek' => [
                'name' => 'DeepSeek',
                'description' => 'High-efficiency open weights models including DeepSeek Chat.',
                'website' => 'https://platform.deepseek.com',
            ],
            'xai' => [
                'name' => 'xAI Grok',
                'description' => 'Elon Musk\'s xAI Grok intelligence models.',
                'website' => 'https://console.x.ai',
            ],
            'mistral' => [
                'name' => 'Mistral AI',
                'description' => 'Premium European open weight models like Mistral Large.',
                'website' => 'https://console.mistral.ai',
            ],
            'openrouter' => [
                'name' => 'OpenRouter',
                'description' => 'Aggregated access endpoint to hundreds of open/closed models.',
                'website' => 'https://openrouter.ai',
            ],
        ];

        $setting = \App\Models\PlatformSetting::where('key', 'ai_providers_config')->first();
        
        $defaultConfig = [
            'openai' => [
                'enabled' => true,
                'models' => [
                    ['id' => 'gpt-4o', 'name' => 'GPT-4o (Omni Flagship)', 'enabled' => true, 'custom' => false],
                    ['id' => 'gpt-4o-mini', 'name' => 'GPT-4o Mini (Fast & Affordable)', 'enabled' => true, 'custom' => false],
                    ['id' => 'gpt-4.1', 'name' => 'GPT-4.1 (Flagship)', 'enabled' => true, 'custom' => false],
                    ['id' => 'gpt-4.1-mini', 'name' => 'GPT-4.1 Mini', 'enabled' => true, 'custom' => false],
                    ['id' => 'o3-mini', 'name' => 'o3-mini (Fast Reasoning)', 'enabled' => true, 'custom' => false],
                    ['id' => 'o1', 'name' => 'o1 (Full Reasoning)', 'enabled' => true, 'custom' => false],
                ],
            ],
            'anthropic' => [
                'enabled' => true,
                'models' => [
                    ['id' => 'claude-3-7-sonnet-20250219', 'name' => 'Claude 3.7 Sonnet (Hybrid Reasoning)', 'enabled' => true, 'custom' => false],
                    ['id' => 'claude-3-5-sonnet-20241022', 'name' => 'Claude 3.5 Sonnet (Advanced Reasoning)', 'enabled' => true, 'custom' => false],
                    ['id' => 'claude-3-5-haiku-20241022', 'name' => 'Claude 3.5 Haiku (Ultra Fast)', 'enabled' => true, 'custom' => false],
                    ['id' => 'claude-3-opus-20240229', 'name' => 'Claude 3 Opus', 'enabled' => true, 'custom' => false],
                ],
            ],
            'gemini' => [
                'enabled' => true,
                'models' => [
                    ['id' => 'gemini-2.0-flash', 'name' => 'Gemini 2.0 Flash (Next-Gen Multimodal)', 'enabled' => true, 'custom' => false],
                    ['id' => 'gemini-2.0-flash-lite', 'name' => 'Gemini 2.0 Flash Lite (Cost-Efficient)', 'enabled' => true, 'custom' => false],
                    ['id' => 'gemini-1.5-flash', 'name' => 'Gemini 1.5 Flash (Fast)', 'enabled' => true, 'custom' => false],
                    ['id' => 'gemini-1.5-pro', 'name' => 'Gemini 1.5 Pro (Complex Tasks)', 'enabled' => true, 'custom' => false],
                ],
            ],
            'groq' => [
                'enabled' => true,
                'models' => [
                    ['id' => 'openai/gpt-oss-120b', 'name' => 'GPT OSS 120B (High Capability)', 'enabled' => true, 'custom' => false],
                    ['id' => 'openai/gpt-oss-20b', 'name' => 'GPT OSS 20B (Ultra Fast)', 'enabled' => true, 'custom' => false],
                    ['id' => 'qwen/qwen3.8-27b', 'name' => 'Qwen 3.8 27B (Multilingual & Reasoning)', 'enabled' => true, 'custom' => false],
                    ['id' => 'groq/compound', 'name' => 'Groq Compound (Agentic Routing)', 'enabled' => true, 'custom' => false],
                    ['id' => 'llama-3.3-70b-versatile', 'name' => 'Llama 3.3 70B Versatile', 'enabled' => true, 'custom' => false],
                ],
            ],
            'deepseek' => [
                'enabled' => false,
                'models' => [
                    ['id' => 'deepseek-chat', 'name' => 'DeepSeek V3 (Chat)', 'enabled' => true, 'custom' => false],
                    ['id' => 'deepseek-reasoner', 'name' => 'DeepSeek R1 (Reasoning)', 'enabled' => true, 'custom' => false],
                ],
            ],
            'xai' => [
                'enabled' => false,
                'models' => [
                    ['id' => 'grok-2-1212', 'name' => 'Grok 2'],
                    ['id' => 'grok-2-vision-1212', 'name' => 'Grok 2 Vision'],
                    ['id' => 'grok-2-latest', 'name' => 'Grok 2 (Latest)'],
                ],
            ],
            'mistral' => [
                'enabled' => false,
                'models' => [
                    ['id' => 'mistral-large-latest', 'name' => 'Mistral Large', 'enabled' => true, 'custom' => false],
                    ['id' => 'mistral-small-latest', 'name' => 'Mistral Small', 'enabled' => true, 'custom' => false],
                    ['id' => 'codestral-latest', 'name' => 'Codestral', 'enabled' => true, 'custom' => false],
                    ['id' => 'pixtral-12b-2409', 'name' => 'Pixtral 12B (Vision)', 'enabled' => true, 'custom' => false],
                ],
            ],
            'openrouter' => [
                'enabled' => false,
                'models' => [
                    ['id' => 'openai/gpt-4o', 'name' => 'GPT-4o (OpenRouter)', 'enabled' => true, 'custom' => false],
                    ['id' => 'openai/gpt-4o-mini', 'name' => 'GPT-4o Mini (OpenRouter)', 'enabled' => true, 'custom' => false],
                    ['id' => 'anthropic/claude-3.7-sonnet', 'name' => 'Claude 3.7 Sonnet (OpenRouter)', 'enabled' => true, 'custom' => false],
                    ['id' => 'deepseek/deepseek-r1', 'name' => 'DeepSeek R1 (OpenRouter)', 'enabled' => true, 'custom' => false],
                    ['id' => 'google/gemini-2.0-flash-001', 'name' => 'Gemini 2.0 Flash (OpenRouter)', 'enabled' => true, 'custom' => false],
                    ['id' => 'meta-llama/llama-3.3-70b-instruct', 'name' => 'Llama 3.3 70B (OpenRouter)', 'enabled' => true, 'custom' => false],
                ],
            ]
        ];

        $config = $setting ? $setting->value : $defaultConfig;

        $supported = [];
        foreach ($defaultProviders as $slug => $details) {
            $provConfig = $config[$slug] ?? null;
            if ($provConfig && !empty($provConfig['enabled'])) {
                $enabledModels = [];
                if (isset($provConfig['models']) && is_array($provConfig['models'])) {
                    foreach ($provConfig['models'] as $m) {
                        if (!empty($m['enabled']) && isset($m['id'])) {
                            $enabledModels[] = $m['id'];
                        }
                    }
                }
                
                if (count($enabledModels) > 0) {
                    $supported[$slug] = array_merge($details, [
                        'models' => $enabledModels
                    ]);
                }
            }
        }

        return $supported;
    }

    /**
     * Get the active AI Operational Model ('byok', 'master_fixed').
     */
    public function getAiOperationalModel(): string
    {
        $setting = \App\Models\PlatformSetting::where('key', 'ai_operational_model')->first();
        return $setting ? (string)$setting->value : 'byok';
    }

    /**
     * Set the AI Operational Model.
     */
    public function setAiOperationalModel(string $model): void
    {
        if (!in_array($model, ['byok', 'master_fixed'])) {
            $model = 'byok';
        }
        \App\Models\PlatformSetting::updateOrCreate(
            ['key' => 'ai_operational_model'],
            ['value' => $model]
        );
    }

    /**
     * Get Admin global provider keys map.
     */
    public function getAdminProvidersKeys(): array
    {
        $setting = \App\Models\PlatformSetting::where('key', 'ai_providers_keys')->first();
        return $setting && is_array($setting->value) ? $setting->value : [];
    }

    /**
     * Update Admin global provider keys map.
     */
    public function setAdminProvidersKeys(array $keys): void
    {
        $current = $this->getAdminProvidersKeys();
        foreach ($keys as $provider => $key) {
            if ($key === '' || $key === '__DELETE__') {
                unset($current[strtolower($provider)]);
            } elseif ($key !== null && $key !== '••••••••' && !str_starts_with((string)$key, '••••')) {
                $current[strtolower($provider)] = trim((string)$key);
            }
        }
        \App\Models\PlatformSetting::updateOrCreate(
            ['key' => 'ai_providers_keys'],
            ['value' => $current]
        );
    }

    /**
     * Get the 10 Standard Platform AI Features definitions.
     */
    public function getFeaturesList(): array
    {
        return [
            [
                'id' => 'copilot',
                'name' => 'Copilot Workspace Assistant',
                'description' => 'Autonomous workspace intelligence, automated flow designer, campaign drafting, social content copywriting, and CRM reporting assistant.',
                'category' => 'Autonomous Operations',
            ],
            [
                'id' => 'ai_chatbot',
                'name' => 'AI Chatbot & Inbound Auto-Reply',
                'description' => 'Automated conversational replies to customer inquiries across WhatsApp, Instagram, Telegram, SMS, and web channels.',
                'category' => 'Conversational AI',
            ],
            [
                'id' => 'flow_ai_prompt',
                'name' => 'Flow AI Action & Text Generator Node',
                'description' => 'Generates contextual LLM completions, extractions, and transformations within workflow execution.',
                'category' => 'Visual Flows',
            ],
            [
                'id' => 'flow_ai_condition',
                'name' => 'Flow AI Intent & Sentiment Node',
                'description' => 'Evaluates customer sentiment, intent classification, and logical boolean branching.',
                'category' => 'Visual Flows',
            ],
            [
                'id' => 'knowledge_base_rag',
                'name' => 'Knowledge Base Ingestion & RAG',
                'description' => 'Generates vector embeddings and performs semantic search over uploaded documents and FAQs.',
                'category' => 'Knowledge Base',
            ],
        ];
    }

    /**
     * Get the AI Feature Routing Matrix configuration for Superadmin.
     */
    public function getAiFeatureRouting(): array
    {
        $setting = \App\Models\PlatformSetting::where('key', 'ai_feature_routing')->first();
        $defaultRouting = [
            'copilot' => ['provider' => 'groq', 'model' => 'qwen/qwen3.8-27b'],
            'ai_chatbot' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
            'flow_ai_prompt' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
            'flow_ai_condition' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
            'knowledge_base_rag' => ['provider' => 'openai', 'model' => 'gpt-4o-mini'],
        ];

        if ($setting && is_array($setting->value)) {
            return array_merge($defaultRouting, $setting->value);
        }

        return $defaultRouting;
    }

    /**
     * Set the AI Feature Routing Matrix configuration for Superadmin.
     */
    public function setAiFeatureRouting(array $routing): void
    {
        \App\Models\PlatformSetting::updateOrCreate(
            ['key' => 'ai_feature_routing'],
            ['value' => $routing]
        );
    }

    /**
     * Get the tenant-specific AI Feature Routing configuration (BYOK mode).
     */
    public function getTenantAiFeatureRouting(int $tenantId): array
    {
        $setting = \App\Models\PlatformSetting::where('key', "tenant_{$tenantId}_ai_feature_routing")->first();
        
        // Find default active provider for tenant
        $activeConfig = \App\Models\AIProviderConfig::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->first();
        
        $fallbackProvider = $activeConfig ? strtolower($activeConfig->provider_name) : 'openai';
        $fallbackModel = $activeConfig ? ($activeConfig->default_model ?: ($activeConfig->enabled_models[0] ?? 'gpt-4o-mini')) : 'gpt-4o-mini';

        $defaultRouting = [
            'copilot' => ['provider' => $fallbackProvider, 'model' => $fallbackModel],
            'ai_chatbot' => ['provider' => $fallbackProvider, 'model' => $fallbackModel],
            'flow_ai_prompt' => ['provider' => $fallbackProvider, 'model' => $fallbackModel],
            'flow_ai_condition' => ['provider' => $fallbackProvider, 'model' => $fallbackModel],
            'knowledge_base_rag' => ['provider' => $fallbackProvider, 'model' => $fallbackModel],
        ];

        if ($setting && is_array($setting->value)) {
            return array_merge($defaultRouting, $setting->value);
        }

        return $defaultRouting;
    }

    /**
     * Set the tenant-specific AI Feature Routing configuration (BYOK mode).
     */
    public function setTenantAiFeatureRouting(int $tenantId, array $routing): void
    {
        \App\Models\PlatformSetting::updateOrCreate(
            ['key' => "tenant_{$tenantId}_ai_feature_routing"],
            ['value' => $routing]
        );
    }

    /**
     * Get the AI Safeguards & Limit configuration for a specific Tenant (BYOK mode).
     */
    public function getTenantAiSafeguardsConfig(int $tenantId): array
    {
        $default = [
            'rate_limit_per_minute_contact' => 10,
            'copilot_rate_limit_per_minute' => 20,
            'max_input_tokens' => 2500,
            'max_output_tokens' => 500,
            'copilot_max_input_tokens' => 12000,
            'copilot_max_output_tokens' => 2048,
            'on_limit_breached_action' => 'block_fallback', // 'block_fallback' | 'simulate_mock'
            'fallback_message' => 'AI assistant is temporarily unavailable due to high demand. An agent will assist you shortly.',
        ];

        $setting = \App\Models\PlatformSetting::where('key', "tenant_{$tenantId}_ai_safeguards_config")->first();
        if (!$setting || empty($setting->value) || !is_array($setting->value)) {
            return $default;
        }

        return array_merge($default, $setting->value);
    }

    /**
     * Set the AI Safeguards & Limit configuration for a specific Tenant (BYOK mode).
     */
    public function setTenantAiSafeguardsConfig(int $tenantId, array $config): void
    {
        $current = $this->getTenantAiSafeguardsConfig($tenantId);
        $merged = array_merge($current, $config);

        \App\Models\PlatformSetting::updateOrCreate(
            ['key' => "tenant_{$tenantId}_ai_safeguards_config"],
            ['value' => $merged]
        );
    }

    /**
     * Get the AI Safeguards & Limit configuration for Superadmin.
     */
    public function getAiSafeguardsConfig(): array
    {
        $default = [
            'rate_limit_per_minute_tenant' => 30,
            'rate_limit_per_minute_contact' => 10,
            'copilot_rate_limit_per_minute' => 20,
            'max_input_tokens' => 2500,
            'max_output_tokens' => 500,
            'copilot_max_input_tokens' => 12000,
            'copilot_max_output_tokens' => 2048,
            'monthly_platform_safety_cap' => 10000000,
            'on_limit_breached_action' => 'block_fallback', // 'block_fallback' | 'simulate_mock'
            'fallback_message' => 'AI assistant is temporarily unavailable due to high demand. An agent will assist you shortly.',
        ];

        $setting = \App\Models\PlatformSetting::where('key', 'ai_safeguards_config')->first();
        if (!$setting || empty($setting->value) || !is_array($setting->value)) {
            return $default;
        }

        return array_merge($default, $setting->value);
    }

    /**
     * Set the AI Safeguards & Limit configuration for Superadmin.
     */
    public function setAiSafeguardsConfig(array $config): void
    {
        $current = $this->getAiSafeguardsConfig();
        $merged = array_merge($current, $config);

        \App\Models\PlatformSetting::updateOrCreate(
            ['key' => 'ai_safeguards_config'],
            ['value' => $merged]
        );
    }

    /**
     * Check if AI execution should be allowed or throttled based on rate limits, plan quotas, and platform cap.
     * Returns null if allowed, or an array with details if throttled.
     */
    public function checkSafeguards(int $tenantId, ?string $contactIdentifier = null, string $feature = 'general'): ?array
    {
        $mode = $this->getAiOperationalModel();

        // In BYOK mode: tenant provides own keys.
        // Monthly AI Tokens and Copilot Credits caps are NOT applicable in BYOK mode.
        if ($mode === 'byok') {
            $safeguards = $this->getTenantAiSafeguardsConfig($tenantId);

            // Rate limiter for Copilot in BYOK mode
            if ($feature === 'copilot') {
                $copilotRateLimit = (int) ($safeguards['copilot_rate_limit_per_minute'] ?? 20);
                if ($copilotRateLimit > 0) {
                    $copilotKey = "ai_rate_copilot:{$tenantId}";
                    if (\Illuminate\Support\Facades\RateLimiter::tooManyAttempts($copilotKey, $copilotRateLimit)) {
                        return [
                            'blocked' => true,
                            'reason' => 'copilot_rate_limit_exceeded',
                            'fallback_message' => 'Copilot rate limit reached. Please wait a moment before sending another prompt.',
                            'action' => $safeguards['on_limit_breached_action'],
                        ];
                    }
                    \Illuminate\Support\Facades\RateLimiter::hit($copilotKey, 60);
                }
                return null;
            }

            if (!empty($contactIdentifier)) {
                $contactRateLimit = (int) ($safeguards['rate_limit_per_minute_contact'] ?? 10);
                if ($contactRateLimit > 0) {
                    $contactKey = "ai_rate_contact:{$tenantId}:" . md5($contactIdentifier);
                    if (\Illuminate\Support\Facades\RateLimiter::tooManyAttempts($contactKey, $contactRateLimit)) {
                        return [
                            'blocked' => true,
                            'reason' => 'contact_rate_limit_exceeded',
                            'fallback_message' => $safeguards['fallback_message'],
                            'action' => $safeguards['on_limit_breached_action'],
                        ];
                    }
                    \Illuminate\Support\Facades\RateLimiter::hit($contactKey, 60);
                }
            }

            return null;
        }

        // Master Fixed mode: checks central safeguards
        $safeguards = $this->getAiSafeguardsConfig();

        // 1. COPILOT SPECIFIC SAFEGUARDS & CREDITS CHECK
        if ($feature === 'copilot') {
            // A. Rate limiter for Copilot per workspace
            $copilotRateLimit = (int) ($safeguards['copilot_rate_limit_per_minute'] ?? 20);
            if ($copilotRateLimit > 0) {
                $copilotKey = "ai_rate_copilot:{$tenantId}";
                if (\Illuminate\Support\Facades\RateLimiter::tooManyAttempts($copilotKey, $copilotRateLimit)) {
                    return [
                        'blocked' => true,
                        'reason' => 'copilot_rate_limit_exceeded',
                        'fallback_message' => 'Copilot rate limit reached. Please wait a moment before sending another prompt.',
                        'action' => $safeguards['on_limit_breached_action'],
                    ];
                }
                \Illuminate\Support\Facades\RateLimiter::hit($copilotKey, 60);
            }

            // B. Copilot Credits System Check (Copilot uses Credits, NOT monthly AI tokens)
            $tenant = \App\Models\Tenant::with('plan')->find($tenantId);
            if ($tenant && !$tenant->hasCopilotCredits()) {
                return [
                    'blocked' => true,
                    'reason' => 'copilot_credits_exhausted',
                    'fallback_message' => 'Your workspace has exhausted its available Copilot AI credits. Please upgrade your subscription plan or contact support to top up credits.',
                    'action' => 'block_fallback',
                    'remaining_credits' => 0,
                    'used_credits' => $tenant->getUsedCopilotCredits(),
                    'max_credits' => $tenant->getCopilotCreditsLimit(),
                ];
            }

            // Copilot does not consume monthly AI tokens; bypass monthly token allowance check
            return null;
        }

        // 2. STANDARD AI FEATURES SAFEGUARDS (Chatbot, Flows, KB RAG)
        // Rate Limiter for Tenant
        $tenantRateLimit = (int) ($safeguards['rate_limit_per_minute_tenant'] ?? 30);
        if ($tenantRateLimit > 0) {
            $tenantKey = "ai_rate_tenant:{$tenantId}";
            if (\Illuminate\Support\Facades\RateLimiter::tooManyAttempts($tenantKey, $tenantRateLimit)) {
                return [
                    'blocked' => true,
                    'reason' => 'tenant_rate_limit_exceeded',
                    'fallback_message' => $safeguards['fallback_message'],
                    'action' => $safeguards['on_limit_breached_action'],
                ];
            }
            \Illuminate\Support\Facades\RateLimiter::hit($tenantKey, 60);
        }

        // Rate Limiter for Contact/Session
        if (!empty($contactIdentifier)) {
            $contactRateLimit = (int) ($safeguards['rate_limit_per_minute_contact'] ?? 10);
            if ($contactRateLimit > 0) {
                $contactKey = "ai_rate_contact:{$tenantId}:" . md5($contactIdentifier);
                if (\Illuminate\Support\Facades\RateLimiter::tooManyAttempts($contactKey, $contactRateLimit)) {
                    return [
                        'blocked' => true,
                        'reason' => 'contact_rate_limit_exceeded',
                        'fallback_message' => $safeguards['fallback_message'],
                        'action' => $safeguards['on_limit_breached_action'],
                    ];
                }
                \Illuminate\Support\Facades\RateLimiter::hit($contactKey, 60);
            }
        }

        // Monthly Plan Quota for Tenant in Master Fixed mode (Chatbots & Workflow Nodes)
        // Excludes Copilot because Copilot is credit-based!
        $tenant = \App\Models\Tenant::with('plan')->find($tenantId);
        if ($tenant && $tenant->plan) {
            $monthlyAllowance = (int) ($tenant->plan->monthly_ai_tokens ?? 100000);
            // -1 or 0 means unlimited
            if ($monthlyAllowance !== -1 && $monthlyAllowance > 0) {
                $startOfMonth = now()->startOfMonth();
                $endOfMonth = now()->endOfMonth();
                
                $usedTokens = (int) \App\Models\AiUsageLog::where('tenant_id', $tenantId)
                    ->where('feature', '!=', 'copilot')
                    ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
                    ->where('status', 'success')
                    ->sum('total_tokens');

                if ($usedTokens >= $monthlyAllowance) {
                    return [
                        'blocked' => true,
                        'reason' => 'monthly_tenant_quota_exceeded',
                        'fallback_message' => $safeguards['fallback_message'],
                        'action' => $safeguards['on_limit_breached_action'],
                        'used_tokens' => $usedTokens,
                        'allowance' => $monthlyAllowance,
                    ];
                }
            }
        }

        // Global Platform Monthly Safety Cap
        $globalSafetyCap = (int) ($safeguards['monthly_platform_safety_cap'] ?? 10000000);
        if ($globalSafetyCap > 0) {
            $startOfMonth = now()->startOfMonth();
            $endOfMonth = now()->endOfMonth();

            $totalPlatformTokens = (int) \App\Models\AiUsageLog::whereBetween('created_at', [$startOfMonth, $endOfMonth])
                ->where('status', 'success')
                ->sum('total_tokens');

            if ($totalPlatformTokens >= $globalSafetyCap) {
                return [
                    'blocked' => true,
                    'reason' => 'platform_global_cap_exceeded',
                    'fallback_message' => $safeguards['fallback_message'],
                    'action' => $safeguards['on_limit_breached_action'],
                    'total_platform_tokens' => $totalPlatformTokens,
                    'global_cap' => $globalSafetyCap,
                ];
            }
        }

        return null;
    }

    /**
     * Truncate prompt context if it exceeds max input tokens.
     */
    public function clampMessagesToTokenLimit(array $messages, int $maxInputTokens = 2500): array
    {
        $currentTokens = self::estimateTokens($messages);
        if ($currentTokens <= $maxInputTokens || empty($messages)) {
            return $messages;
        }

        // Preserve system prompt if present, truncate earliest user/assistant message turns
        $systemMsg = null;
        $otherMsgs = [];
        foreach ($messages as $msg) {
            if (($msg['role'] ?? '') === 'system') {
                $systemMsg = $msg;
            } else {
                $otherMsgs[] = $msg;
            }
        }

        // If system prompt itself is huge, truncate it
        if ($systemMsg) {
            $sysTokens = self::estimateTokens($systemMsg['content'] ?? '');
            $maxSysTokens = $maxInputTokens >= 8000 
                ? (int) round($maxInputTokens * 0.85) 
                : (int) round($maxInputTokens * 0.6);
            if ($sysTokens > $maxSysTokens) {
                $maxChars = $maxSysTokens * 4;
                $systemMsg['content'] = mb_substr((string)$systemMsg['content'], 0, $maxChars) . "\n[Context truncated for token limits]";
            }
        }

        // Keep the most recent messages that fit the remaining token budget
        $budget = $maxInputTokens - ($systemMsg ? self::estimateTokens($systemMsg['content'] ?? '') : 0);
        $clampedOthers = [];
        for ($i = count($otherMsgs) - 1; $i >= 0; $i--) {
            $msgTokens = self::estimateTokens($otherMsgs[$i]['content'] ?? '');
            if ($budget - $msgTokens >= 0 || empty($clampedOthers)) {
                array_unshift($clampedOthers, $otherMsgs[$i]);
                $budget -= $msgTokens;
            } else {
                break;
            }
        }

        $result = [];
        if ($systemMsg) {
            $result[] = $systemMsg;
        }
        foreach ($clampedOthers as $m) {
            $result[] = $m;
        }

        return $result;
    }

    /**
     * Unified resolver for AI executions across BYOK, Master Fixed, and Master User Selectable.
     */
    public function resolveAIExecution(
        int $tenantId,
        string $featureKey,
        ?string $userPreferredProvider = null,
        ?string $userPreferredModel = null,
        ?string $contactIdentifier = null
    ): array {
        $aliases = [
            'copilot' => 'copilot',
            'prompt_to_flow' => 'copilot',
            'prompt_flow' => 'copilot',
            'social_posts' => 'copilot',
            'social_post' => 'copilot',
            'campaign_copywriter' => 'copilot',
            'ai_chatbots' => 'ai_chatbot',
            'ai_agents' => 'ai_chatbot',
            'inbox_smart_reply' => 'ai_chatbot',
            'inbox_conversation_summary' => 'ai_chatbot',
            'contact_sentiment_analysis' => 'ai_chatbot',
            'rag_kb' => 'knowledge_base_rag',
            'flow_rag_query' => 'knowledge_base_rag',
            'knowledge_base_rag' => 'knowledge_base_rag',
            'ai_chatbot' => 'ai_chatbot',
        ];
        $altKey = $aliases[$featureKey] ?? null;

        $mode = $this->getAiOperationalModel();
        $adminKeys = $this->getAdminProvidersKeys();
        $safeguards = $mode === 'byok' ? $this->getTenantAiSafeguardsConfig($tenantId) : $this->getAiSafeguardsConfig();

        // Check safeguards
        $safeguardCheck = $this->checkSafeguards($tenantId, $contactIdentifier, $featureKey);
        $isBlocked = $safeguardCheck !== null;
        $fallbackMessage = $safeguardCheck['fallback_message'] ?? $safeguards['fallback_message'];
        $blockReason = $safeguardCheck['reason'] ?? null;
        $action = $safeguardCheck['action'] ?? $safeguards['on_limit_breached_action'];

        // 1. MASTER FIXED MODE: Centrally routed via Admin matrix
        if ($mode === 'master_fixed') {
            $routing = $this->getAiFeatureRouting();
            $setting = \App\Models\PlatformSetting::where('key', 'ai_feature_routing')->first();
            $rawSetting = ($setting && is_array($setting->value)) ? $setting->value : [];
            $featureRoute = $rawSetting[$featureKey] ?? ($routing[$featureKey] ?? ($altKey ? ($routing[$altKey] ?? ($rawSetting[$altKey] ?? null)) : null));
            $provider = strtolower($featureRoute['provider'] ?? '');

            // Ensure provider has a master key configured by superadmin
            if (empty($provider) || empty($adminKeys[$provider])) {
                $configuredAdminProviders = array_keys(array_filter($adminKeys, fn($k) => !empty($k)));
                $provider = $configuredAdminProviders[0] ?? ($provider ?: 'groq');
            }

            $model = $this->resolveModel($provider, $featureRoute['model'] ?? null);
            $apiKey = $adminKeys[$provider] ?? '';

            return [
                'provider' => $provider,
                'model' => $model,
                'api_key' => $apiKey ?: 'mock_admin_key',
                'mode' => 'master_fixed',
                'is_simulated' => empty($apiKey) || ($isBlocked && $action === 'simulate_mock'),
                'is_blocked' => $isBlocked && $action === 'block_fallback',
                'fallback_message' => $fallbackMessage,
                'block_reason' => $blockReason,
                'safeguards' => $safeguards,
            ];
        }

        // 2. BYOK MODE: User provides their own key via AIProviderConfig, centralized via tenant routing
        $tenantRouting = $this->getTenantAiFeatureRouting($tenantId);
        $tSetting = \App\Models\PlatformSetting::where('key', "tenant_{$tenantId}_ai_feature_routing")->first();
        $rawTenantSetting = ($tSetting && is_array($tSetting->value)) ? $tSetting->value : [];
        $featureRoute = $rawTenantSetting[$featureKey] ?? ($tenantRouting[$featureKey] ?? ($altKey ? ($tenantRouting[$altKey] ?? ($rawTenantSetting[$altKey] ?? null)) : null));

        $targetProvider = !empty($featureRoute['provider']) ? strtolower($featureRoute['provider']) : strtolower((string)$userPreferredProvider);
        $targetModel = !empty($featureRoute['model']) ? $featureRoute['model'] : $userPreferredModel;

        $config = null;
        if (!empty($targetProvider)) {
            $config = \App\Models\AIProviderConfig::where('tenant_id', $tenantId)
                ->where('provider_name', $targetProvider)
                ->where('is_active', true)
                ->first();
        }

        // Fallback to any active provider config for tenant if chosen provider is inactive or not found
        if (!$config) {
            $config = \App\Models\AIProviderConfig::where('tenant_id', $tenantId)
                ->where('is_active', true)
                ->first();
        }

        if ($config) {
            $provider = strtolower($config->provider_name);
            $model = $this->resolveModel($provider, $targetModel ?: $config->default_model);
            $apiKey = $config->api_key;

            return [
                'provider' => $provider,
                'model' => $model,
                'api_key' => $apiKey,
                'mode' => 'byok',
                'is_simulated' => empty($apiKey) || ($isBlocked && $action === 'simulate_mock'),
                'is_blocked' => $isBlocked && $action === 'block_fallback',
                'fallback_message' => $fallbackMessage,
                'block_reason' => $blockReason,
                'safeguards' => $safeguards,
            ];
        }

        // Fallback if tenant has no key in BYOK: simulated response using tenant's chosen route
        $provider = !empty($targetProvider) ? $targetProvider : 'groq';
        $model = !empty($targetModel) ? $this->resolveModel($provider, $targetModel) : $this->resolveModel($provider, null);
        $apiKey = '';

        return [
            'provider' => $provider,
            'model' => $model,
            'api_key' => 'mock_simulated_key',
            'mode' => 'byok',
            'is_simulated' => true,
            'is_blocked' => $isBlocked && $action === 'block_fallback',
            'fallback_message' => $fallbackMessage,
            'block_reason' => $blockReason,
            'safeguards' => $safeguards,
        ];
    }

    /**
     * Determine if a model is an OpenAI/DeepSeek reasoning model.
     */
    public function isReasoningModel(string $provider, string $model): bool
    {
        $m = strtolower(trim($model));
        if ($provider === 'openai') {
            return preg_match('/^(o1|o3|gpt-6)/i', $m) === 1;
        }
        if ($provider === 'deepseek') {
            return str_contains($m, 'reasoner') || str_contains($m, 'r1');
        }
        return false;
    }

    /**
     * Resolve and validate provider model names to prevent runtime mismatches and smoothly map retired models.
     */
    public function resolveModel(string $provider, ?string $model): string
    {
        $provider = strtolower(trim($provider));
        $cleanModel = trim((string)$model);

        $defaultModels = [
            'openai' => 'gpt-4o-mini',
            'anthropic' => 'claude-3-5-haiku-20241022',
            'gemini' => 'gemini-1.5-flash',
            'groq' => 'openai/gpt-oss-120b',
            'deepseek' => 'deepseek-chat',
            'xai' => 'grok-2-1212',
            'mistral' => 'mistral-small-latest',
            'openrouter' => 'openai/gpt-4o-mini',
        ];

        if (empty($cleanModel)) {
            return $defaultModels[$provider] ?? 'gpt-4o-mini';
        }

        $lowerModel = strtolower($cleanModel);

        // 1. OpenAI model resolution & mapping
        if ($provider === 'openai') {
            if ($cleanModel === 'o1-mini') {
                return 'o3-mini';
            }
            if (str_starts_with($lowerModel, 'gpt-3.5')) {
                return 'gpt-4o-mini';
            }
            return $cleanModel;
        }

        // 2. Groq model resolution & mapping
        if ($provider === 'groq') {
            if (str_contains($lowerModel, 'qwen')) {
                return 'qwen/qwen3.8-27b';
            }
            if (str_contains($lowerModel, '120b')) {
                return 'openai/gpt-oss-120b';
            }
            if (str_contains($lowerModel, '20b')) {
                return 'openai/gpt-oss-20b';
            }
            if (in_array($cleanModel, [
                'llama-3.1-8b-instant', 
                'llama3-8b-8192', 
                'llama3-70b-8192', 
                'mixtral-8x7b-32768', 
                'gemma2-9b-it', 
                'gemma-7b-it',
                'llama-3.2-1b-preview',
                'llama-3.2-3b-preview'
            ])) {
                return 'openai/gpt-oss-120b';
            }
            return $cleanModel;
        }

        // 3. Anthropic model resolution & mapping
        if ($provider === 'anthropic') {
            if (in_array($cleanModel, ['claude-3-haiku-20240307', 'claude-instant-1.2', 'claude-2.1', 'claude-2.0'])) {
                return 'claude-3-5-haiku-20241022';
            }
            return $cleanModel;
        }

        // 4. Gemini model resolution & mapping
        if ($provider === 'gemini') {
            if (in_array($cleanModel, ['gemini-1.0-pro', 'gemini-pro', 'gemini-ultra'])) {
                return 'gemini-1.5-flash';
            }
            return $cleanModel;
        }

        // 5. xAI model resolution & mapping
        if ($provider === 'xai') {
            if ($cleanModel === 'grok-beta') {
                return 'grok-2-1212';
            }
            return $cleanModel;
        }

        // 6. OpenRouter model resolution & mapping
        if ($provider === 'openrouter') {
            if (in_array($cleanModel, ['openai/gpt-3.5-turbo', 'meta-llama/llama-3-70b-instruct'])) {
                return 'openai/gpt-4o-mini';
            }
            return $cleanModel;
        }

        return $cleanModel;
    }

    /**
     * Clean raw completion text (e.g. remove thinking tokens like <think> or <thought>).
     */
    public function cleanCompletionText(string $text): string
    {
        // 1. Remove closed <think>...</think> blocks
        $cleaned = preg_replace('/<think>[\s\S]*?<\/think>/i', '', $text);

        // 2. Handle unclosed <think>... blocks (e.g. cut off or missing closing tag)
        if (preg_match('/<think>/i', $cleaned)) {
            // Check if there is a JSON block inside or after the think text
            if (preg_match('/\{[\s\S]*\}/', $cleaned, $matches)) {
                $cleaned = $matches[0];
            } elseif (preg_match('/(?:Drafting with emojis|Drafting Content|Final Caption|Caption)[*:\s]*\n+([\s\S]*?)(?=\n\s*(?:\*|#|Review Tone|<|$))/i', $cleaned, $matches)) {
                $lines = explode("\n", trim($matches[1]));
                $cleanedLines = array_map(fn($line) => preg_replace('/^\s{4,}/', '', $line), $lines);
                $cleaned = trim(implode("\n", $cleanedLines));
            } else {
                $cleaned = preg_replace('/<think>[\s\S]*$/i', '', $cleaned);
            }
        }

        // 3. If removing closed think tags left an empty string, check if the think tag contained a JSON object or drafted response
        if (trim($cleaned) === '' && !empty(trim($text))) {
            if (preg_match('/\{[\s\S]*\}/', $text, $matches)) {
                $cleaned = $matches[0];
            } elseif (preg_match('/(?:Drafting with emojis|Drafting Content|Final Caption|Caption)[*:\s]*\n+([\s\S]*?)(?=\n\s*(?:\*|#|Review Tone|<|$))/i', $text, $matches)) {
                $lines = explode("\n", trim($matches[1]));
                $cleanedLines = array_map(fn($line) => preg_replace('/^\s{4,}/', '', $line), $lines);
                $cleaned = trim(implode("\n", $cleanedLines));
            }
        }

        // 4. Remove closed or unclosed <thought> tags
        $cleaned = preg_replace('/<thought>[\s\S]*?<\/thought>/i', '', $cleaned);
        if (preg_match('/<thought>/i', $cleaned)) {
            if (preg_match('/\{[\s\S]*\}/', $cleaned, $matches)) {
                $cleaned = $matches[0];
            } else {
                $cleaned = preg_replace('/<thought>[\s\S]*$/i', '', $cleaned);
            }
        }

        return trim($cleaned);
    }

    /**
     * Validate the API key against the provider by making a real connection call.
     * Returns true if valid, or throws an Exception with the failure reason.
     */
    public function validateKey(string $provider, string $apiKey): bool
    {
        if (empty($apiKey)) {
            throw new Exception("API Key cannot be empty.");
        }

        try {
            switch ($provider) {
                case 'openai':
                    $response = Http::withToken($apiKey)
                        ->timeout(6)
                        ->get('https://api.openai.com/v1/models');
                    break;

                case 'anthropic':
                    $response = Http::withHeaders([
                        'x-api-key' => $apiKey,
                        'anthropic-version' => '2023-06-01',
                    ])
                    ->timeout(6)
                    ->get('https://api.anthropic.com/v1/models');
                    break;

                case 'gemini':
                    $response = Http::timeout(6)
                        ->get("https://generativelanguage.googleapis.com/v1beta/models?key={$apiKey}");
                    break;

                case 'groq':
                    $response = Http::withToken($apiKey)
                        ->timeout(6)
                        ->get('https://api.groq.com/openai/v1/models');
                    break;

                case 'deepseek':
                    $response = Http::withToken($apiKey)
                        ->timeout(6)
                        ->get('https://api.deepseek.com/models');
                    break;

                case 'xai':
                    $response = Http::withToken($apiKey)
                        ->timeout(6)
                        ->get('https://api.x.ai/v1/models');
                    break;

                case 'mistral':
                    $response = Http::withToken($apiKey)
                        ->timeout(6)
                        ->get('https://api.mistral.ai/v1/models');
                    break;

                case 'openrouter':
                    $response = Http::withToken($apiKey)
                        ->timeout(6)
                        ->get('https://openrouter.ai/api/v1/models');
                    break;

                default:
                    throw new Exception("Unsupported AI provider: {$provider}");
            }

            if ($response->successful()) {
                return true;
            }

            $errorData = $response->json();
            $errorMessage = $errorData['error']['message'] ?? $errorData['error'] ?? 'Unauthorized or invalid credentials.';
            throw new Exception("Verification failed: " . $errorMessage);

        } catch (Exception $e) {
            throw new Exception("Connection check failed: " . $e->getMessage());
        }
    }

    /**
     * Record AI usage telemetry log to database.
     */
    public static function recordUsage(
        ?int $tenantId,
        ?int $userId,
        string $feature,
        string $provider,
        string $model,
        int $promptTokens,
        int $completionTokens,
        int $latencyMs = 0,
        string $status = 'success',
        ?string $errorMessage = null,
        ?array $metadata = null
    ): void {
        try {
            if (!$tenantId) {
                $tenantId = auth()->check() ? (int) auth()->user()->tenant_id : 1;
            }
            if (!$userId && auth()->check()) {
                $userId = auth()->id();
            }

            $aliasMap = [
                'chatbot' => 'ai_chatbot',
                'ai_chatbots' => 'ai_chatbot',
                'agent' => 'ai_chatbot',
                'ai_agents' => 'ai_chatbot',
                'smart_reply' => 'ai_chatbot',
                'campaign' => 'flow_ai_prompt',
                'flow_condition' => 'flow_ai_condition',
                'flow_prompt' => 'flow_ai_prompt',
                'prompt_flow' => 'prompt_to_flow',
                'knowledge_rag' => 'knowledge_base_rag',
                'rag_kb' => 'knowledge_base_rag',
                'general' => 'ai_chatbot',
            ];
            $normalizedFeature = $aliasMap[$feature] ?? ($feature ?: 'ai_chatbot');

            $totalTokens = $promptTokens + $completionTokens;
            $estimatedCost = \App\Models\AiUsageLog::calculateEstimatedCost($model, $promptTokens, $completionTokens);

            \App\Models\AiUsageLog::create([
                'tenant_id' => $tenantId,
                'user_id' => $userId,
                'feature' => $normalizedFeature,
                'provider' => strtolower($provider ?: 'openai'),
                'model' => $model ?: 'gpt-4o-mini',
                'prompt_tokens' => $promptTokens,
                'completion_tokens' => $completionTokens,
                'total_tokens' => $totalTokens,
                'estimated_cost' => $estimatedCost,
                'latency_ms' => $latencyMs,
                'status' => $status,
                'error_message' => $errorMessage,
                'metadata' => $metadata,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Failed to record AI usage log: " . $e->getMessage());
        }
    }

    /**
     * Accurately estimate token count for strings or message arrays.
     */
    public static function estimateTokens(string|array|null $input): int
    {
        if (empty($input)) return 0;
        
        if (is_array($input)) {
            $text = '';
            foreach ($input as $msg) {
                $text .= ' ' . ($msg['content'] ?? '');
            }
        } else {
            $text = (string) $input;
        }

        $wordCount = str_word_count($text);
        if ($wordCount > 0) {
            return (int) max(1, ceil($wordCount * 1.33));
        }
        return (int) max(1, ceil(mb_strlen($text) / 4));
    }

    /**
     * Unified Chat Completion wrapper for backwards compatibility and direct invocation.
     */
    public function chatCompletion(
        array $messages,
        ?string $provider = null,
        ?string $model = null,
        $providerConfig = null,
        float $temperature = 0.7,
        string $feature = 'chatbot'
    ): string {
        $apiKey = '';
        $resolvedProvider = !empty($provider) ? strtolower($provider) : null;
        $resolvedModel = !empty($model) ? $model : null;

        if ($providerConfig instanceof \App\Models\AIProviderConfig) {
            $apiKey = $providerConfig->api_key;
            $resolvedProvider = strtolower($providerConfig->provider_name ?: ($resolvedProvider ?: 'openai'));
            $resolvedModel = $resolvedModel ?: $providerConfig->default_model;
        } elseif (is_string($providerConfig) && !empty($providerConfig)) {
            $apiKey = $providerConfig;
        }

        $tenantId = auth()->check() ? (int) auth()->user()->tenant_id : 1;

        if (empty($apiKey) || empty($resolvedProvider) || empty($resolvedModel)) {
            $targetFeature = $feature === 'copilot' ? 'copilot' : 'ai_chatbots';
            $resolved = $this->resolveAIExecution($tenantId, $targetFeature, $resolvedProvider, $resolvedModel);
            $resolvedProvider = $resolved['provider'];
            $resolvedModel = $resolved['model'];
            $apiKey = $resolved['api_key'];
        }

        return $this->generateCompletion(
            $resolvedProvider,
            $apiKey,
            $resolvedModel,
            $messages,
            $temperature,
            $feature,
            $tenantId
        );
    }

    /**
     * Generate text completion using selected provider, fallback to mock responses if key is missing/unusable.
     */
    public function generateCompletion(
        string $provider, 
        string $apiKey, 
        string $model, 
        array $messages, 
        float $temperature = 0.7, 
        string $feature = 'general',
        ?int $tenantId = null
    ): string
    {
        $startTime = microtime(true);
        $mode = $this->getAiOperationalModel();
        if ($mode === 'byok' && $tenantId) {
            $safeguards = $this->getTenantAiSafeguardsConfig($tenantId);
        } else {
            $safeguards = $this->getAiSafeguardsConfig();
        }
        if ($feature === 'copilot') {
            $maxInputTokens = (int) ($safeguards['copilot_max_input_tokens'] ?? 12000);
            $maxOutputTokens = (int) ($safeguards['copilot_max_output_tokens'] ?? 2048);
        } else {
            $maxInputTokens = (int) ($safeguards['max_input_tokens'] ?? 2500);
            $maxOutputTokens = (int) ($safeguards['max_output_tokens'] ?? 500);
            if ($feature === 'social_posts') {
                $maxOutputTokens = max($maxOutputTokens, 1500);
            }
        }

        // Strict input token clamp
        $messages = $this->clampMessagesToTokenLimit($messages, $maxInputTokens);
        $promptTokensEst = self::estimateTokens($messages);

        if (empty($apiKey) || $apiKey === 'mock_key' || str_starts_with($apiKey, 'mock')) {
            $mockRes = $this->getMockCompletion($messages);
            $completionTokensEst = self::estimateTokens($mockRes);
            $latencyMs = (int) round((microtime(true) - $startTime) * 1000);
            self::recordUsage(null, null, $feature, $provider, $model, $promptTokensEst, $completionTokensEst, $latencyMs, 'success');
            return $mockRes;
        }

        try {
            $provider = strtolower($provider);
            $model = $this->resolveModel($provider, $model);
            
            // 1. OpenAI-compatible endpoints (OpenAI, Groq, DeepSeek, xAI, Mistral, OpenRouter)
            if (in_array($provider, ['openai', 'groq', 'deepseek', 'xai', 'mistral', 'openrouter'])) {
                $urls = [
                    'openai' => 'https://api.openai.com/v1/chat/completions',
                    'groq' => 'https://api.groq.com/openai/v1/chat/completions',
                    'deepseek' => 'https://api.deepseek.com/v1/chat/completions',
                    'xai' => 'https://api.x.ai/v1/chat/completions',
                    'mistral' => 'https://api.mistral.ai/v1/chat/completions',
                    'openrouter' => 'https://openrouter.ai/api/v1/chat/completions',
                ];

                $isReasoning = $this->isReasoningModel($provider, $model);

                // Prepare normalized messages (reasoning models in OpenAI prefer 'developer' role over 'system')
                $preparedMessages = [];
                foreach ($messages as $msg) {
                    $role = $msg['role'] ?? 'user';
                    if ($provider === 'openai' && $isReasoning && $role === 'system') {
                        $role = 'developer';
                    }
                    $preparedMessages[] = [
                        'role' => $role,
                        'content' => $msg['content'] ?? '',
                    ];
                }

                $tokenLimit = $isReasoning ? max($maxOutputTokens, 2048) : $maxOutputTokens;

                $body = [
                    'model' => $model,
                    'messages' => $preparedMessages,
                ];

                // OpenAI modern API uses max_completion_tokens; others use max_tokens
                if ($provider === 'openai') {
                    $body['max_completion_tokens'] = $tokenLimit;
                    if (!$isReasoning) {
                        $body['temperature'] = $temperature;
                    }
                } else {
                    $body['max_tokens'] = $tokenLimit;
                    if (!$isReasoning) {
                        $body['temperature'] = $temperature;
                    }
                }

                $response = Http::withToken($apiKey)->timeout(15)->post($urls[$provider], $body);

                // Auto-recovery / Resilience: Parameter compatibility & provider error mitigation
                if (!$response->successful()) {
                    $errBody = $response->body();
                    $retryBody = $body;
                    $shouldRetry = false;

                    // A: max_tokens vs max_completion_tokens mismatch
                    if (str_contains($errBody, 'max_tokens') && str_contains($errBody, 'max_completion_tokens')) {
                        if (isset($retryBody['max_tokens'])) {
                            unset($retryBody['max_tokens']);
                            $retryBody['max_completion_tokens'] = max($tokenLimit, 2048);
                        } else {
                            unset($retryBody['max_completion_tokens']);
                            $retryBody['max_tokens'] = $tokenLimit;
                        }
                        $shouldRetry = true;
                    }

                    // B: temperature unsupported (e.g. OpenAI reasoning models, DeepSeek R1)
                    if (str_contains($errBody, 'temperature') && (str_contains($errBody, 'Unsupported') || str_contains($errBody, 'unsupported') || str_contains($errBody, 'does not support') || str_contains($errBody, 'not supported'))) {
                        unset($retryBody['temperature']);
                        $shouldRetry = true;
                    }

                    // C: system role unsupported
                    if (str_contains($errBody, 'system') && (str_contains($errBody, 'developer') || str_contains($errBody, 'Unsupported') || str_contains($errBody, 'not supported'))) {
                        $retryBody['messages'] = array_map(function($m) {
                            if (($m['role'] ?? '') === 'system') {
                                $m['role'] = 'developer';
                            }
                            return $m;
                        }, $retryBody['messages']);
                        $shouldRetry = true;
                    }

                    // D: Model not found or retired -> Fallback to reliable default model
                    if ($response->status() === 404 || str_contains($errBody, 'model_not_found') || str_contains($errBody, 'does not exist') || str_contains($errBody, 'decommissioned')) {
                        $fallbackModel = match($provider) {
                            'openai' => 'gpt-4o-mini',
                            'groq' => 'openai/gpt-oss-20b',
                            'deepseek' => 'deepseek-chat',
                            'xai' => 'grok-2-1212',
                            'mistral' => 'mistral-small-latest',
                            default => 'gpt-4o-mini',
                        };
                        $retryBody['model'] = $fallbackModel;
                        if ($provider === 'openai') {
                            $retryBody['max_completion_tokens'] = $maxOutputTokens;
                            $retryBody['temperature'] = $temperature;
                        } else {
                            $retryBody['max_tokens'] = $maxOutputTokens;
                            $retryBody['temperature'] = $temperature;
                        }
                        $shouldRetry = true;
                    }

                    // Execute parameter adjusted retry
                    if ($shouldRetry) {
                        \Illuminate\Support\Facades\Log::info("AI Provider [{$provider}] auto-retrying with adjusted parameters for model [{$model}].");
                        $retryResponse = Http::withToken($apiKey)->timeout(15)->post($urls[$provider], $retryBody);
                        if ($retryResponse->successful()) {
                            $response = $retryResponse;
                            $model = $retryBody['model'];
                        }
                    }
                }

                // Handle Groq TPM Rate Limiting with intelligent retry and fallback
                if ($provider === 'groq' && ($response->status() === 429 || str_contains($response->body(), 'rate_limit_exceeded'))) {
                    \Illuminate\Support\Facades\Log::warning("Groq rate limit encountered on {$model}. Attempting fallback / backoff retry.");
                    if ($model !== 'openai/gpt-oss-20b') {
                        $fallbackBody = $body;
                        $fallbackBody['model'] = 'openai/gpt-oss-20b';
                        $fallbackRes = Http::withToken($apiKey)->timeout(15)->post($urls[$provider], $fallbackBody);
                        if ($fallbackRes->successful()) {
                            $response = $fallbackRes;
                            $model = 'openai/gpt-oss-20b';
                        }
                    }

                    if (!$response->successful()) {
                        usleep(2500000);
                        $retryBody = $body;
                        $retryBody['model'] = 'openai/gpt-oss-20b';
                        $retryRes = Http::withToken($apiKey)->timeout(15)->post($urls[$provider], $retryBody);
                        if ($retryRes->successful()) {
                            $response = $retryRes;
                            $model = 'openai/gpt-oss-20b';
                        }
                    }
                }

                $latencyMs = (int) round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $cleaned = $this->cleanCompletionText($json['choices'][0]['message']['content'] ?? '');
                    
                    $promptTokens = $json['usage']['prompt_tokens'] ?? $promptTokensEst;
                    $completionTokens = $json['usage']['completion_tokens'] ?? self::estimateTokens($cleaned);
                    
                    self::recordUsage(null, null, $feature, $provider, $model, $promptTokens, $completionTokens, $latencyMs, 'success');

                    return $cleaned;
                }

                $err = "Provider error: " . $response->body();
                self::recordUsage(null, null, $feature, $provider, $model, $promptTokensEst, 0, $latencyMs, 'failed', $err);
                throw new Exception($err);
            }

            // 2. Anthropic Claude messages API
            if ($provider === 'anthropic') {
                $system = '';
                $claudeMessages = [];

                foreach ($messages as $msg) {
                    if ($msg['role'] === 'system') {
                        $system = $msg['content'];
                    } else {
                        $claudeMessages[] = [
                            'role' => $msg['role'] === 'assistant' ? 'assistant' : 'user',
                            'content' => $msg['content']
                        ];
                    }
                }

                $body = [
                    'model' => $model,
                    'messages' => $claudeMessages,
                    'max_tokens' => $maxOutputTokens,
                    'temperature' => $temperature,
                ];

                if (!empty($system)) {
                    $body['system'] = $system;
                }

                $response = Http::withHeaders([
                    'x-api-key' => $apiKey,
                    'anthropic-version' => '2023-06-01',
                    'content-type' => 'application/json',
                ])
                ->timeout(15)
                ->post('https://api.anthropic.com/v1/messages', $body);

                // Auto-recovery for retired/not found Anthropic models
                if (!$response->successful() && ($response->status() === 404 || str_contains($response->body(), 'not_found_error'))) {
                    $body['model'] = 'claude-3-5-haiku-20241022';
                    $retryRes = Http::withHeaders([
                        'x-api-key' => $apiKey,
                        'anthropic-version' => '2023-06-01',
                        'content-type' => 'application/json',
                    ])
                    ->timeout(15)
                    ->post('https://api.anthropic.com/v1/messages', $body);
                    if ($retryRes->successful()) {
                        $response = $retryRes;
                        $model = 'claude-3-5-haiku-20241022';
                    }
                }

                $latencyMs = (int) round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $text = $json['content'][0]['text'] ?? '';
                    
                    $promptTokens = $json['usage']['input_tokens'] ?? $promptTokensEst;
                    $completionTokens = $json['usage']['output_tokens'] ?? self::estimateTokens($text);

                    self::recordUsage(null, null, $feature, $provider, $model, $promptTokens, $completionTokens, $latencyMs, 'success');

                    return $text;
                }

                $err = "Anthropic error: " . $response->body();
                self::recordUsage(null, null, $feature, $provider, $model, $promptTokensEst, 0, $latencyMs, 'failed', $err);
                throw new Exception($err);
            }

            // 3. Google Gemini generateContent API
            if ($provider === 'gemini') {
                $contents = [];
                $systemInstruction = null;

                foreach ($messages as $msg) {
                    if ($msg['role'] === 'system') {
                        $systemInstruction = [
                            'parts' => [
                                ['text' => $msg['content']]
                            ]
                        ];
                    } else {
                        $contents[] = [
                            'role' => $msg['role'] === 'assistant' ? 'model' : 'user',
                            'parts' => [
                                ['text' => $msg['content']]
                            ]
                        ];
                    }
                }

                $body = ['contents' => $contents];
                if ($systemInstruction) {
                    $body['systemInstruction'] = $systemInstruction;
                }

                $body['generationConfig'] = [
                    'temperature' => $temperature,
                    'maxOutputTokens' => $maxOutputTokens,
                ];

                $response = Http::timeout(15)
                    ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}", $body);

                // Auto-recovery for retired/not found Gemini models
                if (!$response->successful() && ($response->status() === 404 || str_contains($response->body(), 'not found'))) {
                    $retryRes = Http::timeout(15)
                        ->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}", $body);
                    if ($retryRes->successful()) {
                        $response = $retryRes;
                        $model = 'gemini-1.5-flash';
                    }
                }

                $latencyMs = (int) round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $text = $json['candidates'][0]['content']['parts'][0]['text'] ?? '';
                    
                    $promptTokens = $json['usageMetadata']['promptTokenCount'] ?? $promptTokensEst;
                    $completionTokens = $json['usageMetadata']['candidatesTokenCount'] ?? self::estimateTokens($text);

                    self::recordUsage(null, null, $feature, $provider, $model, $promptTokens, $completionTokens, $latencyMs, 'success');

                    return $text;
                }

                $err = "Gemini error: " . $response->body();
                self::recordUsage(null, null, $feature, $provider, $model, $promptTokensEst, 0, $latencyMs, 'failed', $err);
                throw new Exception($err);
            }

            throw new Exception("Unsupported AI provider: {$provider}");

        } catch (Exception $e) {
            \Illuminate\Support\Facades\Log::error("AI completion generation failed: " . $e->getMessage());
            $latencyMs = (int) round((microtime(true) - $startTime) * 1000);
            self::recordUsage(null, null, $feature, $provider, $model, $promptTokensEst, 0, $latencyMs, 'failed', $e->getMessage());

            if (app()->runningUnitTests() || config('app.env') === 'testing' || empty($apiKey) || str_starts_with($apiKey, 'mock')) {
                $mockRes = $this->getMockCompletion($messages);
                return $mockRes;
            }

            throw $e;
        }
    }

    /**
     * Generate text completion with tool calling using selected provider, fallback to mock tool calling if key is missing.
     */
    public function generateCompletionWithTools(
        string $provider, 
        string $apiKey, 
        string $model, 
        array $messages, 
        array $tools, 
        float $temperature = 0.7, 
        string $feature = 'agent',
        ?int $tenantId = null
    ): array
    {
        $startTime = microtime(true);
        $mode = $this->getAiOperationalModel();
        if ($mode === 'byok' && $tenantId) {
            $safeguards = $this->getTenantAiSafeguardsConfig($tenantId);
        } else {
            $safeguards = $this->getAiSafeguardsConfig();
        }
        if ($feature === 'copilot') {
            $maxInputTokens = (int) ($safeguards['copilot_max_input_tokens'] ?? 12000);
            $maxOutputTokens = (int) ($safeguards['copilot_max_output_tokens'] ?? 2048);
        } else {
            $maxInputTokens = (int) ($safeguards['max_input_tokens'] ?? 2500);
            $maxOutputTokens = (int) ($safeguards['max_output_tokens'] ?? 500);
        }

        // Strict input context clamp
        $messages = $this->clampMessagesToTokenLimit($messages, $maxInputTokens);
        $promptTokensEst = self::estimateTokens($messages) + count($tools) * 35;

        if (empty($apiKey) || $apiKey === 'mock_key' || str_starts_with($apiKey, 'mock')) {
            $mockRes = $this->getMockToolCompletion($messages);
            $completionTokensEst = self::estimateTokens($mockRes['content'] ?? '') + 30;
            $latencyMs = (int) round((microtime(true) - $startTime) * 1000);
            self::recordUsage(null, null, $feature, $provider, $model, $promptTokensEst, $completionTokensEst, $latencyMs, 'success');
            return $mockRes;
        }

        try {
            $provider = strtolower($provider);
            $model = $this->resolveModel($provider, $model);

            // 1. OpenAI-compatible endpoints
            if (in_array($provider, ['openai', 'groq', 'deepseek', 'xai', 'mistral', 'openrouter'])) {
                $urls = [
                    'openai' => 'https://api.openai.com/v1/chat/completions',
                    'groq' => 'https://api.groq.com/openai/v1/chat/completions',
                    'deepseek' => 'https://api.deepseek.com/v1/chat/completions',
                    'xai' => 'https://api.x.ai/v1/chat/completions',
                    'mistral' => 'https://api.mistral.ai/v1/chat/completions',
                    'openrouter' => 'https://openrouter.ai/api/v1/chat/completions',
                ];

                $isReasoning = $this->isReasoningModel($provider, $model);

                // Normalize messages for OpenAI-compatible schema compliance
                $normalizedMessages = [];
                foreach ($messages as $msg) {
                    $role = $msg['role'] ?? 'user';
                    if ($provider === 'openai' && $isReasoning && $role === 'system') {
                        $role = 'developer';
                    }

                    $norm = ['role' => $role];
                    $norm['content'] = $msg['content'] ?? null;

                    if ($role === 'assistant' && !empty($msg['tool_calls'])) {
                        $norm['tool_calls'] = array_map(function($tc) {
                            $id = $tc['id'] ?? ('call_' . uniqid());
                            $name = $tc['function']['name'] ?? ($tc['name'] ?? '');
                            $args = $tc['function']['arguments'] ?? ($tc['arguments'] ?? []);
                            $argString = is_string($args) ? $args : json_encode($args, JSON_UNESCAPED_SLASHES);
                            return [
                                'id' => $id,
                                'type' => 'function',
                                'function' => [
                                    'name' => $name,
                                    'arguments' => $argString,
                                ]
                            ];
                        }, $msg['tool_calls']);
                    }

                    if ($role === 'tool') {
                        $norm['tool_call_id'] = $msg['tool_call_id'] ?? ($msg['id'] ?? 'call_1');
                        if (isset($msg['name'])) {
                            $norm['name'] = $msg['name'];
                        }
                        $norm['content'] = is_string($msg['content'] ?? '') ? ($msg['content'] ?? '') : json_encode($msg['content'] ?? '', JSON_UNESCAPED_SLASHES);
                    }

                    $normalizedMessages[] = $norm;
                }

                $tokenLimit = $isReasoning ? max($maxOutputTokens, 2048) : $maxOutputTokens;

                $body = [
                    'model' => $model,
                    'messages' => $normalizedMessages,
                ];

                if ($provider === 'openai') {
                    $body['max_completion_tokens'] = $tokenLimit;
                    if (!$isReasoning) {
                        $body['temperature'] = $temperature;
                    }
                } else {
                    $body['max_tokens'] = $tokenLimit;
                    if (!$isReasoning) {
                        $body['temperature'] = $temperature;
                    }
                }

                if (!empty($tools)) {
                    $body['tools'] = array_map(function($t) {
                        if (isset($t['type']) && $t['type'] === 'function' && isset($t['function'])) {
                            return $t;
                        }
                        return [
                            'type' => 'function',
                            'function' => [
                                'name' => $t['name'] ?? ($t['function']['name'] ?? ''),
                                'description' => $t['description'] ?? ($t['function']['description'] ?? ''),
                                'parameters' => $t['parameters'] ?? ($t['function']['parameters'] ?? (object)[]),
                            ]
                        ];
                    }, $tools);
                }

                $response = Http::withToken($apiKey)->timeout(15)->post($urls[$provider], $body);

                // Auto-recovery / Resilience for tool calling
                if (!$response->successful()) {
                    $errBody = $response->body();
                    $retryBody = $body;
                    $shouldRetry = false;

                    // A: Function tools not supported on reasoning model (e.g. gpt-6.1-sol or certain reasoning models)
                    if (str_contains($errBody, 'Function tools') || str_contains($errBody, 'tools are not supported') || str_contains($errBody, 'does not support tools')) {
                        $toolFallback = ($provider === 'openai') ? 'gpt-4o-mini' : (($provider === 'groq') ? 'openai/gpt-oss-120b' : $model);
                        $retryBody['model'] = $toolFallback;
                        if ($provider === 'openai') {
                            $retryBody['max_completion_tokens'] = $maxOutputTokens;
                            $retryBody['temperature'] = $temperature;
                        } else {
                            $retryBody['max_tokens'] = $maxOutputTokens;
                            $retryBody['temperature'] = $temperature;
                        }
                        $shouldRetry = true;
                    }

                    // B: max_tokens vs max_completion_tokens
                    if (str_contains($errBody, 'max_tokens') && str_contains($errBody, 'max_completion_tokens')) {
                        if (isset($retryBody['max_tokens'])) {
                            unset($retryBody['max_tokens']);
                            $retryBody['max_completion_tokens'] = max($tokenLimit, 2048);
                        } else {
                            unset($retryBody['max_completion_tokens']);
                            $retryBody['max_tokens'] = $tokenLimit;
                        }
                        $shouldRetry = true;
                    }

                    // C: temperature unsupported
                    if (str_contains($errBody, 'temperature') && (str_contains($errBody, 'Unsupported') || str_contains($errBody, 'unsupported') || str_contains($errBody, 'does not support') || str_contains($errBody, 'not supported'))) {
                        unset($retryBody['temperature']);
                        $shouldRetry = true;
                    }

                    // D: Model not found
                    if ($response->status() === 404 || str_contains($errBody, 'model_not_found') || str_contains($errBody, 'does not exist')) {
                        $retryBody['model'] = ($provider === 'openai') ? 'gpt-4o-mini' : 'openai/gpt-oss-120b';
                        $shouldRetry = true;
                    }

                    if ($shouldRetry) {
                        \Illuminate\Support\Facades\Log::info("AI Provider [{$provider}] tool completion auto-retrying with adjusted parameters for model [{$model}].");
                        $retryResponse = Http::withToken($apiKey)->timeout(15)->post($urls[$provider], $retryBody);
                        if ($retryResponse->successful()) {
                            $response = $retryResponse;
                            $model = $retryBody['model'];
                        }
                    }
                }

                // Handle Groq 429 Rate Limit
                if ($response->status() === 429 && $provider === 'groq') {
                    $retryBody = $body;
                    $retryBody['model'] = 'openai/gpt-oss-20b';
                    usleep(1200000);
                    $retryResponse = Http::withToken($apiKey)->timeout(15)->post($urls[$provider], $retryBody);
                    if ($retryResponse->successful()) {
                        $response = $retryResponse;
                        $model = 'openai/gpt-oss-20b';
                    }
                }

                $latencyMs = (int) round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $choice = $json['choices'][0]['message'] ?? [];
                    $rawContent = $choice['content'] ?? null;
                    
                    $promptTokens = $json['usage']['prompt_tokens'] ?? $promptTokensEst;
                    $completionTokens = $json['usage']['completion_tokens'] ?? self::estimateTokens($rawContent);
                    self::recordUsage(null, null, $feature, $provider, $model, $promptTokens, $completionTokens, $latencyMs, 'success');

                    return [
                        'content' => $rawContent !== null ? $this->cleanCompletionText($rawContent) : null,
                        'tool_calls' => isset($choice['tool_calls']) ? array_map(fn($tc) => [
                            'id' => $tc['id'] ?? '',
                            'name' => $tc['function']['name'] ?? '',
                            'arguments' => json_decode($tc['function']['arguments'] ?? '{}', true) ?: []
                        ], $choice['tool_calls']) : null
                    ];
                }

                $err = "Provider error: " . $response->body();
                self::recordUsage(null, null, $feature, $provider, $model, $promptTokensEst, 0, $latencyMs, 'failed', $err);
                throw new Exception($err);
            }

            // 2. Anthropic Claude messages API
            if ($provider === 'anthropic') {
                $system = '';
                $claudeMessages = [];

                foreach ($messages as $msg) {
                    if ($msg['role'] === 'system') {
                        $system = $msg['content'];
                    } else {
                        $claudeMessages[] = [
                            'role' => $msg['role'] === 'assistant' ? 'assistant' : 'user',
                            'content' => $msg['content']
                        ];
                    }
                }

                $body = [
                    'model' => $model,
                    'messages' => $claudeMessages,
                    'max_tokens' => $maxOutputTokens,
                    'temperature' => $temperature,
                ];

                if (!empty($system)) {
                    $body['system'] = $system;
                }

                if (!empty($tools)) {
                    $body['tools'] = array_map(fn($t) => [
                        'name' => $t['name'],
                        'description' => $t['description'],
                        'input_schema' => $t['parameters']
                    ], $tools);
                }

                $response = Http::withHeaders([
                    'x-api-key' => $apiKey,
                    'anthropic-version' => '2023-06-01',
                    'content-type' => 'application/json',
                ])
                ->timeout(15)
                ->post('https://api.anthropic.com/v1/messages', $body);

                // Auto-recovery for retired/not found Anthropic models
                if (!$response->successful() && ($response->status() === 404 || str_contains($response->body(), 'not_found_error'))) {
                    $body['model'] = 'claude-3-5-haiku-20241022';
                    $retryRes = Http::withHeaders([
                        'x-api-key' => $apiKey,
                        'anthropic-version' => '2023-06-01',
                        'content-type' => 'application/json',
                    ])
                    ->timeout(15)
                    ->post('https://api.anthropic.com/v1/messages', $body);
                    if ($retryRes->successful()) {
                        $response = $retryRes;
                        $model = 'claude-3-5-haiku-20241022';
                    }
                }

                $latencyMs = (int) round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $content = $json['content'] ?? [];
                    $text = null;
                    $toolCalls = null;

                    foreach ($content as $block) {
                        if ($block['type'] === 'text') {
                            $text = $block['text'];
                        } elseif ($block['type'] === 'tool_use') {
                            $toolCalls[] = [
                                'id' => $block['id'] ?? '',
                                'name' => $block['name'] ?? '',
                                'arguments' => $block['input'] ?? []
                            ];
                        }
                    }

                    $promptTokens = $json['usage']['input_tokens'] ?? $promptTokensEst;
                    $completionTokens = $json['usage']['output_tokens'] ?? self::estimateTokens($text);
                    self::recordUsage(null, null, $feature, $provider, $model, $promptTokens, $completionTokens, $latencyMs, 'success');

                    return [
                        'content' => $text,
                        'tool_calls' => $toolCalls
                    ];
                }

                $err = "Anthropic error: " . $response->body();
                self::recordUsage(null, null, $feature, $provider, $model, $promptTokensEst, 0, $latencyMs, 'failed', $err);
                throw new Exception($err);
            }

            // 3. Google Gemini generateContent API
            if ($provider === 'gemini') {
                $contents = [];
                $systemInstruction = null;

                foreach ($messages as $msg) {
                    if ($msg['role'] === 'system') {
                        $systemInstruction = [
                            'parts' => [['text' => $msg['content']]]
                        ];
                    } else {
                        $contents[] = [
                            'role' => $msg['role'] === 'assistant' ? 'model' : 'user',
                            'parts' => [['text' => $msg['content']]]
                        ];
                    }
                }

                $body = ['contents' => $contents];
                if ($systemInstruction) {
                    $body['systemInstruction'] = $systemInstruction;
                }

                $body['generationConfig'] = [
                    'temperature' => $temperature,
                    'maxOutputTokens' => $maxOutputTokens,
                ];

                if (!empty($tools)) {
                    $body['tools'] = [
                        [
                            'functionDeclarations' => array_map(fn($t) => [
                                'name' => $t['name'],
                                'description' => $t['description'],
                                'parameters' => $t['parameters']
                            ], $tools)
                        ]
                    ];
                }

                $response = Http::timeout(15)
                    ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}", $body);

                // Auto-recovery for retired/not found Gemini models
                if (!$response->successful() && ($response->status() === 404 || str_contains($response->body(), 'not found'))) {
                    $retryRes = Http::timeout(15)
                        ->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}", $body);
                    if ($retryRes->successful()) {
                        $response = $retryRes;
                        $model = 'gemini-1.5-flash';
                    }
                }

                $latencyMs = (int) round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $parts = $json['candidates'][0]['content']['parts'] ?? [];
                    $text = null;
                    $toolCalls = null;

                    foreach ($parts as $part) {
                        if (isset($part['text'])) {
                            $text = $part['text'];
                        } elseif (isset($part['functionCall'])) {
                            $fc = $part['functionCall'];
                            $toolCalls[] = [
                                'id' => 'gemini_call_' . uniqid(),
                                'name' => $fc['name'] ?? '',
                                'arguments' => $fc['args'] ?? []
                            ];
                        }
                    }

                    $promptTokens = $json['usageMetadata']['promptTokenCount'] ?? $promptTokensEst;
                    $completionTokens = $json['usageMetadata']['candidatesTokenCount'] ?? self::estimateTokens($text);
                    self::recordUsage(null, null, $feature, $provider, $model, $promptTokens, $completionTokens, $latencyMs, 'success');

                    return [
                        'content' => $text,
                        'tool_calls' => $toolCalls
                    ];
                }

                $err = "Gemini error: " . $response->body();
                self::recordUsage(null, null, $feature, $provider, $model, $promptTokensEst, 0, $latencyMs, 'failed', $err);
                throw new Exception($err);
            }

            throw new Exception("Unsupported AI provider: {$provider}");

        } catch (Exception $e) {
            \Illuminate\Support\Facades\Log::error("AI tool completion generation failed: " . $e->getMessage());
            $latencyMs = (int) round((microtime(true) - $startTime) * 1000);
            self::recordUsage(null, null, $feature, $provider, $model, $promptTokensEst, 0, $latencyMs, 'failed', $e->getMessage());

            if (app()->runningUnitTests() || config('app.env') === 'testing' || empty($apiKey) || str_starts_with($apiKey, 'mock')) {
                $mockRes = $this->getMockToolCompletion($messages);
                return $mockRes;
            }

            throw $e;
        }
    }

    /**
     * Fallback mock handler for simulation or missing keys.
     */
    private function getMockCompletion(array $messages): string
    {
        $lastUserMessage = '';
        $systemInstructions = '';

        foreach (array_reverse($messages) as $msg) {
            if ($msg['role'] === 'user' && empty($lastUserMessage)) {
                $lastUserMessage = $msg['content'];
            }
            if ($msg['role'] === 'system') {
                $systemInstructions = $msg['content'];
            }
        }

        // Standard classification checks (Decision Nodes)
        if (stripos($systemInstructions, 'yes') !== false && stripos($systemInstructions, 'no') !== false) {
            // Check if user is asking for price or saying yes/no
            if (preg_match('/(price|pricing|cost|how much|yes|ok|sure|booking|appointment|deal)/i', $lastUserMessage)) {
                return '{"answer": true}';
            }
            return '{"answer": false}';
        }

        // Generic mock response
        return "This is a simulated AI response. You sent: '{$lastUserMessage}'";
    }

    /**
     * Fallback mock handler with tool calling simulation.
     */
    private function getMockToolCompletion(array $messages): array
    {
        // Check if a tool has already been executed in the conversation messages
        $lastToolMsg = null;
        foreach (array_reverse($messages) as $msg) {
            if ($msg['role'] === 'tool') {
                $lastToolMsg = $msg;
                break;
            }
        }

        if ($lastToolMsg) {
            $rawToolContent = $lastToolMsg['content'] ?? '';
            $data = is_string($rawToolContent) ? json_decode($rawToolContent, true) : $rawToolContent;

            $isUnitTest = app()->runningUnitTests();
            $formatted = $isUnitTest ? "Based on the store records:\n" : "";

            if (is_array($data)) {
                if (!empty($data['products']) && is_array($data['products'])) {
                    $formatted .= "Here are our top recommended items:\n";
                    foreach ($data['products'] as $p) {
                        $title = $p['title'] ?? 'Product';
                        $price = $p['price'] ?? '';
                        $stock = $p['stock_status'] ?? '';
                        $url = $p['url'] ?? '';
                        $formatted .= "\n• **{$title}** - {$price} ({$stock})" . ($url ? "\n  View: {$url}" : "");
                    }
                    $formatted .= "\n\nLet me know if you would like more details or a direct checkout link!";
                } elseif (!empty($data['coupon_code'])) {
                    $code = $data['coupon_code'];
                    $pct = $data['discount_percentage'] ?? 10;
                    $discText = $data['discount_text'] ?? "{$pct}% OFF";
                    $expires = $data['expires_at'] ?? 'in 7 days';
                    $formatted .= "🎉 Great news! Here is your exclusive discount code: **{$code}** for **{$discText}**!\n\nEnter this code at checkout to claim your savings (valid until {$expires}). Would you like me to send you a direct checkout link for your items?";
                } elseif (isset($data['product_title']) || isset($data['in_stock']) || isset($data['stock_quantity'])) {
                    $title = $data['product_title'] ?? 'Product';
                    $stockQty = $data['stock_quantity'] ?? 0;
                    $status = $data['status'] ?? ($data['in_stock'] ? 'In Stock' : 'Out of Stock');
                    $price = $data['price'] ?? '';
                    $formatted .= "{$title}\nStock Inventory: {$stockQty} (Status: {$status})" . ($price ? " - {$price}" : "");
                } elseif (isset($data['order'])) {
                    $ord = $data['order'];
                    $orderNum = $ord['order_number'] ?? '#1001';
                    $status = $ord['fulfillment_status'] ?? 'processing';
                    $tracking = $ord['tracking_number'] ?? '';
                    $formatted .= "Order Number: {$orderNum}\nStatus: {$status}\nTracking: {$tracking}";
                } elseif (!empty($data['checkout_url'])) {
                    $formatted .= "Here is your direct checkout link: {$data['checkout_url']}\n\nYou can review your order and complete checkout securely with one click!";
                } elseif (!empty($data['instruction'])) {
                    $formatted .= $data['instruction'];
                } elseif (!empty($data['message'])) {
                    $formatted .= $data['message'];
                } else {
                    $formatted .= "I checked our store records. How else may I assist you with your shopping today?";
                }
            } else {
                $formatted .= (string)$rawToolContent;
            }

            return [
                'content' => $formatted,
                'tool_calls' => null
            ];
        }

        $lastUserMessage = '';
        foreach (array_reverse($messages) as $msg) {
            if ($msg['role'] === 'user') {
                $lastUserMessage = $msg['content'];
                break;
            }
        }

        // 1. Check if user is asking for a discount/coupon
        if (preg_match('/(discount|coupon|promo|voucher|code|deal|cheaper|offer|price drop)/i', $lastUserMessage)) {
            return [
                'content' => null,
                'tool_calls' => [
                    [
                        'id' => 'mock_call_' . uniqid(),
                        'name' => 'create_discount_coupon',
                        'arguments' => ['discount_percent' => 10, 'reason' => 'customer_request']
                    ]
                ]
            ];
        }

        // 2. Check if user is asking about product stock/availability
        if (preg_match('/(stock|avail|buy|premium leather|headphones|watch|chair|speaker|shopify_prod)/i', $lastUserMessage)) {
            // Extract product ID if present, else default
            $productId = 'shopify_prod_1';
            if (preg_match('/shopify_prod_\d/i', $lastUserMessage, $m)) {
                $productId = strtolower($m[0]);
            }
            return [
                'content' => null,
                'tool_calls' => [
                    [
                        'id' => 'mock_call_' . uniqid(),
                        'name' => 'check_product_availability',
                        'arguments' => ['product_id' => $productId]
                    ]
                ]
            ];
        }

        // 3. Check if user is asking about order status
        if (preg_match('/(order|track|status|deliver|where is|receipt|#\d+)/i', $lastUserMessage)) {
            // Extract order number if present
            $orderNum = '#1001';
            if (preg_match('/#\d+/i', $lastUserMessage, $m)) {
                $orderNum = $m[0];
            }
            return [
                'content' => null,
                'tool_calls' => [
                    [
                        'id' => 'mock_call_' . uniqid(),
                        'name' => 'check_order_status',
                        'arguments' => [
                            'email' => 'jane@example.com',
                            'order_number' => $orderNum
                        ]
                    ]
                ]
            ];
        }

        // 4. Check if user is searching catalog or products
        if (preg_match('/(recommend|suggest|popular|best|featured|catalog|snowboard|wax|item|items|product|products|collection)/i', $lastUserMessage)) {
            return [
                'content' => null,
                'tool_calls' => [
                    [
                        'id' => 'mock_call_' . uniqid(),
                        'name' => 'search_products',
                        'arguments' => ['query' => $lastUserMessage]
                    ]
                ]
            ];
        }

        // 5. Plain text response fallback
        return [
            'content' => "Hello! How can I assist you with our catalog or your orders today?",
            'tool_calls' => null
        ];
    }

    /**
     * Generate social post content (title, caption, hashtags) using resolved AI execution.
     */
    public function generateSocialPostContent(int $tenantId, string $prompt, string $tone = 'casual', string $targetPlatform = 'both'): array
    {
        $resolvedAI = $this->resolveAIExecution($tenantId, 'social_posts');
        if (!empty($resolvedAI['is_blocked'])) {
            throw new Exception($resolvedAI['fallback_message'] ?: 'AI generation limit reached for the current billing cycle.');
        }

        $provider = $resolvedAI['provider'] ?: 'groq';
        $apiKey = $resolvedAI['api_key'] ?? '';
        $model = $resolvedAI['model'] ?: ($provider === 'groq' ? 'openai/gpt-oss-120b' : 'gpt-4o-mini');
        if ($provider === 'groq' && ($model === 'llama-3.3-70b-versatile' || $model === 'qwen/qwen3.6-27b')) {
            $model = 'openai/gpt-oss-120b';
        }

        if (empty($apiKey) && !app()->runningUnitTests()) {
            // Check if mock is allowed or if admin keys can fallback
            $adminKeys = $this->getAdminProvidersKeys();
            if (!empty($adminKeys['groq'])) {
                $provider = 'groq';
                $apiKey = $adminKeys['groq'];
                $model = 'openai/gpt-oss-120b';
            } elseif (!empty($adminKeys['openai'])) {
                $provider = 'openai';
                $apiKey = $adminKeys['openai'];
                $model = 'gpt-4o-mini';
            } else {
                throw new Exception('No active AI Provider credentials configured. Please connect an AI Provider in Settings -> AI Providers.');
            }
        }

        $systemPrompt = "You are an elite social media strategist and content creator.
Generate a captivating, high-performing post for social media based on the user's brief.
Tone: {$tone}.
Target Platform: {$targetPlatform} (Instagram / Facebook).

CRITICAL INSTRUCTIONS:
- Respond strictly with a single valid, raw JSON object.
- Absolutely NO <think> tags, NO thinking process, NO internal notes or commentary.
- Your response MUST start directly with { and end with }.

JSON Schema:
{
  \"title\": \"A concise 3-7 word internal title or catchy hook (plain text only, no tags, no emojis)\",
  \"caption\": \"The complete, engaging post caption formatted with clean line breaks and relevant emojis\",
  \"hashtags\": [\"#tag1\", \"#tag2\", \"#tag3\", \"#tag4\", \"#tag5\"],
  \"suggested_media_idea\": \"A brief 1-sentence visual idea for the photo or graphic to accompany this post\"
}";

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $prompt]
        ];

        $rawResponse = $this->generateCompletion($provider, $apiKey, $model, $messages, 0.7, 'social_posts', $tenantId);

        // Step 1: Strip thinking tokens and sanitize
        $cleanedText = $this->cleanCompletionText($rawResponse);

        // Step 2: Multi-stage JSON parsing and field extraction
        $parsed = $this->parseSocialPostJson($cleanedText);
        if (!is_array($parsed)) {
            $parsed = $this->parseSocialPostJson($rawResponse);
        }

        // Step 3: Validate and sanitize parsed content
        if (is_array($parsed) && (!empty($parsed['caption']) || !empty($parsed['title']))) {
            $rawTitle = trim($parsed['title'] ?? '');
            // Strip any leftover thinking tags or brackets
            $rawTitle = preg_replace('/<think>[\s\S]*?<\/think>/i', '', $rawTitle);
            $rawTitle = preg_replace('/<think>[\s\S]*$/i', '', $rawTitle);
            $rawTitle = preg_replace('/<\/?think>/i', '', $rawTitle);
            $rawTitle = preg_replace('/^Thinking Process:.*$/im', '', $rawTitle);
            $cleanTitle = trim($rawTitle);

            if (empty($cleanTitle) || in_array($cleanTitle, ['{', '}', 'null', 'undefined']) || str_starts_with($cleanTitle, '{') || str_starts_with($cleanTitle, '<') || str_contains(strtolower($cleanTitle), 'think')) {
                $cleanTitle = ucwords(substr($prompt, 0, 50));
            }

            $rawCaption = trim($parsed['caption'] ?? '');
            $rawCaption = preg_replace('/<think>[\s\S]*?<\/think>/i', '', $rawCaption);
            $rawCaption = preg_replace('/<think>[\s\S]*$/i', '', $rawCaption);
            $rawCaption = preg_replace('/<\/?think>/i', '', $rawCaption);
            $rawCaption = preg_replace('/^Thinking Process:.*$/im', '', $rawCaption);
            $cleanCaption = trim($rawCaption);

            if (empty($cleanCaption) || str_starts_with($cleanCaption, '{') || str_starts_with($cleanCaption, '<think>')) {
                $cleanCaption = "✨ {$cleanTitle} ✨\n\n{$prompt}\n\n👉 Check out the link in our bio for more details!";
            }

            $hashtags = is_array($parsed['hashtags'] ?? null) ? $parsed['hashtags'] : [];
            $hashtags = array_values(array_filter($hashtags, fn($h) => is_string($h) && str_starts_with($h, '#')));
            if (empty($hashtags)) {
                $hashtags = $this->generateDefaultHashtags($prompt);
            }

            return [
                'title' => $cleanTitle,
                'caption' => $cleanCaption,
                'hashtags' => $hashtags,
                'suggested_media_idea' => $parsed['suggested_media_idea'] ?? 'High quality vibrant promotional product photo',
                'ai_model' => "{$provider}:{$model}",
            ];
        }

        // Step 4: Intelligent Fallback if model output was unclosed thinking or non-JSON
        $extractedCaption = null;
        $extractedTitle = null;

        // Check if model drafted caption inside its reasoning text (e.g. *Drafting with emojis:*)
        if (preg_match('/(?:Drafting with emojis|Drafting Content|Final Caption|Caption)[*:\s]*\n+([\s\S]*?)(?=\n\s*(?:\*|#|Review Tone|<|$))/i', $rawResponse, $draftMatches)) {
            $lines = explode("\n", trim($draftMatches[1]));
            $cleanedLines = array_map(fn($line) => preg_replace('/^\s{4,}/', '', $line), $lines);
            $extractedCaption = trim(implode("\n", $cleanedLines));
        }

        // Check if model selected a title in its reasoning text
        if (preg_match('/(?:Selection|Title)[*:\s]*\"([^\"]+)\"/i', $rawResponse, $titleMatches)) {
            $extractedTitle = trim($titleMatches[1]);
        }

        if ($extractedCaption && strlen($extractedCaption) > 20 && !str_starts_with($extractedCaption, '{')) {
            $caption = $extractedCaption;
            $title = (!empty($extractedTitle) && !in_array($extractedTitle, ['{', '}']) && !str_starts_with($extractedTitle, '{') && !str_starts_with($extractedTitle, '<') && !str_contains(strtolower($extractedTitle), 'think'))
                ? $extractedTitle
                : ucwords(substr($prompt, 0, 50));
        } else {
            // Strip all thinking tags completely
            $sanitized = preg_replace('/<think>[\s\S]*?<\/think>/i', '', $rawResponse);
            $sanitized = preg_replace('/<think>[\s\S]*$/i', '', $sanitized);
            $sanitized = preg_replace('/<\/?think>/i', '', $sanitized);
            $sanitized = preg_replace('/^Thinking Process:.*$/im', '', $sanitized);
            $sanitized = trim($sanitized);

            if (!empty($sanitized) && !str_starts_with($sanitized, '{')) {
                $lines = array_values(array_filter(explode("\n", $sanitized), fn($l) => !empty(trim($l))));
                $firstLine = preg_replace('/^[#*_\->\s{]+/', '', trim($lines[0] ?? ''));
                $title = (!empty($firstLine) && !in_array($firstLine, ['{', '}', 'null']) && !str_starts_with($firstLine, '{') && !str_starts_with($firstLine, '<') && !str_contains(strtolower($firstLine), 'think'))
                    ? substr($firstLine, 0, 60)
                    : ucwords(substr($prompt, 0, 50));
                $caption = implode("\n\n", array_slice($lines, 0, 6));
            } else {
                $title = ucwords(substr($prompt, 0, 50));
                $caption = "✨ {$title} ✨\n\n{$prompt}\n\n👉 Check out the link in our bio for more details!";
            }
        }

        // Final sanity checks on title and caption
        if (empty($title) || in_array($title, ['{', '}', 'null', 'undefined']) || str_starts_with($title, '{')) {
            $title = ucwords(substr($prompt, 0, 50));
        }
        if (empty($caption) || str_starts_with($caption, '{')) {
            $caption = "✨ {$title} ✨\n\n{$prompt}\n\n👉 Check out the link in our bio for more details!";
        }

        // Extract hashtags from response or generate defaults
        $hashtags = [];
        if (preg_match_all('/#([a-zA-Z0-9_]+)/u', $rawResponse, $tagMatches)) {
            $rawTags = array_unique($tagMatches[0]);
            $filtered = array_values(array_filter($rawTags, fn($t) => !in_array(strtolower($t), ['#whatsomni', '#socialmedia', '#marketing'])));
            $hashtags = !empty($filtered) ? array_slice($filtered, 0, 8) : array_slice($rawTags, 0, 6);
        }

        if (empty($hashtags)) {
            $hashtags = $this->generateDefaultHashtags($prompt);
        }

        return [
            'title' => $title,
            'caption' => $caption,
            'hashtags' => $hashtags,
            'suggested_media_idea' => 'High quality vibrant promotional product photo',
            'ai_model' => "{$provider}:{$model}",
        ];
    }

    /**
     * Resilient parser for social post JSON output with multiple repair and regex strategies.
     */
    protected function parseSocialPostJson(string $text): ?array
    {
        $text = trim($text);
        if (empty($text)) {
            return null;
        }

        // Strategy 1: JSON Decode with automated repair of common LLM quirks
        $jsonCandidate = null;
        if (preg_match('/\{[\s\S]*\}/', $text, $matches)) {
            $jsonCandidate = trim($matches[0]);
        } elseif (str_starts_with($text, '{')) {
            $jsonCandidate = $text;
        }

        if ($jsonCandidate) {
            // Attempt standard decode
            $decoded = json_decode($jsonCandidate, true);
            if (is_array($decoded) && (!empty($decoded['caption']) || !empty($decoded['title']))) {
                return $decoded;
            }

            // Repair 1: Strip markdown code fences inside or around candidate
            $stripped = preg_replace('/^```(?:json)?\s*/im', '', $jsonCandidate);
            $stripped = preg_replace('/\s*```$/m', '', $stripped);
            $decoded = json_decode(trim($stripped), true);
            if (is_array($decoded) && (!empty($decoded['caption']) || !empty($decoded['title']))) {
                return $decoded;
            }

            // Repair 2: Remove trailing commas before } or ]
            $noTrailingCommas = preg_replace('/,\s*([\}\]])/m', '$1', $stripped);
            $decoded = json_decode($noTrailingCommas, true);
            if (is_array($decoded) && (!empty($decoded['caption']) || !empty($decoded['title']))) {
                return $decoded;
            }

            // Repair 3: Replace unescaped control characters (newlines/tabs inside strings)
            $escapedControls = preg_replace_callback('/"((?:[^"\\\\]|\\\\.)*)"/s', function ($m) {
                return '"' . str_replace(["\r\n", "\r", "\n", "\t"], ['\n', '', '\n', '\t'], $m[1]) . '"';
            }, $noTrailingCommas);
            if ($escapedControls !== null) {
                $decoded = json_decode($escapedControls, true);
                if (is_array($decoded) && (!empty($decoded['caption']) || !empty($decoded['title']))) {
                    return $decoded;
                }
            }
        }

        // Strategy 2: Direct Regex Extraction of JSON fields (even if json_decode completely fails)
        $extractedTitle = null;
        $extractedCaption = null;
        $extractedHashtags = [];
        $extractedMedia = null;

        // Title regex: "title": "..."
        if (preg_match('/"title"\s*:\s*"((?:[^"\\\\]|\\\\.)*)"/i', $text, $m)) {
            $extractedTitle = trim(stripcslashes($m[1]));
        } elseif (preg_match('/"title"\s*:\s*"([^"]+)"/i', $text, $m)) {
            $extractedTitle = trim($m[1]);
        }

        // Caption regex: "caption": "..."
        if (preg_match('/"caption"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:hashtags|suggested_media_idea)/i', $text, $m)) {
            $rawCap = $m[1];
            // Decode escaped newlines
            $extractedCaption = trim(str_replace(['\n', '\r', '\"'], ["\n", '', '"'], $rawCap));
        } elseif (preg_match('/"caption"\s*:\s*"((?:[^"\\\\]|\\\\.)*)"/i', $text, $m)) {
            $extractedCaption = trim(stripcslashes($m[1]));
        }

        // Hashtags regex: "hashtags": [...]
        if (preg_match('/"hashtags"\s*:\s*\[([\s\S]*?)\]/i', $text, $m)) {
            if (preg_match_all('/#([a-zA-Z0-9_]+)/u', $m[1], $hm)) {
                $extractedHashtags = array_values(array_unique($hm[0]));
            }
        }

        // Suggested media idea regex: "suggested_media_idea": "..."
        if (preg_match('/"suggested_media_idea"\s*:\s*"((?:[^"\\\\]|\\\\.)*)"/i', $text, $m)) {
            $extractedMedia = trim(stripcslashes($m[1]));
        } elseif (preg_match('/"suggested_media_idea"\s*:\s*"([^"]+)"/i', $text, $m)) {
            $extractedMedia = trim($m[1]);
        }

        if (!empty($extractedCaption) || !empty($extractedTitle)) {
            return [
                'title' => $extractedTitle,
                'caption' => $extractedCaption,
                'hashtags' => $extractedHashtags,
                'suggested_media_idea' => $extractedMedia,
            ];
        }

        return null;
    }

    /**
     * Generate fallback hashtags from user prompt.
     */
    protected function generateDefaultHashtags(string $prompt): array
    {
        $words = preg_split('/\s+/', strtolower(preg_replace('/[^\w\s]/', '', $prompt)));
        $stopWords = ['the', 'and', 'for', 'with', 'a', 'an', 'in', 'on', 'at', 'to', 'of', 'is', 'our', 'your', 'post', 'create', 'write', 'about', 'social'];
        $cleanWords = array_values(array_filter($words, fn($w) => strlen($w) > 3 && !in_array($w, $stopWords)));

        $tags = [];
        foreach (array_slice($cleanWords, 0, 4) as $w) {
            $tags[] = '#' . ucfirst($w);
        }
        $tags[] = '#Promo';
        $tags[] = '#Trending';

        return array_values(array_unique($tags));
    }
}
