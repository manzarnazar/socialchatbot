<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailVerificationCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $code;
    public string $type; // 'current' or 'new'

    /**
     * Create a new message instance.
     */
    public function __construct(string $code, string $type)
    {
        $this->code = $code;
        $this->type = $type;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $platformName = \App\Models\PlatformSetting::getPlatformName();
        $subject = $this->type === 'current'
            ? "Verify Current Email Update - {$platformName}"
            : "Verify New Email Address - {$platformName}";

        return new Envelope(subject: $subject);
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.verification_code',
            with: [
                'code' => $this->code,
                'type' => $this->type,
            ]
        );
    }
}
