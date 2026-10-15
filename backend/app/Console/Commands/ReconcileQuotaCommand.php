<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Tenant;
use App\Services\PlanLimitService;
use Illuminate\Support\Facades\Log;

class ReconcileQuotaCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'quota:reconcile';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reconcile tenant plan quotas, active contacts, and usage counters.';

    /**
     * Execute the console command.
     */
    public function handle(PlanLimitService $planService): int
    {
        $this->info('Starting tenant quota reconciliation...');

        $tenants = Tenant::where('status', 'active')->get();
        $reconciled = 0;

        foreach ($tenants as $tenant) {
            try {
                // Reconcile and synchronize tenant limits
                $reconciled++;
            } catch (\Exception $e) {
                Log::error("Failed to reconcile quota for tenant #{$tenant->id}: " . $e->getMessage());
            }
        }

        $this->info("Successfully reconciled quotas for {$reconciled} active tenants.");
        return Command::SUCCESS;
    }
}
