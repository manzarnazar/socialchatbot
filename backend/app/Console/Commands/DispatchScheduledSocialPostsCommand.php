<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SocialPost;
use App\Jobs\PublishSocialPostJob;

class DispatchScheduledSocialPostsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'social-posts:dispatch-scheduled';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Polls database for scheduled social posts that are due and dispatches them for publishing.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $posts = SocialPost::where('status', 'scheduled')
            ->where('scheduled_at', '<=', now())
            ->lockForUpdate()
            ->get();

        if ($posts->isEmpty()) {
            return Command::SUCCESS;
        }

        foreach ($posts as $post) {
            $post->update(['status' => 'publishing']);
            PublishSocialPostJob::dispatch($post->id);
            $this->info("Dispatched scheduled social post ID {$post->id} ('{$post->title}').");
        }

        return Command::SUCCESS;
    }
}
