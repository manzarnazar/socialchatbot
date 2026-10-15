<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TeamInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $companyName;
    public string $url;

    /**
     * Create a new message instance.
     */
    public function __construct(string $companyName, string $url)
    {
        $this->companyName = $companyName;
        $this->url = $url;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $platformName = \App\Models\PlatformSetting::getPlatformName();
        return new Envelope(
            subject: "Invitation to Join {$this->companyName} on {$platformName}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.team_invitation',
            with: [
                'companyName' => $this->companyName,
                'url' => $this->url,
            ]
        );
    }
}
