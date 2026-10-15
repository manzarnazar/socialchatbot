<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Campaign;
use App\Jobs\ProcessCampaignBroadcastJob;

class DispatchScheduledCampaigns extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'campaigns:dispatch';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Polls database for scheduled campaign broadcasts that are due and triggers them.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dueCampaigns = Campaign::where('status', 'scheduled')
            ->where('scheduled_at', '<=', now())
            ->limit(50)
            ->get();

        if ($dueCampaigns->isEmpty()) {
            return Command::SUCCESS;
        }

        foreach ($dueCampaigns as $campaign) {
            $claimed = Campaign::where('id', $campaign->id)
                ->where('status', 'scheduled')
                ->update(['status' => 'sending', 'updated_at' => now()]);

            if ($claimed) {
                ProcessCampaignBroadcastJob::dispatch($campaign->id);
                $this->info("Dispatched broadcast campaign ID {$campaign->id} ({$campaign->name}).");
            }
        }

        return Command::SUCCESS;
    }
}
