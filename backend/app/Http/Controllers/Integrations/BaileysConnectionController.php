<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Models\ChannelConnection;
use App\Models\PlatformSetting;
use App\Events\WhatsAppBaileysQrCodeEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class BaileysConnectionController extends Controller
{
    /**
     * Get database-configured Baileys worker parameters with env override.
     */
    protected function getBaileysConfig(): array
    {
        $cfg = PlatformSetting::getSetting('baileys_app_config') ?: [];
        $envUrl = getenv('BAILEYS_WORKER_URL') ?: env('BAILEYS_WORKER_URL');
        $envSecret = getenv('BAILEYS_SECRET_TOKEN') ?: env('BAILEYS_SECRET_TOKEN');

        $workerUrl = 'http://127.0.0.1:5006';
        if (!empty($envUrl)) {
            $workerUrl = $envUrl;
        } elseif (!empty($cfg['worker_url'])) {
            $workerUrl = $cfg['worker_url'];
        }

        $secretToken = 'whatsomni_baileys_secret_key';
        if (!empty($envSecret)) {
            $secretToken = $envSecret;
        } elseif (!empty($cfg['secret_token'])) {
            $secretToken = $cfg['secret_token'];
        }

        return [
            'worker_url' => rtrim($workerUrl, '/'),
            'secret_token' => $secretToken,
        ];
    }

    /**
     * Start/Configure Baileys Unofficial WhatsApp connection.
     */
    public function connect(Request $request)
    {
        $request->validate([
            'id' => 'nullable|integer',
            'name' => 'nullable|string|max:255',
        ]);

        $baileysCfg = $this->getBaileysConfig();
        $tenantId = $request->user()->tenant_id ?? 1;
        $connectionId = $request->input('id');
        $workerUrl = $baileysCfg['worker_url'];

        if ($connectionId) {
            $connection = ChannelConnection::where('tenant_id', $tenantId)
                ->where('channel_type', 'whatsapp_baileys')
                ->findOrFail($connectionId);

            if ($request->has('name')) {
                $connection->name = $request->input('name') ?: 'WhatsApp Baileys';
                $connection->save();
            }

            if ($connection->status === 'connected') {
                return response()->json([
                    'id' => $connection->id,
                    'name' => $connection->name,
                    'channel_type' => $connection->channel_type,
                    'status' => $connection->status,
                ]);
            }
        } else {
            $tenant = $request->user()->tenant;
            $limitCheck = app(\App\Services\PlanLimitService::class)->canConnectChannel($tenant, 'whatsapp_baileys');
            if (!$limitCheck['allowed']) {
                return response()->json([
                    'message' => $limitCheck['reason'],
                    'error_code' => $limitCheck['code']
                ], 403);
            }

            $webhookVerifyToken = Str::random(32);
            $connection = new ChannelConnection();
            $connection->tenant_id = $tenantId;
            $connection->channel_type = 'whatsapp_baileys';
            $connection->status = 'disconnected';
            $connection->name = $request->input('name') ?: 'WhatsApp Baileys';
            $connection->credentials = [
                'webhook_verify_token' => $webhookVerifyToken,
            ];
            $connection->save();
        }

        $isNewConnection = !$connectionId;
        $webhookVerifyToken = $connection->decrypted_credentials['webhook_verify_token'] ?? Str::random(32);
        $secretToken = $baileysCfg['secret_token'];

        try {
            // Tell worker to spin up/start the session with auth header
            $response = Http::timeout(10)
                ->withHeaders(['X-Baileys-Secret' => $secretToken])
                ->post("{$workerUrl}/sessions/start", [
                    'connection_id' => $connection->id,
                    'webhook_verify_token' => $webhookVerifyToken,
                ]);

            if (!$response->successful()) {
                Log::error("Baileys worker at {$workerUrl} rejected connect session (HTTP {$response->status()}): " . $response->body());
                if ($isNewConnection) {
                    $connection->delete();
                }
                return response()->json(['message' => 'Baileys worker rejected the connection request.'], 500);
            }
        } catch (Exception $e) {
            Log::error("Failed to contact Baileys worker at {$workerUrl} on connect: " . $e->getMessage());
            if ($isNewConnection) {
                $connection->delete();
            }
            return response()->json(['message' => "Failed to contact Baileys worker at {$workerUrl}. Please ensure the worker service is running."], 500);
        }

        $cachedQr = \Illuminate\Support\Facades\Cache::get("baileys_qr_{$connection->id}");

        return response()->json([
            'id' => $connection->id,
            'name' => $connection->name,
            'channel_type' => $connection->channel_type,
            'status' => $connection->status,
            'qr' => $cachedQr,
            'webhook_verify_token' => $webhookVerifyToken,
        ]);
    }

    /**
     * Disconnect/Remove Baileys connection by ID.
     */
    public function disconnect(Request $request, $id = null)
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $targetId = $id ?: $request->input('id');

        $query = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'whatsapp_baileys');

        if ($targetId) {
            $query->where('id', $targetId);
        }

        $connectionsToDelete = $query->get();

        if ($connectionsToDelete->isEmpty()) {
            return response()->json(['message' => 'Active Baileys channel not found.'], 404);
        }

        $baileysCfg = $this->getBaileysConfig();
        $workerUrl = $baileysCfg['worker_url'];
        $secretToken = $baileysCfg['secret_token'];

        foreach ($connectionsToDelete as $connection) {
            try {
                // Tell worker to stop/close the session with auth header
                Http::timeout(10)
                    ->withHeaders(['X-Baileys-Secret' => $secretToken])
                    ->post("{$workerUrl}/sessions/stop", [
                        'connection_id' => $connection->id,
                    ]);
            } catch (Exception $e) {
                Log::warning("Could not tell Baileys worker to stop session: " . $e->getMessage());
            }

            $connection->delete();
        }

        $remaining = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'whatsapp_baileys')
            ->count();

        return response()->json([
            'success' => true,
            'connected' => $remaining > 0,
            'remaining_count' => $remaining,
        ]);
    }

    /**
     * Fetch active connections list (used by worker recovery on start).
     * Protected by shared internal microservice secret token.
     */
    public function sessions(Request $request)
    {
        $baileysCfg = $this->getBaileysConfig();
        $expectedSecret = $baileysCfg['secret_token'];
        $incomingSecret = $request->header('X-Baileys-Worker-Secret') ?: $request->header('X-Baileys-Secret');

        if (!$incomingSecret || !hash_equals((string)$expectedSecret, (string)$incomingSecret)) {
            return response()->json(['message' => 'Unauthorized worker request.'], 401);
        }

        $connections = ChannelConnection::where('channel_type', 'whatsapp_baileys')
            ->where('status', 'connected')
            ->get()
            ->map(function ($conn) {
                return [
                    'connection_id' => $conn->id,
                    'name' => $conn->name,
                    'status' => $conn->status,
                    'credentials' => $conn->decrypted_credentials,
                ];
            });

        return response()->json(['sessions' => $connections]);
    }

    /**
     * Get Baileys connection details/status endpoint with connections list.
     */
    public function status(Request $request)
    {
        $tenantId = $request->user()->tenant_id ?? 1;

        $connections = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'whatsapp_baileys')
            ->orderBy('id', 'desc')
            ->get();

        $connectionsList = $connections->map(function ($conn) {
            return [
                'id' => $conn->id,
                'name' => $conn->name,
                'status' => $conn->status,
                'webhook_verify_token' => $conn->decrypted_credentials['webhook_verify_token'] ?? null,
                'qr' => \Illuminate\Support\Facades\Cache::get("baileys_qr_{$conn->id}"),
                'created_at' => $conn->created_at?->toIso8601String(),
            ];
        });

        $firstConn = $connections->first();
        $cachedQr = $firstConn ? \Illuminate\Support\Facades\Cache::get("baileys_qr_{$firstConn->id}") : null;

        if ($firstConn && !$cachedQr && $firstConn->status !== 'connected') {
            $baileysCfg = $this->getBaileysConfig();
            $workerUrl = $baileysCfg['worker_url'];
            $secretToken = $baileysCfg['secret_token'];
            try {
                $response = Http::timeout(2)
                    ->withHeaders(['X-Baileys-Secret' => $secretToken])
                    ->get("{$workerUrl}/sessions/{$firstConn->id}/qr");
                if ($response->successful() && !empty($response->json('qr'))) {
                    $cachedQr = $response->json('qr');
                    \Illuminate\Support\Facades\Cache::put("baileys_qr_{$firstConn->id}", $cachedQr, now()->addMinutes(2));
                }
            } catch (\Throwable $e) {}
        }

        return response()->json([
            'connected' => $connections->where('status', 'connected')->isNotEmpty(),
            'connections' => $connectionsList,
            'id' => $firstConn?->id,
            'name' => $firstConn?->name,
            'status' => $firstConn?->status,
            'qr' => $cachedQr,
            'webhook_verify_token' => $firstConn ? ($firstConn->decrypted_credentials['webhook_verify_token'] ?? null) : null,
        ]);
    }

    /**
     * Get latest cached QR code for a connection.
     */
    public function getQr(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $connection = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'whatsapp_baileys')
            ->findOrFail($id);

        $qr = \Illuminate\Support\Facades\Cache::get("baileys_qr_{$connection->id}");

        if (!$qr && $connection->status !== 'connected') {
            $baileysCfg = $this->getBaileysConfig();
            $workerUrl = $baileysCfg['worker_url'];
            $secretToken = $baileysCfg['secret_token'];
            try {
                $response = Http::timeout(3)
                    ->withHeaders(['X-Baileys-Secret' => $secretToken])
                    ->get("{$workerUrl}/sessions/{$connection->id}/qr");
                if ($response->successful() && !empty($response->json('qr'))) {
                    $qr = $response->json('qr');
                    \Illuminate\Support\Facades\Cache::put("baileys_qr_{$connection->id}", $qr, now()->addMinutes(2));
                }
            } catch (\Throwable $e) {
                // Silently fall back
            }
        }

        return response()->json([
            'id' => $connection->id,
            'status' => $connection->status,
            'qr' => $qr,
        ]);
    }

    /**
     * Callback Webhook from Baileys Worker notifying Laravel about QR updates and state changes.
     */
    public function webhook(Request $request)
    {
        $request->validate([
            'connection_id' => 'required|integer',
            'event' => 'required|string',
        ]);

        $connectionId = $request->input('connection_id');
        $event = $request->input('event');

        $connection = ChannelConnection::find($connectionId);
        if (!$connection) {
            return response()->json(['message' => 'Connection not found.'], 404);
        }

        // Verify request signature token
        $expectedToken = $connection->decrypted_credentials['webhook_verify_token'] ?? null;
        $incomingToken = $request->header('X-Baileys-Token');

        if ($expectedToken && $incomingToken !== $expectedToken) {
            return response()->json(['message' => 'Invalid validation token.'], 401);
        }

        if ($event === 'qr') {
            $qr = $request->input('qr');
            if ($qr) {
                // Cache QR for fast HTTP polling retrieval
                \Illuminate\Support\Facades\Cache::put("baileys_qr_{$connectionId}", $qr, now()->addMinutes(2));

                // Broadcast over WebSocket if Reverb is available
                try {
                    WhatsAppBaileysQrCodeEvent::dispatch($connectionId, $qr);
                } catch (\Throwable $e) {
                    Log::warning("Baileys QR Webhook: Reverb broadcast skipped/failed ({$e->getMessage()})");
                }
            }
        } elseif ($event === 'connected') {
            \Illuminate\Support\Facades\Cache::forget("baileys_qr_{$connectionId}");
            $connection->status = 'connected';
            $connection->save();
        } elseif ($event === 'reconnecting') {
            $connection->status = 'connecting';
            $connection->save();
        } elseif ($event === 'disconnected') {
            $connection->status = 'disconnected';
            $connection->save();
        }

        return response()->json(['success' => true]);
    }
}
