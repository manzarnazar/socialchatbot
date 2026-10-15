<?php

namespace App\Http\Controllers\Channels;

use App\Http\Controllers\Controller;
use App\Models\ChannelConnection;
use App\Services\Channels\ChannelManager;
use App\Jobs\ProcessInboundMessageJob;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Exception;

class ChannelWebhookController extends Controller
{
    protected ChannelManager $channelManager;

    public function __construct(ChannelManager $channelManager)
    {
        $this->channelManager = $channelManager;
    }

    /**
     * Handle webhook requests (GET/POST) from message providers.
     */
    public function handle(Request $request, $connectionId)
    {
        $connection = ChannelConnection::find($connectionId);
        if (!$connection) {
            return response()->json(['message' => 'Connection not found.'], 404);
        }

        $credentials = $connection->decrypted_credentials;
        $driver = $this->channelManager->driver($connection->channel_type);

        // GET request challenge verification (e.g. WhatsApp, Facebook Hub Subscription challenge)
        if ($request->isMethod('GET')) {
            $mode = $request->query('hub_mode') ?: $request->query('hub.mode');
            $token = $request->query('hub_verify_token') ?: $request->query('hub.verify_token');
            $challenge = $request->query('hub_challenge') ?: $request->query('hub.challenge');

            $expectedToken = $credentials['webhook_verify_token'] ?? $credentials['webhook_token'] ?? null;

            if ($mode === 'subscribe' && $token === $expectedToken) {
                return response($challenge, 200)->header('Content-Type', 'text/plain');
            }

            // Mock challenge fallback
            if ($request->query('verify_token') === $expectedToken) {
                return response($request->query('challenge'), 200)->header('Content-Type', 'text/plain');
            }

            return response()->json(['message' => 'Forbidden verification token.'], 403);
        }

        // POST request event processing
        $payload = $request->getContent();
        $headers = collect($request->headers->all())->mapWithKeys(function ($item, $key) {
            return [$key => is_array($item) ? ($item[0] ?? '') : $item];
        })->toArray();

        try {
            if (!$driver->verifyWebhookSignature($headers, $payload, $credentials)) {
                Log::warning("Webhook signature verification failed for connection ID: {$connectionId}");
                return response()->json(['message' => 'Invalid signature.'], 401);
            }
        } catch (Exception $e) {
            Log::error("Error checking webhook signature: " . $e->getMessage());
            return response()->json(['message' => 'Signature verification error.'], 401);
        }

        $data = $request->all();

        // Dispatch background processing job
        ProcessInboundMessageJob::dispatch($connection->id, $data);

        return response()->json(['status' => 'queued']);
    }

    /**
     * Handle master Meta Developer App webhook (GET challenge verification or POST event ingress).
     */
    public function handleMetaGlobalWebhook(Request $request)
    {
        $meta = \App\Models\PlatformSetting::getSetting('meta_embedded_config') ?: [];
        $expectedToken = $meta['verify_token'] ?? 'whatsomni_meta_token';

        // 1. Handle GET request challenge verification from Meta
        if ($request->isMethod('GET')) {
            $mode = $request->query('hub_mode') ?: $request->query('hub.mode');
            $token = $request->query('hub_verify_token') ?: $request->query('hub.verify_token');
            $challenge = $request->query('hub_challenge') ?: $request->query('hub.challenge');

            if (($mode === 'subscribe' || empty($mode)) && (!empty($token) && ($token === $expectedToken || $token === 'whatsomni_meta_token'))) {
                return response($challenge, 200)->header('Content-Type', 'text/plain');
            }

            // Also check against any tenant connection's verify token
            if (!empty($token)) {
                $tenantConn = ChannelConnection::whereIn('channel_type', ['whatsapp', 'whatsapp_cloud', 'whatsapp_cloud_api', 'instagram', 'messenger'])
                    ->get()
                    ->first(function ($conn) use ($token) {
                        $creds = $conn->decrypted_credentials;
                        $t = trim((string)($creds['webhook_verify_token'] ?? $creds['webhook_token'] ?? ''));
                        return $t !== '' && $t === trim((string)$token);
                    });

                if ($tenantConn) {
                    return response($challenge, 200)->header('Content-Type', 'text/plain');
                }
            }

            return response()->json(['message' => 'Forbidden verification token.'], 403);
        }

        // 2. Handle POST request event ingress from Meta
        $data = $request->all();
        $rawPayload = $request->getContent();
        $hubSignature = $request->header('X-Hub-Signature-256') ?: $request->header('x-hub-signature-256');

        Log::info('Global Meta Webhook received: object=' . ($data['object'] ?? 'unknown') . ', entries=' . count($data['entry'] ?? []));

        // Attempt to route event to the correct tenant channel connection
        $matchedConnection = null;

        // Check WhatsApp payload across canonical channel names (whatsapp, whatsapp_cloud, whatsapp_cloud_api)
        $phoneId = $data['entry'][0]['changes'][0]['value']['metadata']['phone_number_id'] ?? null;
        $wabaId = $data['entry'][0]['id'] ?? ($data['entry'][0]['changes'][0]['value']['metadata']['waba_id'] ?? null);

        if ($phoneId || $wabaId) {
            $connections = ChannelConnection::whereIn('channel_type', ['whatsapp', 'whatsapp_cloud', 'whatsapp_cloud_api'])->get();
            foreach ($connections as $conn) {
                $creds = $conn->decrypted_credentials;
                if (($phoneId && ($creds['phone_number_id'] ?? '') == $phoneId) ||
                    ($wabaId && (($creds['waba_id'] ?? '') == $wabaId || ($creds['whatsapp_business_account_id'] ?? '') == $wabaId || ($creds['business_account_id'] ?? '') == $wabaId)) ||
                    ($phoneId && $conn->identifier == $phoneId)) {
                    $matchedConnection = $conn;
                    break;
                }
            }
        }

        // Check Instagram payload
        if (!$matchedConnection && ($data['object'] ?? '') === 'instagram') {
            $igId = $data['entry'][0]['id'] ?? null;
            $recipientId = $data['entry'][0]['messaging'][0]['recipient']['id'] ?? null;
            $checkIds = array_filter([$igId, $recipientId]);

            if (!empty($checkIds)) {
                $connections = ChannelConnection::where('channel_type', 'instagram')->get();
                foreach ($connections as $conn) {
                    $creds = $conn->decrypted_credentials;
                    $targetAccountIds = [
                        $creds['instagram_business_account_id'] ?? null,
                        $creds['instagram_account_id'] ?? null,
                        $creds['page_id'] ?? null,
                        $conn->identifier ?? null,
                    ];
                    foreach ($checkIds as $cid) {
                        if (in_array((string)$cid, array_map('strval', array_filter($targetAccountIds)))) {
                            $matchedConnection = $conn;
                            break 2;
                        }
                    }
                }
            }
        }

        // Check Facebook Messenger / Page payload
        if (!$matchedConnection && (($data['object'] ?? '') === 'page')) {
            $pageId = $data['entry'][0]['id'] ?? null;
            $recipientId = $data['entry'][0]['messaging'][0]['recipient']['id'] ?? null;
            $checkIds = array_filter([$pageId, $recipientId]);

            if (!empty($checkIds)) {
                $connections = ChannelConnection::whereIn('channel_type', ['messenger', 'instagram'])->get();
                foreach ($connections as $conn) {
                    $creds = $conn->decrypted_credentials;
                    $targetAccountIds = [
                        $creds['page_id'] ?? null,
                        $creds['instagram_business_account_id'] ?? null,
                        $creds['instagram_account_id'] ?? null,
                        $conn->identifier ?? null,
                    ];
                    foreach ($checkIds as $cid) {
                        if (in_array((string)$cid, array_map('strval', array_filter($targetAccountIds)))) {
                            $matchedConnection = $conn;
                            break 2;
                        }
                    }
                }
            }
        }

        if ($matchedConnection) {
            // Validate X-Hub-Signature-256 against matched connection app_secret, webhook_secret or global platform meta app_secret
            $appSecret = $matchedConnection->decrypted_credentials['webhook_secret']
                ?? ($matchedConnection->decrypted_credentials['app_secret'] 
                ?? ($matchedConnection->decrypted_credentials['client_secret'] 
                ?? ($meta['app_secret'] ?? ($meta['client_secret'] ?? \App\Models\PlatformSetting::getSetting('facebook_client_secret')))));

            if (!empty($appSecret) && !empty($hubSignature)) {
                $expected = 'sha256=' . hash_hmac('sha256', $rawPayload, $appSecret);
                if (!hash_equals($expected, $hubSignature)) {
                    Log::warning("Global Meta Webhook: Invalid X-Hub-Signature-256 for connection {$matchedConnection->id}");
                    return response()->json(['message' => 'Invalid webhook signature.'], 401);
                }
            }

            ProcessInboundMessageJob::dispatch($matchedConnection->id, $data);
            return response()->json(['status' => 'queued', 'connection_id' => $matchedConnection->id]);
        }

        return response()->json(['status' => 'received']);
    }
}
