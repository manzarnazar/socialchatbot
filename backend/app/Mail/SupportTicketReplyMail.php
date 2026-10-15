<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SupportTicketReplyMail extends Mailable
{
    use Queueable, SerializesModels;

    public int $ticketId;
    public string $replyMessage;
    public string $url;

    /**
     * Create a new message instance.
     */
    public function __construct(int $ticketId, string $replyMessage, string $url)
    {
        $this->ticketId = $ticketId;
        $this->replyMessage = $replyMessage;
        $this->url = $url;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $platformName = \App\Models\PlatformSetting::getPlatformName();
        return new Envelope(
            subject: "Support Ticket Update - #{$this->ticketId} - {$platformName}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.ticket_reply',
            with: [
                'ticketId' => $this->ticketId,
                'replyMessage' => $this->replyMessage,
                'url' => $this->url,
            ]
        );
    }
}
