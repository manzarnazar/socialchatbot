<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordNotification extends BaseResetPassword
{
    /**
     * Build the mail representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return \Illuminate\Notifications\Messages\MailMessage
     */
    public function toMail($notifiable)
    {
        if (static::$toMailCallback) {
            return call_user_func(static::$toMailCallback, $notifiable, $this->token);
        }

        $frontendUrl = rtrim(\App\Providers\AppServiceProvider::getFrontendUrl($notifiable), '/');
        $locale = $notifiable->language_preference ?? 'en';
        $resetUrl = "{$frontendUrl}/{$locale}/reset-password?token=" . urlencode($this->token) . '&email=' . urlencode($notifiable->getEmailForVerification());

        if (static::$createUrlCallback) {
            $resetUrl = call_user_func(static::$createUrlCallback, $notifiable, $this->token);
        }

        $name = $notifiable->first_name ?? $notifiable->name ?? 'User';
        $platformName = \App\Models\PlatformSetting::getPlatformName();

        return (new MailMessage)
            ->subject("Reset Password Notification - {$platformName}")
            ->view('emails.reset', [
                'name' => $name,
                'url' => $resetUrl,
            ]);
    }
}
