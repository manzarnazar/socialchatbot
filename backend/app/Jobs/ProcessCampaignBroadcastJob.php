<?php

namespace App\Jobs;

use App\Models\Campaign;
use App\Models\CampaignDispatch;
use App\Models\ChannelConnection;
use App\Models\Contact;
use App\Jobs\SendCampaignMessageJob;
use App\Jobs\FinalizeCampaignJob;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Exception;

class ProcessCampaignBroadcastJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $campaignId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $campaignId)
    {
        $this->campaignId = $campaignId;
    }

    /**
     * Execute the coordinator job.
     */
    public function handle(): void
    {
        $campaign = Campaign::find($this->campaignId);
        if (!$campaign) {
            Log::error("ProcessCampaignBroadcastJob: Campaign ID {$this->campaignId} not found.");
            return;
        }

        if (in_array($campaign->status, ['completed', 'cancelled', 'failed'])) {
            Log::info("ProcessCampaignBroadcastJob: Campaign ID {$this->campaignId} is already {$campaign->status}. Exiting.");
            return;
        }

        $campaign->update(['status' => 'sending']);

        try {
            $channelConnection = ChannelConnection::where('tenant_id', $campaign->tenant_id)
                ->findOrFail($campaign->channel_connection_id);

            if (in_array($channelConnection->channel_type, ['tiktok', 'linkedin'])) {
                $campaign->update([
                    'status' => 'failed',
                    'error_log' => "{$channelConnection->channel_type} channel is not supported for bulk campaigns.",
                ]);
                Log::warning("ProcessCampaignBroadcastJob: {$channelConnection->channel_type} channel is not supported for bulk campaigns.");
                return;
            }

            // 1. Resolve targeted contacts list
            $query = Contact::where('tenant_id', $campaign->tenant_id);
            $filter = $campaign->audience_filter;

            if (isset($filter['type'])) {
                if ($filter['type'] === 'lifecycle_stage' && !empty($filter['value'])) {
                    $query->where('lifecycle_stage', $filter['value']);
                } elseif ($filter['type'] === 'tags' && !empty($filter['value'])) {
                    $query->whereJsonContains('tags', $filter['value']);
                } elseif ($filter['type'] === 'contacts' && !empty($filter['value'])) {
                    $ids = is_array($filter['value']) ? $filter['value'] : explode(',', $filter['value']);
                    $query->whereIn('id', array_map('intval', $ids));
                }
            }

            $allContacts = $query->get();

            if ($allContacts->isEmpty()) {
                $campaign->update([
                    'status' => 'completed',
                    'total_contacts' => 0,
                    'error_log' => 'No contacts matched the audience filter segment.',
                ]);
                return;
            }

            $campaign->update(['total_contacts' => $allContacts->count()]);

            // 2. Crash Resumption & Deduplication Guard:
            // Find contact IDs that have already been dispatched in this campaign
            $alreadyDispatchedContactIds = CampaignDispatch::where('campaign_id', $campaign->id)
                ->whereIn('status', ['sent', 'delivered', 'read', 'replied'])
                ->pluck('contact_id')
                ->all();

            $pendingContacts = $allContacts->filter(function ($contact) use ($alreadyDispatchedContactIds) {
                return !in_array($contact->id, $alreadyDispatchedContactIds);
            });

            if ($pendingContacts->isEmpty()) {
                Log::info("ProcessCampaignBroadcastJob: All contacts for Campaign ID {$campaign->id} have already been dispatched. Finalizing.");
                $campaign->update(['status' => 'completed']);
                $campaign->recalculateStats();
                return;
            }

            // 3. Channel Anti-Ban Rate Delays & Jitter Configuration
            $channelType = $channelConnection->channel_type;
            $accumulatedDelay = 0;
            $consecutiveSends = 0;

            $isEmail = $channelType === 'email';

            $dispatchesToSchedule = [];

            foreach ($pendingContacts as $contact) {
                // Pre-check opt-out enforcement
                $optOuts = $contact->opted_out_channels ?: [];
                if (in_array($channelType, $optOuts)) {
                    CampaignDispatch::updateOrCreate(
                        ['campaign_id' => $campaign->id, 'contact_id' => $contact->id],
                        ['status' => 'failed', 'error_message' => 'Contact has opted out of this channel.']
                    );
                    $campaign->increment('failed_count');
                    continue;
                }

                // Pre-check destination address based on channel requirements
                $destination = null;

                if ($isEmail) {
                    $destination = $contact->email;
                    if (empty($destination)) {
                        CampaignDispatch::updateOrCreate(
                            ['campaign_id' => $campaign->id, 'contact_id' => $contact->id],
                            ['status' => 'failed', 'error_message' => 'No email address configured.']
                        );
                        $campaign->increment('failed_count');
                        continue;
                    }
                } elseif (in_array($channelType, ['messenger', 'instagram'])) {
                    // Meta Messenger/Instagram requires a conversation Scoped ID (PSID/IGSID)
                    $conv = \App\Models\Conversation::where('tenant_id', $campaign->tenant_id)
                        ->where('channel_connection_id', $campaign->channel_connection_id)
                        ->where('contact_id', $contact->id)
                        ->first();

                    if (!$conv || empty($conv->external_chat_id)) {
                        $channelName = $channelType === 'messenger' ? 'Facebook Messenger' : 'Instagram';
                        CampaignDispatch::updateOrCreate(
                            ['campaign_id' => $campaign->id, 'contact_id' => $contact->id],
                            [
                                'status' => 'failed',
                                'error_message' => "{$channelName} requires the contact to initiate a conversation with your page or profile first to obtain a valid Scoped ID.",
                            ]
                        );
                        $campaign->increment('failed_count');
                        continue;
                    }
                    $destination = $conv->external_chat_id;
                } elseif ($channelType === 'telegram') {
                    // Check if existing conversation has a numeric external_chat_id or phone has numeric ID
                    $conv = \App\Models\Conversation::where('tenant_id', $campaign->tenant_id)
                        ->where('channel_connection_id', $campaign->channel_connection_id)
                        ->where('contact_id', $contact->id)
                        ->first();

                    $tgChatId = ($conv && preg_match('/^[0-9]+$/', (string)$conv->external_chat_id))
                        ? $conv->external_chat_id
                        : (preg_match('/^[0-9]+$/', preg_replace('/[^0-9]/', '', (string)$contact->phone)) ? preg_replace('/[^0-9]/', '', (string)$contact->phone) : null);

                    if (!$tgChatId) {
                        CampaignDispatch::updateOrCreate(
                            ['campaign_id' => $campaign->id, 'contact_id' => $contact->id],
                            [
                                'status' => 'failed',
                                'error_message' => 'Telegram Bot API requires the contact to initiate a conversation with the Telegram bot first to obtain a valid Telegram Chat ID.',
                            ]
                        );
                        $campaign->increment('failed_count');
                        continue;
                    }
                    $destination = $tgChatId;
                } else {
                    // WhatsApp (Cloud & Baileys), SMS
                    $destination = $contact->phone;
                    if (empty($destination)) {
                        CampaignDispatch::updateOrCreate(
                            ['campaign_id' => $campaign->id, 'contact_id' => $contact->id],
                            ['status' => 'failed', 'error_message' => 'No phone number configured.']
                        );
                        $campaign->increment('failed_count');
                        continue;
                    }
                }

                // Calculate Anti-Ban Jitter & Stagger Offset for deliverable message
                $currentDelay = $accumulatedDelay;

                if ($channelType === 'whatsapp_baileys') {
                    // Anti-Ban Engine for WhatsApp Web:
                    // Random delay between 4 to 8 seconds (mimicking human typing/sending speed)
                    $jitter = rand(4, 8);
                    $accumulatedDelay += $jitter;
                    $consecutiveSends++;

                    // Add a 45-second breathing window after every 25 messages
                    if ($consecutiveSends % 25 === 0) {
                        $accumulatedDelay += 45;
                    }
                } elseif ($channelType === 'whatsapp') {
                    // Official WhatsApp Cloud API: smooth stagger of 0.2s (up to ~5 msgs/sec safely)
                    $accumulatedDelay += 0.2;
                } elseif ($channelType === 'sms') {
                    // SMS: 1.2s stagger (matching 1 SMS/sec standard carrier rate limit)
                    $accumulatedDelay += 1.2;
                } elseif ($channelType === 'telegram') {
                    // Telegram: 1.2s stagger (conforming to Telegram global 30/sec and chat limits)
                    $accumulatedDelay += 1.2;
                } elseif ($channelType === 'email') {
                    // Email: 0.5s stagger (preventing SMTP relay connection exhaustion)
                    $accumulatedDelay += 0.5;
                } else {
                    // Messenger, Instagram, etc.
                    $accumulatedDelay += 1.0;
                }

                // Create or find CampaignDispatch record in queued status
                $dispatch = CampaignDispatch::updateOrCreate(
                    ['campaign_id' => $campaign->id, 'contact_id' => $contact->id],
                    ['status' => 'queued', 'error_message' => null]
                );

                $dispatchesToSchedule[] = [
                    'contact_id' => $contact->id,
                    'dispatch_id' => $dispatch->id,
                    'delay' => $currentDelay,
                ];
            }

            if (empty($dispatchesToSchedule)) {
                Log::info("ProcessCampaignBroadcastJob: All contacts for Campaign ID {$campaign->id} failed pre-checks or were opted out.");
                $campaign->update(['status' => 'completed']);
                $campaign->recalculateStats();
                return;
            }

            // Dispatch individual granular workers with calculated queue delay timestamp
            // Using ->delay() ensures queue workers are NEVER blocked with PHP sleep()!
            foreach ($dispatchesToSchedule as $item) {
                $job = new SendCampaignMessageJob($campaign->id, $item['contact_id'], $item['dispatch_id']);
                if ($item['delay'] > 0) {
                    $job->delay(now()->addSeconds(round($item['delay'])));
                }
                dispatch($job);
            }

            // Schedule finalizer watchdog to verify and conclude campaign after estimated duration
            $watchdogDelay = max(10, round($accumulatedDelay) + 30);
            dispatch((new FinalizeCampaignJob($campaign->id))->delay(now()->addSeconds($watchdogDelay)));

            Log::info("ProcessCampaignBroadcastJob: Dispatched Campaign ID {$campaign->id} with estimated span of {$accumulatedDelay} seconds for channel {$channelType}.");

        } catch (Exception $e) {
            Log::error("ProcessCampaignBroadcastJob failed for campaign ID {$this->campaignId}: " . $e->getMessage());
            $campaign->update([
                'status' => 'failed',
                'error_log' => $e->getMessage(),
            ]);
        }
    }
}
