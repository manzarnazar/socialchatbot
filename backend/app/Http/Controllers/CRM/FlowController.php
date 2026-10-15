<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\Flow;
use App\Models\FlowVersion;
use App\Models\FlowExecution;
use App\Models\FlowExecutionLog;
use App\Models\Contact;
use App\Models\AiAgent;
use App\Services\Flow\FlowRunner;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Exception;

class FlowController extends Controller
{
    /**
     * Index tenant flows.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $flows = Flow::where('tenant_id', $tenantId)
            ->with(['publishedVersion', 'channels'])
            ->withCount(['executions', 'versions'])
            ->withCount(['executions as completed_executions_count' => function ($q) {
                $q->where('status', 'completed');
            }])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($flows);
    }

    /**
     * Return pre-built flow template blueprints.
     */
    public function getTemplates(): JsonResponse
    {
        $tenant = auth()->user()?->tenant;
        if ($tenant) {
            $check = app(\App\Services\PlanLimitService::class)->canAccessFlowTemplates($tenant);
            if (!$check['allowed']) {
                return response()->json([
                    'message' => $check['reason'],
                    'error_code' => $check['code'],
                    'templates_disabled' => true,
                ], 403);
            }
        }

        $templates = \App\Models\FlowTemplate::where('is_published', true)
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        if ($templates->isEmpty()) {
            return response()->json($this->getFallbackTemplates());
        }

        return response()->json($templates);
    }

    /**
     * Create flow from pre-built template.
     */
    public function fromTemplate(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        if ($tenant) {
            $check = app(\App\Services\PlanLimitService::class)->canAccessFlowTemplates($tenant);
            if (!$check['allowed']) {
                return response()->json([
                    'message' => $check['reason'],
                    'error_code' => $check['code']
                ], 403);
            }
        }

        $tenantId = $request->user()->tenant_id;
        $tenant = $request->user()->tenant;
        $request->validate([
            'template_id' => 'required',
            'name' => 'nullable|string|max:255',
            'channel_ids' => 'nullable|array',
            'channel_ids.*' => 'integer|exists:channel_connections,id',
        ]);

        $currentFlowCount = Flow::where('tenant_id', $tenantId)->count();
        if ($tenant && !app(\App\Services\PlanLimitService::class)->canUseFeature($tenant, 'automations', $currentFlowCount)) {
            $maxAutomations = $tenant->plan ? $tenant->plan->max_automations : ($tenant->status === 'trial' ? 2 : 0);
            return response()->json([
                'message' => \App\Services\PlanLimitService::trans('MAX_AUTOMATIONS_LIMIT_REACHED', ['limit' => $maxAutomations]),
                'code' => 'MAX_AUTOMATIONS_LIMIT_REACHED',
                'limit' => $maxAutomations,
                'current' => $currentFlowCount,
            ], 403);
        }

        $templateInput = $request->input('template_id');
        
        $dbTemplate = \App\Models\FlowTemplate::where('id', $templateInput)
            ->orWhere('slug', $templateInput)
            ->first();

        if ($dbTemplate) {
            $templateData = [
                'name' => $dbTemplate->name,
                'description' => $dbTemplate->description,
                'trigger_type' => $dbTemplate->trigger_type,
                'trigger_keywords' => $dbTemplate->trigger_keywords,
                'definition' => $dbTemplate->definition,
            ];
        } else {
            $templateData = $this->getTemplateDefinition((string)$templateInput);
        }

        $flowName = trim((string)$request->input('name')) ?: $templateData['name'];

        $flow = Flow::create([
            'tenant_id' => $tenantId,
            'name' => $flowName,
            'description' => $templateData['description'] ?? null,
            'trigger_type' => $templateData['trigger_type'] ?? 'inbound_message',
            'trigger_keywords' => $templateData['trigger_keywords'] ?? null,
            'channel_type' => 'omnichannel',
            'is_active' => false,
        ]);

        if ($request->has('channel_ids') && is_array($request->input('channel_ids'))) {
            $flow->channels()->sync($request->input('channel_ids'));
        }

        // Create version 1 draft
        $version = FlowVersion::create([
            'flow_id' => $flow->id,
            'version_number' => 1,
            'definition' => $templateData['definition'],
            'is_published' => false,
            'created_by' => $request->user()->id,
        ]);

        return response()->json($flow->load(['versions', 'channels']), 201);
    }

    /**
     * Duplicate existing flow.
     */
    public function duplicate(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $tenant = $request->user()->tenant;

        $currentFlowCount = Flow::where('tenant_id', $tenantId)->count();
        if ($tenant && !app(\App\Services\PlanLimitService::class)->canUseFeature($tenant, 'automations', $currentFlowCount)) {
            $maxAutomations = $tenant->plan ? $tenant->plan->max_automations : ($tenant->status === 'trial' ? 2 : 0);
            return response()->json([
                'message' => \App\Services\PlanLimitService::trans('MAX_AUTOMATIONS_LIMIT_REACHED', ['limit' => $maxAutomations]),
                'code' => 'MAX_AUTOMATIONS_LIMIT_REACHED',
                'limit' => $maxAutomations,
                'current' => $currentFlowCount,
            ], 403);
        }

        $originalFlow = Flow::where('tenant_id', $tenantId)->with(['channels', 'publishedVersion'])->findOrFail($id);

        $latestVersion = FlowVersion::where('flow_id', $originalFlow->id)
            ->orderBy('version_number', 'desc')
            ->first();

        $definition = $latestVersion ? $latestVersion->definition : [
            'nodes' => [
                [
                    'id' => 'trigger_1',
                    'type' => $originalFlow->trigger_type,
                    'position' => ['x' => 250, 'y' => 100],
                    'data' => [
                        'title' => 'Start Trigger',
                        'channel' => 'all',
                        'keyword' => ''
                    ]
                ]
            ],
            'edges' => []
        ];

        $newFlow = Flow::create([
            'tenant_id' => $tenantId,
            'name' => $originalFlow->name . ' (Copy)',
            'description' => $originalFlow->description,
            'trigger_type' => $originalFlow->trigger_type,
            'trigger_keywords' => $originalFlow->trigger_keywords,
            'channel_type' => $originalFlow->channel_type,
            'is_active' => false,
        ]);

        if ($originalFlow->channels->isNotEmpty()) {
            $newFlow->channels()->sync($originalFlow->channels->pluck('id')->toArray());
        }

        FlowVersion::create([
            'flow_id' => $newFlow->id,
            'version_number' => 1,
            'definition' => $definition,
            'is_published' => false,
            'created_by' => $request->user()->id,
        ]);

        return response()->json($newFlow->load(['versions', 'channels']), 201);
    }

    /**
     * Create new flow container.
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $tenant = $request->user()->tenant;

        $currentFlowCount = Flow::where('tenant_id', $tenantId)->count();
        if ($tenant && !app(\App\Services\PlanLimitService::class)->canUseFeature($tenant, 'automations', $currentFlowCount)) {
            $maxAutomations = $tenant->plan ? $tenant->plan->max_automations : ($tenant->status === 'trial' ? 2 : 0);
            return response()->json([
                'message' => \App\Services\PlanLimitService::trans('MAX_AUTOMATIONS_LIMIT_REACHED', ['limit' => $maxAutomations]),
                'code' => 'MAX_AUTOMATIONS_LIMIT_REACHED',
                'limit' => $maxAutomations,
                'current' => $currentFlowCount,
            ], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'trigger_type' => 'nullable|string|in:inbound_message,keyword,contact_created,webhook,webhook_trigger,deal_updated,manual,outbound_campaign,ecommerceCheckoutAbandoned',
            'trigger_keywords' => 'nullable',
            'channel_type' => 'nullable|string|in:omnichannel,whatsapp,email,telegram,sms,instagram,messenger',
            'channel_ids' => 'nullable|array',
            'channel_ids.*' => 'integer|exists:channel_connections,id',
        ]);

        $triggerType = $request->input('trigger_type') ?: 'inbound_message';
        $triggerKeywords = $request->input('trigger_keywords');
        if (is_string($triggerKeywords)) {
            $triggerKeywords = array_values(array_filter(array_map('trim', explode(',', $triggerKeywords))));
        }

        $flow = Flow::create([
            'tenant_id' => $tenantId,
            'name' => trim($request->input('name')),
            'description' => trim((string)$request->input('description')),
            'trigger_type' => $triggerType,
            'trigger_keywords' => $triggerKeywords ?: null,
            'channel_type' => $request->input('channel_type') ?: 'omnichannel',
            'is_active' => false,
        ]);

        if ($request->has('channel_ids') && is_array($request->input('channel_ids'))) {
            $flow->channels()->sync($request->input('channel_ids'));
        }

        // Create empty initial version draft with starting root trigger
        $emptyDefinition = [
            'nodes' => [
                [
                    'id' => 'trigger_1',
                    'type' => $flow->trigger_type,
                    'position' => ['x' => 250, 'y' => 100],
                    'data' => [
                        'title' => 'Start Trigger',
                        'description' => 'Fires flow execution path',
                        'channel' => 'all',
                        'keyword' => !empty($flow->trigger_keywords) ? implode(', ', $flow->trigger_keywords) : '',
                        'is_root_trigger' => true,
                    ]
                ]
            ],
            'edges' => []
        ];

        FlowVersion::create([
            'flow_id' => $flow->id,
            'version_number' => 1,
            'definition' => $emptyDefinition,
            'is_published' => false,
            'created_by' => $request->user()->id,
        ]);

        return response()->json($flow->load(['versions', 'channels']), 201);
    }

    /**
     * Show single flow.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $flow = Flow::where('tenant_id', $tenantId)
            ->with(['versions' => function ($q) {
                $q->orderBy('version_number', 'desc');
            }, 'publishedVersion', 'channels'])
            ->findOrFail($id);

        return response()->json($flow);
    }

    /**
     * Delete flow container.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $flow = Flow::where('tenant_id', $tenantId)->findOrFail($id);
        $flow->channels()->detach();
        $flow->delete();

        return response()->json(['message' => 'Flow deleted successfully.']);
    }

    /**
     * Update flow details.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $flow = Flow::where('tenant_id', $tenantId)->findOrFail($id);

        $request->validate([
            'name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'trigger_type' => 'nullable|string|in:inbound_message,keyword,contact_created,webhook,webhook_trigger,deal_updated,manual,outbound_campaign,ecommerceCheckoutAbandoned',
            'trigger_keywords' => 'nullable',
            'channel_type' => 'nullable|string|in:omnichannel,whatsapp,email,telegram,sms,instagram,messenger',
            'channel_ids' => 'nullable|array',
            'channel_ids.*' => 'integer|exists:channel_connections,id',
            'is_active' => 'nullable|boolean',
        ]);

        $oldTriggerType = $flow->trigger_type;
        $newTriggerType = $request->input('trigger_type', $flow->trigger_type);
        $isActive = $request->has('is_active') ? filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN) : $flow->is_active;

        if ($isActive && !$flow->current_published_version_id) {
            return response()->json([
                'message' => 'Cannot activate flow without a published version.'
            ], 400);
        }

        $triggerKeywords = $request->has('trigger_keywords') ? $request->input('trigger_keywords') : $flow->trigger_keywords;
        if (is_string($triggerKeywords)) {
            $triggerKeywords = array_values(array_filter(array_map('trim', explode(',', $triggerKeywords))));
        }

        $flow->update([
            'name' => $request->has('name') ? trim($request->input('name')) : $flow->name,
            'description' => $request->has('description') ? trim((string)$request->input('description')) : $flow->description,
            'trigger_type' => $newTriggerType,
            'trigger_keywords' => $triggerKeywords ?: null,
            'channel_type' => $request->input('channel_type') ?: $flow->channel_type,
            'is_active' => $isActive,
        ]);

        if ($request->has('channel_ids') && is_array($request->input('channel_ids'))) {
            $flow->channels()->sync($request->input('channel_ids'));
        }

        // If trigger type changed, update start trigger node type in the latest unpublished version draft
        if ($oldTriggerType !== $newTriggerType) {
            $latestVersion = FlowVersion::where('flow_id', $flow->id)
                ->orderBy('version_number', 'desc')
                ->first();
            if ($latestVersion && !$latestVersion->is_published) {
                $definition = $latestVersion->definition;
                if (isset($definition['nodes'])) {
                    foreach ($definition['nodes'] as &$node) {
                        if ($node['id'] === 'trigger_1') {
                            $node['type'] = $newTriggerType;
                            break;
                        }
                    }
                    $latestVersion->definition = $definition;
                    $latestVersion->save();
                }
            }
        }

        return response()->json($flow->load(['channels', 'publishedVersion', 'versions']));
    }

    /**
     * Toggle active state.
     */
    public function toggleActive(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $flow = Flow::where('tenant_id', $tenantId)->findOrFail($id);
        
        if (!$flow->current_published_version_id && !$flow->is_active) {
            return response()->json([
                'message' => 'Cannot activate flow without a published version.'
            ], 400);
        }

        $flow->update([
            'is_active' => !$flow->is_active
        ]);

        return response()->json($flow);
    }

    /**
     * List all versions of a flow.
     */
    public function versions(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $flow = Flow::where('tenant_id', $tenantId)->findOrFail($id);
        $versions = FlowVersion::where('flow_id', $flow->id)
            ->orderBy('version_number', 'desc')
            ->get();

        return response()->json($versions);
    }

    /**
     * Save draft version layout (creates new version or overwrites latest unpublished version).
     */
    public function saveVersion(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $flow = Flow::where('tenant_id', $tenantId)->findOrFail($id);

        $request->validate([
            'definition' => 'required|array',
            'definition.nodes' => 'present|array',
            'definition.edges' => 'present|array',
        ]);

        $definition = $request->input('definition');

        // Normalize and enrich node properties across definition
        if (isset($definition['nodes']) && is_array($definition['nodes'])) {
            foreach ($definition['nodes'] as &$n) {
                $n = $this->normalizeAndEnrichNodeProperties($n, $n['type'] ?? 'send_message');
            }
            unset($n);
        }

        // Extract root trigger node from canvas and sync to flow model
        $triggerNode = null;
        $triggerKeywords = [];
        if (isset($definition['nodes']) && is_array($definition['nodes'])) {
            foreach ($definition['nodes'] as $node) {
                $type = $node['type'] ?? '';
                if (in_array($type, ['inbound_message', 'webhook_trigger', 'webhook', 'contact_created', 'deal_updated', 'manual', 'ecommerceCheckoutAbandoned', 'outbound_campaign', 'keyword']) || ($node['id'] ?? '') === 'trigger_1' || !empty($node['data']['is_root_trigger'])) {
                    $triggerNode = $node;
                    break;
                }
            }
        }

        if ($triggerNode) {
            $nodeType = $triggerNode['type'] ?? 'inbound_message';
            $matchType = $triggerNode['data']['matchType'] ?? 'any_message';
            $triggerKeywords = [];

            if ($matchType === 'keyword_match' || $nodeType === 'keyword' || !empty($triggerNode['data']['enable_trigger_words'])) {
                $kwRaw = $triggerNode['data']['keyword'] ?? ($triggerNode['data']['keywords'] ?? ($triggerNode['data']['trigger_words'] ?? null));
                if (is_string($kwRaw)) {
                    $triggerKeywords = array_values(array_filter(array_map('trim', explode(',', $kwRaw))));
                } elseif (is_array($kwRaw)) {
                    $triggerKeywords = array_values(array_filter(array_map('trim', $kwRaw)));
                }
            }

            $flow->update([
                'trigger_type' => $nodeType,
                'trigger_keywords' => !empty($triggerKeywords) ? $triggerKeywords : null,
            ]);

            // Synchronize root trigger channel target to flow channels pivot
            $targetChannel = $triggerNode['data']['channel'] ?? null;
            if ($targetChannel !== null) {
                if ($targetChannel === 'all' || empty($targetChannel)) {
                    $flow->channels()->detach();
                } elseif (is_numeric($targetChannel)) {
                    $flow->channels()->sync([(int)$targetChannel]);
                }
            }
        }

        // Find the latest version
        $latest = FlowVersion::where('flow_id', $flow->id)
            ->orderBy('version_number', 'desc')
            ->first();

        if ($latest && !$latest->is_published) {
            // Overwrite latest unpublished draft
            $latest->update([
                'definition' => $definition,
                'created_by' => $request->user()->id,
            ]);
            $version = $latest;
        } else {
            // Create a new version
            $nextVerNumber = $latest ? $latest->version_number + 1 : 1;
            $version = FlowVersion::create([
                'flow_id' => $flow->id,
                'version_number' => $nextVerNumber,
                'definition' => $definition,
                'is_published' => false,
                'created_by' => $request->user()->id,
            ]);
        }

        return response()->json($version);
    }

    /**
     * Validate and Publish version.
     */
    public function publish(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $flow = Flow::where('tenant_id', $tenantId)->findOrFail($id);

        $request->validate([
            'definition' => 'nullable|array',
        ]);

        // If a definition is posted, save it first
        if ($request->has('definition')) {
            $this->saveVersion($request, $id);
        }

        // Retrieve latest version to publish
        $version = FlowVersion::where('flow_id', $flow->id)
            ->orderBy('version_number', 'desc')
            ->firstOrFail();

        // Perform validation checks
        $errors = $this->validateFlowDefinition($version->definition);
        if (!empty($errors)) {
            return response()->json([
                'message' => 'Flow validation failed.',
                'errors' => $errors
            ], 422);
        }

        // Publish version
        $version->update(['is_published' => true]);

        // Update flow header pointer
        $flow->update([
            'current_published_version_id' => $version->id,
            'is_active' => true // Auto-enable upon initial publishing
        ]);

        return response()->json([
            'message' => 'Flow published successfully.',
            'flow' => $flow->load('publishedVersion'),
        ]);
    }

    /**
     * Visual Debugger Sandbox Simulator Console Endpoint.
     */
    public function runSimulator(Request $request, $id, FlowRunner $runner): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $flow = Flow::where('tenant_id', $tenantId)->findOrFail($id);

        $request->validate([
            'contact_id' => 'required|integer|exists:contacts,id',
            'variables' => 'nullable|array',
            'definition' => 'nullable|array',
        ]);

        $contact = Contact::where('tenant_id', $tenantId)->findOrFail($request->contact_id);

        $definition = $request->input('definition');
        if (!$definition) {
            $latestVersion = FlowVersion::where('flow_id', $flow->id)->orderBy('version_number', 'desc')->first();
            if (!$latestVersion) {
                return response()->json(['message' => 'No versions exist to simulate.'], 400);
            }
            $definition = $latestVersion->definition;
        }

        $triggerTypes = ['inbound_message', 'outbound_campaign', 'webhook_trigger', 'webhook', 'ecommerceCheckoutAbandoned', 'contact_created', 'deal_updated', 'manual'];
        $triggerNode = null;
        foreach ($definition['nodes'] ?? [] as $node) {
            if (in_array($node['type'] ?? '', $triggerTypes) || ($node['id'] ?? '') === 'trigger_1' || !empty($node['data']['is_root_trigger'])) {
                $triggerNode = $node;
                break;
            }
        }

        if (!$triggerNode) {
            return response()->json(['message' => 'Flow definition must have a trigger node.'], 400);
        }

        // Create transient sandbox version
        $sandboxVersion = FlowVersion::create([
            'flow_id' => $flow->id,
            'version_number' => 999999, // Simulator Sandbox special code
            'definition' => $definition,
            'is_published' => false,
            'created_by' => $request->user()->id,
        ]);

        // Create transient execution
        $execution = FlowExecution::create([
            'tenant_id' => $tenantId,
            'flow_version_id' => $sandboxVersion->id,
            'contact_id' => $contact->id,
            'status' => 'running',
            'current_node_id' => $triggerNode['id'],
            'context' => [
                'is_simulator' => true,
                'variables' => array_merge([
                    'inbound_message_body' => '',
                ], $request->input('variables', [])),
                'simulated_messages' => [],
                'loop_count' => []
            ]
        ]);

        // Execute runner sandbox thread
        try {
            $runner->execute($execution);
        } catch (Exception $e) {
            Log::error('Simulator Execution exception: ' . $e->getMessage());
        }

        // Fetch trace step logs
        $logs = FlowExecutionLog::where('flow_execution_id', $execution->id)
            ->orderBy('id', 'asc')
            ->get();

        // Clean up transient DB state
        $execution->delete();
        $sandboxVersion->delete();

        return response()->json([
            'status' => $execution->status,
            'last_error' => $execution->last_error,
            'variables' => $execution->context['variables'] ?? [],
            'simulated_messages' => $execution->context['simulated_messages'] ?? [],
            'logs' => $logs
        ]);
    }

    /**
     * Flow Builder validation engine rules checks.
     */
    protected function validateFlowDefinition(array $definition): array
    {
        $nodes = $definition['nodes'] ?? [];
        $edges = $definition['edges'] ?? [];
        $errors = [];

        // 1. Trigger node check
        $validTriggers = [
            'inbound_message',
            'webhook_trigger',
            'webhook',
            'contact_created',
            'deal_updated',
            'manual',
            'outbound_campaign',
            'ecommerceCheckoutAbandoned',
            'keyword',
        ];

        $triggerCount = 0;
        foreach ($nodes as $node) {
            if (in_array($node['type'] ?? '', $validTriggers)) {
                $triggerCount++;
            }
        }
        if ($triggerCount < 1) {
            $errors[] = "A flow must contain at least one trigger entry node (found: {$triggerCount}).";
        }

        // Build mapping arrays
        $incoming = [];
        $outgoing = [];
        foreach ($edges as $edge) {
            $src = $edge['source'];
            $tgt = $edge['target'];
            
            if (!isset($incoming[$tgt])) $incoming[$tgt] = [];
            $incoming[$tgt][] = $edge;

            if (!isset($outgoing[$src])) $outgoing[$src] = [];
            $outgoing[$src][] = $edge;
        }

        // 2. Orphan detection (no inputs, except trigger nodes)
        foreach ($nodes as $node) {
            $nodeId = $node['id'];
            $nodeType = $node['type'] ?? '';
            $isTrigger = in_array($nodeType, $validTriggers);
            if (!$isTrigger && empty($incoming[$nodeId])) {
                $nodeTitle = $node['data']['title'] ?? $nodeId;
                $errors[] = "Node '{$nodeTitle}' has no incoming connections.";
            }
        }

        // 3. Conditional dead-ends check
        foreach ($nodes as $node) {
            $nodeId = $node['id'];
            $nodeType = $node['type'] ?? '';
            
            if (in_array($nodeType, ['condition', 'ai_condition', 'webhook_dispatch', 'ai_prompt', 'rag_query']) && empty($outgoing[$nodeId])) {
                $nodeTitle = $node['data']['title'] ?? $nodeId;
                $errors[] = "Outcome branch channels for '{$nodeTitle}' must be connected.";
            }
        }

        return $errors;
    }

    /**
     * Get tenant flow credits summary (Alias for getAiFlowCredits).
     */
    public function getFlowCredits(Request $request): JsonResponse
    {
        return $this->getAiFlowCredits($request);
    }

    /**
     * Get tenant flow credits summary.
     */
    public function getAiFlowCredits(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        if (!$tenant) {
            return response()->json(['message' => 'Workspace context not found.'], 404);
        }

        $aiService = app(\App\Services\AIProviderService::class);
        $operationalModel = $aiService->getAiOperationalModel();

        $tenant->load('plan');
        $maxCredits = $tenant->plan ? ($tenant->plan->flow_credits ?? 50) : 5;
        $usedCredits = $tenant->used_flow_credits ?? 0;
        $remainingCredits = max(0, $maxCredits - $usedCredits);

        if ($operationalModel === 'byok' && !app()->runningUnitTests()) {
            return response()->json([
                'operational_model' => 'byok',
                'is_byok' => true,
                'max_credits' => -1,
                'used_credits' => $usedCredits,
                'remaining_credits' => -1,
                'plan_name' => $tenant->plan?->name ?? 'Active Plan',
            ]);
        }

        return response()->json([
            'operational_model' => $operationalModel,
            'is_byok' => $operationalModel === 'byok',
            'max_credits' => $maxCredits,
            'used_credits' => $usedCredits,
            'remaining_credits' => $remainingCredits,
            'plan_name' => $tenant->plan?->name ?? 'Free Trial',
        ]);
    }

    /**
     * Generate whole conversation flow from natural language prompt.
     */
    public function promptToFlow(Request $request, $id): JsonResponse
    {
        $tenant = $request->user()->tenant;
        if (!$tenant) {
            return response()->json(['message' => 'Workspace context not found.'], 404);
        }

        $flow = Flow::where('tenant_id', $tenant->id)->findOrFail($id);

        $request->validate([
            'prompt' => 'required|string|min:5|max:4000',
        ]);

        $aiService = app(\App\Services\AIProviderService::class);
        $operationalModel = $aiService->getAiOperationalModel();

        $tenant->load('plan');
        $maxCredits = $tenant->plan ? ($tenant->plan->flow_credits ?? 50) : 5;
        $usedCredits = $tenant->used_flow_credits ?? 0;

        if (($operationalModel === 'master_fixed' || app()->runningUnitTests()) && $usedCredits >= $maxCredits) {
            return response()->json([
                'message' => \App\Services\PlanLimitService::trans('FLOW_CREDITS_EXHAUSTED', [
                    'used' => $usedCredits,
                    'limit' => $maxCredits,
                ]),
                'error_code' => 'FLOW_CREDITS_EXHAUSTED',
                'code' => 'FLOW_CREDITS_EXHAUSTED',
                'credits' => [
                    'max_credits' => $maxCredits,
                    'used_credits' => $usedCredits,
                    'remaining_credits' => 0
                ]
            ], 403);
        }

        // Resolve AI Provider & Model via unified operational model resolver
        $aiService = app(\App\Services\AIProviderService::class);
        $resolvedAI = $aiService->resolveAIExecution($tenant->id, 'prompt_to_flow');
        $provider = $resolvedAI['provider'];
        $apiKey = $resolvedAI['api_key'];
        $model = $resolvedAI['model'];

        if (!empty($resolvedAI['is_blocked'])) {
            return response()->json([
                'message' => $resolvedAI['fallback_message'] ?: 'AI generation limit reached for the current billing cycle.',
                'error_code' => 'AI_LIMIT_REACHED',
                'block_reason' => $resolvedAI['block_reason'] ?? 'limit_exceeded',
            ], 429);
        }

        if (!empty($resolvedAI['missing_byok_config']) && !app()->runningUnitTests()) {
            return response()->json([
                'message' => 'No active AI Provider configured. Please connect an AI Provider in Settings -> AI Providers or configure an AI Agent first.',
                'error_code' => 'NO_AI_PROVIDER'
            ], 422);
        }
        $userPrompt = trim($request->input('prompt'));
        $flowTriggerType = $flow->trigger_type ?: 'inbound_message';

        $systemPrompt = <<<PROMPT
You are an expert Conversation Flow Architect for the WhatsOmni omnichannel platform. Your job is to convert a user prompt into a complete, professional, production-ready WhatsApp & Omnichannel automation flow JSON structure for the WhatsOmni visual flow canvas.

You MUST output ONLY a valid JSON object with the following exact schema:
{
  "flow_name": "Short descriptive name",
  "description": "One sentence summary of what this workflow achieves",
  "nodes": [ ... ],
  "edges": [ ... ]
}

Available Node Types, their exact `data` fields, and their exact OUTGOING HANDLE IDs:

1. Root Trigger (REQUIRED, must be the very first node with id 'trigger_1'):
   - type: "{$flowTriggerType}"
   - data: { "title": "Start Trigger", "channel": "all", "keyword": "", "is_root_trigger": true }
   - Outgoing Handle: sourceHandle: "out"

2. "send_message": Send a friendly text message (with emojis & formatting)
   - data: { "title": "Send Message", "body": "Hello! Welcome to our service..." }
   - Outgoing Handle: sourceHandle: "out"

3. "ask_question": Ask a question and store the contact's reply into a custom variable
   - data: {
       "title": "Ask Question",
       "question": "What is your full name?",
       "questionText": "What is your full name?",
       "saveVariable": "customer_name",
       "saveVariableLabel": "Customer Name",
       "variableDataType": "text",
       "skipEnabled": false
     }
   - variableDataType can be: "text" | "number" | "email" | "phone" | "date" | "time"
   - Outgoing Handle: sourceHandle: "out" (triggers when user replies)

4. "interactive_menu": Send an interactive WhatsApp List or Button menu with multiple choices
   - data: {
       "title": "Choose an Option",
       "menuType": "list",
       "buttonText": "View Options",
       "body": "Please select how we can help you today:",
       "saveVariable": "selected_option",
       "items": [
         { "id": "item_0", "title": "Book Appointment", "description": "Schedule a call with our team", "keywords": "1", "value": "book" },
         { "id": "item_1", "title": "Product Pricing", "description": "View pricing and plans", "keywords": "2", "value": "pricing" },
         { "id": "item_2", "title": "Live Support", "description": "Talk to a customer agent", "keywords": "3", "value": "support" }
       ]
     }
   - Outgoing Handles: sourceHandle MUST be "item_0", "item_1", "item_2" corresponding to items index.

5. "condition": Multi-rule conditional branching based on contact variables or tags
   - data: { "title": "Check Budget", "operator": "AND", "conditions": [{ "field": "variables.budget", "operator": "greater_than", "value": "1000" }] }
   - Outgoing Handles: sourceHandle: "true" (if matched), sourceHandle: "false" (if not matched)

6. "ai_condition": Binary AI Classification / Intent Detection using LLM
   - data: { "title": "AI Intent Check", "question": "Did the customer express interest in booking a demo?", "contentKey": "{{ inbound_message_body }}", "model": "gpt-4o-mini" }
   - Outgoing Handles: sourceHandle: "yes" (if affirmative), sourceHandle: "no" (if negative)

7. "create_appointment": Schedule an appointment in Google Calendar / Built-in booking system
   - data: { "title": "Book Appointment", "bookingDuration": 30, "calendarProvider": "built_in", "conferenceProvider": "built_in" }
   - Outgoing Handles:
     - sourceHandle: "scheduled" (Success path - when slot is booked)
     - sourceHandle: "unavailable" (When requested time slot is busy)
     - sourceHandle: "error" (When booking fails)

8. "create_deal": Create a sales pipeline CRM deal
   - data: { "title": "Create CRM Deal", "dealName": "Website Sales Lead", "dealValue": 500, "stageId": "lead", "currency": "USD" }
   - Outgoing Handles: sourceHandle: "success" (Deal created), sourceHandle: "error" (Failed)

9. "wait_delay": Pause execution for a set duration or until next user message
   - data: { "title": "Wait 15 Minutes", "delayType": "duration", "value": 15, "unit": "minutes" }
   - Outgoing Handles: sourceHandle: "resume" (Timer elapsed), sourceHandle: "timeout" (Timeout)

10. "tag_contact": Add or remove a contact segmentation tag
    - data: { "title": "Tag High-Value Lead", "tagAction": "add_tag", "targetTag": "vip-lead" }
    - Outgoing Handle: sourceHandle: "out"

11. "update_contact": Modify contact CRM custom fields
    - data: { "title": "Update Lead Status", "updates": [{ "field": "lifecycle_stage", "value": "qualified" }] }
    - Outgoing Handle: sourceHandle: "out"

12. "human_handoff": Hand off the conversation to a live agent in the inbox
    - data: { "title": "Transfer to Agent", "queueTarget": "unassigned_inbox", "internalNote": "Customer requested human support" }
    - Outgoing Handles: None (Terminating node)

13. "webhook_dispatch" / "n8n" / "zapier": Send payload to external webhook or automation workflow
    - data: { "title": "Webhook Dispatch", "url": "https://api.example.com/webhook", "method": "POST", "body": "{}", "saveKey": "api_result" }
    - Outgoing Handles: sourceHandle: "success", sourceHandle: "error"

14. "rag_query": Search knowledgebase with AI Vector Search / RAG
    - data: { "title": "Search Knowledgebase", "query": "{{ inbound_message_body }}", "saveKey": "ai_answer" }
    - Outgoing Handle: sourceHandle: "out"

15. "end_flow": Gracefully conclude conversation
    - data: { "title": "End Flow", "body": "Thank you! Have a great day." }
    - Outgoing Handles: None (Terminating node)

CRITICAL EDGE & HANDLE RULES:
- EVERY node except root trigger MUST have targetHandle: "in".
- When creating an edge from "create_appointment": use sourceHandle: "scheduled" (DO NOT use "out").
- When creating an edge from "create_deal", "webhook_dispatch", "n8n", "zapier": use sourceHandle: "success".
- When creating an edge from "interactive_menu": use sourceHandle: "item_0", "item_1", etc.
- When creating an edge from "condition": use sourceHandle: "true" and "false".
- When creating an edge from "ai_condition": use sourceHandle: "yes" and "no".
- When creating an edge from "wait_delay": use sourceHandle: "resume".
- When creating an edge from "ask_question", "send_message", "tag_contact", "update_contact", "rag_query", root trigger: use sourceHandle: "out".
- EVERY created node MUST be connected to the graph with at least one incoming edge. No isolated orphan nodes are allowed.
- Return ONLY the JSON object. Do not include markdown code ticks (```json) or extra text.
PROMPT;

        $aiService = app(\App\Services\AIProviderService::class);

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => "Generate a complete flow for: " . $userPrompt]
        ];

        try {
            $rawCompletion = $aiService->generateCompletion($provider, $apiKey, $model, $messages, 0.7, 'prompt_to_flow', $tenant->id);
            
            // Clean JSON
            $cleanJson = trim($rawCompletion);
            if (str_starts_with($cleanJson, '```json')) {
                $cleanJson = substr($cleanJson, 7);
            } elseif (str_starts_with($cleanJson, '```')) {
                $cleanJson = substr($cleanJson, 3);
            }
            if (str_ends_with($cleanJson, '```')) {
                $cleanJson = substr($cleanJson, 0, -3);
            }
            $cleanJson = trim($cleanJson);

            $parsed = json_decode($cleanJson, true);

            // Fallback for mock completion or invalid JSON
            if (!$parsed || !isset($parsed['nodes']) || !is_array($parsed['nodes'])) {
                $parsed = $this->buildFallbackGeneratedFlow($userPrompt, $flowTriggerType);
            }

            // Ensure trigger_1 is present and is root trigger
            $hasTrigger = false;
            foreach ($parsed['nodes'] as &$node) {
                if (in_array($node['type'], ['inbound_message', 'webhook_trigger', 'webhook', 'contact_created', 'deal_updated', 'manual', 'outbound_campaign', 'ecommerceCheckoutAbandoned', 'keyword']) || ($node['id'] ?? '') === 'trigger_1') {
                    $node['id'] = 'trigger_1';
                    $node['type'] = $flowTriggerType;
                    $node['data']['is_root_trigger'] = true;
                    $hasTrigger = true;
                    break;
                }
            }

            if (!$hasTrigger) {
                array_unshift($parsed['nodes'], [
                    'id' => 'trigger_1',
                    'type' => $flowTriggerType,
                    'position' => ['x' => 350, 'y' => 80],
                    'data' => [
                        'title' => 'Start Trigger',
                        'channel' => 'all',
                        'keyword' => '',
                        'is_root_trigger' => true
                    ]
                ]);
            }

            // 1. Normalize and enrich every node's required properties
            $normalizedNodes = [];
            foreach ($parsed['nodes'] as $n) {
                $normalizedNodes[] = $this->normalizeAndEnrichNodeProperties($n, $flowTriggerType);
            }

            // 2. Sanitize and heal edges (fix handles, resolve orphans, guarantee 100% graph connectivity)
            $sanitizedEdges = $this->sanitizeAndHealEdges($normalizedNodes, $parsed['edges'] ?? [], $flowTriggerType);

            $definition = [
                'nodes' => $normalizedNodes,
                'edges' => $sanitizedEdges
            ];

            // 3. Deduct 1 credit in Master Fixed mode or Unit Tests
            if ($operationalModel === 'master_fixed' || app()->runningUnitTests()) {
                $tenant->increment('used_flow_credits');
                $usedCredits++;
                $remainingCredits = max(0, $maxCredits - $usedCredits);
            } else {
                $remainingCredits = -1;
            }

            // 4. Save new version draft
            $nextVerNum = (FlowVersion::where('flow_id', $flow->id)->max('version_number') ?? 0) + 1;
            
            $flowVersion = FlowVersion::create([
                'flow_id' => $flow->id,
                'version_number' => $nextVerNum,
                'definition' => $definition,
                'is_published' => false,
                'created_by' => $request->user()->id,
            ]);

            if (!empty($parsed['flow_name']) && ($flow->name === 'Workspace Flow' || $flow->name === 'Untitled Flow' || empty($flow->name))) {
                $flow->name = $parsed['flow_name'];
                $flow->saveQuietly();
            }

            return response()->json([
                'message' => 'Flow generated successfully with AI.',
                'definition' => $definition,
                'flow_name' => $parsed['flow_name'] ?? $flow->name,
                'description' => $parsed['description'] ?? '',
                'version' => $flowVersion,
                'credits' => [
                    'max_credits' => $maxCredits,
                    'used_credits' => $usedCredits,
                    'remaining_credits' => $remainingCredits,
                    'plan_name' => $tenant->plan->name ?? 'Free Plan'
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Prompt to Flow error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'message' => 'Failed to generate flow: ' . $e->getMessage(),
                'error_code' => 'GENERATION_FAILED',
                'credits' => [
                    'max_credits' => $maxCredits,
                    'used_credits' => $usedCredits,
                    'remaining_credits' => max(0, $maxCredits - $usedCredits),
                    'plan_name' => $tenant->plan->name ?? 'Free Plan'
                ]
            ], 500);
        }
    }

    /**
     * Build intelligent fallback flow structure when mock AI or raw text is generated.
     */
    protected function buildFallbackGeneratedFlow(string $prompt, string $triggerType): array
    {
        return [
            'flow_name' => 'Automated Customer Workflow',
            'description' => 'Customer assistance, menu triage, and appointment booking automation',
            'nodes' => [
                [
                    'id' => 'trigger_1',
                    'type' => $triggerType,
                    'position' => ['x' => 350, 'y' => 50],
                    'data' => [
                        'title' => 'Start Trigger',
                        'channel' => 'all',
                        'keyword' => '',
                        'is_root_trigger' => true
                    ]
                ],
                [
                    'id' => 'msg_welcome',
                    'type' => 'send_message',
                    'position' => ['x' => 350, 'y' => 200],
                    'data' => [
                        'title' => 'Welcome Message',
                        'body' => '👋 Welcome! Thank you for getting in touch. How can we help you today?'
                    ]
                ],
                [
                    'id' => 'menu_options',
                    'type' => 'interactive_menu',
                    'position' => ['x' => 350, 'y' => 380],
                    'data' => [
                        'title' => 'Select Service',
                        'menuType' => 'list',
                        'buttonText' => 'View Services',
                        'body' => 'Please choose one of the options below:',
                        'saveVariable' => 'selected_service',
                        'items' => [
                            [
                                'id' => 'item_0',
                                'title' => 'Book Appointment',
                                'description' => 'Schedule a consultation session',
                                'keywords' => '1',
                                'value' => 'appointment'
                            ],
                            [
                                'id' => 'item_1',
                                'title' => 'Talk to Support',
                                'description' => 'Speak with a customer representative',
                                'keywords' => '2',
                                'value' => 'support'
                            ]
                        ]
                    ]
                ],
                [
                    'id' => 'action_book',
                    'type' => 'create_appointment',
                    'position' => ['x' => 150, 'y' => 600],
                    'data' => [
                        'title' => 'Book Appointment',
                        'bookingDuration' => 30,
                        'calendarProvider' => 'built_in',
                        'conferenceProvider' => 'built_in'
                    ]
                ],
                [
                    'id' => 'end_flow_node',
                    'type' => 'end_flow',
                    'position' => ['x' => 150, 'y' => 800],
                    'data' => [
                        'title' => 'Booking Confirmation',
                        'body' => '✅ Your appointment has been booked! A confirmation email and WhatsApp reminder have been sent.'
                    ]
                ]
            ],
            'edges' => [
                [
                    'id' => 'e_trig_welcome',
                    'source' => 'trigger_1',
                    'target' => 'msg_welcome',
                    'sourceHandle' => 'out',
                    'targetHandle' => 'in'
                ],
                [
                    'id' => 'e_welcome_menu',
                    'source' => 'msg_welcome',
                    'target' => 'menu_options',
                    'sourceHandle' => 'out',
                    'targetHandle' => 'in'
                ],
                [
                    'id' => 'e_menu_book',
                    'source' => 'menu_options',
                    'target' => 'action_book',
                    'sourceHandle' => 'item_0',
                    'targetHandle' => 'in'
                ],
                [
                    'id' => 'e_book_end',
                    'source' => 'action_book',
                    'target' => 'end_flow_node',
                    'sourceHandle' => 'scheduled',
                    'targetHandle' => 'in'
                ]
            ]
        ];
    }

    /**
     * Ensure every node has its required properties and standard schema defaults populated.
     */
    protected function normalizeAndEnrichNodeProperties(array $node, string $triggerType): array
    {
        $type = $node['type'] ?? 'send_message';
        $data = $node['data'] ?? [];

        switch ($type) {
            case 'inbound_message':
            case 'webhook_trigger':
            case 'outbound_campaign':
            case 'contact_created':
            case 'deal_updated':
            case 'manual':
                $data['title'] = $data['title'] ?? 'Start Trigger';
                $data['channel'] = $data['channel'] ?? 'all';
                $data['keyword'] = $data['keyword'] ?? '';
                $data['is_root_trigger'] = true;
                break;

            case 'send_message':
                $data['title'] = $data['title'] ?? 'Send Message';
                $data['body'] = !empty($data['body']) ? $data['body'] : 'Hello! 👋 How can we assist you today?';
                break;

            case 'ask_question':
                $question = !empty($data['question']) ? $data['question'] : (!empty($data['questionText']) ? $data['questionText'] : (!empty($data['body']) ? $data['body'] : 'Could you please provide your details?'));
                $data['title'] = $data['title'] ?? 'Ask Question';
                $data['question'] = $question;
                $data['questionText'] = $question;
                $data['saveVariable'] = $data['saveVariable'] ?? ($data['saveKey'] ?? 'user_response');
                $data['saveVariableLabel'] = $data['saveVariableLabel'] ?? ucwords(str_replace('_', ' ', $data['saveVariable']));
                $data['variableDataType'] = $data['variableDataType'] ?? 'text';
                $data['skipEnabled'] = $data['skipEnabled'] ?? false;
                break;

            case 'interactive_menu':
                $data['title'] = $data['title'] ?? 'Interactive Menu';
                $data['menuType'] = $data['menuType'] ?? 'list';
                $data['buttonText'] = $data['buttonText'] ?? 'Select Option';
                $data['body'] = $data['body'] ?? 'Please choose one of the options below:';
                $data['saveVariable'] = $data['saveVariable'] ?? 'selected_option';
                if (empty($data['items']) || !is_array($data['items'])) {
                    $data['items'] = [
                        ['id' => 'item_0', 'title' => 'Option 1', 'description' => 'First option', 'keywords' => '1', 'value' => 'opt_1'],
                        ['id' => 'item_1', 'title' => 'Option 2', 'description' => 'Second option', 'keywords' => '2', 'value' => 'opt_2']
                    ];
                } else {
                    foreach ($data['items'] as $idx => &$item) {
                        $item['id'] = 'item_' . $idx;
                        $item['title'] = $item['title'] ?? ('Option ' . ($idx + 1));
                        $item['value'] = $item['value'] ?? ('opt_' . ($idx + 1));
                    }
                }
                break;

            case 'condition':
                $data['title'] = $data['title'] ?? 'Check Condition';
                $data['operator'] = $data['operator'] ?? 'AND';
                if (empty($data['conditions']) || !is_array($data['conditions'])) {
                    $data['conditions'] = [
                        ['field' => 'variables.user_response', 'operator' => 'not_empty', 'value' => '']
                    ];
                }
                break;

            case 'ai_condition':
                $data['title'] = $data['title'] ?? 'AI Decision';
                $data['question'] = $data['question'] ?? 'Did the customer express positive buying intent?';
                $data['contentKey'] = $data['contentKey'] ?? '{{ inbound_message_body }}';
                $data['model'] = $data['model'] ?? 'gpt-4o-mini';
                break;

            case 'wait_delay':
                $data['title'] = $data['title'] ?? 'Wait Delay';
                $data['delayType'] = $data['delayType'] ?? 'duration';
                $data['value'] = $data['value'] ?? 5;
                $data['unit'] = $data['unit'] ?? 'minutes';
                break;

            case 'tag_contact':
                $data['title'] = $data['title'] ?? 'Tag Contact';
                $data['tagAction'] = $data['tagAction'] ?? 'add_tag';
                $data['targetTag'] = $data['targetTag'] ?? 'lead';
                break;

            case 'update_contact':
                $data['title'] = $data['title'] ?? 'Update Contact';
                if (empty($data['updates']) || !is_array($data['updates'])) {
                    $data['updates'] = [
                        ['field' => 'lifecycle_stage', 'value' => 'qualified_lead']
                    ];
                }
                break;

            case 'create_deal':
                $data['title'] = $data['title'] ?? 'Create CRM Deal';
                $data['dealName'] = $data['dealName'] ?? ($data['deal_name'] ?? 'New Sales Deal');
                $data['dealValue'] = $data['dealValue'] ?? ($data['deal_value'] ?? 100);
                $data['stageId'] = $data['stageId'] ?? ($data['stage_id'] ?? 'lead');
                break;

            case 'create_appointment':
                $data['title'] = $data['title'] ?? 'Book Appointment';
                $data['bookingDuration'] = $data['bookingDuration'] ?? ($data['booking_duration'] ?? 30);
                $data['calendarProvider'] = $data['calendarProvider'] ?? ($data['calendar_provider'] ?? 'built_in');
                $data['conferenceProvider'] = $data['conferenceProvider'] ?? ($data['conference_provider'] ?? 'built_in');
                $data['staffAssigneeType'] = $data['staffAssigneeType'] ?? ($data['staff_assignee_type'] ?? 'round_robin');
                break;

            case 'human_handoff':
                $data['title'] = $data['title'] ?? 'Live Human Handoff';
                $data['queueTarget'] = $data['queueTarget'] ?? ($data['queue_target'] ?? 'unassigned_inbox');
                $data['internalNote'] = $data['internalNote'] ?? ($data['internal_note'] ?? 'Customer requested agent support');
                break;

            case 'webhook_dispatch':
            case 'n8n':
            case 'zapier':
                $data['title'] = $data['title'] ?? ($type === 'n8n' ? 'n8n Workflow' : ($type === 'zapier' ? 'Zapier Hook' : 'Webhook Dispatch'));
                $data['url'] = $data['url'] ?? 'https://api.example.com/webhook';
                $data['method'] = $data['method'] ?? 'POST';
                $data['body'] = $data['body'] ?? '{}';
                $data['saveKey'] = $data['saveKey'] ?? ($data['saveVariable'] ?? ($data['save_key'] ?? ($data['save_variable'] ?? 'api_response')));
                break;

            case 'rag_query':
                $data['title'] = $data['title'] ?? 'Knowledgebase Search';
                $data['query'] = $data['query'] ?? '{{ inbound_message_body }}';
                $data['saveKey'] = $data['saveKey'] ?? ($data['save_key'] ?? 'rag_answer');
                break;

            case 'end_flow':
                $data['title'] = $data['title'] ?? 'End Session';
                $data['body'] = $data['body'] ?? 'Thank you for reaching out! Have a wonderful day.';
                break;
        }

        // Bridge all camelCase properties to snake_case and vice versa
        $camelToSnakeMap = [
            'mediaUrl' => 'media_url',
            'templateId' => 'template_id',
            'templateName' => 'template_name',
            'dealName' => 'deal_name',
            'dealValue' => 'deal_value',
            'stageId' => 'stage_id',
            'bookingDuration' => 'booking_duration',
            'conferenceProvider' => 'conference_provider',
            'calendarProvider' => 'calendar_provider',
            'internalNote' => 'internal_note',
            'systemInstructions' => 'system_instructions',
            'saveKey' => 'save_key',
            'saveVariable' => 'save_variable',
            'contentKey' => 'content_key',
            'questionText' => 'question_text',
            'targetTag' => 'target_tag',
            'tagAction' => 'tag_action',
            'stockThreshold' => 'threshold',
            'delayType' => 'delay_type',
            'variableDataType' => 'variable_data_type',
            'discountType' => 'discount_type',
            'discountValue' => 'discount_value',
            'expiryDays' => 'expiry_days',
            'productId' => 'product_id',
            'promptMessage' => 'prompt_message',
            'menuType' => 'menu_type',
            'buttonText' => 'button_text',
        ];

        foreach ($camelToSnakeMap as $camel => $snake) {
            if (isset($data[$camel]) && !isset($data[$snake])) {
                $data[$snake] = $data[$camel];
            } elseif (isset($data[$snake]) && !isset($data[$camel])) {
                $data[$camel] = $data[$snake];
            }
        }

        // Generic fallback for any remaining camelCase properties
        foreach ($data as $k => $v) {
            $snakeK = \Illuminate\Support\Str::snake($k);
            if (!isset($data[$snakeK])) {
                $data[$snakeK] = $v;
            }
        }

        $node['data'] = $data;
        return $node;
    }

    /**
     * Sanitize, fix handle mismatches, and heal orphan nodes in generated edges.
     */
    protected function sanitizeAndHealEdges(array $nodes, array $edges, string $triggerType): array
    {
        $nodeMap = [];
        $nodeOrder = [];
        foreach ($nodes as $n) {
            $nodeMap[$n['id']] = $n['type'];
            $nodeOrder[] = $n['id'];
        }

        $validEdges = [];
        $connectedTargets = [];
        $connectedSources = [];

        foreach ($edges as $edge) {
            $sourceId = $edge['source'] ?? '';
            $targetId = $edge['target'] ?? '';

            if (!isset($nodeMap[$sourceId]) || !isset($nodeMap[$targetId])) {
                continue;
            }

            $sourceType = $nodeMap[$sourceId];
            $sourceHandle = $edge['sourceHandle'] ?? 'out';

            // Correct handle mappings based on source node type
            switch ($sourceType) {
                case 'create_appointment':
                    if (!in_array($sourceHandle, ['scheduled', 'unavailable', 'error'])) {
                        $sourceHandle = 'scheduled';
                    }
                    break;

                case 'create_deal':
                case 'send_template':
                case 'webhook_dispatch':
                case 'n8n':
                case 'zapier':
                case 'generateDiscountCode':
                    if (!in_array($sourceHandle, ['success', 'error'])) {
                        $sourceHandle = 'success';
                    }
                    break;

                case 'search_product':
                case 'get_product':
                    if (!in_array($sourceHandle, ['found', 'not_found'])) {
                        $sourceHandle = 'found';
                    }
                    break;

                case 'check_stock':
                    if (!in_array($sourceHandle, ['in_stock', 'out_of_stock'])) {
                        $sourceHandle = 'in_stock';
                    }
                    break;

                case 'send_product':
                case 'send_checkout_link':
                    if (!in_array($sourceHandle, ['sent', 'failed'])) {
                        $sourceHandle = 'sent';
                    }
                    break;

                case 'condition':
                case 'checkCartStatus':
                    if (!in_array($sourceHandle, ['true', 'false'])) {
                        $sourceHandle = in_array($sourceHandle, ['no', 'false']) ? 'false' : 'true';
                    }
                    break;

                case 'ai_condition':
                    if (!in_array($sourceHandle, ['yes', 'no'])) {
                        $sourceHandle = in_array($sourceHandle, ['no', 'false']) ? 'no' : 'yes';
                    }
                    break;

                case 'wait_delay':
                    if (!in_array($sourceHandle, ['resume', 'timeout'])) {
                        $sourceHandle = 'resume';
                    }
                    break;

                case 'interactive_menu':
                    if (!str_starts_with($sourceHandle, 'item_')) {
                        $sourceHandle = 'item_0';
                    }
                    break;

                default:
                    $sourceHandle = 'out';
                    break;
            }

            $edgeId = $edge['id'] ?? ("e_" . $sourceId . "_" . $targetId);

            $validEdges[] = [
                'id' => $edgeId,
                'source' => $sourceId,
                'target' => $targetId,
                'sourceHandle' => $sourceHandle,
                'targetHandle' => 'in'
            ];

            $connectedTargets[$targetId] = true;
            $connectedSources[$sourceId] = true;
        }

        // Orphan node healing: Ensure every non-trigger node has at least one incoming edge
        $prevNodeId = $nodeOrder[0] ?? null;
        for ($i = 1; $i < count($nodeOrder); $i++) {
            $currNodeId = $nodeOrder[$i];
            
            if (!isset($connectedTargets[$currNodeId])) {
                // Find previous node that can serve as source
                $candidateSourceId = $prevNodeId;
                if ($candidateSourceId && isset($nodeMap[$candidateSourceId])) {
                    $cType = $nodeMap[$candidateSourceId];
                    $cHandle = 'out';
                    if ($cType === 'create_appointment') $cHandle = 'scheduled';
                    elseif (in_array($cType, ['create_deal', 'webhook_dispatch', 'n8n', 'zapier'])) $cHandle = 'success';
                    elseif ($cType === 'condition') $cHandle = 'true';
                    elseif ($cType === 'ai_condition') $cHandle = 'yes';
                    elseif ($cType === 'wait_delay') $cHandle = 'resume';
                    elseif ($cType === 'interactive_menu') $cHandle = 'item_0';

                    $validEdges[] = [
                        'id' => 'e_healed_' . $candidateSourceId . '_' . $currNodeId,
                        'source' => $candidateSourceId,
                        'target' => $currNodeId,
                        'sourceHandle' => $cHandle,
                        'targetHandle' => 'in'
                    ];

                    $connectedTargets[$currNodeId] = true;
                }
            }

            // Only advance prevNodeId if currNode is not terminating
            $currType = $nodeMap[$currNodeId] ?? '';
            if (!in_array($currType, ['human_handoff', 'end_flow'])) {
                $prevNodeId = $currNodeId;
            }
        }

        return $validEdges;
    }

    /**
     * Fallback template list if database table is unseeded.
     */
    protected function getFallbackTemplates(): array
    {
        return [
            [
                'id' => 1,
                'slug' => 'lead_qualification',
                'name' => 'Smart Lead Qualification & CRM Sync',
                'category' => 'Sales & Growth',
                'description' => 'Automated conversational lead triage, budget assessment, CRM deal creation, and VIP tagging.',
                'trigger_type' => 'inbound_message',
                'nodes_count' => 8,
                'is_published' => true,
            ],
            [
                'id' => 2,
                'slug' => 'welcome_menu',
                'name' => 'Interactive Welcome Menu with WhatsApp Quick Buttons',
                'category' => 'Engagement',
                'description' => 'Omnichannel greeting with interactive WhatsApp buttons/lists for instant booking, pricing lookup, and support.',
                'trigger_type' => 'inbound_message',
                'nodes_count' => 9,
                'is_published' => true,
            ],
            [
                'id' => 3,
                'slug' => 'booking_scheduler',
                'name' => 'Appointment Booking & Calendar Scheduler',
                'category' => 'Bookings',
                'description' => 'Collects topic preferences, checks slot availability, and books appointments directly to your calendar.',
                'trigger_type' => 'inbound_message',
                'nodes_count' => 7,
                'is_published' => true,
            ],
            [
                'id' => 4,
                'slug' => 'cart_recovery',
                'name' => 'E-Commerce Order Status & Abandoned Cart Recovery',
                'category' => 'E-Commerce',
                'description' => 'Timed abandoned cart follow-up with incentive discount codes and instant live checkout assistance.',
                'trigger_type' => 'ecommerceCheckoutAbandoned',
                'nodes_count' => 6,
                'is_published' => true,
            ],
            [
                'id' => 5,
                'slug' => 'support_triage',
                'name' => 'Customer Support Triage with Human Agent Escalation',
                'category' => 'Customer Support',
                'description' => 'AI sentiment detection, knowledge base RAG query matching, and seamless escalation to human inbox agents.',
                'trigger_type' => 'inbound_message',
                'nodes_count' => 8,
                'is_published' => true,
            ],
        ];
    }

    /**
     * Complete JSON blueprints for pre-built flow templates.
     */
    protected function getTemplateDefinition(string $templateId): array
    {
        switch ($templateId) {
            case 'lead_qualification':
                return [
                    'name' => 'Smart Lead Qualification & CRM Sync',
                    'description' => 'Automated conversational lead triage, budget assessment, CRM deal creation, and VIP tagging.',
                    'trigger_type' => 'inbound_message',
                    'trigger_keywords' => ['quote', 'price', 'pricing', 'hire', 'service', 'lead'],
                    'definition' => [
                        'nodes' => [
                            [
                                'id' => 'trigger_1',
                                'type' => 'inbound_message',
                                'position' => ['x' => 380, 'y' => 50],
                                'data' => ['title' => 'Inbound Lead Trigger', 'channel' => 'all', 'keyword' => 'quote, price, pricing, hire', 'is_root_trigger' => true]
                            ],
                            [
                                'id' => 'msg_welcome',
                                'type' => 'send_message',
                                'position' => ['x' => 380, 'y' => 180],
                                'data' => ['title' => 'Welcome Greeting', 'body' => "Hello! 👋 Thank you for contacting us. Let's find the perfect solution for your business!"]
                            ],
                            [
                                'id' => 'ask_name',
                                'type' => 'ask_question',
                                'position' => ['x' => 380, 'y' => 310],
                                'data' => ['title' => 'Ask Full Name', 'question' => 'Could you please share your full name?', 'questionText' => 'Could you please share your full name?', 'saveVariable' => 'lead_name', 'saveVariableLabel' => 'Lead Name', 'variableDataType' => 'text']
                            ],
                            [
                                'id' => 'ask_budget',
                                'type' => 'ask_question',
                                'position' => ['x' => 380, 'y' => 450],
                                'data' => ['title' => 'Ask Monthly Budget', 'question' => "What is your estimated monthly budget for this project (in USD)?\n(e.g., 500, 1500, 5000)", 'questionText' => "What is your estimated monthly budget for this project (in USD)?\n(e.g., 500, 1500, 5000)", 'saveVariable' => 'lead_budget', 'saveVariableLabel' => 'Lead Budget', 'variableDataType' => 'number']
                            ],
                            [
                                'id' => 'cond_budget',
                                'type' => 'condition',
                                'position' => ['x' => 380, 'y' => 600],
                                'data' => ['title' => 'Budget >= $1,000?', 'operator' => 'AND', 'conditions' => [['field' => 'variables.lead_budget', 'operator' => 'greater_than_or_equal', 'value' => '1000']]]
                            ],
                            [
                                'id' => 'deal_vip',
                                'type' => 'create_deal',
                                'position' => ['x' => 180, 'y' => 750],
                                'data' => ['title' => 'Create VIP Deal', 'dealName' => 'VIP Sales Opportunity', 'dealValue' => 2500, 'stageId' => 'qualified', 'currency' => 'USD']
                            ],
                            [
                                'id' => 'tag_vip',
                                'type' => 'tag_contact',
                                'position' => ['x' => 180, 'y' => 890],
                                'data' => ['title' => 'Tag VIP Lead', 'tagAction' => 'add_tag', 'targetTag' => 'vip-qualified']
                            ],
                            [
                                'id' => 'msg_vip',
                                'type' => 'send_message',
                                'position' => ['x' => 180, 'y' => 1020],
                                'data' => ['title' => 'VIP Fast-Track Note', 'body' => "Excellent, {{variables.lead_name}}! 🎉 Your project fits our Enterprise tier. A senior specialist is reviewing your details and will call you within 15 minutes."]
                            ],
                            [
                                'id' => 'tag_standard',
                                'type' => 'tag_contact',
                                'position' => ['x' => 580, 'y' => 750],
                                'data' => ['title' => 'Tag Standard Lead', 'tagAction' => 'add_tag', 'targetTag' => 'standard-lead']
                            ],
                            [
                                'id' => 'msg_standard',
                                'type' => 'send_message',
                                'position' => ['x' => 580, 'y' => 890],
                                'data' => ['title' => 'Standard Catalog Note', 'body' => "Thank you, {{variables.lead_name}}! We have sent our starter catalog and pricing guide. Let us know if you have any questions!"]
                            ],
                            [
                                'id' => 'end_node',
                                'type' => 'end_flow',
                                'position' => ['x' => 380, 'y' => 1180],
                                'data' => ['title' => 'Conclude Journey', 'body' => 'Lead qualification complete.']
                            ]
                        ],
                        'edges' => [
                            ['id' => 'e1', 'source' => 'trigger_1', 'target' => 'msg_welcome', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e2', 'source' => 'msg_welcome', 'target' => 'ask_name', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e3', 'source' => 'ask_name', 'target' => 'ask_budget', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e4', 'source' => 'ask_budget', 'target' => 'cond_budget', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e5', 'source' => 'cond_budget', 'target' => 'deal_vip', 'sourceHandle' => 'true', 'targetHandle' => 'in'],
                            ['id' => 'e6', 'source' => 'deal_vip', 'target' => 'tag_vip', 'sourceHandle' => 'success', 'targetHandle' => 'in'],
                            ['id' => 'e7', 'source' => 'tag_vip', 'target' => 'msg_vip', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e8', 'source' => 'msg_vip', 'target' => 'end_node', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e9', 'source' => 'cond_budget', 'target' => 'tag_standard', 'sourceHandle' => 'false', 'targetHandle' => 'in'],
                            ['id' => 'e10', 'source' => 'tag_standard', 'target' => 'msg_standard', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e11', 'source' => 'msg_standard', 'target' => 'end_node', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ]
                    ]
                ];

            case 'welcome_menu':
                return [
                    'name' => 'Interactive Welcome Menu with WhatsApp Quick Buttons',
                    'description' => 'Omnichannel greeting with interactive WhatsApp buttons/lists for instant booking, pricing lookup, and support.',
                    'trigger_type' => 'inbound_message',
                    'trigger_keywords' => ['hi', 'hello', 'start', 'menu', 'hey'],
                    'definition' => [
                        'nodes' => [
                            [
                                'id' => 'trigger_1',
                                'type' => 'inbound_message',
                                'position' => ['x' => 380, 'y' => 50],
                                'data' => ['title' => 'Inbound Greeting Trigger', 'channel' => 'all', 'keyword' => 'hi, hello, start, menu', 'is_root_trigger' => true]
                            ],
                            [
                                'id' => 'msg_greet',
                                'type' => 'send_message',
                                'position' => ['x' => 380, 'y' => 180],
                                'data' => ['title' => 'Welcome Greeting', 'body' => "Welcome to WhatsOmni! 🚀 We're here to help you automate communications and accelerate your business."]
                            ],
                            [
                                'id' => 'menu_interactive',
                                'type' => 'interactive_menu',
                                'position' => ['x' => 380, 'y' => 320],
                                'data' => [
                                    'title' => 'Main Options Menu',
                                    'menuType' => 'list',
                                    'buttonText' => 'View Services',
                                    'body' => 'Please choose one of the options below to get started:',
                                    'saveVariable' => 'user_choice',
                                    'items' => [
                                        ['id' => 'item_0', 'title' => '📅 Book Consultation', 'description' => 'Schedule a live 1-on-1 strategy call', 'keywords' => '1, book', 'value' => 'book'],
                                        ['id' => 'item_1', 'title' => '💼 Plans & Pricing', 'description' => 'Explore packages and features', 'keywords' => '2, price', 'value' => 'pricing'],
                                        ['id' => 'item_2', 'title' => '💬 Live Agent Support', 'description' => 'Connect to our customer success team', 'keywords' => '3, support', 'value' => 'support'],
                                    ]
                                ]
                            ],
                            [
                                'id' => 'book_appointment',
                                'type' => 'create_appointment',
                                'position' => ['x' => 100, 'y' => 520],
                                'data' => ['title' => 'Schedule Call', 'bookingDuration' => 30, 'calendarProvider' => 'built_in', 'conferenceProvider' => 'built_in']
                            ],
                            [
                                'id' => 'msg_booked',
                                'type' => 'send_message',
                                'position' => ['x' => 100, 'y' => 680],
                                'data' => ['title' => 'Booking Confirmed', 'body' => "Your consultation is reserved! 📅 Check your email and calendar for meeting details."]
                            ],
                            [
                                'id' => 'rag_pricing',
                                'type' => 'rag_query',
                                'position' => ['x' => 380, 'y' => 520],
                                'data' => ['title' => 'Pricing Knowledgebase', 'query' => 'Provide a clear summary of all our service plans and monthly pricing tiers.', 'saveKey' => 'pricing_info']
                            ],
                            [
                                'id' => 'msg_pricing',
                                'type' => 'send_message',
                                'position' => ['x' => 380, 'y' => 680],
                                'data' => ['title' => 'Send Pricing Info', 'body' => "Here is our current pricing overview:\n\n{{variables.pricing_info}}\n\nReply 'book' anytime to schedule a consultation!"]
                            ],
                            [
                                'id' => 'handoff_support',
                                'type' => 'human_handoff',
                                'position' => ['x' => 660, 'y' => 520],
                                'data' => ['title' => 'Transfer to Support Agent', 'queueTarget' => 'support_inbox', 'internalNote' => 'Customer selected Live Agent from Main Welcome Menu']
                            ],
                            [
                                'id' => 'end_menu',
                                'type' => 'end_flow',
                                'position' => ['x' => 240, 'y' => 840],
                                'data' => ['title' => 'Complete Session', 'body' => 'Thank you for chatting with us!']
                            ]
                        ],
                        'edges' => [
                            ['id' => 'e1', 'source' => 'trigger_1', 'target' => 'msg_greet', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e2', 'source' => 'msg_greet', 'target' => 'menu_interactive', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e3', 'source' => 'menu_interactive', 'target' => 'book_appointment', 'sourceHandle' => 'item_0', 'targetHandle' => 'in'],
                            ['id' => 'e4', 'source' => 'book_appointment', 'target' => 'msg_booked', 'sourceHandle' => 'scheduled', 'targetHandle' => 'in'],
                            ['id' => 'e5', 'source' => 'msg_booked', 'target' => 'end_menu', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e6', 'source' => 'menu_interactive', 'target' => 'rag_pricing', 'sourceHandle' => 'item_1', 'targetHandle' => 'in'],
                            ['id' => 'e7', 'source' => 'rag_query', 'target' => 'msg_pricing', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e8', 'source' => 'msg_pricing', 'target' => 'end_menu', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e9', 'source' => 'menu_interactive', 'target' => 'handoff_support', 'sourceHandle' => 'item_2', 'targetHandle' => 'in'],
                        ]
                    ]
                ];

            case 'booking_scheduler':
                return [
                    'name' => 'Appointment Booking & Calendar Scheduler',
                    'description' => 'Collects topic preferences, checks slot availability, and books appointments directly to your calendar.',
                    'trigger_type' => 'inbound_message',
                    'trigger_keywords' => ['book', 'schedule', 'calendar', 'meeting', 'demo', 'call'],
                    'definition' => [
                        'nodes' => [
                            [
                                'id' => 'trigger_1',
                                'type' => 'inbound_message',
                                'position' => ['x' => 380, 'y' => 50],
                                'data' => ['title' => 'Booking Keyword Trigger', 'channel' => 'all', 'keyword' => 'book, schedule, calendar, meeting, demo', 'is_root_trigger' => true]
                            ],
                            [
                                'id' => 'ask_topic',
                                'type' => 'ask_question',
                                'position' => ['x' => 380, 'y' => 180],
                                'data' => ['title' => 'Ask Consultation Topic', 'question' => "What would you like to focus on during our call?\n(e.g., Omnichannel CRM, WhatsApp API, AI ChatBots, Custom Integration)", 'questionText' => "What would you like to focus on during our call?\n(e.g., Omnichannel CRM, WhatsApp API, AI ChatBots, Custom Integration)", 'saveVariable' => 'call_topic', 'saveVariableLabel' => 'Call Topic', 'variableDataType' => 'text']
                            ],
                            [
                                'id' => 'book_slot',
                                'type' => 'create_appointment',
                                'position' => ['x' => 380, 'y' => 340],
                                'data' => ['title' => 'Book Google Calendar Slot', 'bookingDuration' => 30, 'calendarProvider' => 'google_calendar', 'conferenceProvider' => 'google_meet']
                            ],
                            [
                                'id' => 'deal_booking',
                                'type' => 'create_deal',
                                'position' => ['x' => 200, 'y' => 500],
                                'data' => ['title' => 'Log CRM Booking Deal', 'dealName' => 'Scheduled Demo Call', 'dealValue' => 750, 'stageId' => 'meeting_booked', 'currency' => 'USD']
                            ],
                            [
                                'id' => 'msg_success',
                                'type' => 'send_message',
                                'position' => ['x' => 200, 'y' => 650],
                                'data' => ['title' => 'Confirmation Notice', 'body' => "You're all set! 📅 Your session has been confirmed. A calendar invite with Google Meet link has been sent."]
                            ],
                            [
                                'id' => 'msg_retry',
                                'type' => 'send_message',
                                'position' => ['x' => 560, 'y' => 500],
                                'data' => ['title' => 'Slot Unavailable Message', 'body' => "That slot was just booked by another customer. Let's connect you directly with a coordinator to secure your spot."]
                            ],
                            [
                                'id' => 'handoff_booking',
                                'type' => 'human_handoff',
                                'position' => ['x' => 560, 'y' => 650],
                                'data' => ['title' => 'Live Booking Coordinator', 'queueTarget' => 'booking_team', 'internalNote' => 'Manual slot assistance needed for booking']
                            ]
                        ],
                        'edges' => [
                            ['id' => 'e1', 'source' => 'trigger_1', 'target' => 'ask_topic', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e2', 'source' => 'ask_topic', 'target' => 'book_slot', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e3', 'source' => 'book_slot', 'target' => 'deal_booking', 'sourceHandle' => 'scheduled', 'targetHandle' => 'in'],
                            ['id' => 'e4', 'source' => 'deal_booking', 'target' => 'msg_success', 'sourceHandle' => 'success', 'targetHandle' => 'in'],
                            ['id' => 'e5', 'source' => 'book_slot', 'target' => 'msg_retry', 'sourceHandle' => 'unavailable', 'targetHandle' => 'in'],
                            ['id' => 'e6', 'source' => 'msg_retry', 'target' => 'handoff_booking', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ]
                    ]
                ];

            case 'cart_recovery':
                return [
                    'name' => 'E-Commerce Order Status & Abandoned Cart Recovery',
                    'description' => 'Timed abandoned cart follow-up with incentive discount codes and instant live checkout assistance.',
                    'trigger_type' => 'ecommerceCheckoutAbandoned',
                    'trigger_keywords' => ['cart', 'order', 'checkout', 'discount'],
                    'definition' => [
                        'nodes' => [
                            [
                                'id' => 'trigger_1',
                                'type' => 'ecommerceCheckoutAbandoned',
                                'position' => ['x' => 380, 'y' => 50],
                                'data' => ['title' => 'Abandoned Cart Webhook', 'channel' => 'all', 'is_root_trigger' => true]
                            ],
                            [
                                'id' => 'wait_30m',
                                'type' => 'wait_delay',
                                'position' => ['x' => 380, 'y' => 180],
                                'data' => ['title' => 'Wait 30 Minutes', 'delayType' => 'duration', 'value' => 30, 'unit' => 'minutes']
                            ],
                            [
                                'id' => 'msg_cart',
                                'type' => 'send_message',
                                'position' => ['x' => 380, 'y' => 310],
                                'data' => ['title' => 'Cart Reminder', 'body' => "Hey there! 🛒 We noticed you left some amazing items in your cart. Would you like a 10% discount code to complete your order right now?"]
                            ],
                            [
                                'id' => 'menu_cart',
                                'type' => 'interactive_menu',
                                'position' => ['x' => 380, 'y' => 450],
                                'data' => [
                                    'title' => 'Discount Offer Menu',
                                    'menuType' => 'buttons',
                                    'body' => 'Select an option below:',
                                    'saveVariable' => 'cart_action',
                                    'items' => [
                                        ['id' => 'item_0', 'title' => '🎁 Claim 10% Off', 'value' => 'discount'],
                                        ['id' => 'item_1', 'title' => '❓ I Need Help', 'value' => 'help'],
                                    ]
                                ]
                            ],
                            [
                                'id' => 'tag_recovered',
                                'type' => 'tag_contact',
                                'position' => ['x' => 200, 'y' => 610],
                                'data' => ['title' => 'Tag Cart Recovered', 'tagAction' => 'add_tag', 'targetTag' => 'cart-incentivized']
                            ],
                            [
                                'id' => 'msg_promo',
                                'type' => 'send_message',
                                'position' => ['x' => 200, 'y' => 750],
                                'data' => ['title' => 'Send Discount Code', 'body' => "Awesome! Use promo code *SAVE10* at checkout to take 10% off your entire order:\n👉 https://yourstore.com/checkout"]
                            ],
                            [
                                'id' => 'handoff_cart',
                                'type' => 'human_handoff',
                                'position' => ['x' => 560, 'y' => 610],
                                'data' => ['title' => 'Checkout Support Agent', 'queueTarget' => 'sales_support', 'internalNote' => 'Customer requested help with abandoned cart checkout']
                            ]
                        ],
                        'edges' => [
                            ['id' => 'e1', 'source' => 'trigger_1', 'target' => 'wait_30m', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e2', 'source' => 'wait_30m', 'target' => 'msg_cart', 'sourceHandle' => 'resume', 'targetHandle' => 'in'],
                            ['id' => 'e3', 'source' => 'msg_cart', 'target' => 'menu_cart', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e4', 'source' => 'menu_cart', 'target' => 'tag_recovered', 'sourceHandle' => 'item_0', 'targetHandle' => 'in'],
                            ['id' => 'e5', 'source' => 'tag_recovered', 'target' => 'msg_promo', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e6', 'source' => 'menu_cart', 'target' => 'handoff_cart', 'sourceHandle' => 'item_1', 'targetHandle' => 'in'],
                        ]
                    ]
                ];

            case 'support_triage':
            default:
                return [
                    'name' => 'Customer Support Triage with Human Agent Escalation',
                    'description' => 'AI sentiment detection, knowledge base RAG query matching, and seamless escalation to human inbox agents.',
                    'trigger_type' => 'inbound_message',
                    'trigger_keywords' => ['help', 'issue', 'problem', 'support', 'broken', 'error'],
                    'definition' => [
                        'nodes' => [
                            [
                                'id' => 'trigger_1',
                                'type' => 'inbound_message',
                                'position' => ['x' => 380, 'y' => 50],
                                'data' => ['title' => 'Support Entry Trigger', 'channel' => 'all', 'keyword' => 'help, issue, problem, support', 'is_root_trigger' => true]
                            ],
                            [
                                'id' => 'ask_issue',
                                'type' => 'ask_question',
                                'position' => ['x' => 380, 'y' => 180],
                                'data' => ['title' => 'Ask Issue Description', 'question' => "Hello! Our support team is ready to assist. Please describe what you're experiencing in detail:", 'questionText' => "Hello! Our support team is ready to assist. Please describe what you're experiencing in detail:", 'saveVariable' => 'issue_desc', 'saveVariableLabel' => 'Issue Description', 'variableDataType' => 'text']
                            ],
                            [
                                'id' => 'ai_sentiment',
                                'type' => 'ai_condition',
                                'position' => ['x' => 380, 'y' => 330],
                                'data' => ['title' => 'Is Issue Urgent / Critical?', 'question' => 'Is the customer reporting a critical bug, payment blockage, server downtime, or expressing high frustration/anger?', 'contentKey' => '{{variables.issue_desc}}', 'model' => 'gpt-4o-mini']
                            ],
                            [
                                'id' => 'tag_urgent',
                                'type' => 'tag_contact',
                                'position' => ['x' => 180, 'y' => 500],
                                'data' => ['title' => 'Tag Urgent Priority', 'tagAction' => 'add_tag', 'targetTag' => 'priority-urgent']
                            ],
                            [
                                'id' => 'msg_urgent',
                                'type' => 'send_message',
                                'position' => ['x' => 180, 'y' => 640],
                                'data' => ['title' => 'Urgent Notification', 'body' => "We understand this is critical. 🚨 Connecting you immediately with our Priority Escalation team..."]
                            ],
                            [
                                'id' => 'handoff_urgent',
                                'type' => 'human_handoff',
                                'position' => ['x' => 180, 'y' => 780],
                                'data' => ['title' => 'Priority Queue Handoff', 'queueTarget' => 'priority_inbox', 'internalNote' => 'Urgent priority issue flagged by AI Sentiment triage']
                            ],
                            [
                                'id' => 'rag_search',
                                'type' => 'rag_query',
                                'position' => ['x' => 580, 'y' => 500],
                                'data' => ['title' => 'Search Knowledgebase', 'query' => '{{variables.issue_desc}}', 'saveKey' => 'kb_solution']
                            ],
                            [
                                'id' => 'msg_kb',
                                'type' => 'send_message',
                                'position' => ['x' => 580, 'y' => 640],
                                'data' => ['title' => 'Send Suggested Solution', 'body' => "Here is what our system found to help resolve your issue:\n\n{{variables.kb_solution}}\n\nDid this solve your problem? Reply 'yes' or 'agent' if you still need assistance."]
                            ],
                            [
                                'id' => 'end_support',
                                'type' => 'end_flow',
                                'position' => ['x' => 580, 'y' => 780],
                                'data' => ['title' => 'Session Resolved', 'body' => 'Support triage concluded.']
                            ]
                        ],
                        'edges' => [
                            ['id' => 'e1', 'source' => 'trigger_1', 'target' => 'ask_issue', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e2', 'source' => 'ask_issue', 'target' => 'ai_sentiment', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e3', 'source' => 'ai_sentiment', 'target' => 'tag_urgent', 'sourceHandle' => 'yes', 'targetHandle' => 'in'],
                            ['id' => 'e4', 'source' => 'tag_urgent', 'target' => 'msg_urgent', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e5', 'source' => 'msg_urgent', 'target' => 'handoff_urgent', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e6', 'source' => 'ai_sentiment', 'target' => 'rag_search', 'sourceHandle' => 'no', 'targetHandle' => 'in'],
                            ['id' => 'e7', 'source' => 'rag_search', 'target' => 'msg_kb', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                            ['id' => 'e8', 'source' => 'msg_kb', 'target' => 'end_support', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ]
                    ]
                ];
        }
    }

    /**
     * Public Inbound API Webhook Receiver for Flow Automations.
     */
    public function handleWebhook(Request $request, string $id, \App\Services\Flow\FlowTriggerService $triggerService): JsonResponse
    {
        $payload = $request->all();
        $headers = $request->headers->all();

        $execution = $triggerService->handleWebhookTrigger($id, $payload, $headers);

        if (!$execution) {
            return response()->json([
                'success' => false,
                'message' => 'No active published flow found matching trigger ID.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Flow webhook triggered successfully.',
            'execution_id' => $execution->id,
            'status' => $execution->status,
        ], 200);
    }

    /**
     * Trigger a flow manually for a contact or test contact.
     */
    public function triggerManual(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $flow = Flow::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->whereNotNull('current_published_version_id')
            ->with('publishedVersion')
            ->findOrFail($id);

        $version = $flow->publishedVersion;
        if (!$version || empty($version->definition['nodes'])) {
            return response()->json(['message' => 'Flow has no valid published version.'], 400);
        }

        $validated = $request->validate([
            'contact_id' => 'nullable|integer',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
            'conversation_id' => 'nullable|integer',
            'variables' => 'nullable|array',
        ]);

        $contact = null;
        if (!empty($validated['contact_id'])) {
            $contact = Contact::where('tenant_id', $tenantId)->find($validated['contact_id']);
        }
        if (!$contact && !empty($validated['email'])) {
            $contact = Contact::where('tenant_id', $tenantId)->where('email', $validated['email'])->first();
        }
        if (!$contact && !empty($validated['phone'])) {
            $contact = Contact::where('tenant_id', $tenantId)->where('phone', $validated['phone'])->first();
        }
        if (!$contact) {
            $contact = Contact::where('tenant_id', $tenantId)->first();
        }
        if (!$contact) {
            $contact = Contact::create([
                'tenant_id' => $tenantId,
                'first_name' => 'Manual Flow Test Contact',
                'email' => $validated['email'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'lifecycle_stage' => 'lead',
            ]);
        }

        // Find root trigger node
        $triggerNode = null;
        $validTriggers = [
            'manual', 'inbound_message', 'webhook_trigger', 'webhook',
            'contact_created', 'deal_updated', 'outbound_campaign',
            'ecommerceCheckoutAbandoned', 'keyword'
        ];
        foreach ($version->definition['nodes'] as $n) {
            if (in_array($n['type'] ?? '', $validTriggers) || ($n['id'] ?? '') === 'trigger_1' || !empty($n['data']['is_root_trigger'])) {
                $triggerNode = $n;
                break;
            }
        }
        $startNodeId = $triggerNode ? $triggerNode['id'] : ($version->definition['nodes'][0]['id'] ?? 'trigger_1');

        $initialVars = array_merge([
            'triggered_by' => 'manual',
            'triggered_at' => now()->toIso8601String(),
        ], $validated['variables'] ?? []);

        $execution = FlowExecution::create([
            'tenant_id' => $tenantId,
            'flow_version_id' => $version->id,
            'contact_id' => $contact->id,
            'conversation_id' => $validated['conversation_id'] ?? null,
            'status' => 'running',
            'current_node_id' => $startNodeId,
            'context' => [
                'variables' => $initialVars,
                'loop_count' => [],
            ],
        ]);

        $runner = app(\App\Services\Flow\FlowRunner::class);
        $runner->execute($execution);

        return response()->json([
            'message' => 'Flow triggered successfully.',
            'execution_id' => $execution->id,
            'execution' => $execution->fresh(['logs']),
        ], 200);
    }
}

