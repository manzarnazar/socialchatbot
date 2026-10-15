<?php

namespace App\Jobs;

use App\Models\SocialPost;
use App\Services\SocialPosts\SocialPostPublishingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Exception;

class PublishSocialPostJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $socialPostId;
    public ?array $onlyChannelIds;

    /**
     * Create a new job instance.
     */
    public function __construct(int $socialPostId, ?array $onlyChannelIds = null)
    {
        $this->socialPostId = $socialPostId;
        $this->onlyChannelIds = $onlyChannelIds;
    }

    /**
     * Execute the job.
     */
    public function handle(SocialPostPublishingService $publishingService): void
    {
        $post = SocialPost::with(['postChannels.channelConnection'])->find($this->socialPostId);
        if (!$post) {
            Log::error("PublishSocialPostJob: SocialPost ID {$this->socialPostId} not found.");
            return;
        }

        try {
            $publishingService->publishPost($post, $this->onlyChannelIds);
        } catch (Exception $e) {
            Log::error("PublishSocialPostJob failed for SocialPost ID {$this->socialPostId}: " . $e->getMessage());
            $post->update(['status' => 'failed']);
        }
    }
}
