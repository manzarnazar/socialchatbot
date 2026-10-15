<?php

namespace App\Services\SocialPosts;

use App\Events\SocialPostStatusUpdatedEvent;
use App\Models\ChannelConnection;
use App\Models\SocialPost;
use App\Models\SocialPostChannel;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class SocialPostPublishingService
{
    /**
     * Publish a post across all or specific target channels.
     */
    public function publishPost(SocialPost $post, ?array $onlyChannelIds = null): void
    {
        $post->update(['status' => 'publishing']);

        // Load channel connections
        $post->load(['postChannels.channelConnection']);

        $postChannels = $post->postChannels;

        foreach ($postChannels as $postChannel) {
            // If onlyChannelIds is specified, skip channels not in list
            if ($onlyChannelIds !== null && !in_array($postChannel->channel_connection_id, $onlyChannelIds)) {
                continue;
            }

            // Skip already published channels unless explicitly targeted
            if ($onlyChannelIds === null && $postChannel->status === 'published') {
                continue;
            }

            $postChannel->update([
                'status' => 'publishing',
                'attempts' => $postChannel->attempts + 1,
            ]);

            $this->publishChannel($post, $postChannel);
        }

        // Aggregate overall post status
        $allChannels = SocialPostChannel::where('social_post_id', $post->id)->get();
        $totalChannels = $allChannels->count();
        $publishedCount = $allChannels->where('status', 'published')->count();
        $failedCount = $allChannels->where('status', 'failed')->count();

        $overallStatus = 'publishing';
        $publishedAt = $post->published_at;

        if ($publishedCount === $totalChannels && $totalChannels > 0) {
            $overallStatus = 'published';
            $publishedAt = now();
        } elseif ($publishedCount > 0 && $failedCount > 0) {
            $overallStatus = 'partially_published';
            $publishedAt = $publishedAt ?: now();
        } elseif ($failedCount === $totalChannels && $totalChannels > 0) {
            $overallStatus = 'failed';
        }

        $post->update([
            'status' => $overallStatus,
            'published_at' => $publishedAt,
        ]);

        // Broadcast real-time telemetry event via Reverb
        try {
            event(new SocialPostStatusUpdatedEvent($post->fresh(['channels', 'postChannels.channelConnection'])));
        } catch (Exception $e) {
            Log::warning("Failed to broadcast SocialPostStatusUpdatedEvent for post ID {$post->id}: " . $e->getMessage());
        }
    }

    /**
     * Publish content to an individual channel.
     */
    public function publishChannel(SocialPost $post, SocialPostChannel $postChannel): bool
    {
        $channel = $postChannel->channelConnection;
        if (!$channel) {
            $postChannel->update([
                'status' => 'failed',
                'error_message' => 'Channel connection record not found.',
            ]);
            return false;
        }

        $credentials = $channel->decrypted_credentials ?: [];
        $platform = $postChannel->platform;

        try {
            if ($platform === 'facebook') {
                return $this->publishFacebookPage($post, $postChannel, $credentials);
            } elseif ($platform === 'instagram') {
                return $this->publishInstagramAccount($post, $postChannel, $credentials);
            } elseif ($platform === 'tiktok') {
                return $this->publishTikTokAccount($post, $postChannel, $credentials);
            } elseif ($platform === 'linkedin') {
                return $this->publishLinkedInAccount($post, $postChannel, $credentials);
            } else {
                $postChannel->update([
                    'status' => 'failed',
                    'error_message' => "Unsupported social platform: {$platform}",
                ]);
                return false;
            }
        } catch (Exception $e) {
            Log::error("Exception publishing to channel {$channel->id}: " . $e->getMessage());
            $postChannel->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Facebook Pages Publishing Pipeline:
     * - Media post: POST /{page-id}/photos
     * - Text post: POST /{page-id}/feed
     */
    protected function publishFacebookPage(SocialPost $post, SocialPostChannel $postChannel, array $credentials): bool
    {
        $pageAccessToken = $credentials['page_access_token'] 
            ?? $credentials['access_token'] 
            ?? $credentials['system_user_access_token'] 
            ?? null;
        $pageId = $credentials['page_id'] 
            ?? $credentials['facebook_page_id'] 
            ?? null;

        if (!$pageAccessToken || !$pageId) {
            $postChannel->update([
                'status' => 'failed',
                'error_message' => 'Facebook Page credentials (page_access_token or page_id) are missing.',
            ]);
            return false;
        }

        // Mock mode for tests or mock credentials
        if ($this->isMockToken($pageAccessToken)) {
            $mockPostId = "{$pageId}_" . uniqid();
            $postChannel->update([
                'status' => 'published',
                'external_post_id' => $mockPostId,
                'permalink' => "https://www.facebook.com/{$pageId}/posts/{$mockPostId}",
                'error_message' => null,
                'published_at' => now(),
            ]);
            return true;
        }

        $mediaUrls = $post->media_urls ?: [];
        $hasMedia = !empty($mediaUrls) && !empty($mediaUrls[0]);
        $isVideo = false;

        if ($hasMedia) {
            $mediaUrl = $mediaUrls[0];
            if (!str_starts_with($mediaUrl, 'http')) {
                $mediaUrl = \App\Providers\AppServiceProvider::getBackendUrl() . '/' . ltrim($mediaUrl, '/');
            }

            $isVideo = $this->isVideoMedia($mediaUrl, $post->post_type);

            if ($isVideo) {
                $endpoint = "https://graph.facebook.com/v21.0/{$pageId}/videos";
                $payload = [
                    'file_url' => $mediaUrl,
                    'description' => $post->content,
                ];
                if (!empty($post->title)) {
                    $payload['title'] = $post->title;
                }
            } else {
                $endpoint = "https://graph.facebook.com/v21.0/{$pageId}/photos";
                $payload = [
                    'url' => $mediaUrl,
                    'caption' => $post->content,
                    'published' => true,
                ];
            }
        } else {
            $endpoint = "https://graph.facebook.com/v21.0/{$pageId}/feed";
            $payload = [
                'message' => $post->content,
            ];
        }

        $response = Http::withToken($pageAccessToken)
            ->timeout(30)
            ->post($endpoint, $payload);

        if (!$response->successful()) {
            $errorMessage = $this->parseMetaError($response->json());
            Log::error("Facebook Page publishing failed for channel {$postChannel->channel_connection_id}: " . $response->body());
            $postChannel->update([
                'status' => 'failed',
                'error_message' => $errorMessage,
            ]);
            return false;
        }

        $data = $response->json();
        $postId = $data['id'] ?? $data['post_id'] ?? null;
        $permalink = null;
        if ($postId) {
            $permalink = $isVideo
                ? "https://www.facebook.com/{$pageId}/videos/{$postId}"
                : "https://www.facebook.com/{$pageId}/posts/{$postId}";
        }

        $postChannel->update([
            'status' => 'published',
            'external_post_id' => $postId,
            'permalink' => $permalink,
            'error_message' => null,
            'published_at' => now(),
        ]);

        return true;
    }

    /**
     * Instagram Business Publishing Pipeline (2-step containerized workflow):
     * 1. POST /{ig_user_id}/media -> container_id (supports IMAGE or REELS)
     * 2. Poll GET /{container_id}?fields=status_code -> FINISHED
     * 3. POST /{ig_user_id}/media_publish -> media_id
     * 4. GET /{media_id}?fields=permalink -> live URL
     */
    protected function publishInstagramAccount(SocialPost $post, SocialPostChannel $postChannel, array $credentials): bool
    {
        $pageAccessToken = $credentials['page_access_token'] 
            ?? $credentials['access_token'] 
            ?? $credentials['system_user_access_token'] 
            ?? null;
        $igUserId = $credentials['instagram_business_account_id'] 
            ?? $credentials['instagram_account_id'] 
            ?? $credentials['ig_id'] 
            ?? null;

        if (!$pageAccessToken || !$igUserId) {
            $postChannel->update([
                'status' => 'failed',
                'error_message' => 'Instagram configuration keys (page_access_token, instagram_business_account_id) are missing.',
            ]);
            return false;
        }

        $mediaUrls = $post->media_urls ?: [];
        $mediaUrl = !empty($mediaUrls) ? $mediaUrls[0] : null;

        // Instagram feed and reel posts strictly require a media attachment
        if (!$mediaUrl) {
            $postChannel->update([
                'status' => 'failed',
                'error_message' => 'Instagram posts require an image or video attachment.',
            ]);
            return false;
        }

        if (!str_starts_with($mediaUrl, 'http')) {
            $mediaUrl = \App\Providers\AppServiceProvider::getBackendUrl() . '/' . ltrim($mediaUrl, '/');
        }

        // Mock mode for tests or mock credentials
        if ($this->isMockToken($pageAccessToken)) {
            $mockMediaId = "180" . rand(1000000000, 9999999999);
            $postChannel->update([
                'status' => 'published',
                'external_post_id' => $mockMediaId,
                'permalink' => "https://www.instagram.com/p/mock_" . uniqid() . "/",
                'error_message' => null,
                'published_at' => now(),
            ]);
            return true;
        }

        $isVideo = $this->isVideoMedia($mediaUrl, $post->post_type);

        // Step 1: Create media container
        $containerEndpoint = "https://graph.facebook.com/v21.0/{$igUserId}/media";
        $containerPayload = $isVideo
            ? [
                'media_type' => 'REELS',
                'video_url' => $mediaUrl,
                'caption' => $post->content,
                'share_to_feed' => true,
            ]
            : [
                'image_url' => $mediaUrl,
                'caption' => $post->content,
            ];

        $containerResponse = Http::withToken($pageAccessToken)
            ->timeout(30)
            ->post($containerEndpoint, $containerPayload);

        if (!$containerResponse->successful()) {
            $errorMessage = $this->parseMetaError($containerResponse->json());
            Log::error("Instagram container creation failed: " . $containerResponse->body());
            $postChannel->update([
                'status' => 'failed',
                'error_message' => $errorMessage,
            ]);
            return false;
        }

        $containerId = $containerResponse->json('id');
        if (!$containerId) {
            $postChannel->update([
                'status' => 'failed',
                'error_message' => 'Failed to retrieve Instagram media container ID.',
            ]);
            return false;
        }

        // Step 2: Poll container status (videos require more time/attempts for encoding)
        $isFinished = false;
        $maxAttempts = $isVideo ? 20 : 6;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            $statusResponse = Http::withToken($pageAccessToken)
                ->timeout(10)
                ->get("https://graph.facebook.com/v21.0/{$containerId}", [
                    'fields' => 'status_code',
                ]);

            if ($statusResponse->successful()) {
                $statusCode = $statusResponse->json('status_code');
                if ($statusCode === 'FINISHED') {
                    $isFinished = true;
                    break;
                } elseif ($statusCode === 'ERROR' || $statusCode === 'EXPIRED') {
                    $postChannel->update([
                        'status' => 'failed',
                        'error_message' => "Instagram container processing {$statusCode}: Media encoding or validation error.",
                    ]);
                    return false;
                }
            }

            // Sleep only in non-testing environment
            if (!app()->environment('testing')) {
                sleep($isVideo ? 3 : 2);
            }
        }

        if (!$isFinished) {
            $postChannel->update([
                'status' => 'failed',
                'error_message' => 'Instagram media container processing timed out. Please try again.',
            ]);
            return false;
        }

        // Step 3: Container Release & Publication
        $publishEndpoint = "https://graph.facebook.com/v21.0/{$igUserId}/media_publish";
        $publishResponse = Http::withToken($pageAccessToken)
            ->timeout(25)
            ->post($publishEndpoint, [
                'creation_id' => $containerId,
            ]);

        if (!$publishResponse->successful()) {
            $errorMessage = $this->parseMetaError($publishResponse->json());
            Log::error("Instagram media release failed: " . $publishResponse->body());
            $postChannel->update([
                'status' => 'failed',
                'error_message' => $errorMessage,
            ]);
            return false;
        }

        $mediaId = $publishResponse->json('id');

        // Step 4: Resolve live public permalink
        $permalink = null;
        try {
            $permalinkResponse = Http::withToken($pageAccessToken)
                ->timeout(10)
                ->get("https://graph.facebook.com/v21.0/{$mediaId}", [
                    'fields' => 'permalink',
                ]);

            if ($permalinkResponse->successful()) {
                $permalink = $permalinkResponse->json('permalink');
            }
        } catch (Exception $e) {
            Log::warning("Could not resolve Instagram permalink for media ID {$mediaId}: " . $e->getMessage());
        }

        if (!$permalink) {
            $permalink = $isVideo
                ? "https://www.instagram.com/reel/{$mediaId}/"
                : "https://www.instagram.com/p/{$mediaId}/";
        }

        $postChannel->update([
            'status' => 'published',
            'external_post_id' => $mediaId,
            'permalink' => $permalink,
            'error_message' => null,
            'published_at' => now(),
        ]);

        return true;
    }

    /**
     * Determine whether the media asset or post type is a video / reel.
     */
    public function isVideoMedia(?string $url, ?string $postType = null): bool
    {
        if ($postType === 'reel' || $postType === 'video') {
            return true;
        }

        if (!$url) {
            return false;
        }

        $path = parse_url($url, PHP_URL_PATH) ?? $url;
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return in_array($extension, ['mp4', 'mov', 'm4v', 'webm', 'quicktime']);
    }

    /**
     * Parse structured Meta Graph API error payloads.
     */
    public function parseMetaError(?array $responseJson): string
    {
        if (empty($responseJson) || !isset($responseJson['error'])) {
            return 'Unknown Meta Graph API error.';
        }

        $error = $responseJson['error'];
        $code = $error['code'] ?? null;
        $subcode = $error['error_subcode'] ?? null;
        $rawMessage = $error['message'] ?? 'Meta API error.';

        // Meta Code 190: Access token expired or invalidated
        if ($code == 190) {
            return 'Token expired or invalidated. Please reconnect this account under Channels.';
        }

        // Meta Code 36003: Aspect ratio not supported
        if ($code == 36003 || $subcode == 2207009) {
            return 'Image aspect ratio invalid for Instagram. Allowed ratios: 1:1, 4:5, 16:9.';
        }

        // Meta Code 4 or 17: Rate limit reached
        if ($code == 4 || $code == 17) {
            return 'Meta rate limit reached. Please wait a few minutes before retrying.';
        }

        // Meta Code 100: Invalid parameter or unreachable image host
        if ($code == 100) {
            if (str_contains(strtolower($rawMessage), 'url') || str_contains(strtolower($rawMessage), 'media')) {
                return 'Media could not be retrieved from host server or URL is inaccessible to Meta.';
            }
            return "Invalid request parameter: {$rawMessage}";
        }

        return $error['error_user_msg'] ?? $rawMessage;
    }

    /**
     * TikTok Content Posting Pipeline:
     * 1. Validate video media requirement
     * 2. POST https://open.tiktokapis.com/v2/post/publish/video/init/ with source_info = PULL_FROM_URL
     * 3. Poll POST https://open.tiktokapis.com/v2/post/publish/status/fetch/ with publish_id
     * 4. On SUCCESS, store external_post_id and permalink
     */
    protected function publishTikTokAccount(SocialPost $post, SocialPostChannel $postChannel, array $credentials): bool
    {
        $accessToken = $credentials['access_token'] ?? null;
        $openId = $credentials['open_id'] ?? null;
        $handle = ltrim($credentials['handle'] ?? $credentials['username'] ?? 'user', '@');

        if (!$accessToken) {
            $postChannel->update([
                'status' => 'failed',
                'error_message' => 'TikTok access token is missing from credentials.',
            ]);
            return false;
        }

        $mediaUrls = $post->media_urls ?: [];
        $videoUrl = null;
        foreach ($mediaUrls as $url) {
            if ($this->isVideoMedia($url, $post->post_type)) {
                $videoUrl = $url;
                break;
            }
        }

        if (!$videoUrl) {
            $postChannel->update([
                'status' => 'failed',
                'error_message' => 'TikTok posts strictly require a video attachment (MP4, MOV, or WEBM).',
            ]);
            return false;
        }

        if (!str_starts_with($videoUrl, 'http')) {
            $videoUrl = \App\Providers\AppServiceProvider::getBackendUrl() . '/' . ltrim($videoUrl, '/');
        }

        // Mock mode for automated testing or mock tokens
        if ($this->isMockToken($accessToken)) {
            $mockPublishId = "mock_tiktok_pub_" . uniqid();
            $permalink = "https://www.tiktok.com/@{$handle}/video/{$mockPublishId}";

            $postChannel->update([
                'status' => 'published',
                'external_post_id' => $mockPublishId,
                'permalink' => $permalink,
                'error_message' => null,
                'published_at' => now(),
            ]);

            return true;
        }

        $initUrl = "https://open.tiktokapis.com/v2/post/publish/video/init/";
        $payload = [
            'post_info' => [
                'title' => $post->content ?: $post->title,
                'privacy_level' => 'PUBLIC_TO_EVERYONE',
                'disable_duet' => false,
                'disable_stitch' => false,
                'disable_comment' => false,
            ],
            'source_info' => [
                'source' => 'PULL_FROM_URL',
                'video_url' => $videoUrl,
            ],
        ];

        try {
            $response = Http::withToken($accessToken)
                ->withHeaders([
                    'Content-Type' => 'application/json; charset=UTF-8',
                ])
                ->timeout(30)
                ->post($initUrl, $payload);

            if (!$response->successful()) {
                Log::error("TikTok publish init failed for channel {$postChannel->channel_connection_id}: " . $response->body());
                $errorMsg = $response->json('error.message') ?? $response->json('message') ?? 'TikTok publishing request failed.';
                $postChannel->update([
                    'status' => 'failed',
                    'error_message' => $errorMsg,
                ]);
                return false;
            }

            $publishId = $response->json('data.publish_id');
            if (!$publishId) {
                $postChannel->update([
                    'status' => 'failed',
                    'error_message' => 'TikTok did not return a valid publish_id.',
                ]);
                return false;
            }

            // Poll publish status
            $isCompleted = false;
            $attempts = 0;
            $maxAttempts = app()->environment('testing') ? 1 : 15;
            $statusUrl = "https://open.tiktokapis.com/v2/post/publish/status/fetch/";

            while ($attempts < $maxAttempts && !$isCompleted) {
                $attempts++;
                if (!app()->environment('testing')) {
                    sleep(3);
                }

                $statusRes = Http::withToken($accessToken)
                    ->withHeaders(['Content-Type' => 'application/json; charset=UTF-8'])
                    ->timeout(15)
                    ->post($statusUrl, ['publish_id' => $publishId]);

                if ($statusRes->successful()) {
                    $status = $statusRes->json('data.status');
                    if ($status === 'SUCCESS' || $status === 'PUBLISHED') {
                        $isCompleted = true;
                        break;
                    } elseif ($status === 'FAILED') {
                        $failReason = $statusRes->json('data.fail_reason') ?? 'TikTok video processing failed.';
                        $postChannel->update([
                            'status' => 'failed',
                            'error_message' => $failReason,
                        ]);
                        return false;
                    }
                }
            }

            $permalink = "https://www.tiktok.com/@{$handle}/video/{$publishId}";

            $postChannel->update([
                'status' => 'published',
                'external_post_id' => $publishId,
                'permalink' => $permalink,
                'error_message' => null,
                'published_at' => now(),
            ]);

            return true;
        } catch (Exception $e) {
            Log::error("Exception in publishTikTokAccount: " . $e->getMessage());
            $postChannel->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * LinkedIn Posts API Publishing Pipeline:
     * 1. Resolve author URN (organization or person)
     * 2. Build commentary and distribution
     * 3. Send POST https://api.linkedin.com/rest/posts
     * 4. Capture x-restli-id header and persist permalink
     */
    protected function publishLinkedInAccount(SocialPost $post, SocialPostChannel $postChannel, array $credentials): bool
    {
        $accessToken = $credentials['access_token'] ?? null;
        $authorUrn = $credentials['author_urn'] ?? $credentials['identifier'] ?? null;

        if (!$accessToken) {
            $postChannel->update([
                'status' => 'failed',
                'error_message' => 'LinkedIn access token is missing from credentials.',
            ]);
            return false;
        }

        if (!$authorUrn) {
            $postChannel->update([
                'status' => 'failed',
                'error_message' => 'LinkedIn author URN is missing from credentials.',
            ]);
            return false;
        }

        // Mock mode for automated tests and sandbox verification
        if ($this->isMockToken($accessToken)) {
            $mockPostUrn = 'urn:li:share:' . uniqid();
            $permalink = "https://www.linkedin.com/feed/update/{$mockPostUrn}";

            $postChannel->update([
                'status' => 'published',
                'external_post_id' => $mockPostUrn,
                'permalink' => $permalink,
                'error_message' => null,
                'published_at' => now(),
            ]);

            return true;
        }

        $commentary = $post->content ?: $post->title;
        $mediaUrls = $post->media_urls ?: [];

        $payload = [
            'author' => $authorUrn,
            'commentary' => $commentary,
            'visibility' => 'PUBLIC',
            'distribution' => [
                'feedDistribution' => 'MAIN_FEED',
                'targetEntities' => [],
                'thirdPartyDistributionChannels' => [],
            ],
            'lifecycleState' => 'PUBLISHED',
            'isReshareDisabledByAuthor' => false,
        ];

        // If media URL is provided and valid, attach article/media
        if (!empty($mediaUrls) && !empty($mediaUrls[0])) {
            $firstMedia = $mediaUrls[0];
            if (!str_starts_with($firstMedia, 'http')) {
                $firstMedia = \App\Providers\AppServiceProvider::getBackendUrl() . '/' . ltrim($firstMedia, '/');
            }

            $payload['content'] = [
                'article' => [
                    'source' => $firstMedia,
                    'title' => $post->title,
                    'description' => substr($commentary, 0, 200),
                ]
            ];
        }

        try {
            $response = Http::withToken($accessToken)
                ->withHeaders([
                    'X-Restli-Protocol-Version' => '2.0.0',
                    'Linkedin-Version' => '202401',
                    'Content-Type' => 'application/json',
                ])
                ->timeout(20)
                ->post('https://api.linkedin.com/rest/posts', $payload);

            if (!$response->successful() && $response->status() !== 201) {
                Log::error("LinkedIn Posts API returned error: " . $response->body());
                $errorMessage = $response->json('message') 
                    ?? $response->json('error.message') 
                    ?? 'Unknown LinkedIn API publishing error.';

                $postChannel->update([
                    'status' => 'failed',
                    'error_message' => $errorMessage,
                ]);
                return false;
            }

            $postUrn = $response->header('x-restli-id') 
                ?? $response->json('id') 
                ?? ('urn:li:share:' . uniqid());

            $permalink = "https://www.linkedin.com/feed/update/{$postUrn}";

            $postChannel->update([
                'status' => 'published',
                'external_post_id' => $postUrn,
                'permalink' => $permalink,
                'error_message' => null,
                'published_at' => now(),
            ]);

            return true;
        } catch (Exception $e) {
            Log::error("Exception in publishLinkedInAccount: " . $e->getMessage());
            $postChannel->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Check whether token is a mock token for development or testing.
     */
    protected function isMockToken(?string $token): bool
    {
        if (empty($token)) {
            return false;
        }

        return $token === 'mock_token' 
            || str_starts_with($token, 'EAAGb3eSZC_MOCK_TOKEN') 
            || str_starts_with($token, 'mock_');
    }
}
