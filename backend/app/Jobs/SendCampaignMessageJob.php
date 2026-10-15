<?php

namespace App\Jobs;

use App\Models\Campaign;
use App\Models\CampaignDispatch;
use App\Models\ChannelConnection;
use App\Models\Conversation;
use App\Models\Contact;
use App\Models\Message;
use App\Models\MessageTemplate;
use App\Models\AiAgent;
use App\Models\Flow;
use App\Models\FlowExecution;
use App\Services\Flow\FlowRunner;
use App\Services\Channels\ChannelManager;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Exception;

class SendCampaignMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $campaignId;
    public int $contactId;
    public int $dispatchId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $campaignId, int $contactId, int $dispatchId)
    {
        $this->campaignId = $campaignId;
        $this->contactId = $contactId;
        $this->dispatchId = $dispatchId;
    }

    /**
     * Execute the job.
     */
    public function handle(ChannelManager $channelManager): void
    {
        $campaign = Campaign::find($this->campaignId);
        if (!$campaign) {
            Log::error("SendCampaignMessageJob: Campaign ID {$this->campaignId} not found.");
            return;
        }

        // Check if campaign was paused or cancelled in real-time
        if ($campaign->status === 'paused' || $campaign->status === 'cancelled') {
            Log::info("SendCampaignMessageJob: Skipping dispatch ID {$this->dispatchId} because campaign is {$campaign->status}.");
            return;
        }

        $dispatch = CampaignDispatch::find($this->dispatchId);
        if (!$dispatch) {
            Log::error("SendCampaignMessageJob: Dispatch ID {$this->dispatchId} not found.");
            return;
        }

        // Idempotency check: If already sent, delivered, read, or replied, do NOT duplicate
        if (in_array($dispatch->status, ['sent', 'delivered', 'read', 'replied'])) {
            Log::info("SendCampaignMessageJob: Dispatch ID {$this->dispatchId} already has status '{$dispatch->status}', skipping.");
            return;
        }

        $contact = Contact::find($this->contactId);
        if (!$contact) {
            $dispatch->update([
                'status' => 'failed',
                'error_message' => 'Contact not found.',
            ]);
            $this->checkCampaignCompletion($campaign);
            return;
        }

        $channelConnection = ChannelConnection::find($campaign->channel_connection_id);
        if (!$channelConnection) {
            $dispatch->update([
                'status' => 'failed',
                'error_message' => 'Channel connection not found.',
            ]);
            $this->checkCampaignCompletion($campaign);
            return;
        }

        // 1. Opt-out check (checks if contact opted out in the interim)
        $optOuts = $contact->opted_out_channels ?: [];
        if (in_array($channelConnection->channel_type, $optOuts)) {
            $dispatch->update([
                'status' => 'failed',
                'error_message' => 'Contact has opted out of this channel.',
            ]);
            $this->checkCampaignCompletion($campaign);
            return;
        }

        // 2. Destination validation & Conversation resolution
        $channelType = $channelConnection->channel_type;
        $isEmail = $channelType === 'email';
        $destination = null;
        $externalChatId = null;

        if ($isEmail) {
            $destination = $contact->email;
            $externalChatId = $contact->email;
            if (empty($destination)) {
                $dispatch->update([
                    'status' => 'failed',
                    'error_message' => 'No email address configured.',
                ]);
                $this->checkCampaignCompletion($campaign);
                return;
            }
        } elseif (in_array($channelType, ['messenger', 'instagram'])) {
            $conversation = Conversation::where('tenant_id', $campaign->tenant_id)
                ->where('channel_connection_id', $campaign->channel_connection_id)
                ->where('contact_id', $contact->id)
                ->first();

            if (!$conversation || empty($conversation->external_chat_id)) {
                $channelName = $channelType === 'messenger' ? 'Facebook Messenger' : 'Instagram';
                $dispatch->update([
                    'status' => 'failed',
                    'error_message' => "{$channelName} requires the contact to initiate a conversation with your page or profile first to obtain a valid Scoped ID.",
                ]);
                $this->checkCampaignCompletion($campaign);
                return;
            }
            $destination = $conversation->external_chat_id;
            $externalChatId = $conversation->external_chat_id;
        } elseif ($channelType === 'telegram') {
            $conversation = Conversation::where('tenant_id', $campaign->tenant_id)
                ->where('channel_connection_id', $campaign->channel_connection_id)
                ->where('contact_id', $contact->id)
                ->first();

            $tgChatId = ($conversation && preg_match('/^[0-9]+$/', (string)$conversation->external_chat_id))
                ? $conversation->external_chat_id
                : (preg_match('/^[0-9]+$/', preg_replace('/[^0-9]/', '', (string)$contact->phone)) ? preg_replace('/[^0-9]/', '', (string)$contact->phone) : null);

            if (!$tgChatId) {
                $dispatch->update([
                    'status' => 'failed',
                    'error_message' => 'Telegram Bot API requires the contact to initiate a conversation with the Telegram bot first to obtain a valid Telegram Chat ID.',
                ]);
                $this->checkCampaignCompletion($campaign);
                return;
            }
            $destination = $tgChatId;
            $externalChatId = $tgChatId;
        } else {
            // WhatsApp (Cloud & Baileys), SMS
            $destination = $contact->phone;
            $externalChatId = preg_replace('/[^0-9]/', '', (string)$contact->phone);
            if (empty($destination)) {
                $dispatch->update([
                    'status' => 'failed',
                    'error_message' => 'No phone number configured.',
                ]);
                $this->checkCampaignCompletion($campaign);
                return;
            }
        }

        // 3. Resolve or create Conversation
        $conversation = Conversation::firstOrCreate([
            'tenant_id' => $campaign->tenant_id,
            'channel_connection_id' => $campaign->channel_connection_id,
            'contact_id' => $contact->id,
        ], [
            'external_chat_id' => $externalChatId,
            'last_message_at' => now(),
        ]);

        try {
            $driver = $channelManager->driver($channelConnection->channel_type);
            $credentials = $channelConnection->decrypted_credentials;

            $bodyContent = '';
            $sendParams = [];

            // Compile body text based on Campaign source type
            if ($campaign->source_type === 'template') {
                $template = MessageTemplate::find($campaign->message_template_id);
                if (!$template) {
                    $dispatch->update([
                        'status' => 'failed',
                        'error_message' => 'Bound message template not found.',
                    ]);
                    $this->checkCampaignCompletion($campaign);
                    return;
                }

                if ($template->type === 'email') {
                    // Compile visual email blocks
                    $html = '';
                    $blocks = $template->content['blocks'] ?? [];
                    foreach ($blocks as $block) {
                        if ($block['type'] === 'header') {
                            $html .= '<h2 style="font-size: 22px; font-weight: 800; font-family: sans-serif; color: #0A0A0A; margin: 10px 0 16px;">' . e($block['content']) . '</h2>';
                        } elseif ($block['type'] === 'paragraph') {
                            $html .= '<p style="font-size: 14px; line-height: 1.6; font-family: sans-serif; color: #6B6B6B; margin-bottom: 16px;">' . nl2br(e($block['content'])) . '</p>';
                        } elseif ($block['type'] === 'button') {
                            $html .= '<div style="margin: 20px 0;"><a href="' . e($block['url'] ?? '#') . '" style="background-color: #0A0A0A; color: #FFFFFF; font-family: sans-serif; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 12px; display: inline-block;">' . e($block['content']) . '</a></div>';
                        } elseif ($block['type'] === 'divider') {
                            $html .= '<hr style="border: 0; border-top: 1px solid #E8E8E6; margin: 24px 0;" />';
                        } elseif ($block['type'] === 'image') {
                            $html .= '<div style="margin-bottom: 16px;"><img src="' . e($block['src'] ?? '') . '" alt="" style="max-width: 100%; height: auto; border-radius: 6px;" /></div>';
                        }
                    }

                    // Substitute tags
                    $bodyContent = str_replace(
                        ['{{ contact.first_name }}', '{{ contact.last_name }}', '{{ contact.email }}'],
                        [$contact->first_name ?: 'there', $contact->last_name ?: '', $contact->email],
                        $html
                    );
                    $sendParams = [
                        'external_chat_id' => $contact->email,
                        'body' => "Subject: {$campaign->name}\n\n" . $bodyContent,
                    ];
                } else {
                    // WhatsApp templates
                    // WhatsApp templates
                    $isCarousel = ($template->content['format'] ?? '') === 'carousel' || !empty($template->content['carousel']['cards']);
                    $bodyText = $template->content['body']['text'] ?? '';
                    
                    // Variable replacement map
                    $varMap = [
                        '{{1}}' => $contact->first_name ?: 'there',
                        '{{2}}' => $contact->last_name ?: '',
                        '{{3}}' => $contact->email ?: '',
                        '{{4}}' => $contact->phone ?: '',
                        '{{ contact.first_name }}' => $contact->first_name ?: 'there',
                        '{{ contact.last_name }}' => $contact->last_name ?: '',
                        '{{ contact.email }}' => $contact->email ?: '',
                        '{{ contact.phone }}' => $contact->phone ?: '',
                        '{{contact.first_name}}' => $contact->first_name ?: 'there',
                        '{{contact.last_name}}' => $contact->last_name ?: '',
                        '{{contact.email}}' => $contact->email ?: '',
                        '{{contact.phone}}' => $contact->phone ?: '',
                    ];

                    // Add campaign custom variable mappings if present
                    if (!empty($campaign->metadata['template_variables']) && is_array($campaign->metadata['template_variables'])) {
                        foreach ($campaign->metadata['template_variables'] as $k => $v) {
                            $varMap['{{' . $k . '}}'] = (string)$v;
                            $varMap['{{ ' . $k . ' }}'] = (string)$v;
                        }
                    }

                    $bodyContent = str_replace(array_keys($varMap), array_values($varMap), $bodyText);

                    if (in_array($channelConnection->channel_type, ['whatsapp', 'whatsapp_cloud', 'whatsapp_cloud_api'])) {
                        // Build structured Meta template components
                        $components = [];

                        // 1. Header Media Component
                        $headerMedia = $template->content['header']['media_url'] ?? ($campaign->metadata['header_media_url'] ?? null);
                        $headerFormat = strtolower($template->content['header']['format'] ?? 'text');
                        if ($headerMedia && in_array($headerFormat, ['image', 'video', 'document'])) {
                            $components[] = [
                                'type' => 'header',
                                'parameters' => [
                                    [
                                        'type' => $headerFormat,
                                        $headerFormat => [
                                            'link' => $headerMedia,
                                        ]
                                    ]
                                ]
                            ];
                        } elseif ($headerFormat === 'text' && !empty($template->content['header']['text'])) {
                            $headerText = str_replace(array_keys($varMap), array_values($varMap), $template->content['header']['text']);
                            $components[] = [
                                'type' => 'header',
                                'parameters' => [
                                    [
                                        'type' => 'text',
                                        'text' => $headerText,
                                    ]
                                ]
                            ];
                        }

                        // 2. Body Parameters
                        // Detect placeholder count ({{1}}, {{2}}, etc.)
                        preg_match_all('/\{\{(\d+)\}\}/', $bodyText, $matches);
                        $bodyParams = [];
                        if (!empty($matches[1])) {
                            $paramIndices = array_unique($matches[1]);
                            sort($paramIndices);
                            foreach ($paramIndices as $idx) {
                                $val = $varMap["{{$idx}}"] ?? ($contact->first_name ?: 'there');
                                $bodyParams[] = [
                                    'type' => 'text',
                                    'text' => $val,
                                ];
                            }
                        } else {
                            $bodyParams[] = [
                                'type' => 'text',
                                'text' => $contact->first_name ?: 'there',
                            ];
                        }

                        $components[] = [
                            'type' => 'body',
                            'parameters' => $bodyParams,
                        ];

                        if ($isCarousel && !empty($template->content['carousel']['cards'])) {
                            $carouselCards = [];
                            foreach ($template->content['carousel']['cards'] as $cIdx => $card) {
                                $cardComponents = [];
                                if (!empty($card['header']['media_url'])) {
                                    $cardComponents[] = [
                                        'type' => 'header',
                                        'parameters' => [
                                            [
                                                'type' => 'image',
                                                'image' => [
                                                    'link' => $card['header']['media_url']
                                                ]
                                            ]
                                        ]
                                    ];
                                }
                                $carouselCards[] = [
                                    'card_index' => $cIdx,
                                    'components' => $cardComponents
                                ];
                            }
                            $components[] = [
                                'type' => 'carousel',
                                'cards' => $carouselCards
                            ];
                        }

                        $sendParams = [
                            'external_chat_id' => $contact->phone,
                            'type' => 'template',
                            'template' => [
                                'name' => $template->name,
                                'language' => [
                                    'code' => $template->language ?: 'en_US',
                                ],
                                'components' => $components
                            ]
                        ];
                    } else {
                        // Plain text bypass for Baileys/SMS/Telegram/Mock with formatted carousel cards or mixed action buttons
                        if ($isCarousel && !empty($template->content['carousel']['cards'])) {
                            $cardSummaries = [];
                            foreach ($template->content['carousel']['cards'] as $cIdx => $c) {
                                $cNum = $cIdx + 1;
                                $cText = $c['body']['text'] ?? '';
                                $cMedia = $c['header']['media_url'] ?? '';
                                $cBtns = [];
                                if (!empty($c['buttons'])) {
                                    foreach ($c['buttons'] as $b) {
                                        $cBtns[] = $b['text'] . (!empty($b['url']) ? ": {$b['url']}" : '');
                                    }
                                }
                                $cardSummaries[] = "📍 *Card {$cNum}*: " . ($cMedia ? "{$cMedia}\n" : "") . $cText . (count($cBtns) ? "\n👉 " . implode(" | ", $cBtns) : "");
                            }
                            $bodyContent .= "\n\n" . implode("\n\n", $cardSummaries);
                        } elseif (!$isCarousel && !empty($template->content['buttons'])) {
                            $btnSummaries = [];
                            foreach ($template->content['buttons'] as $b) {
                                if (($b['type'] ?? '') === 'copy_code') {
                                    $code = $b['coupon_code'] ?? ($b['text'] ?? '');
                                    $btnSummaries[] = "✂️ Promo Code: {$code}";
                                } elseif (($b['type'] ?? '') === 'phone') {
                                    $btnSummaries[] = "📞 " . ($b['text'] ?? 'Call') . ": " . ($b['phone_number'] ?? '');
                                } elseif (($b['type'] ?? '') === 'url') {
                                    $btnSummaries[] = "🌐 " . ($b['text'] ?? 'Visit') . ": " . ($b['url'] ?? '');
                                } else {
                                    $btnSummaries[] = "💬 " . ($b['text'] ?? 'Reply');
                                }
                            }
                            if (count($btnSummaries) > 0) {
                                $bodyContent .= "\n\n👉 " . implode(" | ", $btnSummaries);
                            }
                        }

                        $sendParams = [
                            'external_chat_id' => $contact->phone,
                            'body' => $bodyContent,
                        ];
                    }
                }

            } elseif ($campaign->source_type === 'compose' || $campaign->source_type === 'custom') {
                $rawText = $campaign->custom_message ?: '';
                $bodyContent = $this->interpolateContactVariables($rawText, $contact);

                if ($isEmail) {
                    $htmlBody = '';
                    if (!empty($campaign->media_url)) {
                        $htmlBody .= '<div style="margin-bottom: 20px; text-align: center;"><img src="' . e($campaign->media_url) . '" alt="Attachment" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);" /></div>';
                    }
                    $htmlBody .= '<p style="font-size: 14px; line-height: 1.6; font-family: sans-serif; color: #333333; margin-bottom: 20px;">' . nl2br(e($bodyContent)) . '</p>';
                    if (!empty($campaign->cta_button_text) && !empty($campaign->cta_button_url)) {
                        $btnUrl = $this->interpolateContactVariables($campaign->cta_button_url, $contact);
                        $htmlBody .= '<div style="margin: 24px 0; text-align: center;"><a href="' . e($btnUrl) . '" style="background-color: #0A0A0A; color: #FFFFFF; font-family: sans-serif; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">' . e($campaign->cta_button_text) . '</a></div>';
                    }
                    $subject = $this->interpolateContactVariables($campaign->custom_subject ?: $campaign->name, $contact);
                    $sendParams = [
                        'external_chat_id' => $contact->email,
                        'subject' => $subject,
                        'body' => $htmlBody,
                    ];
                } else {
                    $textWithButton = $bodyContent;
                    if (!empty($campaign->cta_button_text) && !empty($campaign->cta_button_url)) {
                        $textWithButton .= "\n\n👉 " . $campaign->cta_button_text . ": " . $campaign->cta_button_url;
                    }
                    if (!empty($campaign->media_url)) {
                        $sendParams = [
                            'external_chat_id' => $destination,
                            'type' => $campaign->media_type ?: 'image',
                            'media_url' => $campaign->media_url,
                            'body' => $textWithButton,
                            'caption' => $textWithButton,
                        ];
                    } else {
                        $sendParams = [
                            'external_chat_id' => $destination,
                            'body' => $textWithButton,
                        ];
                    }
                }

            } elseif ($campaign->source_type === 'flow' || $campaign->source_type === 'agent') {
                $agent = $campaign->ai_agent_id ? AiAgent::where('tenant_id', $campaign->tenant_id)->find($campaign->ai_agent_id) : null;
                if ($campaign->source_type === 'agent' && !$agent) {
                    $dispatch->update([
                        'status' => 'failed',
                        'error_message' => 'Bound outbound AI Agent not found.',
                    ]);
                    $this->checkCampaignCompletion($campaign);
                    return;
                }

                $flowId = $agent ? $agent->flow_id : $campaign->flow_id;
                if (!$flowId) {
                    $dispatch->update([
                        'status' => 'failed',
                        'error_message' => 'Selected AI Agent has no Automation Flow attached.',
                    ]);
                    $this->checkCampaignCompletion($campaign);
                    return;
                }

                $flow = Flow::find($flowId);
                if (!$flow) {
                    $dispatch->update([
                        'status' => 'failed',
                        'error_message' => 'Automation flow was not found.',
                    ]);
                    $this->checkCampaignCompletion($campaign);
                    return;
                }

                $flowVersion = $flow->publishedVersion ?? $flow->versions()->latest('version_number')->first();
                if (!$flowVersion || empty($flowVersion->definition['nodes'])) {
                    $dispatch->update([
                        'status' => 'failed',
                        'error_message' => 'Automation flow has no published or valid node definitions.',
                    ]);
                    $this->checkCampaignCompletion($campaign);
                    return;
                }

                $startNodeId = null;
                foreach ($flowVersion->definition['nodes'] as $n) {
                    if (in_array($n['type'] ?? '', ['inbound_message', 'webhook_trigger', 'outbound_campaign'])) {
                        $startNodeId = $n['id'];
                        break;
                    }
                }
                if (!$startNodeId) {
                    $startNodeId = $flowVersion->definition['nodes'][0]['id'];
                }

                $execution = FlowExecution::create([
                    'tenant_id' => $campaign->tenant_id,
                    'flow_version_id' => $flowVersion->id,
                    'contact_id' => $contact->id,
                    'conversation_id' => $conversation->id,
                    'current_node_id' => $startNodeId,
                    'status' => 'running',
                    'context' => [
                        'variables' => [
                            'campaign.id' => $campaign->id,
                            'campaign.name' => $campaign->name,
                        ]
                    ]
                ]);

                /** @var FlowRunner $flowRunner */
                $flowRunner = app(FlowRunner::class);
                $flowRunner->execute($execution);

                $execution->refresh();
                if ($execution->status === 'failed' || !empty($execution->last_error)) {
                    $dispatch->update([
                        'status' => 'failed',
                        'error_message' => $execution->last_error ?: 'Flow execution failed to deliver outbound message.',
                    ]);
                } else {
                    $dispatch->update([
                        'status' => 'sent',
                        'error_message' => null,
                    ]);
                    $campaign->increment('sent_count');
                }

                $this->checkCampaignCompletion($campaign);
                return;
            }

            // Ensure connection_id and external_chat_id are explicitly mapped
            $sendParams['connection_id'] = $channelConnection->id;
            if (empty($sendParams['external_chat_id'])) {
                $sendParams['external_chat_id'] = $destination;
            }

            // Dispatch message via channel driver
            $res = $driver->sendMessage($credentials, $sendParams);

            // Record Message in Shared Inbox
            $message = Message::create([
                'conversation_id' => $conversation->id,
                'direction' => 'outbound',
                'message_type' => 'text',
                'body' => $bodyContent,
                'external_message_id' => $res['external_message_id'] ?? null,
                'delivery_status' => $res['delivery_status'] ?? 'sent',
                'error_message' => $res['error_message'] ?? null,
            ]);

            // Update Dispatch log
            $dispatch->update([
                'message_id' => $message->id,
                'status' => $message->delivery_status,
                'error_message' => $message->error_message,
            ]);

            if ($message->delivery_status === 'sent' || $message->delivery_status === 'delivered') {
                $campaign->increment('sent_count');
            } else {
                $campaign->increment('failed_count');
            }

            $this->checkCampaignCompletion($campaign);

        } catch (Exception $e) {
            Log::error("SendCampaignMessageJob failed for dispatch ID {$this->dispatchId}: " . $e->getMessage());
            $dispatch->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            $campaign->increment('failed_count');
            $this->checkCampaignCompletion($campaign);
        }
    }

    /**
     * Check if all dispatches for this campaign have completed.
     */
    protected function checkCampaignCompletion(Campaign $campaign): void
    {
        $pendingCount = CampaignDispatch::where('campaign_id', $campaign->id)
            ->where('status', 'queued')
            ->count();

        if ($pendingCount === 0) {
            // Check current status - only update if still sending
            $campaign->refresh();
            if ($campaign->status === 'sending') {
                $campaign->update(['status' => 'completed']);
                $campaign->recalculateStats();

                NotificationService::createAndBroadcast(
                    $campaign->tenant_id,
                    null,
                    'Campaign Completed',
                    "The campaign broadcast '{$campaign->name}' has completed successfully.",
                    'campaign_complete',
                    ['campaign_id' => $campaign->id]
                );
            }
        }
    }

    /**
     * Interpolate contact fields into message content.
     */
    protected function interpolateContactVariables(?string $text, Contact $contact): string
    {
        if (empty($text)) {
            return '';
        }

        $fullName = trim(($contact->first_name ?: '') . ' ' . ($contact->last_name ?: ''));
        if (empty($fullName)) {
            $fullName = $contact->first_name ?: 'Valued Customer';
        }

        $tagsStr = is_array($contact->tags) ? implode(', ', $contact->tags) : ($contact->tags ?: '');

        $replacements = [
            '{{ contact.first_name }}' => $contact->first_name ?: 'there',
            '{{ contact.last_name }}' => $contact->last_name ?: '',
            '{{ contact.name }}' => $fullName,
            '{{ contact.email }}' => $contact->email ?: '',
            '{{ contact.phone }}' => $contact->phone ?: '',
            '{{ contact.lifecycle_stage }}' => $contact->lifecycle_stage ?: 'Lead',
            '{{ contact.tags }}' => $tagsStr,
            '{{ contact.id }}' => (string)$contact->id,
            '{{ contact.created_at }}' => $contact->created_at ? $contact->created_at->format('Y-m-d') : '',
            '{{1}}' => $contact->first_name ?: 'there',
        ];

        $interpolated = str_replace(array_keys($replacements), array_values($replacements), $text);

        // Also interpolate dynamic custom_fields like {{ contact.custom_fields.company }}
        $interpolated = preg_replace_callback('/\{\{\s*contact\.custom_fields\.([a-zA-Z0-9_\-]+)\s*\}\}/', function ($matches) use ($contact) {
            $key = $matches[1];
            if (is_array($contact->custom_fields) && isset($contact->custom_fields[$key])) {
                return (string)$contact->custom_fields[$key];
            }
            return '';
        }, $interpolated);

        return $interpolated;
    }
}
