<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\AiAgent;
use App\Models\AiAgentLog;
use App\Models\ChannelConnection;
use App\Models\Flow;
use App\Models\KnowledgeBase;
use App\Models\AIProviderConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Exception;

class AiAgentController extends Controller
{
    /**
     * List all AI agents for the current tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $agents = AiAgent::where('tenant_id', $tenantId)
            ->with(['channels', 'flow.publishedVersion', 'knowledgeBase', 'providerConfig'])
            ->latest()
            ->get();

        // Auto-heal agents missing their dedicated flow
        foreach ($agents as $agent) {
            if (!$agent->flow_id) {
                $flow = Flow::where('tenant_id', $tenantId)->where('name', $agent->name . ' Dedicated Flow')->first();
                if ($flow) {
                    $agent->flow_id = $flow->id;
                } else {
                    $triggerType = $agent->type === 'outbound' ? 'outbound_campaign' : 'inbound_message';
                    $flow = Flow::create([
                        'tenant_id' => $tenantId,
                        'name' => $agent->name . ' Dedicated Flow',
                        'description' => 'Automatically provisioned flow logic for ' . $agent->name,
                        'trigger_type' => $triggerType,
                        'is_active' => true,
                    ]);

                    $version = $flow->versions()->create([
                        'version_number' => 1,
                        'definition' => [
                            'nodes' => [
                                [
                                    'id' => 'trigger_1',
                                    'type' => $triggerType,
                                    'position' => ['x' => 250, 'y' => 100],
                                    'data' => [
                                        'title' => 'Start Trigger',
                                        'description' => 'Fires flow execution path',
                                        'channel' => 'all',
                                        'keyword' => ''
                                    ]
                                ]
                            ],
                            'edges' => []
                        ],
                        'is_published' => true,
                        'created_by' => $request->user()->id,
                    ]);

                    $flow->update(['current_published_version_id' => $version->id]);
                    $agent->flow_id = $flow->id;
                }
                $agent->save();
            }
        }

        return response()->json($agents->fresh(['channels', 'flow.publishedVersion', 'knowledgeBase', 'providerConfig']));
    }

    /**
     * Create a new AI agent with its dedicated Flow.
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:inbound,outbound',
            'trigger_type' => 'nullable|string|in:inbound_message,outbound_campaign,webhook_trigger,webhook,ecommerceCheckoutAbandoned,contact_created,deal_updated,manual',
            'ai_provider_config_id' => [
                'nullable',
                'integer',
                Rule::exists('ai_provider_configs', 'id')->where('tenant_id', $tenantId)
            ],
            'provider' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'system_prompt' => 'nullable|string',
            'status' => 'nullable|string|in:active,inactive',
            'business_hours' => 'nullable|array',
            'fallback_message' => 'nullable|string|max:1000',
            'handoff_rules' => 'nullable|array',
            'flow_id' => [
                'nullable',
                'integer',
                Rule::exists('flows', 'id')->where('tenant_id', $tenantId)
            ],
            'knowledge_base_id' => [
                'nullable',
                'integer',
                Rule::exists('knowledge_bases', 'id')->where('tenant_id', $tenantId)
            ],
            'channel_ids' => 'nullable|array',
            'channel_ids.*' => [
                'integer',
                Rule::exists('channel_connections', 'id')->where('tenant_id', $tenantId)
            ],
        ]);

        $triggerType = $request->input('trigger_type');
        if (empty($triggerType)) {
            $triggerType = $request->input('type') === 'outbound' ? 'outbound_campaign' : 'inbound_message';
        }

        $triggerTitles = [
            'inbound_message' => 'Inbound Message',
            'outbound_campaign' => 'Outbound Broadcast',
            'webhook_trigger' => 'API Webhook',
            'ecommerceCheckoutAbandoned' => 'Checkout Abandoned',
            'contact_created' => 'Contact Created Event',
            'deal_updated' => 'Deal Stage Updated',
            'manual' => 'Manual Inbound Trigger',
        ];

        // Safety Guard: A channel can only be assigned to ONE Inbound AI Agent at a time
        $isInbound = ($request->input('type') === 'inbound' || $triggerType === 'inbound_message');
        $requestedChannelIds = $request->input('channel_ids', []);
        if ($isInbound && !empty($requestedChannelIds)) {
            $conflictAgent = AiAgent::where('tenant_id', $tenantId)
                ->where(function ($q) {
                    $q->where('type', 'inbound')
                      ->orWhere('trigger_type', 'inbound_message');
                })
                ->whereHas('channels', function ($q) use ($requestedChannelIds) {
                    $q->whereIn('channel_connections.id', $requestedChannelIds);
                })
                ->with('channels')
                ->first();

            if ($conflictAgent) {
                $conflictChannel = $conflictAgent->channels->firstWhere(fn($c) => in_array($c->id, $requestedChannelIds));
                return response()->json([
                    'message' => "This channel is already assigned to \"{$conflictAgent->name}\" for inbound handling.",
                    'conflict_channel_id' => $conflictChannel ? $conflictChannel->id : null,
                    'conflict_agent_name' => $conflictAgent->name,
                ], 422);
            }
        }

        try {
            DB::beginTransaction();

            $flowId = $request->input('flow_id');
            if (empty($flowId)) {
                // Auto-create dedicated Flow for this agent
                $flow = Flow::create([
                    'tenant_id' => $tenantId,
                    'name' => trim($request->input('name')) . ' Flow',
                    'description' => 'Automated workflow for ' . trim($request->input('name')),
                    'trigger_type' => $triggerType,
                    'channel_type' => 'omnichannel',
                    'is_active' => true,
                ]);

                $version = \App\Models\FlowVersion::create([
                    'flow_id' => $flow->id,
                    'version_number' => 1,
                    'definition' => [
                        'nodes' => [
                            [
                                'id' => 'trigger_1',
                                'type' => $triggerType,
                                'position' => ['x' => 250, 'y' => 100],
                                'data' => [
                                    'title' => $triggerTitles[$triggerType] ?? 'Start Trigger',
                                    'description' => 'Trigger node configured in AI Agent settings',
                                    'is_root_trigger' => true,
                                    'channel' => 'all',
                                    'keyword' => ''
                                ]
                            ]
                        ],
                        'edges' => []
                    ],
                    'is_published' => true,
                    'created_by' => $request->user()->id,
                ]);

                $flow->update(['current_published_version_id' => $version->id]);
                $flowId = $flow->id;
            }

            $aiService = app(\App\Services\AIProviderService::class);
            $mode = $aiService->getAiOperationalModel();
            $providerConfigId = $request->input('ai_provider_config_id');
            $providerName = $request->input('provider') ?: $request->input('provider_name');

            if ($mode === 'byok') {
                if ($providerConfigId) {
                    $pConfig = AIProviderConfig::where('tenant_id', $tenantId)->find($providerConfigId);
                    if ($pConfig) {
                        $providerName = $pConfig->provider_name;
                    } else {
                        $providerConfigId = null;
                    }
                }
            } else {
                $providerConfigId = null;
            }

            $agent = AiAgent::create([
                'tenant_id' => $tenantId,
                'name' => trim($request->input('name')),
                'type' => $request->input('type'),
                'trigger_type' => $triggerType,
                'ai_provider_config_id' => $providerConfigId,
                'provider' => $providerName,
                'model' => $request->input('model'),
                'system_prompt' => $request->input('system_prompt'),
                'status' => $request->input('status', 'active'),
                'business_hours' => $request->input('business_hours'),
                'fallback_message' => $request->input('fallback_message'),
                'handoff_rules' => $request->input('handoff_rules'),
                'flow_id' => $flowId,
                'knowledge_base_id' => $request->input('knowledge_base_id'),
                'created_by' => $request->user()->id,
            ]);

            // Sync channels
            if ($request->has('channel_ids')) {
                $channelIds = $request->input('channel_ids', []);
                $agent->channels()->sync($channelIds);

                if ($agent->status === 'active' && !empty($channelIds)) {
                    \App\Models\Conversation::where('tenant_id', $tenantId)
                        ->whereIn('channel_connection_id', $channelIds)
                        ->whereNull('assigned_user_id')
                        ->update([
                            'ai_active' => true,
                            'ai_agent_id' => $agent->id,
                        ]);
                }
            }

            DB::commit();

            return response()->json($agent->load(['channels', 'flow.publishedVersion', 'knowledgeBase', 'providerConfig']), 201);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create AI Agent: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Show single AI agent.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $agent = AiAgent::where('tenant_id', $tenantId)
            ->with(['channels', 'flow.publishedVersion', 'knowledgeBase', 'providerConfig'])
            ->findOrFail($id);

        return response()->json($agent);
    }

    /**
     * Update AI agent details and sync underlying Flow.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $agent = AiAgent::where('tenant_id', $tenantId)->findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:inbound,outbound',
            'trigger_type' => 'nullable|string|in:inbound_message,outbound_campaign,webhook_trigger,webhook,ecommerceCheckoutAbandoned,contact_created,deal_updated,manual',
            'ai_provider_config_id' => [
                'nullable',
                'integer',
                Rule::exists('ai_provider_configs', 'id')->where('tenant_id', $tenantId)
            ],
            'model' => 'nullable|string|max:100',
            'system_prompt' => 'nullable|string',
            'status' => 'nullable|string|in:active,inactive',
            'business_hours' => 'nullable|array',
            'fallback_message' => 'nullable|string|max:1000',
            'handoff_rules' => 'nullable|array',
            'flow_id' => [
                'nullable',
                'integer',
                Rule::exists('flows', 'id')->where('tenant_id', $tenantId)
            ],
            'knowledge_base_id' => [
                'nullable',
                'integer',
                Rule::exists('knowledge_bases', 'id')->where('tenant_id', $tenantId)
            ],
            'channel_ids' => 'nullable|array',
            'channel_ids.*' => [
                'integer',
                Rule::exists('channel_connections', 'id')->where('tenant_id', $tenantId)
            ],
        ]);

        $triggerType = $request->input('trigger_type', $agent->trigger_type ?: ($request->input('type') === 'outbound' ? 'outbound_campaign' : 'inbound_message'));

        $triggerTitles = [
            'inbound_message' => 'Inbound Message',
            'outbound_campaign' => 'Outbound Broadcast',
            'webhook_trigger' => 'API Webhook',
            'ecommerceCheckoutAbandoned' => 'Checkout Abandoned',
            'contact_created' => 'Contact Created Event',
            'deal_updated' => 'Deal Stage Updated',
            'manual' => 'Manual Inbound Trigger',
        ];

        // Safety Guard: A channel can only be assigned to ONE Inbound AI Agent at a time
        $isInbound = ($request->input('type') === 'inbound' || $triggerType === 'inbound_message');
        $requestedChannelIds = $request->input('channel_ids', []);
        if ($isInbound && $request->has('channel_ids') && !empty($requestedChannelIds)) {
            $conflictAgent = AiAgent::where('tenant_id', $tenantId)
                ->where('id', '!=', $agent->id)
                ->where(function ($q) {
                    $q->where('type', 'inbound')
                      ->orWhere('trigger_type', 'inbound_message');
                })
                ->whereHas('channels', function ($q) use ($requestedChannelIds) {
                    $q->whereIn('channel_connections.id', $requestedChannelIds);
                })
                ->with('channels')
                ->first();

            if ($conflictAgent) {
                $conflictChannel = $conflictAgent->channels->firstWhere(fn($c) => in_array($c->id, $requestedChannelIds));
                return response()->json([
                    'message' => "This channel is already assigned to \"{$conflictAgent->name}\" for inbound handling.",
                    'conflict_channel_id' => $conflictChannel ? $conflictChannel->id : null,
                    'conflict_agent_name' => $conflictAgent->name,
                ], 422);
            }
        }

        try {
            DB::beginTransaction();

            // Ensure dedicated Flow exists and stays synced
            $flowId = $request->input('flow_id', $agent->flow_id);
            if (empty($flowId)) {
                $flow = Flow::create([
                    'tenant_id' => $tenantId,
                    'name' => trim($request->input('name')) . ' Flow',
                    'description' => 'Automated workflow for ' . trim($request->input('name')),
                    'trigger_type' => $triggerType,
                    'channel_type' => 'omnichannel',
                    'is_active' => true,
                ]);

                $version = \App\Models\FlowVersion::create([
                    'flow_id' => $flow->id,
                    'version_number' => 1,
                    'definition' => [
                        'nodes' => [
                            [
                                'id' => 'trigger_1',
                                'type' => $triggerType,
                                'position' => ['x' => 250, 'y' => 100],
                                'data' => [
                                    'title' => $triggerTitles[$triggerType] ?? 'Start Trigger',
                                    'description' => 'Trigger node configured in AI Agent settings',
                                    'is_root_trigger' => true,
                                    'channel' => 'all',
                                    'keyword' => ''
                                ]
                            ]
                        ],
                        'edges' => []
                    ],
                    'is_published' => true,
                    'created_by' => $request->user()->id,
                ]);

                $flow->update(['current_published_version_id' => $version->id]);
                $flowId = $flow->id;
            } else {
                $flow = Flow::where('tenant_id', $tenantId)->find($flowId);
                if ($flow) {
                    $flow->update([
                        'name' => trim($request->input('name')) . ' Flow',
                        'trigger_type' => $triggerType,
                    ]);

                    $versions = \App\Models\FlowVersion::where('flow_id', $flow->id)->get();
                    foreach ($versions as $version) {
                        $def = $version->definition;
                        if (isset($def['nodes']) && is_array($def['nodes'])) {
                            $hasTrigger = false;
                            foreach ($def['nodes'] as &$node) {
                                if ($node['id'] === 'trigger_1' || str_starts_with($node['id'], 'trigger_') || in_array($node['type'], ['inbound_message', 'outbound_campaign', 'webhook_trigger', 'webhook', 'ecommerceCheckoutAbandoned', 'contact_created', 'deal_updated', 'manual']) || !empty($node['data']['is_root_trigger'])) {
                                    $node['type'] = $triggerType;
                                    if (isset($node['data'])) {
                                        $node['data']['title'] = $triggerTitles[$triggerType] ?? 'Start Trigger';
                                        $node['data']['is_root_trigger'] = true;
                                    }
                                    $hasTrigger = true;
                                    break;
                                }
                            }
                            if (!$hasTrigger) {
                                array_unshift($def['nodes'], [
                                    'id' => 'trigger_1',
                                    'type' => $triggerType,
                                    'position' => ['x' => 250, 'y' => 100],
                                    'data' => [
                                        'title' => $triggerTitles[$triggerType] ?? 'Start Trigger',
                                        'description' => 'Trigger node configured in AI Agent settings',
                                        'is_root_trigger' => true,
                                    ]
                                ]);
                            }
                            $version->update(['definition' => $def]);
                        }
                    }
                }
            }

            $aiService = app(\App\Services\AIProviderService::class);
            $mode = $aiService->getAiOperationalModel();
            $providerConfigId = $request->input('ai_provider_config_id');
            $providerName = $request->input('provider') ?: $request->input('provider_name');

            if ($mode === 'byok') {
                if ($providerConfigId) {
                    $pConfig = AIProviderConfig::where('tenant_id', $tenantId)->find($providerConfigId);
                    if ($pConfig) {
                        $providerName = $pConfig->provider_name;
                    } else {
                        $providerConfigId = null;
                    }
                }
            } else {
                $providerConfigId = null;
            }

            $agent->update([
                'name' => trim($request->input('name')),
                'type' => $request->input('type'),
                'trigger_type' => $triggerType,
                'ai_provider_config_id' => $providerConfigId,
                'provider' => $providerName,
                'model' => $request->input('model'),
                'system_prompt' => $request->input('system_prompt'),
                'status' => $request->input('status', $agent->status),
                'business_hours' => $request->input('business_hours'),
                'fallback_message' => $request->input('fallback_message'),
                'handoff_rules' => $request->input('handoff_rules'),
                'flow_id' => $flowId,
                'knowledge_base_id' => $request->input('knowledge_base_id'),
            ]);

            // Sync channels
            if ($request->has('channel_ids')) {
                $channelIds = $request->input('channel_ids', []);
                $agent->channels()->sync($channelIds);

                if ($agent->status === 'active' && !empty($channelIds)) {
                    \App\Models\Conversation::where('tenant_id', $tenantId)
                        ->whereIn('channel_connection_id', $channelIds)
                        ->whereNull('assigned_user_id')
                        ->update([
                            'ai_active' => true,
                            'ai_agent_id' => $agent->id,
                        ]);
                }
            }

            DB::commit();

            return response()->json($agent->load(['channels', 'flow.publishedVersion', 'knowledgeBase', 'providerConfig']));
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update AI Agent: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete AI agent.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $agent = AiAgent::where('tenant_id', $tenantId)->findOrFail($id);
        
        if ($agent->flow_id) {
            Flow::where('tenant_id', $tenantId)->where('id', $agent->flow_id)->delete();
        }

        $agent->delete();

        return response()->json(['message' => 'AI Agent and associated Flow deleted successfully.']);
    }

    /**
     * Get logs for a specific agent.
     */
    public function logs(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $agent = AiAgent::where('tenant_id', $tenantId)->findOrFail($id);

        $logs = AiAgentLog::where('ai_agent_id', $agent->id)
            ->with(['conversation.contact'])
            ->orderBy('id', 'desc')
            ->paginate(20);

        return response()->json($logs);
    }

    /**
     * Get active provider configurations for dropdown binding.
     */
    public function providerConfigs(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $aiService = app(\App\Services\AIProviderService::class);
        $mode = $aiService->getAiOperationalModel();

        if ($mode === 'master_fixed') {
            return response()->json([
                [
                    'id' => 1,
                    'tenant_id' => $tenantId,
                    'provider_name' => 'platform',
                    'display_name' => 'WhatsOmni AI Engine',
                    'is_active' => true,
                    'enabled_models' => ['WhatsOmni Enterprise Model'],
                    'default_model' => 'WhatsOmni Enterprise Model',
                    'is_centrally_managed' => true,
                    'mode' => 'master_fixed',
                ]
            ]);
        }

        // BYOK mode: Returns only active provider configs configured by this tenant and supported by platform
        $supported = $aiService->getSupportedProviders();
        $configs = AIProviderConfig::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->get()
            ->filter(function ($cfg) use ($supported) {
                return isset($supported[$cfg->provider_name]);
            })
            ->map(function ($cfg) use ($supported) {
                $allowed = $supported[$cfg->provider_name]['models'] ?? [];
                $savedEnabled = is_array($cfg->enabled_models) ? $cfg->enabled_models : [];
                $enabled = array_values(array_intersect($savedEnabled, $allowed));
                if (empty($enabled)) {
                    $enabled = $allowed;
                }
                $defaultModel = $cfg->default_model;
                if (!in_array($defaultModel, $enabled)) {
                    $defaultModel = $enabled[0] ?? null;
                }
                $cfg->enabled_models = $enabled;
                $cfg->default_model = $defaultModel;
                return $cfg;
            })
            ->values();

        return response()->json($configs);
    }

    /**
     * Trigger an AI Agent turn or dispatch its assigned flow.
     */
    public function trigger(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $agent = AiAgent::where('tenant_id', $tenantId)->findOrFail($id);

        $request->validate([
            'contact_id' => 'nullable|integer',
            'message' => 'nullable|string',
            'variables' => 'nullable|array',
            'channel_connection_id' => 'nullable|integer',
        ]);

        $contactId = $request->input('contact_id');
        $contact = $contactId ? \App\Models\Contact::where('tenant_id', $tenantId)->find($contactId) : null;
        $messageText = $request->input('message', 'Trigger manual execution');
        $variables = $request->input('variables', []);

        if ($agent->flow) {
            $flowTriggerService = app(\App\Services\Flow\FlowTriggerService::class);
            $execution = $flowTriggerService->triggerFlow($agent->flow, [
                'trigger_type' => 'manual',
                'contact_id' => $contact?->id,
                'inbound_message' => $messageText,
                'variables' => array_merge(['triggered_by_agent_id' => $agent->id], $variables),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'AI Agent flow execution triggered.',
                'agent' => $agent->only(['id', 'name', 'status']),
                'execution_id' => $execution?->id,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'AI Agent triggered successfully.',
            'agent' => $agent->only(['id', 'name', 'status']),
        ]);
    }
}
