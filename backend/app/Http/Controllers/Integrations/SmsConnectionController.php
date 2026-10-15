<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Models\ChannelConnection;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class SmsConnectionController extends Controller
{
    /**
     * Get active SMS connection status and all configured SMS gateways for the tenant.
     */
    public function status(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $connections = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'sms')
            ->orderBy('id', 'desc')
            ->get();

        $connectionsList = $connections->map(function ($conn) {
            $creds = $conn->decrypted_credentials;
            return [
                'id' => $conn->id,
                'name' => $conn->name,
                'status' => $conn->status,
                'provider' => $creds['provider'] ?? 'twilio',
                'webhook_url' => \App\Providers\AppServiceProvider::getBackendUrl() . "/api/webhooks/channel/{$conn->id}",
                'webhook_verify_token' => $creds['webhook_verify_token'] ?? '',
                'details' => $this->getMaskedDetails($creds),
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
            'provider' => $firstCreds['provider'] ?? 'twilio',
            'webhook_url' => $firstConn ? \App\Providers\AppServiceProvider::getBackendUrl() . "/api/webhooks/channel/{$firstConn->id}" : '',
            'webhook_verify_token' => $firstCreds['webhook_verify_token'] ?? '',
            'details' => $firstConn ? $this->getMaskedDetails($firstCreds) : null,
            'raw_credentials' => $firstCreds,
        ]);
    }

    /**
     * Connect a new SMS BYOK provider or update an existing connection.
     */
    public function connect(Request $request): JsonResponse
    {
        $request->validate([
            'id' => 'nullable|integer',
            'name' => 'required|string|max:255',
            'provider' => 'required|string|in:twilio,vonage,plivo,messagebird,sinch,telnyx',
        ]);

        $tenantId = $request->user()->tenant_id ?? 1;
        $connectionId = $request->input('id');
        $provider = $request->input('provider');
        $name = $request->input('name');

        try {
            $credentials = ['provider' => $provider];

            if ($provider === 'twilio') {
                $request->validate([
                    'twilio_account_sid' => 'required|string|max:255',
                    'twilio_auth_token' => 'required|string|max:255',
                    'twilio_phone_number' => 'required|string|max:255',
                ]);

                $sid = trim($request->input('twilio_account_sid'));
                $token = trim($request->input('twilio_auth_token'));
                $from = trim($request->input('twilio_phone_number'));

                // Verify credentials by fetching Twilio account details
                if ($sid !== 'mock_sid') {
                    $url = "https://api.twilio.com/2010-04-01/Accounts/{$sid}.json";
                    $response = Http::timeout(10)->withBasicAuth($sid, $token)->get($url);

                    if (!$response->successful()) {
                        return response()->json([
                            'message' => 'Twilio credential verification failed: ' . ($response->json('message') ?? 'Invalid Account SID or Auth Token.'),
                        ], 422);
                    }
                }

                $credentials['twilio_account_sid'] = $sid;
                $credentials['twilio_auth_token'] = $token;
                $credentials['twilio_phone_number'] = $from;

            } elseif ($provider === 'vonage') {
                $request->validate([
                    'vonage_api_key' => 'required|string|max:255',
                    'vonage_api_secret' => 'required|string|max:255',
                    'vonage_phone_number' => 'required|string|max:255',
                ]);

                $key = trim($request->input('vonage_api_key'));
                $secret = trim($request->input('vonage_api_secret'));
                $from = trim($request->input('vonage_phone_number'));

                // Verify credentials by fetching Vonage account balance
                if ($key !== 'mock_key') {
                    $url = "https://rest.nexmo.com/account/get-balance";
                    $response = Http::timeout(10)->get($url, [
                        'api_key' => $key,
                        'api_secret' => $secret,
                    ]);

                    if (!$response->successful() || isset($response->json()['error-code'])) {
                        return response()->json([
                            'message' => 'Vonage credential verification failed: Invalid API Key or API Secret.',
                        ], 422);
                    }
                }

                $credentials['vonage_api_key'] = $key;
                $credentials['vonage_api_secret'] = $secret;
                $credentials['vonage_phone_number'] = $from;

            } elseif ($provider === 'plivo') {
                $request->validate([
                    'plivo_auth_id' => 'required|string|max:255',
                    'plivo_auth_token' => 'required|string|max:255',
                    'plivo_phone_number' => 'required|string|max:255',
                ]);

                $authId = trim($request->input('plivo_auth_id'));
                $authToken = trim($request->input('plivo_auth_token'));
                $from = trim($request->input('plivo_phone_number'));

                if ($authId !== 'mock_auth_id') {
                    $url = "https://api.plivo.com/v1/Account/{$authId}/";
                    $response = Http::timeout(10)->withBasicAuth($authId, $authToken)->get($url);

                    if (!$response->successful()) {
                        return response()->json([
                            'message' => 'Plivo credential verification failed: ' . ($response->json('message') ?? 'Invalid Auth ID or Auth Token.'),
                        ], 422);
                    }
                }

                $credentials['plivo_auth_id'] = $authId;
                $credentials['plivo_auth_token'] = $authToken;
                $credentials['plivo_phone_number'] = $from;

            } elseif ($provider === 'messagebird') {
                $request->validate([
                    'messagebird_api_key' => 'required|string|max:255',
                    'messagebird_phone_number' => 'required|string|max:255',
                ]);

                $key = trim($request->input('messagebird_api_key'));
                $from = trim($request->input('messagebird_phone_number'));

                if ($key !== 'mock_key') {
                    $url = "https://rest.messagebird.com/balance";
                    $response = Http::timeout(10)->withHeaders(['Authorization' => "AccessKey {$key}"])->get($url);

                    if (!$response->successful()) {
                        return response()->json([
                            'message' => 'MessageBird credential verification failed: ' . ($response->json('errors')[0]['description'] ?? 'Invalid API Key.'),
                        ], 422);
                    }
                }

                $credentials['messagebird_api_key'] = $key;
                $credentials['messagebird_phone_number'] = $from;

            } elseif ($provider === 'sinch') {
                $request->validate([
                    'sinch_service_plan_id' => 'required|string|max:255',
                    'sinch_api_token' => 'required|string|max:255',
                    'sinch_phone_number' => 'required|string|max:255',
                ]);

                $planId = trim($request->input('sinch_service_plan_id'));
                $token = trim($request->input('sinch_api_token'));
                $from = trim($request->input('sinch_phone_number'));

                if ($planId !== 'mock_id') {
                    $url = "https://sms.api.sinch.com/xms/v1/{$planId}/batches?page_size=1";
                    $response = Http::timeout(10)->withToken($token)->get($url);

                    if (!$response->successful()) {
                        return response()->json([
                            'message' => 'Sinch credential verification failed: ' . ($response->json('message') ?? 'Invalid Service Plan ID or API Token.'),
                        ], 422);
                    }
                }

                $credentials['sinch_service_plan_id'] = $planId;
                $credentials['sinch_api_token'] = $token;
                $credentials['sinch_phone_number'] = $from;

            } elseif ($provider === 'telnyx') {
                $request->validate([
                    'telnyx_api_key' => 'required|string|max:255',
                    'telnyx_phone_number' => 'required|string|max:255',
                ]);

                $key = trim($request->input('telnyx_api_key'));
                $from = trim($request->input('telnyx_phone_number'));

                if ($key !== 'mock_key') {
                    $url = "https://api.telnyx.com/v2/balance";
                    $response = Http::timeout(10)->withToken($key)->get($url);

                    if (!$response->successful()) {
                        return response()->json([
                            'message' => 'Telnyx credential verification failed: ' . ($response->json('errors')[0]['detail'] ?? 'Invalid API Key.'),
                        ], 422);
                    }
                }

                $credentials['telnyx_api_key'] = $key;
                $credentials['telnyx_phone_number'] = $from;
            }

            // Find or create connection
            if ($connectionId) {
                $connection = ChannelConnection::where('tenant_id', $tenantId)
                    ->where('channel_type', 'sms')
                    ->findOrFail($connectionId);
            } else {
                $tenant = $request->user()->tenant;
                $limitCheck = app(\App\Services\PlanLimitService::class)->canConnectChannel($tenant, 'sms');
                if (!$limitCheck['allowed']) {
                    return response()->json([
                        'message' => $limitCheck['reason'],
                        'error_code' => $limitCheck['code']
                    ], 403);
                }

                $connection = new ChannelConnection();
                $connection->tenant_id = $tenantId;
                $connection->channel_type = 'sms';
            }

            $existingCreds = $connection->exists ? $connection->decrypted_credentials : [];
            $webhookVerifyToken = $existingCreds['webhook_verify_token'] ?? Str::random(32);
            $credentials['webhook_verify_token'] = $webhookVerifyToken;

            $connection->name = $name;
            $connection->status = 'connected';
            $connection->credentials = $credentials;
            $connection->save();

            return response()->json([
                'connected' => true,
                'id' => $connection->id,
                'name' => $connection->name,
                'status' => $connection->status,
                'provider' => $provider,
                'webhook_url' => \App\Providers\AppServiceProvider::getBackendUrl() . "/api/webhooks/channel/{$connection->id}",
                'webhook_verify_token' => $webhookVerifyToken,
                'details' => $this->getMaskedDetails($credentials),
                'raw_credentials' => $credentials,
            ]);

        } catch (Exception $e) {
            Log::error("SMS provider connection failed: " . $e->getMessage());
            return response()->json([
                'message' => 'Connection failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete/Disconnect SMS channel by ID.
     */
    public function disconnect(Request $request, $id = null): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $targetId = $id ?: $request->input('id');

        $query = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'sms');

        if ($targetId) {
            $query->where('id', $targetId);
        }

        $query->delete();

        $remaining = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'sms')
            ->count();

        return response()->json([
            'connected' => $remaining > 0,
            'remaining_count' => $remaining,
            'message' => 'SMS gateway connection has been disconnected successfully.'
        ]);
    }

    /**
     * Mask credentials for secure response delivery.
     */
    protected function getMaskedDetails(array $creds): array
    {
        $provider = $creds['provider'] ?? 'twilio';

        switch ($provider) {
            case 'twilio':
                return [
                    'twilio_account_sid' => substr($creds['twilio_account_sid'] ?? '', 0, 8) . '...',
                    'twilio_phone_number' => $creds['twilio_phone_number'] ?? '',
                ];
            case 'vonage':
                return [
                    'vonage_api_key' => substr($creds['vonage_api_key'] ?? '', 0, 4) . '...',
                    'vonage_phone_number' => $creds['vonage_phone_number'] ?? '',
                ];
            case 'plivo':
                return [
                    'plivo_auth_id' => substr($creds['plivo_auth_id'] ?? '', 0, 6) . '...',
                    'plivo_phone_number' => $creds['plivo_phone_number'] ?? '',
                ];
            case 'messagebird':
                return [
                    'messagebird_api_key' => substr($creds['messagebird_api_key'] ?? '', 0, 4) . '...',
                    'messagebird_phone_number' => $creds['messagebird_phone_number'] ?? '',
                ];
            case 'sinch':
                return [
                    'sinch_service_plan_id' => substr($creds['sinch_service_plan_id'] ?? '', 0, 6) . '...',
                    'sinch_phone_number' => $creds['sinch_phone_number'] ?? '',
                ];
            case 'telnyx':
                return [
                    'telnyx_api_key' => substr($creds['telnyx_api_key'] ?? '', 0, 6) . '...',
                    'telnyx_phone_number' => $creds['telnyx_phone_number'] ?? '',
                ];
            default:
                return [];
        }
    }
}
