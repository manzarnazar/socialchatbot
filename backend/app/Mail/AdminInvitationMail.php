<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $roleName;
    public string $url;

    /**
     * Create a new message instance.
     */
    public function __construct(string $roleName, string $url)
    {
        $this->roleName = $roleName;
        $this->url = $url;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $platformName = \App\Models\PlatformSetting::getPlatformName();
        return new Envelope(
            subject: "Administrator Invitation - Join {$platformName} Management Team",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.admin_invitation',
            with: [
                'roleName' => $this->roleName,
                'url' => $this->url,
            ]
        );
    }
}
