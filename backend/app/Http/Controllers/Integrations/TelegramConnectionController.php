<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Models\ChannelConnection;
use App\Providers\AppServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class TelegramConnectionController extends Controller
{
    /**
     * Get active Telegram connection status and list of all bots for the tenant.
     */
    public function status(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $connections = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'telegram')
            ->orderBy('id', 'desc')
            ->get();

        $connectionsList = $connections->map(function ($conn) {
            $creds = $conn->decrypted_credentials;
            return [
                'id' => $conn->id,
                'name' => $conn->name,
                'status' => $conn->status,
                'bot_username' => $creds['bot_username'] ?? '',
                'bot_first_name' => $creds['bot_first_name'] ?? '',
                'webhook_url' => AppServiceProvider::getBackendUrl() . "/api/webhooks/channel/{$conn->id}",
                'webhook_verify_token' => $creds['secret_token'] ?? '',
                'raw_credentials' => $creds,
                'created_at' => $conn->created_at?->toIso8601String(),
            ];
        });

        $firstConn = $connections->first();
        $firstCreds = $firstConn ? $firstConn->decrypted_credentials : [];

        return response()->json([
            'connected' => $connections->isNotEmpty(),
            'connections' => $connectionsList,
            'id' => $firstConn?->id,
            'name' => $firstConn?->name,
            'status' => $firstConn?->status,
            'bot_username' => $firstCreds['bot_username'] ?? '',
            'webhook_url' => $firstConn ? AppServiceProvider::getBackendUrl() . "/api/webhooks/channel/{$firstConn->id}" : '',
            'webhook_verify_token' => $firstCreds['secret_token'] ?? '',
            'raw_credentials' => $firstCreds,
        ]);
    }

    /**
     * Connect a new Telegram bot or update an existing connection.
     */
    public function connect(Request $request): JsonResponse
    {
        $request->validate([
            'id' => 'nullable|integer',
            'name' => 'required|string|max:255',
            'token' => 'required|string|max:255',
        ]);

        $tenantId = $request->user()->tenant_id ?? 1;
        $connectionId = $request->input('id');
        $token = trim($request->input('token'));
        $name = trim($request->input('name'));

        if (!$connectionId) {
            $tenant = $request->user()->tenant;
            $limitCheck = app(\App\Services\PlanLimitService::class)->canConnectChannel($tenant, 'telegram');
            if (!$limitCheck['allowed']) {
                return response()->json([
                    'message' => $limitCheck['reason'],
                    'error_code' => $limitCheck['code']
                ], 403);
            }
        }

        try {
            // 1. Verify token by querying getMe
            $urlGetMe = "https://api.telegram.org/bot{$token}/getMe";
            $response = Http::timeout(10)->get($urlGetMe);

            if (!$response->successful() || !$response->json('ok')) {
                return response()->json([
                    'message' => 'Invalid Telegram Bot Token. Verification failed.',
                ], 422);
            }

            $botUsername = $response->json('result.username') ?? 'bot';
            $botFirstName = $response->json('result.first_name') ?? $name;

            // 2. Find or create connection
            if ($connectionId) {
                $connection = ChannelConnection::where('tenant_id', $tenantId)
                    ->where('channel_type', 'telegram')
                    ->findOrFail($connectionId);
            } else {
                $connection = new ChannelConnection();
                $connection->tenant_id = $tenantId;
                $connection->channel_type = 'telegram';
            }

            $connection->name = $name;
            $connection->status = 'connected';
            
            $existingCreds = $connection->exists ? $connection->decrypted_credentials : [];
            $secretToken = $existingCreds['secret_token'] ?? Str::random(32);
            $connection->credentials = [
                'token' => $token,
                'secret_token' => $secretToken,
                'bot_username' => $botUsername,
                'bot_first_name' => $botFirstName,
            ];
            $connection->save();

            // 3. Set Webhook against Telegram Bot API
            $appUrl = \App\Providers\AppServiceProvider::getBackendUrl();
            $webhookUrl = "{$appUrl}/api/webhooks/channel/{$connection->id}";
            if (str_starts_with($webhookUrl, 'http://') && !str_contains($webhookUrl, 'localhost') && !str_contains($webhookUrl, '127.0.0.1')) {
                $webhookUrl = str_replace('http://', 'https://', $webhookUrl);
            }

            $urlSetWebhook = "https://api.telegram.org/bot{$token}/setWebhook";
            $webhookRes = Http::timeout(10)->post($urlSetWebhook, [
                'url' => $webhookUrl,
                'secret_token' => $secretToken,
            ]);

            if (!$webhookRes->successful() || !$webhookRes->json('ok')) {
                $errDescription = $webhookRes->json('description') ?? 'Unknown error';
                Log::warning("Failed to register Telegram webhook: {$errDescription}");

                if (!str_starts_with($webhookUrl, 'https://') || str_contains($webhookUrl, 'localhost') || str_contains($webhookUrl, '127.0.0.1')) {
                    return response()->json([
                        'connected' => true,
                        'id' => $connection->id,
                        'name' => $connection->name,
                        'status' => $connection->status,
                        'bot_username' => $botUsername,
                        'webhook_url' => $webhookUrl,
                        'webhook_verify_token' => $secretToken,
                        'warning' => 'Webhook registration skipped/failed because the application is running locally without an HTTPS public URL. Outbound messages will work, but inbound webhook updates will not be received.',
                    ]);
                }

                $connection->delete();
                return response()->json([
                    'message' => 'Failed to register webhook with Telegram Bot API: ' . $errDescription,
                ], 500);
            }

            return response()->json([
                'connected' => true,
                'id' => $connection->id,
                'name' => $connection->name,
                'status' => $connection->status,
                'bot_username' => $botUsername,
                'webhook_url' => $webhookUrl,
                'webhook_verify_token' => $secretToken,
                'raw_credentials' => $connection->decrypted_credentials,
            ]);

        } catch (Exception $e) {
            Log::error("Telegram connection failed: " . $e->getMessage());
            return response()->json([
                'message' => 'Connection failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete/Disconnect Telegram channel by ID.
     */
    public function disconnect(Request $request, $id = null): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $targetId = $id ?: $request->input('id');

        $query = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'telegram');

        if ($targetId) {
            $query->where('id', $targetId);
        }

        $connectionsToDelete = $query->get();

        foreach ($connectionsToDelete as $connection) {
            $creds = $connection->decrypted_credentials;
            $token = $creds['token'] ?? null;

            if ($token && $token !== 'mock_token') {
                try {
                    $urlDeleteWebhook = "https://api.telegram.org/bot{$token}/deleteWebhook";
                    Http::timeout(10)->post($urlDeleteWebhook);
                } catch (Exception $e) {
                    Log::warning("Failed to delete Telegram webhook: " . $e->getMessage());
                }
            }

            $connection->delete();
        }

        $remaining = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'telegram')
            ->count();

        return response()->json([
            'connected' => $remaining > 0,
            'remaining_count' => $remaining,
            'message' => 'Telegram connection has been disconnected successfully.'
        ]);
    }
}
