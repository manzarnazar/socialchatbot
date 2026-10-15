<?php

namespace App\Jobs;

use App\Models\Contact;
use App\Models\CrmIntegration;
use App\Services\CRM\CrmManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncContactToCrmJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected Contact $contact;

    /**
     * Create a new job instance.
     */
    public function __construct(Contact $contact)
    {
        $this->contact = $contact;
    }

    /**
     * Execute the job.
     */
    public function handle(CrmManager $crmManager): void
    {
        $integrations = CrmIntegration::where('tenant_id', $this->contact->tenant_id)->get();

        foreach ($integrations as $integration) {
            // Only sync if push or bidirectional is configured
            if ($integration->sync_direction === 'pull') {
                continue;
            }

            try {
                $driver = $crmManager->driver($integration->provider);
                $driver->pushContact($this->contact, $integration);
            } catch (\Exception $e) {
                Log::error("Failed to sync contact {$this->contact->id} to {$integration->provider}: " . $e->getMessage());
            }
        }
    }
}
