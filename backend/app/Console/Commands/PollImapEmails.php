<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ChannelConnection;
use App\Jobs\ProcessInboundMessageJob;
use Illuminate\Support\Facades\Log;

class PollImapEmails extends Command
{
    protected $signature = 'email:poll';
    protected $description = 'Poll active IMAP mailboxes for inbound emails';

    public function handle()
    {
        $connections = ChannelConnection::where('channel_type', 'email')
            ->where('status', 'connected')
            ->get();

        if ($connections->isEmpty()) {
            $this->info("No active Email connections found.");
            return 0;
        }

        foreach ($connections as $connection) {
            $creds = $connection->decrypted_credentials;
            $provider = $creds['provider'] ?? 'smtp';

            $this->info("Polling mailbox for connection: {$connection->name} ({$provider})");

            $this->pollImap($connection, $creds);
        }

        return 0;
    }

    protected function pollImap(ChannelConnection $connection, array $creds)
    {
        if (!function_exists('imap_open')) {
            $this->warn("PHP IMAP extension is not installed/enabled. Polling skipped for BYOK mailbox.");
            return;
        }

        $host = $creds['imap_host'] ?? '';
        $port = $creds['imap_port'] ?? 993;
        $username = $creds['imap_username'] ?? '';
        $password = $creds['imap_password'] ?? '';
        $encryption = $creds['imap_encryption'] ?? 'ssl';

        // Build mailbox connection string
        $sslFlag = ($encryption === 'ssl') ? '/ssl' : (($encryption === 'tls') ? '/tls' : '/novalidate-cert');
        $mboxStr = "{" . $host . ":" . $port . "/imap" . $sslFlag . "}INBOX";

        try {
            $mbox = @imap_open($mboxStr, $username, $password);
            if (!$mbox) {
                Log::error("IMAP connection failed for {$connection->name}: " . imap_last_error());
                $this->error("IMAP connection failed: " . imap_last_error());
                return;
            }

            // Search for unread emails
            $emails = imap_search($mbox, 'UNSEEN');
            if ($emails) {
                foreach ($emails as $emailNumber) {
                    $header = imap_headerinfo($mbox, $emailNumber);
                    $structure = imap_fetchstructure($mbox, $emailNumber);
                    
                    // Extract subject and body
                    $subject = isset($header->subject) ? imap_utf8($header->subject) : 'No Subject';
                    $fromAddress = isset($header->from[0]->mailbox) && isset($header->from[0]->host) 
                        ? $header->from[0]->mailbox . '@' . $header->from[0]->host 
                        : 'unknown@example.com';

                    $messageId = isset($header->message_id) ? trim($header->message_id) : '<inbound-' . uniqid() . '@whatsomni.io>';
                    $inReplyTo = isset($header->in_reply_to) ? trim($header->in_reply_to) : null;

                    // Fetch body text (simple text/html extractor)
                    $body = $this->fetchImapBody($mbox, $emailNumber, $structure);

                    $payload = [
                        'from' => $fromAddress,
                        'subject' => $subject,
                        'text' => $body,
                        'message_id' => $messageId,
                        'in_reply_to' => $inReplyTo,
                    ];

                    ProcessInboundMessageJob::dispatch($connection->id, $payload);
                    
                    // Mark as read/seen
                    imap_setflag_full($mbox, $emailNumber, "\\Seen");
                }
            }

            imap_close($mbox);
        } catch (\Exception $e) {
            Log::error("IMAP poll error: " . $e->getMessage());
            $this->error("IMAP poll error: " . $e->getMessage());
        }
    }

    protected function fetchImapBody($mbox, $msgNum, $structure, $partNum = "")
    {
        if ($structure->type == 0) { // Text part
            $data = imap_fetchbody($mbox, $msgNum, $partNum ? $partNum : "1");
            if ($structure->encoding == 3) { // Base64
                return base64_decode($data);
            } elseif ($structure->encoding == 4) { // Quoted-Printable
                return quoted_printable_decode($data);
            }
            return $data;
        }

        if ($structure->type == 1) { // Multipart
            foreach ($structure->parts as $index => $subPart) {
                $subPartNum = $partNum ? $partNum . "." . ($index + 1) : ($index + 1);
                $body = $this->fetchImapBody($mbox, $msgNum, $subPart, $subPartNum);
                if ($body) {
                    return $body;
                }
            }
        }

        return "";
    }
}
