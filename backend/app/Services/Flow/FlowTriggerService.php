<?php

namespace App\Services\Flow;

use App\Models\Flow;
use App\Models\FlowVersion;
use App\Models\FlowExecution;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Deal;
use App\Models\ChannelConnection;
use App\Models\AiChatbot;
use App\Models\AiAgent;
use Illuminate\Support\Facades\Log;
use Exception;

class FlowTriggerService
{
    protected FlowRunner $flowRunner;

    public function __construct(FlowRunner $flowRunner)
    {
        $this->flowRunner = $flowRunner;
    }

    /**
     * Determine if a flow is configured with keyword requirements.
     */
    public function flowHasKeywordRequirement(Flow $flow, ?array $triggerNode): bool
    {
        if ($flow->trigger_type === 'keyword') {
            return true;
        }

        if (!empty($flow->trigger_keywords) && is_array($flow->trigger_keywords) && count($flow->trigger_keywords) > 0) {
            return true;
        }

        if ($triggerNode && isset($triggerNode['data'])) {
            $data = $triggerNode['data'];
            $matchType = $data['matchType'] ?? null;
            if ($matchType === 'keyword_match') {
                return true;
            }
            if (!empty($data['keyword']) || !empty($data['keywords']) || !empty($data['trigger_words'])) {
                return true;
            }
        }

        return false;
    }

    /**
     * Extract all keywords and matching options for a flow.
     */
    public function extractFlowKeywords(Flow $flow, ?array $triggerNode): array
    {
        $keywords = [];

        if (!empty($flow->trigger_keywords) && is_array($flow->trigger_keywords)) {
            $keywords = array_merge($keywords, $flow->trigger_keywords);
        }

        if ($triggerNode && isset($triggerNode['data'])) {
            $data = $triggerNode['data'];
            $kwRaw = $data['keyword'] ?? ($data['keywords'] ?? ($data['trigger_words'] ?? null));
            if (is_string($kwRaw)) {
                $parsed = array_values(array_filter(array_map('trim', explode(',', $kwRaw))));
                $keywords = array_merge($keywords, $parsed);
            } elseif (is_array($kwRaw)) {
                $keywords = array_merge($keywords, array_values(array_filter(array_map('trim', $kwRaw))));
            }
        }

        $keywords = array_values(array_unique(array_filter(array_map('trim', $keywords))));
        $matchType = $triggerNode['data']['trigger_words_match_type'] ?? ($triggerNode['data']['match_type'] ?? 'contains');

        return [
            'keywords' => $keywords,
            'match_type' => $matchType,
        ];
    }

    /**
     * Check if inbound message matches the flow's keyword criteria.
     */
    public function messageMatchesKeywords(string $messageBody, array $keywords, string $matchType = 'contains'): ?string
    {
        $cleanBody = trim(strtolower($messageBody));
        if (empty($cleanBody) || empty($keywords)) {
            return null;
        }

        $cleanBodyNoPunct = trim(preg_replace('/[[:punct:]]+/u', '', $cleanBody));

        foreach ($keywords as $kw) {
            $kwClean = trim(strtolower($kw));
            if (empty($kwClean)) {
                continue;
            }
            $kwCleanNoPunct = trim(preg_replace('/[[:punct:]]+/u', '', $kwClean));

            if ($matchType === 'exact') {
                if ($cleanBody === $kwClean || (!empty($cleanBodyNoPunct) && $cleanBodyNoPunct === $kwCleanNoPunct)) {
                    return $kwClean;
                }
            } else { // contains / word boundary
                if (
                    $cleanBody === $kwClean ||
                    (!empty($cleanBodyNoPunct) && $cleanBodyNoPunct === $kwCleanNoPunct) ||
                    preg_match('/\b' . preg_quote($kwClean, '/') . '\b/i', $cleanBody) ||
                    str_contains($cleanBody, $kwClean)
                ) {
                    return $kwClean;
                }
            }
        }

        return null;
    }

    /**
     * Process inbound message through the 5-tier automation & AI routing matrix.
     */
    public function handleInboundMessage(
        Message $message,
        Conversation $conversation,
        ChannelConnection $connection,
        Contact $contact
    ): bool {
        // Human takeover check: if conversation is assigned to human operator, halt all bot automations
        if (!empty($conversation->assigned_user_id)) {
            Log::info("FlowTriggerService: Conversation {$conversation->id} is assigned to human agent. Halting bot execution.");
            return false;
        }

        $execution = FlowExecution::where('contact_id', $contact->id)
            ->where('tenant_id', $connection->tenant_id)
            ->where('status', 'paused_waiting_reply')
            ->first();

        // 0. Check if incoming message matches any node's keyword jump triggers in active flow
        if ($execution && $execution->flowVersion) {
            $keywordNode = $this->flowRunner->findMatchingKeywordNode($message->body, $execution->flowVersion->definition);
            if ($keywordNode) {
                Log::info("FlowTriggerService: Keyword Jump matched in active execution {$execution->id}, jumping to node {$keywordNode['id']}");
                $execution->conversation_id = $conversation->id;
                $execution->status = 'running';
                $execution->current_node_id = $keywordNode['id'];
                $context = $execution->context;
                $context['variables']['inbound_message_body'] = $message->body;
                $execution->context = $context;
                $execution->save();

                $this->flowRunner->execute($execution);
                return true;
            }
        }

        // 1. Resume waiting flow execution if it exists (Priority 1)
        if ($execution) {
            Log::info("FlowTriggerService: Resuming FlowExecution {$execution->id} for contact {$contact->id} at node {$execution->current_node_id}");
            $execution->conversation_id = $conversation->id;
            $execution->status = 'running';
            $context = $execution->context;
            $saveVar = $context['variables']['current_save_variable'] ?? null;
            if ($saveVar) {
                $context['variables'][$saveVar] = $message->body;
            }
            $context['variables']['inbound_message_body'] = $message->body;

            // If message is a WhatsApp Flow response, inject submitted form fields
            if ($message->message_type === 'flow_response' && !empty($message->metadata['answers'])) {
                $context['variables']['flow_answers'] = $message->metadata['answers'];
                $context['variables']['flow_submission'] = $message->metadata['answers'];
                foreach ($message->metadata['answers'] as $k => $v) {
                    $context['variables']['flow_' . $k] = is_array($v) ? json_encode($v) : (string)$v;
                }
            }

            $execution->context = $context;
            $execution->save();

            $this->flowRunner->execute($execution);
            return true;
        }

        // 1.5 Click-to-WhatsApp (CTWA) Meta Ad Referral Trigger
        $referral = $message->metadata['referral'] ?? null;
        if ($referral && !empty($referral['source_id'])) {
            $metaAd = \App\Models\MetaAd::where('tenant_id', $connection->tenant_id)
                ->where('meta_ad_id', $referral['source_id'])
                ->with(['linkedFlow.publishedVersion'])
                ->first();

            if ($metaAd && $metaAd->linkedFlow && $metaAd->linkedFlow->publishedVersion) {
                $linkedFlow = $metaAd->linkedFlow;
                $version = $linkedFlow->publishedVersion;
                $triggerNode = $version->definition['nodes'][0] ?? null;

                Log::info("FlowTriggerService: Click-to-WhatsApp Ad matched (Ad {$metaAd->id}, Flow {$linkedFlow->id}) for contact {$contact->id}");

                $execution = FlowExecution::create([
                    'tenant_id' => $connection->tenant_id,
                    'flow_version_id' => $version->id,
                    'contact_id' => $contact->id,
                    'conversation_id' => $conversation->id,
                    'status' => 'running',
                    'current_node_id' => $triggerNode ? $triggerNode['id'] : 'trigger_1',
                    'context' => [
                        'variables' => [
                            'inbound_message_body' => $message->body,
                            'ad_id' => $metaAd->meta_ad_id,
                            'ad_headline' => $referral['headline'] ?? $metaAd->headline,
                            'ad_source_type' => $referral['source_type'] ?? 'ad',
                        ],
                        'loop_count' => []
                    ]
                ]);

                $this->flowRunner->execute($execution);
                return true;
            }
        }

        // Fetch active flows for this tenant that match this channel or are omnichannel
        $inboundText = trim(strtolower($message->body ?? ''));
        $activeFlows = Flow::where('tenant_id', $connection->tenant_id)
            ->where('is_active', true)
            ->whereNotNull('current_published_version_id')
            ->with(['channels', 'publishedVersion'])
            ->where(function ($q) use ($connection) {
                $q->whereHas('channels', function ($qc) use ($connection) {
                    $qc->where('channel_connections.id', $connection->id);
                })->orDoesntHave('channels');
            })
            ->get();

        // Separate flows into Keyword-Triggered vs Catch-All Inbound Message flows
        $keywordCandidates = [];
        $catchAllCandidates = [];

        foreach ($activeFlows as $flow) {
            // Ignore non-inbound triggers (e.g. manual, outbound_campaign, contact_created, deal_updated, webhook_trigger)
            if (in_array($flow->trigger_type, ['manual', 'outbound_campaign', 'contact_created', 'deal_updated', 'ecommerceCheckoutAbandoned', 'webhook_trigger', 'webhook'])) {
                continue;
            }

            $version = $flow->publishedVersion;
            if (!$version || empty($version->definition['nodes'])) {
                continue;
            }

            $triggerNode = null;
            foreach ($version->definition['nodes'] as $node) {
                $type = $node['type'] ?? '';
                if (in_array($type, ['inbound_message', 'keyword']) || ($node['id'] ?? '') === 'trigger_1' || !empty($node['data']['is_root_trigger'])) {
                    $triggerNode = $node;
                    break;
                }
            }

            if (!$triggerNode) {
                continue;
            }

            // If trigger node specifies a specific channel, ensure it matches connection
            $nodeChannel = $triggerNode['data']['channel'] ?? null;
            if ($nodeChannel !== null && $nodeChannel !== 'all' && !empty($nodeChannel) && is_numeric($nodeChannel)) {
                if ((int)$nodeChannel !== (int)$connection->id) {
                    continue;
                }
            }

            if ($this->flowHasKeywordRequirement($flow, $triggerNode)) {
                $keywordData = $this->extractFlowKeywords($flow, $triggerNode);
                $matchedKeyword = $this->messageMatchesKeywords($inboundText, $keywordData['keywords'], $keywordData['match_type']);
                
                if ($matchedKeyword !== null) {
                    $keywordCandidates[] = [
                        'flow' => $flow,
                        'version' => $version,
                        'trigger_node' => $triggerNode,
                        'matched_keyword' => $matchedKeyword,
                        'is_channel_bound' => $flow->channels->contains('id', $connection->id),
                    ];
                }
            } elseif ($flow->trigger_type === 'inbound_message') {
                $catchAllCandidates[] = [
                    'flow' => $flow,
                    'version' => $version,
                    'trigger_node' => $triggerNode,
                    'is_channel_bound' => $flow->channels->contains('id', $connection->id),
                ];
            }
        }

        // 2. PRIORITY 2: Keyword-matched flow execution
        if (!empty($keywordCandidates)) {
            // Sort to prefer channel-bound keyword flow over omnichannel
            usort($keywordCandidates, fn($a, $b) => ($b['is_channel_bound'] ? 1 : 0) <=> ($a['is_channel_bound'] ? 1 : 0));
            $target = $keywordCandidates[0];

            Log::info("FlowTriggerService: Keyword matched ('{$target['matched_keyword']}') for Flow {$target['flow']->id}, starting execution for contact {$contact->id}");
            $execution = FlowExecution::create([
                'tenant_id' => $connection->tenant_id,
                'flow_version_id' => $target['version']->id,
                'contact_id' => $contact->id,
                'conversation_id' => $conversation->id,
                'status' => 'running',
                'current_node_id' => $target['trigger_node']['id'],
                'context' => [
                    'variables' => [
                        'inbound_message_body' => $message->body,
                        'matched_keyword' => $target['matched_keyword'],
                    ],
                    'loop_count' => []
                ]
            ]);

            $this->flowRunner->execute($execution);
            return true;
        }

        // 3. PRIORITY 3: Catch-all "Any Inbound Message" flow (ONLY if no keywords were required)
        if (!empty($catchAllCandidates)) {
            usort($catchAllCandidates, fn($a, $b) => ($b['is_channel_bound'] ? 1 : 0) <=> ($a['is_channel_bound'] ? 1 : 0));
            $target = $catchAllCandidates[0];

            Log::info("FlowTriggerService: Catch-all inbound message trigger for Flow {$target['flow']->id}, starting execution for contact {$contact->id}");
            $execution = FlowExecution::create([
                'tenant_id' => $connection->tenant_id,
                'flow_version_id' => $target['version']->id,
                'contact_id' => $contact->id,
                'conversation_id' => $conversation->id,
                'status' => 'running',
                'current_node_id' => $target['trigger_node']['id'],
                'context' => [
                    'variables' => [
                        'inbound_message_body' => $message->body,
                    ],
                    'loop_count' => []
                ]
            ]);

            $this->flowRunner->execute($execution);
            return true;
        }

        return false;
    }

    /**
     * Trigger automations for Contact Created event.
     */
    public function handleContactCreated(Contact $contact): int
    {
        $activeFlows = Flow::where('tenant_id', $contact->tenant_id)
            ->where('is_active', true)
            ->where('trigger_type', 'contact_created')
            ->whereNotNull('current_published_version_id')
            ->with('publishedVersion')
            ->get();

        $dispatched = 0;

        foreach ($activeFlows as $flow) {
            $version = $flow->publishedVersion;
            if (!$version || empty($version->definition['nodes'])) {
                continue;
            }

            $triggerNode = null;
            foreach ($version->definition['nodes'] as $node) {
                if (($node['type'] ?? '') === 'contact_created' || ($node['id'] ?? '') === 'trigger_1' || !empty($node['data']['is_root_trigger'])) {
                    $triggerNode = $node;
                    break;
                }
            }

            if (!$triggerNode) {
                continue;
            }

            Log::info("FlowTriggerService: Contact Created trigger for Flow {$flow->id}, contact {$contact->id}");
            $execution = FlowExecution::create([
                'tenant_id' => $contact->tenant_id,
                'flow_version_id' => $version->id,
                'contact_id' => $contact->id,
                'status' => 'running',
                'current_node_id' => $triggerNode['id'],
                'context' => [
                    'variables' => [
                        'contact.id' => $contact->id,
                        'contact.first_name' => $contact->first_name ?? '',
                        'contact.last_name' => $contact->last_name ?? '',
                        'contact.email' => $contact->email ?? '',
                        'contact.phone' => $contact->phone ?? '',
                        'contact.lifecycle_stage' => $contact->lifecycle_stage ?? 'lead',
                    ],
                    'loop_count' => []
                ]
            ]);

            try {
                $this->flowRunner->execute($execution);
                $dispatched++;
            } catch (Exception $e) {
                Log::error("FlowTriggerService contact_created execution error: " . $e->getMessage());
            }
        }

        return $dispatched;
    }

    /**
     * Trigger automations for Deal Updated / Stage Changed event.
     */
    public function handleDealUpdated(Deal $deal, string $oldStage, string $newStage): int
    {
        $activeFlows = Flow::where('tenant_id', $deal->tenant_id)
            ->where('is_active', true)
            ->where('trigger_type', 'deal_updated')
            ->whereNotNull('current_published_version_id')
            ->with('publishedVersion')
            ->get();

        $dispatched = 0;

        foreach ($activeFlows as $flow) {
            $version = $flow->publishedVersion;
            if (!$version || empty($version->definition['nodes'])) {
                continue;
            }

            $triggerNode = null;
            foreach ($version->definition['nodes'] as $node) {
                if (($node['type'] ?? '') === 'deal_updated' || ($node['id'] ?? '') === 'trigger_1' || !empty($node['data']['is_root_trigger'])) {
                    $triggerNode = $node;
                    break;
                }
            }

            if (!$triggerNode) {
                continue;
            }

            // Check stage condition if configured
            $targetStage = $triggerNode['data']['stageId'] ?? ($triggerNode['data']['stage'] ?? 'all');
            if ($targetStage !== 'all' && !empty($targetStage) && $targetStage !== $newStage) {
                continue;
            }

            // Resolve contact
            $contactId = $deal->contact_id;
            if (!$contactId) {
                Log::warning("FlowTriggerService: Deal {$deal->id} has no linked contact; skipping flow {$flow->id} to prevent data leak.");
                continue;
            }

            Log::info("FlowTriggerService: Deal Updated trigger for Flow {$flow->id}, deal {$deal->id} (stage: {$newStage})");
            $execution = FlowExecution::create([
                'tenant_id' => $deal->tenant_id,
                'flow_version_id' => $version->id,
                'contact_id' => $contactId,
                'status' => 'running',
                'current_node_id' => $triggerNode['id'],
                'context' => [
                    'variables' => [
                        'deal_id' => $deal->id,
                        'deal_title' => $deal->title ?? '',
                        'deal_stage' => $newStage,
                        'old_stage' => $oldStage,
                        'deal_value' => (string)($deal->amount ?? 0),
                        'deal_amount' => (string)($deal->amount ?? 0),
                    ],
                    'loop_count' => []
                ]
            ]);

            try {
                $this->flowRunner->execute($execution);
                $dispatched++;
            } catch (Exception $e) {
                Log::error("FlowTriggerService deal_updated execution error: " . $e->getMessage());
            }
        }

        return $dispatched;
    }

    /**
     * Trigger automations for Inbound API Webhook Trigger.
     */
    public function handleWebhookTrigger(string $nodeOrFlowId, array $payload, array $headers = []): ?FlowExecution
    {
        // Strict lookup by exact Flow ID or exact node ID in published version
        $flow = null;
        if (is_numeric($nodeOrFlowId)) {
            $flow = Flow::where('is_active', true)
                ->where('id', (int)$nodeOrFlowId)
                ->whereNotNull('current_published_version_id')
                ->with('publishedVersion')
                ->first();
        }

        // If not found by flow ID, check if an identifying secret/token is supplied in headers/payload
        $inboundSecret = $headers['x-webhook-secret'][0] 
            ?? ($headers['x-webhook-token'][0] 
            ?? ($headers['x-api-key'][0] 
            ?? ($headers['authorization'][0] 
            ?? ($headers['x-flow-token'][0] 
            ?? ($payload['token'] 
            ?? ($payload['secret'] ?? null))))));
        if ($inboundSecret && str_starts_with($inboundSecret, 'Bearer ')) {
            $inboundSecret = substr($inboundSecret, 7);
        }

        if (!$flow && !empty($inboundSecret)) {
            $flow = Flow::where('is_active', true)
                ->whereNotNull('current_published_version_id')
                ->whereHas('publishedVersion', function ($q) use ($inboundSecret) {
                    $sanitizedSecret = addcslashes($inboundSecret, '%_\\');
                    $q->where('definition', 'like', '%"secret":"' . $sanitizedSecret . '"%')
                      ->orWhere('definition', 'like', '%"token":"' . $sanitizedSecret . '"%')
                      ->orWhere('definition', 'like', '%"webhook_token":"' . $sanitizedSecret . '"%')
                      ->orWhere('definition', 'like', '%"apiKey":"' . $sanitizedSecret . '"%');
                })
                ->with('publishedVersion')
                ->first();
        }

        if (!$flow && $nodeOrFlowId !== 'trigger_1' && $nodeOrFlowId !== 'webhook_trigger') {
            // Find flow where published version contains exact node ID (only for unique non-default IDs)
            $flow = Flow::where('is_active', true)
                ->whereNotNull('current_published_version_id')
                ->whereHas('publishedVersion', function ($q) use ($nodeOrFlowId) {
                    $sanitized = addcslashes($nodeOrFlowId, '%_\\');
                    $q->where('definition', 'like', '%"id":"' . $sanitized . '"%')
                      ->orWhere('definition', 'like', '%"id": "' . $sanitized . '"%');
                })
                ->with('publishedVersion')
                ->first();
        }

        if (!$flow || !$flow->publishedVersion) {
            Log::warning("FlowTriggerService: Webhook trigger not found for identifier: {$nodeOrFlowId}");
            return null;
        }

        $version = $flow->publishedVersion;
        $triggerNode = null;
        foreach ($version->definition['nodes'] ?? [] as $node) {
            $nodeId = $node['id'] ?? '';
            $nodeType = $node['type'] ?? '';
            if ($nodeId === $nodeOrFlowId || in_array($nodeType, ['webhook_trigger', 'webhook']) || !empty($node['data']['is_root_trigger'])) {
                $triggerNode = $node;
                break;
            }
        }

        if (!$triggerNode) {
            Log::warning("FlowTriggerService: Trigger node not found in published version of flow {$flow->id}");
            return null;
        }

        // Validate webhook secret/token if configured on the trigger node
        $nodeSecret = $triggerNode['data']['secret'] 
            ?? ($triggerNode['data']['webhook_secret'] 
            ?? ($triggerNode['data']['token'] 
            ?? ($triggerNode['data']['webhook_token'] 
            ?? ($triggerNode['data']['apiKey'] ?? null))));

        if (!empty($nodeSecret)) {
            if (empty($inboundSecret) || !hash_equals((string)$nodeSecret, (string)$inboundSecret)) {
                Log::warning("FlowTriggerService: Unauthorized webhook trigger attempt for flow {$flow->id}. Invalid or missing secret token.");
                return null;
            }
        }

        // Extract variables according to variable_mappings
        $extractedVariables = [
            'raw_payload' => json_encode($payload),
        ];

        $mappings = $triggerNode['data']['variable_mappings'] ?? [];
        if (is_array($mappings)) {
            foreach ($mappings as $map) {
                $jsonPath = $map['jsonPath'] ?? ($map['json_path'] ?? null);
                $varName = $map['variableName'] ?? ($map['variable_name'] ?? null);
                if ($jsonPath && $varName) {
                    $extractedVariables[$varName] = data_get($payload, $jsonPath, '');
                }
            }
        }

        // Resolve Contact
        $contact = null;
        $tenantId = $flow->tenant_id;

        $email = $payload['email'] ?? ($payload['customer']['email'] ?? ($extractedVariables['email'] ?? null));
        $phone = $payload['phone'] ?? ($payload['customer']['phone'] ?? ($extractedVariables['phone'] ?? null));

        if ($email) {
            $contact = Contact::where('tenant_id', $tenantId)->where('email', $email)->first();
        }
        if (!$contact && $phone) {
            $contact = Contact::where('tenant_id', $tenantId)->where('phone', $phone)->first();
        }

        if (!$contact) {
            $firstName = $payload['first_name'] ?? ($payload['customer']['first_name'] ?? ($extractedVariables['first_name'] ?? ($extractedVariables['name'] ?? 'Webhook Contact')));
            $lastName = $payload['last_name'] ?? ($payload['customer']['last_name'] ?? ($extractedVariables['last_name'] ?? null));
            $contact = Contact::create([
                'tenant_id' => $tenantId,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $email,
                'phone' => $phone,
                'lifecycle_stage' => 'lead',
            ]);
        }

        $execution = FlowExecution::create([
            'tenant_id' => $tenantId,
            'flow_version_id' => $version->id,
            'contact_id' => $contact->id,
            'status' => 'running',
            'current_node_id' => $triggerNode['id'],
            'context' => [
                'variables' => array_merge($extractedVariables, [
                    'contact.id' => $contact->id,
                    'contact.first_name' => $contact->first_name ?? '',
                    'contact.email' => $contact->email ?? '',
                    'contact.phone' => $contact->phone ?? '',
                ]),
                'loop_count' => []
            ]
        ]);

        $this->flowRunner->execute($execution);
        return $execution;
    }
}
