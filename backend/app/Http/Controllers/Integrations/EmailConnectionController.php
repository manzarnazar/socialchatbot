<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Models\ChannelConnection;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Exception;
use Illuminate\Support\Facades\Log;

class EmailConnectionController extends Controller
{
    /**
     * Get active Email connection status and all connected mailboxes.
     */
    public function status(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $connections = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'email')
            ->orderBy('id', 'desc')
            ->get();

        $connectionsList = $connections->map(function ($conn) {
            $creds = $conn->decrypted_credentials;
            return [
                'id' => $conn->id,
                'name' => $conn->name,
                'status' => $conn->status,
                'provider' => $creds['provider'] ?? 'smtp',
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
            'provider' => $firstCreds['provider'] ?? 'smtp',
            'webhook_url' => $firstConn ? \App\Providers\AppServiceProvider::getBackendUrl() . "/api/webhooks/channel/{$firstConn->id}" : '',
            'webhook_verify_token' => $firstCreds['webhook_verify_token'] ?? '',
            'details' => $firstConn ? $this->getMaskedDetails($firstCreds) : null,
            'raw_credentials' => $firstCreds,
        ]);
    }

    /**
     * Connect a new Email channel or update an existing mailbox connection.
     */
    public function connect(Request $request): JsonResponse
    {
        $request->validate([
            'id' => 'nullable|integer',
            'name' => 'required|string|max:255',
            'provider' => 'required|string|in:smtp',
        ]);

        $tenantId = $request->user()->tenant_id ?? 1;
        $connectionId = $request->input('id');
        $provider = $request->input('provider');
        $name = $request->input('name');

        try {
            $credentials = ['provider' => $provider];

            $request->validate([
                'email_address' => 'required|email|max:255',
                'smtp_host' => 'required|string|max:255',
                'smtp_port' => 'required|integer',
                'smtp_username' => 'required|string|max:255',
                'smtp_password' => 'required|string|max:255',
                'smtp_encryption' => 'required|string|in:none,ssl,tls',
                'imap_host' => 'required|string|max:255',
                'imap_port' => 'required|integer',
                'imap_username' => 'required|string|max:255',
                'imap_password' => 'required|string|max:255',
                'imap_encryption' => 'required|string|in:none,ssl,tls',
            ]);

            $emailAddress = trim($request->input('email_address'));
            $smtpHost = trim($request->input('smtp_host'));
            $smtpPort = (int)$request->input('smtp_port');
            $smtpUser = trim($request->input('smtp_username'));
            $smtpPass = trim($request->input('smtp_password'));
            $smtpEnc = trim($request->input('smtp_encryption'));

            $imapHost = trim($request->input('imap_host'));
            $imapPort = (int)$request->input('imap_port');
            $imapUser = trim($request->input('imap_username'));
            $imapPass = trim($request->input('imap_password'));
            $imapEnc = trim($request->input('imap_encryption'));

            // Verify SMTP server socket connection
            if ($smtpHost !== 'localhost' && $smtpHost !== '127.0.0.1') {
                $smtpSocket = @fsockopen($smtpHost, $smtpPort, $errno, $errstr, 5);
                if (!$smtpSocket) {
                    return response()->json([
                        'message' => "SMTP verification failed: Could not connect to host {$smtpHost}:{$smtpPort} ({$errstr})"
                    ], 422);
                }
                @fclose($smtpSocket);
            }

            // Verify IMAP server socket connection
            if ($imapHost !== 'localhost' && $imapHost !== '127.0.0.1') {
                $imapSocket = @fsockopen($imapHost, $imapPort, $errno, $errstr, 5);
                if (!$imapSocket) {
                    return response()->json([
                        'message' => "IMAP verification failed: Could not connect to host {$imapHost}:{$imapPort} ({$errstr})"
                    ], 422);
                }
                @fclose($imapSocket);
            }

            $credentials = array_merge($credentials, [
                'email_address' => $emailAddress,
                'smtp_host' => $smtpHost,
                'smtp_port' => $smtpPort,
                'smtp_username' => $smtpUser,
                'smtp_password' => $smtpPass,
                'smtp_encryption' => $smtpEnc,
                'imap_host' => $imapHost,
                'imap_port' => $imapPort,
                'imap_username' => $imapUser,
                'imap_password' => $imapPass,
                'imap_encryption' => $imapEnc,
            ]);

            // Find or create connection record
            if ($connectionId) {
                $connection = ChannelConnection::where('tenant_id', $tenantId)
                    ->where('channel_type', 'email')
                    ->findOrFail($connectionId);
            } else {
                $tenant = $request->user()->tenant;
                $limitCheck = app(\App\Services\PlanLimitService::class)->canConnectChannel($tenant, 'email');
                if (!$limitCheck['allowed']) {
                    return response()->json([
                        'message' => $limitCheck['reason'],
                        'error_code' => $limitCheck['code']
                    ], 403);
                }

                $connection = new ChannelConnection();
                $connection->tenant_id = $tenantId;
                $connection->channel_type = 'email';
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
            Log::error("Email channel connection setup failed: " . $e->getMessage());
            return response()->json([
                'message' => 'Connection validation error: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Disconnect/Delete Email channel connection by ID.
     */
    public function disconnect(Request $request, $id = null): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $targetId = $id ?: $request->input('id');

        $query = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'email');

        if ($targetId) {
            $query->where('id', $targetId);
        }

        $query->delete();

        $remaining = ChannelConnection::where('tenant_id', $tenantId)
            ->where('channel_type', 'email')
            ->count();

        return response()->json([
            'connected' => $remaining > 0,
            'remaining_count' => $remaining,
            'message' => 'Email channel connection has been disconnected successfully.',
        ]);
    }

    /**
     * Securely mask credentials for response rendering.
     */
    protected function getMaskedDetails(array $creds): array
    {
        return [
            'email_address' => $creds['email_address'] ?? 'mail@domain.com',
            'smtp_host' => $creds['smtp_host'] ?? 'smtp.domain.com',
            'smtp_port' => $creds['smtp_port'] ?? 587,
            'smtp_username' => substr($creds['smtp_username'] ?? 'user', 0, 4) . '...',
            'smtp_encryption' => $creds['smtp_encryption'] ?? 'tls',
            'imap_host' => $creds['imap_host'] ?? 'imap.domain.com',
            'imap_port' => $creds['imap_port'] ?? 993,
            'imap_username' => substr($creds['imap_username'] ?? 'user', 0, 4) . '...',
            'imap_encryption' => $creds['imap_encryption'] ?? 'ssl',
        ];
    }
}
