<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TestPlatformMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $platformName;

    public function __construct(string $platformName)
    {
        $this->platformName = $platformName;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->platformName} Platform Mailer Connection Test",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.test',
            with: [
                'platformName' => $this->platformName,
            ]
        );
    }
}
