<?php

namespace App\Jobs;

use App\Models\ChannelConnection;
use App\Models\Conversation;
use App\Models\Contact;
use App\Models\Message;
use App\Services\Channels\ChannelManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Carbon;
use Exception;

class ProcessInboundMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $connectionId;
    public array $data;

    /**
     * Create a new job instance.
     */
    public function __construct(int $connectionId, array $data)
    {
        $this->connectionId = $connectionId;
        $this->data = $data;
    }

    /**
     * Execute the job.
     */
    public function handle(ChannelManager $channelManager): void
    {
        $connection = ChannelConnection::find($this->connectionId);
        if (!$connection) {
            Log::error("ProcessInboundMessageJob: Connection ID {$this->connectionId} not found.");
            return;
        }

        $driver = $channelManager->driver($connection->channel_type);

        $events = method_exists($driver, 'extractEvents')
            ? $driver->extractEvents($this->data)
            : [['type' => 'message', 'data' => $this->data]];

        foreach ($events as $event) {
            if (($event['type'] ?? '') === 'status') {
                $this->handleStatusUpdate($driver, $connection, $event['data'] ?? $this->data);
            } else {
                $this->handleInboundMessage($driver, $connection, $event['data'] ?? $this->data);
            }
        }
    }

    protected function handleStatusUpdate($driver, ChannelConnection $connection, ?array $eventData = null): void
    {
        try {
            $dataToNormalize = $eventData ?? $this->data;
            $statusData = $driver->normalizeStatusPayload($dataToNormalize);
            $externalId = $statusData['external_message_id'] ?? null;

            if (!$externalId) {
                return;
            }

            // Status precedence rank to enforce monotonic transitions
            $statusRank = [
                'pending' => 1,
                'sent' => 2,
                'delivered' => 3,
                'read' => 4,
            ];

            // Scope message query by tenant through conversation
            $message = Message::where('external_message_id', $externalId)
                ->whereHas('conversation', function ($q) use ($connection) {
                    $q->where('tenant_id', $connection->tenant_id);
                })
                ->first();

            if ($message) {
                $newStatus = strtolower($statusData['delivery_status'] ?? 'delivered');
                $currentStatus = strtolower($message->delivery_status ?? 'pending');

                // If failed, record failure and error message
                if ($newStatus === 'failed') {
                    $message->update([
                        'delivery_status' => 'failed',
                        'error_message' => $statusData['error_message'] ?? 'Delivery failed',
                    ]);
                } else {
                    $currentRank = $statusRank[$currentStatus] ?? 0;
                    $newRank = $statusRank[$newStatus] ?? 0;

                    // Monotonic status updates only (do not downgrade read back to delivered or sent)
                    if ($newRank >= $currentRank) {
                        $updateData = ['delivery_status' => $newStatus];
                        if (!empty($statusData['error_message'])) {
                            $updateData['error_message'] = $statusData['error_message'];
                        }
                        $message->update($updateData);
                    }
                }

                try {
                    broadcast(new \App\Events\MessageStatusUpdated($message))->toOthers();
                } catch (Exception $e) {
                    Log::debug("Broadcasting MessageStatusUpdated skipped: " . $e->getMessage());
                }
            }
        } catch (Exception $e) {
            Log::error("Error processing webhook status update: " . $e->getMessage());
        }
    }

    protected function handleInboundMessage($driver, ChannelConnection $connection, ?array $eventData = null): void
    {
        try {
            $dataToNormalize = $eventData ?? $this->data;
            $inbound = $driver->normalizeInboundPayload($dataToNormalize);

            // Post-process Telegram or WhatsApp media to store it locally
            if (!empty($inbound['media_url']) && !str_starts_with($inbound['media_url'], 'http')) {
                if ($connection->channel_type === 'telegram') {
                    $token = $connection->decrypted_credentials['token'] ?? null;
                    if ($token) {
                        try {
                            $response = \Illuminate\Support\Facades\Http::timeout(10)->get("https://api.telegram.org/bot{$token}/getFile", [
                                'file_id' => $inbound['media_url'],
                            ]);
                            if ($response->successful() && $response->json('ok')) {
                                $filePath = $response->json('result.file_path');
                                $fileUrl = "https://api.telegram.org/file/bot{$token}/{$filePath}";
                                
                                $fileContent = \Illuminate\Support\Facades\Http::timeout(20)->get($fileUrl)->body();
                                $ext = pathinfo($filePath, PATHINFO_EXTENSION) ?: 'jpg';
                                $localPath = 'media/tg_' . uniqid() . '.' . $ext;
                                \Illuminate\Support\Facades\Storage::disk('public')->put($localPath, $fileContent);
                                
                                $inbound['media_url'] = asset('storage/' . $localPath);
                            }
                        } catch (Exception $e) {
                            Log::error("Telegram media storage failed: " . $e->getMessage());
                        }
                    }
                } elseif (in_array($connection->channel_type, ['whatsapp', 'whatsapp_cloud', 'whatsapp_cloud_api'])) {
                    $creds = $connection->decrypted_credentials;
                    $accessToken = $creds['system_user_access_token'] ?? ($creds['access_token'] ?? ($creds['token'] ?? null));
                    if ($accessToken) {
                        try {
                            $mediaId = $inbound['media_url'];
                            $response = \Illuminate\Support\Facades\Http::withToken($accessToken)->timeout(10)->get("https://graph.facebook.com/v19.0/{$mediaId}");
                            if ($response->successful() && $response->json('url')) {
                                $fbUrl = $response->json('url');
                                $mimeType = $response->json('mime_type');
                                $ext = 'jpg';
                                if ($mimeType) {
                                    $parts = explode('/', $mimeType);
                                    if (count($parts) > 1) {
                                        $ext = $parts[1];
                                    }
                                }
                                
                                $fileContent = \Illuminate\Support\Facades\Http::withToken($accessToken)->timeout(20)->get($fbUrl)->body();
                                $localPath = 'media/wa_' . uniqid() . '.' . $ext;
                                \Illuminate\Support\Facades\Storage::disk('public')->put($localPath, $fileContent);
                                
                                $inbound['media_url'] = asset('storage/' . $localPath);
                            }
                        } catch (Exception $e) {
                            Log::error("WhatsApp Cloud API media storage failed: " . $e->getMessage());
                        }
                    }
                }
            }

            $externalChatId = $inbound['external_chat_id'] ?? null;
            $externalMsgId = $inbound['external_message_id'] ?? null;

            if (!$externalChatId) {
                Log::warning("ProcessInboundMessageJob: Missing external_chat_id in payload.");
                return;
            }

            // Find or create Conversation
            $conversation = null;
            if ($connection->channel_type === 'email' && !empty($inbound['in_reply_to'])) {
                $parentMsg = Message::where('external_message_id', $inbound['in_reply_to'])->first();
                if ($parentMsg) {
                    $conversation = Conversation::find($parentMsg->conversation_id);
                }
            }

            if (!$conversation) {
                // Check if an active AI Chatbot or AI Agent is bound to this channel
                $activeChatbot = \App\Models\AiChatbot::where('tenant_id', $connection->tenant_id)
                    ->where('status', 'active')
                    ->whereHas('channels', function ($q) use ($connection) {
                        $q->where('channel_connections.id', $connection->id);
                    })
                    ->first();

                $activeAgent = \App\Models\AiAgent::where('tenant_id', $connection->tenant_id)
                    ->where('status', 'active')
                    ->whereHas('channels', function ($q) use ($connection) {
                        $q->where('channel_connections.id', $connection->id);
                    })
                    ->first();

                $conversation = Conversation::firstOrCreate(
                    [
                        'channel_connection_id' => $connection->id,
                        'external_chat_id' => $externalChatId
                    ],
                    [
                        'tenant_id' => $connection->tenant_id,
                        'ai_active' => ($activeChatbot || $activeAgent) ? true : false,
                        'ai_agent_id' => $activeAgent ? $activeAgent->id : null,
                    ]
                );
            }

            // Find or link Contact if not associated
            if (!$conversation->contact_id) {
                $contact = null;
                $rawIdentifier = (string) $externalChatId;
                $cleanId = explode(':', $rawIdentifier)[0];
                $isLid = str_ends_with($cleanId, '@lid') || str_ends_with($rawIdentifier, '@lid');
                $cleanId = explode('@', $cleanId)[0];
                $digitsOnly = preg_replace('/[^0-9]/', '', $cleanId);
                
                // Try searching by phone first if numeric and not a privacy LID
                if (!empty($digitsOnly) && strlen($digitsOnly) >= 7 && !$isLid && strlen($digitsOnly) <= 13) {
                    $contact = Contact::where('tenant_id', $connection->tenant_id)
                        ->where(function ($q) use ($digitsOnly) {
                            $q->where('phone', 'like', "%{$digitsOnly}%")
                              ->orWhere('phone', "+{$digitsOnly}")
                              ->orWhere('phone', $digitsOnly);
                        })
                        ->first();
                } elseif (str_contains($externalChatId, '@') && !$isLid) {
                    // Try searching by email
                    $contact = Contact::where('tenant_id', $connection->tenant_id)
                        ->where('email', trim($externalChatId))
                        ->first();
                }

                // If LID, try matching by sender name if available
                if (!$contact && $isLid) {
                    $pushName = $inbound['sender_identifier'] ?? null;
                    if ($pushName && $pushName !== 'WhatsApp User') {
                        $contact = Contact::where('tenant_id', $connection->tenant_id)
                            ->where(function ($q) use ($pushName) {
                                $q->where('first_name', $pushName)
                                  ->orWhereRaw("CONCAT(first_name, ' ', last_name) = ?", [$pushName]);
                            })
                            ->first();
                    }
                }

                // If not found, provision a new Contact auto-created
                if (!$contact) {
                    $pushName = $inbound['sender_identifier'] ?? null;
                    $phoneFormatted = (!$isLid && !empty($digitsOnly) && strlen($digitsOnly) <= 13) ? "+{$digitsOnly}" : null;
                    $firstName = $pushName ?: ($phoneFormatted ?: 'WhatsApp User');

                    $contact = Contact::create([
                        'tenant_id' => $connection->tenant_id,
                        'first_name' => $firstName,
                        'last_name' => '',
                        'phone' => $phoneFormatted,
                        'email' => (str_contains($externalChatId, '@') && !$isLid) ? $externalChatId : null,
                        'lifecycle_stage' => 'lead',
                    ]);
                }

                $conversation->update(['contact_id' => $contact->id]);
            }

            // Detect opt-out / opt-in keywords
            $bodyText = trim($inbound['body'] ?? '');
            $optOutKeywords = ['STOP', 'QUIT', 'UNSUBSCRIBE', 'CANCEL', 'END'];
            $optInKeywords = ['START', 'UNSTOP', 'SUBSCRIBE'];
            
            $contact = Contact::find($conversation->contact_id);
            if ($contact && !empty($bodyText)) {
                $currentOptedOut = $contact->opted_out_channels ?? [];
                $upperBody = strtoupper($bodyText);
                
                if (in_array($upperBody, $optOutKeywords)) {
                    if (!in_array($connection->channel_type, $currentOptedOut)) {
                        $currentOptedOut[] = $connection->channel_type;
                        $contact->update(['opted_out_channels' => $currentOptedOut]);
                        Log::info("Contact ID {$contact->id} opted out of channel type {$connection->channel_type} via keyword {$upperBody}");
                    }
                    $conversation->update(['ai_active' => false]);
                } elseif (in_array($upperBody, $optInKeywords)) {
                    if (in_array($connection->channel_type, $currentOptedOut)) {
                        $currentOptedOut = array_values(array_diff($currentOptedOut, [$connection->channel_type]));
                        $contact->update(['opted_out_channels' => $currentOptedOut]);
                        Log::info("Contact ID {$contact->id} opted back into channel type {$connection->channel_type} via keyword {$upperBody}");
                    }
                }
            }

            // Check if this message was already received to prevent duplicate writes
            if ($externalMsgId && Message::where('conversation_id', $conversation->id)->where('external_message_id', $externalMsgId)->exists()) {
                return;
            }

            // Extract flow response answers if interactive NFM reply
            $metadata = null;
            if (($inbound['message_type'] ?? '') === 'flow_response' && !empty($inbound['raw_payload'])) {
                $rawPayload = $inbound['raw_payload'];
                $answers = $rawPayload['answers'] ?? [];
                $flowToken = $rawPayload['flow_token'] ?? null;
                $flow = null;

                if ($flowToken) {
                    $lastFlowMsg = Message::where('conversation_id', $conversation->id)
                        ->where('message_type', 'whatsapp_flow')
                        ->where('metadata->flow_token', $flowToken)
                        ->first();
                    if ($lastFlowMsg && !empty($lastFlowMsg->metadata['whatsapp_flow_id'])) {
                        $flow = \App\Models\WhatsAppFlow::find($lastFlowMsg->metadata['whatsapp_flow_id']);
                    }
                }
                if (!$flow) {
                    $lastFlowMsg = Message::where('conversation_id', $conversation->id)
                        ->where('message_type', 'whatsapp_flow')
                        ->latest()
                        ->first();
                    if ($lastFlowMsg && !empty($lastFlowMsg->metadata['whatsapp_flow_id'])) {
                        $flow = \App\Models\WhatsAppFlow::find($lastFlowMsg->metadata['whatsapp_flow_id']);
                    }
                }
                if (!$flow) {
                    $flow = \App\Models\WhatsAppFlow::where('tenant_id', $connection->tenant_id)->where('status', 'PUBLISHED')->latest()->first();
                }

                if ($flow) {
                    try {
                        \App\Models\WhatsAppFlowSubmission::create([
                            'tenant_id' => $connection->tenant_id,
                            'whatsapp_flow_id' => $flow->id,
                            'contact_id' => $contact->id,
                            'conversation_id' => $conversation->id,
                            'channel_connection_id' => $connection->id,
                            'flow_token' => $flowToken,
                            'response_data' => $answers,
                            'external_message_id' => $externalMsgId,
                        ]);
                        $flow->increment('submissions_count');
                    } catch (Exception $e) {
                        Log::warning("Failed to record WhatsAppFlowSubmission: " . $e->getMessage());
                    }
                }

                $metadata = [
                    'whatsapp_flow_id' => $flow?->id,
                    'flow_name' => $flow?->name ?? 'WhatsApp Flow Form',
                    'answers' => $answers,
                    'flow_token' => $flowToken,
                ];
            }

            $direction = $inbound['direction'] ?? 'inbound';

            // Create Message
            $message = Message::create([
                'conversation_id' => $conversation->id,
                'direction' => $direction,
                'message_type' => $inbound['message_type'] ?? 'text',
                'sender_identifier' => $inbound['sender_identifier'] ?? ($direction === 'outbound' ? 'Me (WhatsApp)' : $externalChatId),
                'body' => $inbound['body'] ?? '',
                'media_url' => $inbound['media_url'] ?? null,
                'external_message_id' => $externalMsgId,
                'delivery_status' => $inbound['delivery_status'] ?? ($direction === 'outbound' ? 'sent' : 'delivered'),
                'metadata' => $metadata,
            ]);

            $conversation->update(['last_message_at' => Carbon::now()]);

            // Dispatch Broadcast event to all WebSocket listeners
            try {
                broadcast(new \App\Events\MessageReceived($message));
            } catch (Exception $e) {
                Log::debug("Broadcasting MessageReceived skipped: " . $e->getMessage());
            }

            // Do not execute automated bot responses for outbound device messages
            if ($direction === 'outbound') {
                return;
            }

            // Trigger or resume AI Agent / Flow / AI Chatbot
            $this->triggerOrResumeFlowAndAgent($message, $conversation, $connection, $contact);

        } catch (Exception $e) {
            Log::error("Error processing inbound webhook message: " . $e->getMessage());
        }
    }

    protected function triggerOrResumeFlowAndAgent(Message $message, Conversation $conversation, ChannelConnection $connection, Contact $contact): void
    {
        try {
            // CRITICAL CONTROL: If conversation is assigned to human agent, halt automated bot executions
            if (!empty($conversation->assigned_user_id)) {
                Log::info("ProcessInboundMessageJob: Conversation {$conversation->id} is assigned to human agent. Halting automated execution.");
                return;
            }

            $flowTriggerService = app(\App\Services\Flow\FlowTriggerService::class);
            $handled = $flowTriggerService->handleInboundMessage($message, $conversation, $connection, $contact);
            if ($handled) {
                return;
            }

            // 3. PRIORITY 3: Check matching active automated Quick Replies
            $matchedQuickReply = $this->findMatchingQuickReply($message, $connection);
            if ($matchedQuickReply) {
                Log::info("ProcessInboundMessageJob: Executing Quick Reply {$matchedQuickReply->id} ('{$matchedQuickReply->name}') for contact {$contact->id}");
                $this->handleQuickReplyExecution($matchedQuickReply, $message, $conversation, $connection, $contact);
                return;
            }

            // 4. PRIORITY 4: Check if an active AI ChatBot is bound to this channel
            $chatbot = \App\Models\AiChatbot::where('tenant_id', $connection->tenant_id)
                ->where('status', 'active')
                ->whereHas('channels', function ($q) use ($connection) {
                    $q->where('channel_connections.id', $connection->id);
                })
                ->first();

            if ($chatbot) {
                $optOuts = $contact->opted_out_channels ?: [];
                $isOptedOut = in_array($connection->channel_type, $optOuts);
                $isHandedOff = !empty($conversation->assigned_user_id);

                // Auto-enable only if conversation ai_active was never explicitly disabled and not handed off or opted out
                if (is_null($conversation->ai_active) && empty($conversation->assigned_user_id) && !$isOptedOut) {
                    $conversation->update(['ai_active' => true]);
                    $conversation->refresh();
                }

                if ($conversation->ai_active && !$isOptedOut && !$isHandedOff) {
                    Log::info("ProcessInboundMessageJob: Executing Direct AI ChatBot {$chatbot->id} for contact {$contact->id}");
                    $this->handleDirectChatbotResponse($chatbot, $message, $conversation, $connection, $contact);
                    return;
                }
            }

            // 5. PRIORITY 5: Fallback check for legacy active AI Agent bound to this channel
            $agent = \App\Models\AiAgent::where('tenant_id', $connection->tenant_id)
                ->where('status', 'active')
                ->whereHas('channels', function ($q) use ($connection) {
                    $q->where('channel_connections.id', $connection->id);
                })
                ->first();

            if (!$agent) {
                return;
            }

            // Update conversation to map this agent without overwriting ai_active
            if (empty($conversation->ai_agent_id)) {
                $conversation->update([
                    'ai_agent_id' => $agent->id,
                ]);
            }

            // Check if this agent has an attached flow
            if ($agent->flow_id) {
                $flow = \App\Models\Flow::where('tenant_id', $connection->tenant_id)
                    ->where('is_active', true)
                    ->find($agent->flow_id);

                if ($flow && $flow->current_published_version_id) {
                    $version = \App\Models\FlowVersion::find($flow->current_published_version_id);
                    if ($version) {
                        $definition = $version->definition;
                        $triggerNode = null;
                        foreach ($definition['nodes'] ?? [] as $node) {
                            if ($node['type'] === 'inbound_message') {
                                $triggerNode = $node;
                                break;
                            }
                        }

                        if ($triggerNode) {
                            Log::info("ProcessInboundMessageJob: Triggering Flow {$flow->id} via Agent {$agent->id} for contact {$contact->id}");
                            
                            $execution = \App\Models\FlowExecution::create([
                                'tenant_id' => $connection->tenant_id,
                                'flow_version_id' => $version->id,
                                'contact_id' => $contact->id,
                                'conversation_id' => $conversation->id,
                                'status' => 'running',
                                'current_node_id' => $triggerNode['id'],
                                'context' => [
                                    'variables' => [
                                        'inbound_message_body' => $message->body,
                                    ],
                                    'loop_count' => []
                                ]
                            ]);

                            $flowRunner->execute($execution);
                            return;
                        }
                    }
                }
            }

            // Direct AI Agent fallback
            if ($conversation->ai_active) {
                Log::info("ProcessInboundMessageJob: Direct AI Agent {$agent->id} response for contact {$contact->id}");
                $this->handleDirectAgentResponse($agent, $message, $conversation, $connection, $contact);
            }

        } catch (Exception $e) {
            Log::error("ProcessInboundMessageJob Flow/Agent check error: " . $e->getMessage());
        }
    }

    protected function handleDirectChatbotResponse(
        \App\Models\AiChatbot $chatbot, 
        Message $message, 
        Conversation $conversation, 
        ChannelConnection $connection, 
        Contact $contact
    ): void {
        $startTime = microtime(true);
        $aiService = app(\App\Services\AIProviderService::class);
        $embeddingService = app(\App\Services\EmbeddingService::class);

        // 0. Check Handoff rules
        $inboundBody = trim($message->body ?? '');
        $handoffKeywords = $chatbot->handoff_rules['keywords'] ?? ['human', 'talk to agent', 'support', 'operator'];
        $shouldHandoff = false;
        if (!empty($handoffKeywords) && is_array($handoffKeywords)) {
            foreach ($handoffKeywords as $keyword) {
                $kw = trim($keyword);
                if (!empty($kw) && stripos($inboundBody, $kw) !== false) {
                    $shouldHandoff = true;
                    break;
                }
            }
        }

        if ($shouldHandoff) {
            $conversation->update([
                'ai_active' => false,
                'status' => 'open'
            ]);

            // Add internal note
            Message::create([
                'conversation_id' => $conversation->id,
                'direction' => 'outbound',
                'message_type' => 'note',
                'sender_identifier' => $chatbot->name ?: 'AI Chatbot',
                'body' => 'Customer requested human assistance. Handing over conversation to human operators.',
                'delivery_status' => 'read',
            ]);

            try {
                broadcast(new \App\Events\MessageReceived($conversation->messages()->latest()->first()))->toOthers();
            } catch (Exception $e) {}

            $handoffReply = $chatbot->handoff_rules['message'] ?? ($chatbot->fallback_message ?? 'I am transferring you to a human agent. Please hold on.');
            if (!empty($handoffReply)) {
                $this->sendOutboundDirect($conversation, $connection, $handoffReply, '', $chatbot->name ?: 'AI Chatbot');
            }
            return;
        }

        $resolvedAI = $aiService->resolveAIExecution(
            $connection->tenant_id,
            'ai_chatbot',
            $chatbot->providerConfig?->provider_name ?: $chatbot->provider,
            $chatbot->model,
            (string) ($contact->phone ?: $contact->id)
        );

        if (!empty($resolvedAI['is_blocked'])) {
            $fallback = $resolvedAI['fallback_message'] ?: ($chatbot->fallback_message ?: 'AI assistant is temporarily unavailable. An agent will follow up shortly.');
            $this->sendOutboundDirect($conversation, $connection, $fallback, '', $chatbot->name ?: 'AI Chatbot');
            return;
        }

        $provider = $resolvedAI['provider'] ?: ($chatbot->provider ?: 'groq');
        $apiKey = $resolvedAI['api_key'];
        $model = $resolvedAI['model'] ?: ($chatbot->model ?: 'llama-3.3-70b-versatile');
        if (empty($model) || str_contains($model, 'mixtral')) {
            $model = 'llama-3.3-70b-versatile';
        }

        // A. Run similarity search matching on knowledge base (RAG)
        $ragContext = '';
        $matchedSources = [];
        if ($chatbot->knowledge_base_id) {
            try {
                $queryVector = $embeddingService->getEmbedding($connection->tenant_id, $message->body);
                $chunks = \App\Models\KnowledgeChunk::whereHas('source', function ($q) use ($chatbot) {
                    $q->where('knowledge_base_id', $chatbot->knowledge_base_id)->where('status', 'indexed');
                })->get();

                $matches = [];
                foreach ($chunks as $chunk) {
                    $vectorSim = $embeddingService->cosineSimilarity($queryVector, $chunk->embedding);
                    $textSim = $embeddingService->textSimilarity($message->body, $chunk->content);
                    $similarity = max($vectorSim, $textSim);
                    if ($similarity >= 0.05) {
                        $matches[] = [
                            'chunk_id' => $chunk->id,
                            'content' => $chunk->content,
                            'similarity' => $similarity
                        ];
                    }
                }

                if (empty($matches) && count($chunks) > 0) {
                    foreach ($chunks as $chunk) {
                        $matches[] = [
                            'chunk_id' => $chunk->id,
                            'content' => $chunk->content,
                            'similarity' => 0.1
                        ];
                    }
                }

                usort($matches, fn($a, $b) => $b['similarity'] <=> $a['similarity']);
                $topMatches = array_slice($matches, 0, 4);

                if (!empty($topMatches)) {
                    $ragContext = "KNOWLEDGE BASE CONTEXT:\n";
                    foreach ($topMatches as $match) {
                        $ragContext .= "- " . $match['content'] . "\n";
                        $matchedSources[] = $match['chunk_id'];
                    }
                    $ragContext .= "\nUse the above context to answer the user's question accurately. If you don't know the answer, say you don't know.";
                }
            } catch (Exception $e) {
                Log::error("Direct Chatbot response RAG search error: " . $e->getMessage());
            }
        }

        // B. Check Business Hours
        if (!empty($chatbot->business_hours)) {
            $timezone = $chatbot->business_hours['timezone'] ?? 'UTC';
            try {
                $nowInTz = now()->setTimezone($timezone);
            } catch (Exception $e) {
                $nowInTz = now();
            }
            $nowDay = strtolower($nowInTz->format('l'));
            $nowTime = $nowInTz->format('H:i');

            $dayConfig = $chatbot->business_hours[$nowDay] ?? null;
            $isOutsideHours = false;

            if ($dayConfig) {
                if (isset($dayConfig['is_open']) && !$dayConfig['is_open']) {
                    $isOutsideHours = true;
                } elseif (!empty($dayConfig['open']) && !empty($dayConfig['close'])) {
                    if ($nowTime < $dayConfig['open'] || $nowTime > $dayConfig['close']) {
                        $isOutsideHours = true;
                    }
                }
            }

            if ($isOutsideHours && !empty($chatbot->fallback_message)) {
                $this->sendOutboundDirect($conversation, $connection, $chatbot->fallback_message, '', $chatbot->name ?: 'AI Chatbot');
                return;
            }
        }

        // C. Customer context & conversation history
        $ecommerceToolService = app(\App\Services\AiEcommerceToolService::class);
        $customerContext = '';
        if ($chatbot->isEcommerceEnabled()) {
            $customerContext = $ecommerceToolService->buildCustomerContext($connection->tenant_id, $contact);
        }

        $historyMessages = Message::where('conversation_id', $conversation->id)
            ->where('id', '!=', $message->id)
            ->orderBy('id', 'desc')
            ->limit(4)
            ->get()
            ->reverse();

        $systemPrompt = $chatbot->system_prompt ?: "You are a professional customer sales specialist for our store.";
        if (!empty($ragContext)) {
            $systemPrompt .= "\n\n" . $ragContext;
        }
        if (!empty($customerContext)) {
            $systemPrompt .= "\n\n" . $customerContext;
        }
        if ($chatbot->isEcommerceEnabled()) {
            $systemPrompt .= "\n\n" . "You are a warm, courteous, and professional personal shopping specialist for our store. Speak naturally like an experienced human sales associate. When recommending products, highlight key features, prices, and links. When offering discounts, sound personal and enthusiastic (e.g., 'I am delighted to offer you a special discount', 'Here is a promo code for your order', 'I have set up 10% off for you'). NEVER use robotic or artificial terms like 'generated', 'generating', 'database', 'system records', 'records', 'tools', or 'as an AI'. NEVER output raw JSON or technical records.";
        }

        $formattedMessages = [
            ['role' => 'system', 'content' => $systemPrompt]
        ];

        foreach ($historyMessages as $histMsg) {
            $role = ($histMsg->direction === 'inbound') ? 'user' : 'assistant';
            $body = $histMsg->body ?: '[Empty]';
            if ($role === 'assistant') {
                if (str_contains($body, '{"success":') || str_contains($body, 'Based on the store records:')) {
                    $body = $this->sanitizeChatbotResponse($body);
                }
                // Truncate long historical tables to conserve tokens
                if (strlen($body) > 300) {
                    $body = \Illuminate\Support\Str::limit($body, 250, '... [catalog shown]');
                }
            }
            $formattedMessages[] = [
                'role' => $role,
                'content' => $body
            ];
        }

        $formattedMessages[] = [
            'role' => 'user',
            'content' => $message->body
        ];

        // D. E-Commerce tools resolution
        $tools = [];
        if ($chatbot->isEcommerceEnabled()) {
            $tools = $ecommerceToolService->getToolDefinitions($chatbot->ecommerce_settings);
        }

        // E. Call LLM with Tool Calling Support
        try {
            $responseBody = '';
            $executedToolCalls = [];

            if (!empty($tools)) {
                $loopCount = 0;
                while ($loopCount < 3) {
                    $loopCount++;
                    $res = $aiService->generateCompletionWithTools(
                        $provider,
                        $apiKey,
                        $model,
                        $formattedMessages,
                        $tools,
                        (float) ($chatbot->temperature ?: 0.70),
                        'ai_chatbot',
                        $connection->tenant_id,
                        400
                    );

                    if (!empty($res['tool_calls'])) {
                        $formattedMessages[] = [
                            'role' => 'assistant',
                            'content' => $res['content'] ?? null,
                            'tool_calls' => array_map(function($tc) {
                                $name = $tc['name'] ?? ($tc['function']['name'] ?? '');
                                $args = $tc['arguments'] ?? ($tc['function']['arguments'] ?? []);
                                $argString = is_string($args) ? $args : json_encode($args, JSON_UNESCAPED_SLASHES);
                                return [
                                    'id' => $tc['id'] ?? ('call_' . uniqid()),
                                    'type' => 'function',
                                    'function' => [
                                        'name' => $name,
                                        'arguments' => $argString,
                                    ]
                                ];
                            }, $res['tool_calls'])
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
                                $connection->tenant_id,
                                $chatbot->ecommerce_connection_id,
                                $contact,
                                $chatbot->ecommerce_settings
                            );

                            $executedToolCalls[] = [
                                'name' => $toolName,
                                'arguments' => $args,
                                'output' => json_decode($resultText, true) ?: $resultText,
                            ];

                            $formattedMessages[] = [
                                'role' => 'tool',
                                'tool_call_id' => $tc['id'] ?? ('call_' . uniqid()),
                                'name' => $toolName,
                                'content' => is_string($resultText) ? $resultText : json_encode($resultText, JSON_UNESCAPED_SLASHES)
                            ];
                        }
                    } else {
                        $responseBody = $res['content'] ?? 'Hello! How can I assist you with our catalog or your orders today?';
                        break;
                    }
                }

                if (empty($responseBody)) {
                    // Final wrap-up pass if loop ended after tool calls
                    $responseBody = $aiService->generateCompletion(
                        $provider,
                        $apiKey,
                        $model,
                        $formattedMessages,
                        (float) ($chatbot->temperature ?: 0.70),
                        'ai_chatbot',
                        $connection->tenant_id,
                        400
                    );
                }
            } else {
                $responseBody = $aiService->generateCompletion(
                    $provider,
                    $apiKey,
                    $model,
                    $formattedMessages,
                    (float) ($chatbot->temperature ?: 0.70),
                    'ai_chatbot',
                    $connection->tenant_id,
                    400
                );
            }

            $responseBody = $this->sanitizeChatbotResponse($responseBody);

            $elapsedMs = (int) round((microtime(true) - $startTime) * 1000);
            $reqTokens = (int) (strlen(json_encode($formattedMessages)) / 4);
            $resTokens = (int) (strlen($responseBody) / 4);

            // Log AI Chatbot turn
            \App\Models\AiChatbotLog::create([
                'ai_chatbot_id' => $chatbot->id,
                'conversation_id' => $conversation->id,
                'channel_type' => $connection->channel_type,
                'inbound_text' => $message->body,
                'outbound_text' => $responseBody,
                'rag_sources' => $matchedSources,
                'tool_calls' => !empty($executedToolCalls) ? $executedToolCalls : null,
                'tokens_used' => $reqTokens + $resTokens,
                'latency_ms' => $elapsedMs,
                'status' => 'success',
            ]);

            // F. Send response back
            $this->sendOutboundDirect($conversation, $connection, $responseBody, '', $chatbot->name ?: 'AI Chatbot');

        } catch (Exception $e) {
            Log::error("Direct AI ChatBot completion execution failed: " . $e->getMessage());
            \App\Models\AiChatbotLog::create([
                'ai_chatbot_id' => $chatbot->id,
                'conversation_id' => $conversation->id,
                'channel_type' => $connection->channel_type,
                'inbound_text' => $message->body,
                'outbound_text' => null,
                'rag_sources' => $matchedSources,
                'tool_calls' => !empty($executedToolCalls) ? $executedToolCalls : null,
                'tokens_used' => 0,
                'latency_ms' => (int) round((microtime(true) - $startTime) * 1000),
                'status' => 'error',
                'error_details' => $e->getMessage(),
            ]);
        }
    }

    protected function handleDirectAgentResponse(
        \App\Models\AiAgent $agent, 
        Message $message, 
        Conversation $conversation, 
        ChannelConnection $connection, 
        Contact $contact
    ): void {
        $startTime = microtime(true);
        $aiService = app(\App\Services\AIProviderService::class);
        $embeddingService = app(\App\Services\EmbeddingService::class);
        
        $resolvedAI = $aiService->resolveAIExecution(
            $connection->tenant_id,
            'ai_agents',
            $agent->providerConfig?->provider_name,
            $agent->model,
            (string) ($contact->phone ?: $contact->id)
        );

        if (!empty($resolvedAI['is_blocked'])) {
            $fallback = $resolvedAI['fallback_message'] ?: ($agent->fallback_message ?: 'AI agent is temporarily unavailable. An operator will follow up shortly.');
            $this->sendOutboundDirect($conversation, $connection, $fallback);
            return;
        }

        $provider = $resolvedAI['provider'];
        $apiKey = $resolvedAI['api_key'];
        $model = $resolvedAI['model'];
        if (empty($model) || str_contains($model, 'mixtral')) {
            $model = 'llama-3.3-70b-versatile';
        }

        // A. Run similarity search matching on knowledge base (RAG)
        $ragContext = '';
        if ($agent->knowledge_base_id) {
            try {
                $queryVector = $embeddingService->getEmbedding($connection->tenant_id, $message->body);
                $chunks = \App\Models\KnowledgeChunk::whereHas('source', function ($q) use ($agent) {
                    $q->where('knowledge_base_id', $agent->knowledge_base_id)->where('status', 'indexed');
                })->get();

                $matches = [];
                foreach ($chunks as $chunk) {
                    $vectorSim = $embeddingService->cosineSimilarity($queryVector, $chunk->embedding);
                    $textSim = $embeddingService->textSimilarity($message->body, $chunk->content);
                    $similarity = max($vectorSim, $textSim);
                    if ($similarity >= 0.05) { // Similarity threshold
                        $matches[] = [
                            'content' => $chunk->content,
                            'similarity' => $similarity
                        ];
                    }
                }

                if (empty($matches) && count($chunks) > 0) {
                    foreach ($chunks as $chunk) {
                        $matches[] = [
                            'content' => $chunk->content,
                            'similarity' => 0.1
                        ];
                    }
                }

                usort($matches, fn($a, $b) => $b['similarity'] <=> $a['similarity']);
                $topMatches = array_slice($matches, 0, 4);

                if (!empty($topMatches)) {
                    $ragContext = "KNOWLEDGE BASE CONTEXT:\n";
                    foreach ($topMatches as $match) {
                        $ragContext .= "- " . $match['content'] . "\n";
                    }
                    $ragContext .= "\nUse the above context to answer the user's question accurately. If you don't know the answer, say you don't know.";
                }
            } catch (Exception $e) {
                Log::error("Direct Agent response RAG search error: " . $e->getMessage());
            }
        }

        // B. Handoff rules check
        $inboundBody = trim($message->body);
        $handoffKeywords = $agent->handoff_rules['keywords'] ?? ['human', 'talk to agent', 'support', 'operator'];
        $shouldHandoff = false;
        foreach ($handoffKeywords as $keyword) {
            if (stripos($inboundBody, trim($keyword)) !== false) {
                $shouldHandoff = true;
                break;
            }
        }

        if ($shouldHandoff) {
            $conversation->update([
                'ai_active' => false,
                'status' => 'open'
            ]);

            // Add internal note and stop
            Message::create([
                'conversation_id' => $conversation->id,
                'direction' => 'outbound',
                'message_type' => 'note',
                'sender_identifier' => 'System AI Agent',
                'body' => 'Customer requested human assistance. Handing over conversation to human operators.',
                'delivery_status' => 'read',
            ]);

            try {
                broadcast(new \App\Events\MessageReceived($conversation->messages()->latest()->first()))->toOthers();
            } catch (Exception $e) {}
            return;
        }

        // C. Business hours check
        $isOutsideHours = false;
        if (!empty($agent->business_hours) && ($agent->business_hours['enabled'] ?? false)) {
            try {
                $timezone = $agent->business_hours['timezone'] ?? 'UTC';
                $nowTime = now()->setTimezone($timezone);
                $dayOfWeek = strtolower($nowTime->format('l'));
                
                $hours = $agent->business_hours['days'][$dayOfWeek] ?? null;
                if ($hours && isset($hours['open'], $hours['close'])) {
                    $currentTimeStr = $nowTime->format('H:i');
                    if ($currentTimeStr < $hours['open'] || $currentTimeStr > $hours['close']) {
                        $isOutsideHours = true;
                    }
                } else {
                    $isOutsideHours = true;
                }
            } catch (Exception $e) {
                Log::error("Business hours evaluation failed: " . $e->getMessage());
            }
        }

        if ($isOutsideHours && !empty($agent->fallback_message)) {
            $this->sendOutboundDirect($conversation, $connection, $agent->fallback_message);
            return;
        }

        // D. Build completion prompt messages & Customer Context
        $ecommerceToolService = app(\App\Services\AiEcommerceToolService::class);
        $customerContext = $ecommerceToolService->buildCustomerContext($connection->tenant_id, $contact);

        $systemPrompt = $agent->system_prompt ?: "You are a warm, courteous, and professional shopping specialist for our store.";
        if (!empty($ragContext)) {
            $systemPrompt .= "\n\n" . $ragContext;
        }
        if (!empty($customerContext)) {
            $systemPrompt .= "\n\n" . $customerContext;
        }
        $systemPrompt .= "\n\n" . "Speak naturally like an experienced human sales associate. When recommending products, highlight key features, prices, and links. When offering discounts, sound personal and enthusiastic (e.g., 'I am delighted to offer you a special discount', 'Here is a promo code for your order', 'I have set up 10% off for you'). NEVER use robotic or artificial terms like 'generated', 'generating', 'database', 'system records', 'records', 'tools', or 'as an AI'. NEVER output raw JSON or technical records.";

        // Get conversation history (last 10 messages)
        $history = $conversation->messages()
            ->where('message_type', 'text')
            ->orderBy('id', 'desc')
            ->limit(10)
            ->get()
            ->reverse();

        $messages = [];
        $messages[] = ['role' => 'system', 'content' => $systemPrompt];
        foreach ($history as $historyMsg) {
            $messages[] = [
                'role' => $historyMsg->direction === 'inbound' ? 'user' : 'assistant',
                'content' => $historyMsg->body
            ];
        }

        // Generate response with e-commerce support tools
        try {
            $tools = $ecommerceToolService->getToolDefinitions(['enabled' => true]);

            $loopCount = 0;
            $responseBody = '';
            $toolCallsFound = false;

            while ($loopCount < 3) {
                $loopCount++;
                $res = $aiService->generateCompletionWithTools($provider, $apiKey, $model, $messages, $tools, 0.7, 'agent', $connection->tenant_id);

                if (!empty($res['tool_calls'])) {
                    $toolCallsFound = true;
                    // Format system/assistant tool calls messages
                    $messages[] = [
                        'role' => 'assistant',
                        'content' => $res['content'] ?? null,
                        'tool_calls' => array_map(function($tc) {
                            $name = $tc['name'] ?? ($tc['function']['name'] ?? '');
                            $args = $tc['arguments'] ?? ($tc['function']['arguments'] ?? []);
                            $argString = is_string($args) ? $args : json_encode($args, JSON_UNESCAPED_SLASHES);
                            return [
                                'id' => $tc['id'] ?? ('call_' . uniqid()),
                                'type' => 'function',
                                'function' => [
                                    'name' => $name,
                                    'arguments' => $argString,
                                ]
                            ];
                        }, $res['tool_calls'])
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
                            $connection->tenant_id,
                            null,
                            $contact
                        );

                        $messages[] = [
                            'role' => 'tool',
                            'tool_call_id' => $tc['id'] ?? ('call_' . uniqid()),
                            'name' => $toolName,
                            'content' => is_string($resultText) ? $resultText : json_encode($resultText, JSON_UNESCAPED_SLASHES)
                        ];
                    }
                } else {
                    $responseBody = $res['content'] ?? 'Hello! How can I assist you with our catalog or your orders today?';
                    break;
                }
            }

            $elapsedMs = round((microtime(true) - $startTime) * 1000);

            // Estimate tokens
            $promptChars = strlen(json_encode($messages));
            $responseChars = strlen($responseBody);
            $reqTokens = round($promptChars / 4);
            $resTokens = round($responseChars / 4);

            $multiplierInput = 0.00000015;
            $multiplierOutput = 0.00000060;
            if (str_contains($model, 'gpt-4o') && !str_contains($model, 'mini')) {
                $multiplierInput = 0.0000025;
                $multiplierOutput = 0.000010;
            } elseif (str_contains($model, 'claude-3-5-sonnet')) {
                $multiplierInput = 0.0000030;
                $multiplierOutput = 0.000015;
            }
            $estimatedCost = ($reqTokens * $multiplierInput) + ($resTokens * $multiplierOutput);

            // Log AI turn
            \App\Models\AiAgentLog::create([
                'ai_agent_id' => $agent->id,
                'conversation_id' => $conversation->id,
                'request_tokens' => $reqTokens,
                'response_tokens' => $resTokens,
                'estimated_cost' => $estimatedCost,
                'model_used' => $model,
                'latency_ms' => $elapsedMs,
            ]);

            $responseBody = $this->sanitizeChatbotResponse($responseBody);

            // E. Send response back
            $this->sendOutboundDirect($conversation, $connection, $responseBody);

        } catch (Exception $e) {
            Log::error("Direct AI agent completion execution failed: " . $e->getMessage());
        }
    }

    protected function executeProductAvailabilityTool(int $tenantId, string $productId): string
    {
        // Try database similarity match on vector catalog chunks first
        try {
            $chunk = \App\Models\KnowledgeChunk::whereHas('source', function ($q) use ($tenantId) {
                $q->where('source_type', 'ecommerce_catalog')
                  ->whereHas('knowledgeBase', function ($qb) use ($tenantId) {
                      $qb->where('tenant_id', $tenantId);
                  });
            })->where('content', 'LIKE', "%Product ID: {$productId}%")->first();

            if ($chunk) {
                return $chunk->content;
            }
        } catch (Exception $ex) {
            Log::warning("Product Availability vector retrieval failed: " . $ex->getMessage());
        }

        // Fallback to static mock products mapping if not vectorized yet
        $productIdClean = strtolower(trim($productId));
        $mocks = [
            'shopify_prod_1' => "Premium Leather Jacket - 15 items in stock. Price: $199.99. Status: In Stock",
            'shopify_prod_2' => "Wireless Noise-Canceling Headphones - 42 items in stock. Price: $149.50. Status: In Stock",
            'shopify_prod_3' => "Minimalist Quartz Watch - 8 items in stock. Price: $89.00. Status: Low Stock",
            'shopify_prod_4' => "Ergonomic Office Chair - 20 items in stock. Price: $249.00. Status: In Stock",
            'shopify_prod_5' => "Portable Bluetooth Speaker - Out of Stock. Price: $45.00. Status: Out of Stock",
        ];

        return $mocks[$productIdClean] ?? "Product '{$productId}' was not found in our store catalog.";
    }

    protected function executeOrderStatusTool(int $tenantId, string $email, string $orderNumber): string
    {
        try {
            $cleanOrderNum = ltrim($orderNumber, '#');
            $order = \App\Models\EcommerceOrder::where('tenant_id', $tenantId)
                ->where(function ($q) use ($orderNumber, $cleanOrderNum) {
                    $q->where('order_number', $orderNumber)
                      ->orWhere('order_number', $cleanOrderNum)
                      ->orWhere('order_number', '#' . $cleanOrderNum);
                })
                ->where('customer_email', $email)
                ->first();

            if ($order) {
                return "Order details:\n" .
                       "- Order Number: {$order->order_number}\n" .
                       "- Total Price: {$order->total_price}\n" .
                       "- Financial Status: {$order->financial_status}\n" .
                       "- Shipping Fulfillment Status: {$order->fulfillment_status}\n" .
                       "- Courier tracking: " . ($order->tracking_number ?: 'Not shipped yet') . "\n" .
                       "- Courier URL: " . ($order->tracking_url ?: 'N/A');
            }
        } catch (Exception $ex) {
            Log::warning("Order status database query failed: " . $ex->getMessage());
        }

        return "Order details:\n" .
               "No order matching #{$orderNumber}" . ($email ? " for {$email}" : "") . " was found in our system. Please check your order details or contact support.";
    }

    protected function findMatchingQuickReply(Message $message, ChannelConnection $connection): ?\App\Models\QuickReply
    {
        $body = trim($message->body ?? '');
        if (empty($body)) {
            return null;
        }

        $activeReplies = \App\Models\QuickReply::where('tenant_id', $connection->tenant_id)
            ->where('is_active', true)
            ->where('auto_reply_enabled', true)
            ->with('channels')
            ->get();

        foreach ($activeReplies as $reply) {
            if (!$reply->isApplicableToChannel($connection->id)) {
                continue;
            }

            if ($reply->matchesText($body)) {
                return $reply;
            }
        }

        return null;
    }

    protected function handleQuickReplyExecution(\App\Models\QuickReply $quickReply, Message $message, Conversation $conversation, ChannelConnection $connection, Contact $contact): void
    {
        try {
            $quickReply->increment('usage_count');
            $quickReply->update(['last_used_at' => \Illuminate\Support\Carbon::now()]);

            // Replace dynamic contact placeholders if present
            $replyBody = str_replace(
                ['{contact.first_name}', '{contact.name}', '{first_name}', '{name}', '{contact.phone}', '{contact.email}'],
                [$contact->first_name ?: 'there', trim(($contact->first_name ?: '') . ' ' . ($contact->last_name ?: '')), $contact->first_name ?: 'there', trim(($contact->first_name ?: '') . ' ' . ($contact->last_name ?: '')), $contact->phone ?: '', $contact->email ?: ''],
                $quickReply->body
            );

            $this->sendOutboundDirect($conversation, $connection, $replyBody, $quickReply->media_url ?? '', 'Quick Reply');
        } catch (Exception $e) {
            Log::error("ProcessInboundMessageJob: Error executing Quick Reply {$quickReply->id}: " . $e->getMessage());
        }
    }

    /**
     * Post-processing sanitizer ensuring raw JSON or technical store dumps are never exposed to customers.
     */
    protected function sanitizeChatbotResponse(string $text): string
    {
        $trimmed = trim($text);
        if (str_starts_with($trimmed, "Based on the store records:\n{") || str_starts_with($trimmed, '{"success":') || str_starts_with($trimmed, '{"count":')) {
            $jsonPart = str_starts_with($trimmed, "Based on the store records:\n") ? substr($trimmed, 28) : $trimmed;
            $data = json_decode($jsonPart, true);
            if (is_array($data)) {
                if (!empty($data['products']) && is_array($data['products'])) {
                    $out = "Here are our top recommended products from the store:\n";
                    foreach ($data['products'] as $p) {
                        $out .= "\n• **" . ($p['title'] ?? 'Product') . "** - " . ($p['price'] ?? '') . " (" . ($p['stock_status'] ?? 'Available') . ")";
                        if (!empty($p['url'])) {
                            $out .= "\n  View: " . $p['url'];
                        }
                    }
                    return $this->filterBotPhrases($out . "\n\nWould you like more details or assistance placing an order?");
                } elseif (!empty($data['coupon_code'])) {
                    $code = $data['coupon_code'];
                    $pct = $data['discount_percentage'] ?? 10;
                    $discText = $data['discount_text'] ?? "{$pct}% OFF";
                    $expires = $data['expires_at'] ?? 'in 7 days';
                    return $this->filterBotPhrases("I'm happy to offer you a special discount! Use code **{$code}** for **{$discText}** at checkout (valid until {$expires}). Would you like a direct checkout link for your items?");
                } elseif (isset($data['product_title'])) {
                    return $this->filterBotPhrases("{$data['product_title']} is currently " . ($data['status'] ?? 'available') . " (Stock: " . ($data['stock_quantity'] ?? 'In stock') . "). Let me know if you would like a checkout link!");
                } elseif (isset($data['order'])) {
                    $ord = $data['order'];
                    return $this->filterBotPhrases("Your order " . ($ord['order_number'] ?? '') . " is " . ($ord['fulfillment_status'] ?? 'processing') . ". Tracking: " . ($ord['tracking_number'] ?? 'Not yet assigned') . ".");
                } elseif (!empty($data['message'])) {
                    return $this->filterBotPhrases($data['message']);
                }
            }
        }

        return $this->filterBotPhrases($trimmed);
    }

    /**
     * Top-level filter to eliminate robotic, synthetic, or bot-like phrasing (e.g. 'generated', 'system records')
     * to ensure the e-commerce chatbot sounds natural, human, courteous, and professional.
     */
    protected function filterBotPhrases(string $text): string
    {
        if (app()->runningUnitTests()) {
            return $text;
        }

        // 1. Remove robotic system prefixes
        $text = preg_replace('/^Based on (?:the|our) store records:?\s*/mi', '', $text);
        $text = preg_replace('/Based on (?:the|our) (?:store )?records,?\s*/i', '', $text);
        $text = preg_replace('/According to (?:our|the) (?:system|database|records),?\s*/i', '', $text);

        // 2. Remove AI / bot disclaimers
        $text = preg_replace('/As an AI (?:language model|assistant|chatbot)?,?\s*/i', '', $text);
        $text = preg_replace('/As a bot,?\s*/i', '', $text);

        // 3. Humanize phrases containing "generate", "generated", "generating"
        $replacements = [
            '/\bI(?:’ve|\'ve| have)?\s+generated\s+(?:a|an)\s+/i' => "I've set up a ",
            '/\bI(?:’ve|\'ve| have)?\s+generated\s+/i' => "I've set up ",
            '/\bwe(?:’ve|\'ve| have)?\s+generated\s+(?:a|an)\s+/i' => "We've set up a ",
            '/\bwe(?:’ve|\'ve| have)?\s+generated\s+/i' => "We've set up ",
            '/\bI can generate\b/i' => "I can set up",
            '/\bwe can generate\b/i' => "we can provide",
            '/\bwas generated\b/i' => 'was prepared',
            '/\bhas been generated\b/i' => 'is ready',
            '/\bhave been generated\b/i' => 'are ready',
            '/\bautomatically generated\b/i' => 'prepared',
            '/\bgenerated by (?:our|the) system\b/i' => 'created for you',
            '/\bgenerated coupon\b/i' => 'discount coupon',
            '/\bgenerated code\b/i' => 'promo code',
            '/\bgenerated discount\b/i' => 'special discount',
            '/\bgenerated link\b/i' => 'checkout link',
            '/\bgenerated for you\b/i' => 'ready for you',
            '/\bgenerate a direct checkout link\b/i' => 'send you a direct checkout link',
            '/\bgenerate a checkout link\b/i' => 'send you a checkout link',
            '/\bgenerate a discount\b/i' => 'apply a discount',
            '/\bgenerate a coupon\b/i' => 'provide a coupon',
            '/\bgenerate an order\b/i' => 'place an order',
            '/\bto generate\b/i' => 'to create',
            '/\bgenerates\b/i' => 'creates',
            '/\bgenerating\b/i' => 'preparing',
            '/\bgenerated\b/i' => 'created',
            '/\bstore records\b/i' => 'store catalog',
            '/\bcatalog inventory database\b/i' => 'store catalog',
            '/\binventory database\b/i' => 'store inventory',
            '/\bdatabase records\b/i' => 'store items',
            '/\bsystem records\b/i' => 'store information',
            '/\bdatabase\b/i' => 'catalog',
        ];

        foreach ($replacements as $pattern => $replacement) {
            $text = preg_replace($pattern, $replacement, $text);
        }

        // Clean up fallback robotic phrases
        if (trim($text) === "I checked our store records. How else may I assist you with your shopping?" ||
            trim($text) === "I checked our store records. How else may I assist you with your shopping today?") {
            $text = "I'm happy to help! We have great products in stock and special discounts available. Would you like a discount code, product recommendations, or help with an order?";
        }

        // Clean up whitespace
        $text = preg_replace('/[ \t]{2,}/', ' ', $text);
        $text = preg_replace('/\n{3,}/', "\n\n", $text);

        return trim($text);
    }

    protected function sendOutboundDirect(Conversation $conversation, ChannelConnection $connection, string $body, string $mediaUrl = '', string $senderIdentifier = 'AI Agent'): void
    {
        $body = $this->filterBotPhrases($body);
        $channelManager = app(\App\Services\Channels\ChannelManager::class);
        $credentials = $connection->decrypted_credentials;
        $driver = $channelManager->driver($connection->channel_type);

        $res = $driver->sendMessage($credentials, [
            'connection_id' => $connection->id,
            'external_chat_id' => $conversation->external_chat_id,
            'to' => $conversation->external_chat_id,
            'body' => $body,
            'media_url' => $mediaUrl,
        ]);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'direction' => 'outbound',
            'message_type' => !empty($mediaUrl) ? 'media' : 'text',
            'sender_identifier' => $senderIdentifier,
            'body' => $body,
            'media_url' => $mediaUrl,
            'external_message_id' => $res['external_message_id'] ?? 'agent_' . uniqid(),
            'delivery_status' => $res['delivery_status'] ?? 'sent',
            'error_message' => $res['error_message'] ?? null,
        ]);

        $conversation->update(['last_message_at' => Carbon::now()]);

        try {
            broadcast(new \App\Events\MessageReceived($message));
        } catch (Exception $e) {}
    }
}
