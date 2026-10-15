<?php

namespace App\Jobs;

use App\Models\Campaign;
use App\Models\CampaignDispatch;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class FinalizeCampaignJob implements ShouldQueue
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
     * Execute the job.
     */
    public function handle(): void
    {
        $campaign = Campaign::find($this->campaignId);
        if (!$campaign) {
            return;
        }

        // Only finalize if still in 'sending' status
        if ($campaign->status !== 'sending') {
            return;
        }

        $pendingCount = CampaignDispatch::where('campaign_id', $campaign->id)
            ->where('status', 'queued')
            ->count();

        if ($pendingCount === 0) {
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

            Log::info("FinalizeCampaignJob: Campaign ID {$campaign->id} completed successfully.");
        } else {
            Log::info("FinalizeCampaignJob: Campaign ID {$campaign->id} still has {$pendingCount} queued dispatches in flight.");
        }
    }
}
