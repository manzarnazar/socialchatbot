<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\ChannelConnection;
use App\Models\SocialPost;
use App\Models\SocialPostChannel;
use App\Jobs\PublishSocialPostJob;
use App\Providers\AppServiceProvider;
use App\Services\AIProviderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Exception;

class SocialPostController extends Controller
{
    protected AIProviderService $aiService;

    public function __construct(AIProviderService $aiService)
    {
        $this->aiService = $aiService;
    }

    /**
     * Get paginated social posts list with telemetry counts and filters.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $query = SocialPost::where('tenant_id', $tenantId)
            ->with(['channels', 'postChannels.channelConnection'])
            ->orderBy('created_at', 'desc');

        // Search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('content', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($status = $request->input('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        // Channel filter
        if ($channelId = $request->input('channel_id')) {
            if ($channelId !== 'all') {
                $query->whereHas('postChannels', function ($q) use ($channelId) {
                    $q->where('channel_connection_id', $channelId);
                });
            }
        }

        // Platform filter (instagram / facebook)
        if ($platform = $request->input('platform')) {
            if ($platform !== 'all') {
                $query->whereHas('postChannels', function ($q) use ($platform) {
                    $q->where('platform', $platform);
                });
            }
        }

        // Telemetry counts
        $counts = [
            'total' => SocialPost::where('tenant_id', $tenantId)->count(),
            'published' => SocialPost::where('tenant_id', $tenantId)->whereIn('status', ['published', 'partially_published'])->count(),
            'scheduled' => SocialPost::where('tenant_id', $tenantId)->where('status', 'scheduled')->count(),
            'draft' => SocialPost::where('tenant_id', $tenantId)->where('status', 'draft')->count(),
            'failed' => SocialPost::where('tenant_id', $tenantId)->where('status', 'failed')->count(),
        ];

        $perPage = min(50, max(5, (int) $request->input('per_page', 15)));
        $posts = $query->paginate($perPage);

        return response()->json([
            'posts' => $posts,
            'counts' => $counts,
        ]);
    }

    /**
     * Strictly get connected Instagram and Facebook channels for posting.
     */
    public function getChannels(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $channels = ChannelConnection::where('tenant_id', $tenantId)
            ->whereIn('channel_type', ['instagram', 'messenger', 'tiktok', 'linkedin'])
            ->where('status', 'connected')
            ->get()
            ->map(function ($conn) {
                $decrypted = $conn->decrypted_credentials;
                $platform = match ($conn->channel_type) {
                    'instagram' => 'instagram',
                    'messenger' => 'facebook',
                    'tiktok' => 'tiktok',
                    'linkedin' => 'linkedin',
                    default => $conn->channel_type,
                };

                $handle = null;
                if ($conn->channel_type === 'instagram') {
                    $handle = $decrypted['username'] ?? $decrypted['instagram_username'] ?? $decrypted['instagram_business_account_id'] ?? null;
                } elseif ($conn->channel_type === 'tiktok') {
                    $handle = $decrypted['handle'] ?? $decrypted['username'] ?? $decrypted['open_id'] ?? $conn->name;
                } elseif ($conn->channel_type === 'linkedin') {
                    $handle = $decrypted['handle'] ?? $decrypted['author_name'] ?? $decrypted['author_urn'] ?? $conn->name;
                } else {
                    $handle = $decrypted['page_name'] ?? $decrypted['page_id'] ?? null;
                }

                return [
                    'id' => $conn->id,
                    'name' => $conn->name,
                    'channel_type' => $conn->channel_type,
                    'platform' => $platform,
                    'status' => $conn->status,
                    'handle' => $handle,
                    'page_id' => $decrypted['page_id'] ?? null,
                    'instagram_business_account_id' => $decrypted['instagram_business_account_id'] ?? null,
                    'open_id' => $decrypted['open_id'] ?? null,
                    'created_at' => $conn->created_at,
                ];
            });

        return response()->json([
            'channels' => $channels,
        ]);
    }

    /**
     * Store a new composed social post (draft, immediate, or scheduled).
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string|max:10000',
            'channel_ids' => 'required|array|min:1',
            'channel_ids.*' => [
                'required',
                'integer',
                Rule::exists('channel_connections', 'id')->where(function ($q) use ($tenantId) {
                    $q->where('tenant_id', $tenantId)
                      ->whereIn('channel_type', ['instagram', 'messenger', 'tiktok', 'linkedin'])
                      ->where('status', 'connected');
                }),
            ],
            'media_urls' => 'nullable|array',
            'media_urls.*' => 'string|max:2000',
            'post_type' => 'nullable|string|in:feed_post,story,reel,video',
            'timing_type' => 'required|string|in:immediate,scheduled,draft',
            'scheduled_at' => 'required_if:timing_type,scheduled|nullable|date',
            'ai_prompt' => 'nullable|string|max:2000',
            'ai_model' => 'nullable|string|max:100',
            'metadata' => 'nullable|array',
        ]);

        $channelIds = $request->input('channel_ids', []);
        $mediaUrls = $request->input('media_urls', []);

        // Validate TikTok video requirement
        $hasTikTokChannel = ChannelConnection::where('tenant_id', $tenantId)
            ->whereIn('id', $channelIds)
            ->where('channel_type', 'tiktok')
            ->exists();

        if ($hasTikTokChannel) {
            $hasVideo = false;
            foreach ($mediaUrls as $url) {
                if (preg_match('/\.(mp4|mov|m4v|webm|quicktime)(\?.*)?$/i', $url)) {
                    $hasVideo = true;
                    break;
                }
            }

            if (!$hasVideo) {
                return response()->json([
                    'message' => 'TikTok posts strictly require a video attachment (MP4, MOV, or WEBM).',
                    'error_code' => 'TIKTOK_VIDEO_REQUIRED',
                ], 422);
            }
        }

        $timingType = $request->input('timing_type');
        $scheduledAt = $timingType === 'scheduled' ? $request->input('scheduled_at') : null;

        // Status mapping
        $status = 'draft';
        if ($timingType === 'scheduled') {
            $status = 'scheduled';
        } elseif ($timingType === 'immediate') {
            $status = 'publishing';
        }

        DB::beginTransaction();
        try {
            $post = SocialPost::create([
                'tenant_id' => $tenantId,
                'title' => trim($request->input('title')),
                'content' => trim($request->input('content')),
                'media_urls' => $request->input('media_urls') ?: [],
                'post_type' => $request->input('post_type', 'feed_post'),
                'timing_type' => $timingType,
                'scheduled_at' => $scheduledAt,
                'status' => $status,
                'ai_prompt' => $request->input('ai_prompt'),
                'ai_model' => $request->input('ai_model'),
                'metadata' => $request->input('metadata') ?: [],
            ]);

            // Bind targeted channels
            $channels = ChannelConnection::where('tenant_id', $tenantId)
                ->whereIn('id', $request->input('channel_ids'))
                ->get();

            $channelStatus = $timingType === 'immediate' ? 'publishing' : 'pending';

            foreach ($channels as $channel) {
                $platform = match ($channel->channel_type) {
                    'instagram' => 'instagram',
                    'tiktok' => 'tiktok',
                    'linkedin' => 'linkedin',
                    default => 'facebook',
                };
                SocialPostChannel::create([
                    'social_post_id' => $post->id,
                    'channel_connection_id' => $channel->id,
                    'platform' => $platform,
                    'status' => $channelStatus,
                ]);
            }

            DB::commit();

            if ($timingType === 'immediate') {
                PublishSocialPostJob::dispatch($post->id);
            }

            $message = match ($timingType) {
                'scheduled' => 'Post scheduled successfully!',
                'immediate' => 'Publishing post to selected channels...',
                default => 'Post created successfully!',
            };

            return response()->json([
                'success' => true,
                'message' => $message,
                'post' => $post->load(['channels', 'postChannels.channelConnection']),
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create post: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Show post details.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $post = SocialPost::where('tenant_id', $tenantId)
            ->with(['channels', 'postChannels.channelConnection'])
            ->findOrFail($id);

        return response()->json([
            'post' => $post,
        ]);
    }

    /**
     * Update an existing post.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $post = SocialPost::where('tenant_id', $tenantId)->findOrFail($id);

        if (in_array($post->status, ['published', 'partially_published'])) {
            return response()->json([
                'message' => 'Published or partially published posts cannot be modified.',
            ], 422);
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string|max:10000',
            'channel_ids' => 'required|array|min:1',
            'channel_ids.*' => [
                'required',
                'integer',
                Rule::exists('channel_connections', 'id')->where(function ($q) use ($tenantId) {
                    $q->where('tenant_id', $tenantId)
                      ->whereIn('channel_type', ['instagram', 'messenger', 'tiktok', 'linkedin'])
                      ->where('status', 'connected');
                }),
            ],
            'media_urls' => 'nullable|array',
            'media_urls.*' => 'string|max:2000',
            'post_type' => 'nullable|string|in:feed_post,story,reel,video',
            'timing_type' => 'required|string|in:immediate,scheduled,draft',
            'scheduled_at' => 'required_if:timing_type,scheduled|nullable|date',
        ]);

        $channelIds = $request->input('channel_ids', []);
        $mediaUrls = $request->input('media_urls', []);

        // Validate TikTok video requirement
        $hasTikTokChannel = ChannelConnection::where('tenant_id', $tenantId)
            ->whereIn('id', $channelIds)
            ->where('channel_type', 'tiktok')
            ->exists();

        if ($hasTikTokChannel) {
            $hasVideo = false;
            foreach ($mediaUrls as $url) {
                if (preg_match('/\.(mp4|mov|m4v|webm|quicktime)(\?.*)?$/i', $url)) {
                    $hasVideo = true;
                    break;
                }
            }

            if (!$hasVideo) {
                return response()->json([
                    'message' => 'TikTok posts strictly require a video attachment (MP4, MOV, or WEBM).',
                    'error_code' => 'TIKTOK_VIDEO_REQUIRED',
                ], 422);
            }
        }

        $timingType = $request->input('timing_type');
        $scheduledAt = $timingType === 'scheduled' ? $request->input('scheduled_at') : null;

        if ($timingType === 'immediate') {
            $status = 'publishing';
        } elseif ($timingType === 'scheduled') {
            $status = 'scheduled';
        } else {
            $status = 'draft';
        }

        DB::beginTransaction();
        try {
            $post->update([
                'title' => trim($request->input('title')),
                'content' => trim($request->input('content')),
                'media_urls' => $request->input('media_urls') ?: [],
                'post_type' => $request->input('post_type', $post->post_type),
                'timing_type' => $timingType,
                'scheduled_at' => $scheduledAt,
                'status' => $status,
            ]);

            // Sync channels
            $channelIds = $request->input('channel_ids');
            SocialPostChannel::where('social_post_id', $post->id)
                ->whereNotIn('channel_connection_id', $channelIds)
                ->delete();

            $existingChannelIds = SocialPostChannel::where('social_post_id', $post->id)
                ->pluck('channel_connection_id')
                ->toArray();

            $newChannelIds = array_diff($channelIds, $existingChannelIds);
            if (!empty($newChannelIds)) {
                $channels = ChannelConnection::where('tenant_id', $tenantId)
                    ->whereIn('id', $newChannelIds)
                    ->get();

                foreach ($channels as $channel) {
                    $platform = match ($channel->channel_type) {
                        'instagram' => 'instagram',
                        'tiktok' => 'tiktok',
                        'linkedin' => 'linkedin',
                        default => 'facebook',
                    };
                    SocialPostChannel::create([
                        'social_post_id' => $post->id,
                        'channel_connection_id' => $channel->id,
                        'platform' => $platform,
                        'status' => $timingType === 'immediate' ? 'publishing' : 'pending',
                    ]);
                }
            }

            if ($timingType === 'immediate') {
                SocialPostChannel::where('social_post_id', $post->id)->update(['status' => 'publishing']);
            }

            DB::commit();

            if ($timingType === 'immediate') {
                PublishSocialPostJob::dispatch($post->id);
            }

            $message = match ($timingType) {
                'immediate' => 'Publishing post to selected channels...',
                'scheduled' => 'Post scheduled successfully!',
                default => 'Post updated successfully!',
            };

            return response()->json([
                'success' => true,
                'message' => $message,
                'post' => $post->load(['channels', 'postChannels.channelConnection']),
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update post: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete post.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $post = SocialPost::where('tenant_id', $tenantId)->findOrFail($id);
        $post->delete();

        return response()->json([
            'success' => true,
            'message' => 'Post deleted successfully.',
        ]);
    }

    /**
     * AI Copywriter & Hashtag Generator.
     */
    public function generateAi(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $request->validate([
            'prompt' => 'required|string|min:3|max:2000',
            'tone' => 'nullable|string|in:casual,professional,promo,urgent,storytelling',
            'target_platform' => 'nullable|string|in:both,instagram,facebook,tiktok,linkedin',
        ]);

        try {
            $prompt = trim($request->input('prompt'));
            $tone = $request->input('tone', 'casual');
            $targetPlatform = $request->input('target_platform', 'both');

            $generated = $this->aiService->generateSocialPostContent($tenantId, $prompt, $tone, $targetPlatform);

            return response()->json([
                'success' => true,
                'data' => $generated,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'AI Generation failed: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Upload a media file (image or video) for social media post.
     */
    public function uploadMedia(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $request->validate([
            'file' => 'required|file|mimes:jpeg,png,jpg,webp,mp4,mov,m4v,quicktime,webm|max:102400', // 100MB limit
        ]);

        try {
            $file = $request->file('file');
            $extension = strtolower($file->guessExtension() ?: ($file->getClientOriginalExtension() ?: 'bin'));
            $mimeType = $file->getMimeType();
            $fileName = uniqid('post_media_') . '.' . $extension;
            $path = $file->storeAs("social-posts/{$tenantId}", $fileName, 'public');

            // Determine if media is a video
            $isVideo = str_starts_with($mimeType, 'video/') || in_array($extension, ['mp4', 'mov', 'm4v', 'webm', 'quicktime']);

            // Generate full URL via public disk
            $url = Storage::disk('public')->url($path);
            if (!str_starts_with($url, 'http')) {
                $url = AppServiceProvider::getBackendUrl() . $url;
            }

            return response()->json([
                'success' => true,
                'url' => $url,
                'relative_url' => "/storage/{$path}",
                'file_name' => $fileName,
                'media_type' => $isVideo ? 'video' : 'image',
                'mime_type' => $mimeType,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Media upload failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Retry publishing for failed channels on a post.
     */
    public function retry(Request $request, int $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $post = SocialPost::where('tenant_id', $tenantId)
            ->with(['postChannels.channelConnection'])
            ->findOrFail($id);

        $channelIds = $request->input('channel_ids'); // optional array of connection IDs

        $query = SocialPostChannel::where('social_post_id', $post->id)
            ->where('status', 'failed');

        if (!empty($channelIds) && is_array($channelIds)) {
            $query->whereIn('channel_connection_id', $channelIds);
        }

        $failedChannels = $query->get();

        if ($failedChannels->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No failed channels found to retry.',
            ], 400);
        }

        $targetConnectionIds = $failedChannels->pluck('channel_connection_id')->toArray();

        // Mark targeted channels and post as publishing
        SocialPostChannel::where('social_post_id', $post->id)
            ->whereIn('channel_connection_id', $targetConnectionIds)
            ->update([
                'status' => 'publishing',
                'error_message' => null,
            ]);

        $post->update(['status' => 'publishing']);

        // Dispatch publishing job
        PublishSocialPostJob::dispatch($post->id, $targetConnectionIds);

        return response()->json([
            'success' => true,
            'message' => 'Publishing retry initiated for failed channels.',
            'post' => $post->fresh(['channels', 'postChannels.channelConnection']),
        ]);
    }
}
