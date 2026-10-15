<?php

namespace App\Console\Commands;

use App\Models\FlowExecution;
use App\Services\Flow\FlowRunner;
use Illuminate\Console\Command;

class ResumeFlows extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'flows:resume';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Find and resume paused flow executions that have passed their delay time.';

    /**
     * Execute the console command.
     */
    public function handle(FlowRunner $runner): int
    {
        $this->info('Checking for paused flow executions to resume...');

        $dueExecutionIds = FlowExecution::where('status', 'paused_delay')
            ->where('resume_after', '<=', now())
            ->limit(100)
            ->pluck('id');

        if ($dueExecutionIds->isEmpty()) {
            $this->info('No flow executions found to resume.');
            return Command::SUCCESS;
        }

        $this->info("Found {$dueExecutionIds->count()} executions to resume.");

        foreach ($dueExecutionIds as $id) {
            $claimed = FlowExecution::where('id', $id)
                ->where('status', 'paused_delay')
                ->update(['status' => 'running', 'updated_at' => now()]);

            if (!$claimed) {
                continue; // Claimed by another worker
            }

            $execution = FlowExecution::find($id);
            if (!$execution) {
                continue;
            }

            $this->info("Resuming execution #{$execution->id} for contact #{$execution->contact_id} starting at node {$execution->current_node_id}");
            
            try {
                // Execute using the FlowRunner service
                $runner->execute($execution);
            } catch (\Exception $e) {
                $execution->update(['status' => 'failed', 'last_error' => $e->getMessage()]);
                $this->error("Failed to resume execution #{$execution->id}: " . $e->getMessage());
            }
        }

        $this->info('Finished resuming flow executions.');
        return Command::SUCCESS;
    }
}
