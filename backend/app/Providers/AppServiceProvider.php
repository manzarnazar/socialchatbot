<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Auth\Notifications\ResetPassword;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Services\Channels\ChannelManager::class, function ($app) {
            return new \App\Services\Channels\ChannelManager();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Enforce active Backend URL and HTTPS scheme for all generated and signed URLs
        $backendUrl = self::getBackendUrl();
        if (!empty($backendUrl)) {
            \Illuminate\Support\Facades\URL::forceRootUrl($backendUrl);
            if (str_starts_with($backendUrl, 'https://')) {
                \Illuminate\Support\Facades\URL::forceScheme('https');
            }
        }

        // Customize the password reset link to point directly to the frontend URL
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            $frontendUrl = self::getFrontendUrl($notifiable);
            $locale = $notifiable->language_preference ?? 'en';
            return "{$frontendUrl}/{$locale}/reset-password?token={$token}&email=" . urlencode($notifiable->getEmailForVerification());
        });

        // Customize email verification URL to guarantee it uses active backend URL from .env / request
        \Illuminate\Auth\Notifications\VerifyEmail::createUrlUsing(function (object $notifiable) {
            $backendUrl = self::getBackendUrl();
            if (!empty($backendUrl)) {
                \Illuminate\Support\Facades\URL::forceRootUrl($backendUrl);
                if (str_starts_with($backendUrl, 'https://')) {
                    \Illuminate\Support\Facades\URL::forceScheme('https');
                }
            }

            return \Illuminate\Support\Facades\URL::temporarySignedRoute(
                'verification.verify',
                \Illuminate\Support\Carbon::now()->addMinutes(\Illuminate\Support\Facades\Config::get('auth.verification.expire', 60)),
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ]
            );
        });

        // Register CRM Contact Observers
        \App\Models\Contact::observe(\App\Observers\ContactObserver::class);
        \App\Models\Tenant::observe(\App\Observers\TenantObserver::class);
        \App\Models\User::observe(\App\Observers\UserObserver::class);

        // Share dynamic platform branding with all email templates
        try {
            \Illuminate\Support\Facades\View::composer('emails.*', function ($view) {
                $existing = $view->getData();
                $view->with([
                    'platformName' => $existing['platformName'] ?? \App\Models\PlatformSetting::getPlatformName(),
                    'platformLogo' => $existing['platformLogo'] ?? \App\Models\PlatformSetting::getPlatformLogo(),
                    'primaryColor' => $existing['primaryColor'] ?? \App\Models\PlatformSetting::getSetting('primary_color', '#4AE54A'),
                    'accentColor' => $existing['accentColor'] ?? \App\Models\PlatformSetting::getSetting('accent_color', '#0A0A0A'),
                ]);
            });
        } catch (\Throwable $e) {
            // Silently fallback if views not bound
        }

        // Dynamically configure platform mailer from PlatformSettings table
        self::loadDynamicMailConfiguration();

        // Reload configuration before processing queue jobs
        try {
            \Illuminate\Support\Facades\Queue::before(function (\Illuminate\Queue\Events\JobProcessing $event) {
                self::loadDynamicMailConfiguration();
            });
        } catch (\Exception $e) {
            // Fallback if Queue manager fails to bind during CLI start
        }
    }

    /**
     * Dynamically configure platform mailer from PlatformSettings table.
     */
    public static function loadDynamicMailConfiguration(): void
    {
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('platform_settings')) {
                $defaultPlatformName = \App\Models\PlatformSetting::getPlatformName();
                config(['mail.from.name' => $defaultPlatformName]);

                $settings = \App\Models\PlatformSetting::where('key', 'mailer')->first();
                if ($settings && !empty($settings->value)) {
                    $config = $settings->value;
                    $type = $config['type'] ?? 'smtp';
                    
                    if ($type === 'smtp' && !empty($config['smtp'])) {
                        $smtp = $config['smtp'];
                        $port = (int)($smtp['port'] ?? 1025);
                        
                        $encryption = $smtp['encryption'] ?? null;
                        if ($encryption === 'none') {
                            $encryption = null;
                        }
                        if ($port === 465) {
                            $encryption = 'ssl';
                            $scheme = 'smtps';
                        } elseif ($port === 587 || $encryption === 'tls') {
                            $encryption = 'tls';
                            $scheme = null;
                        } else {
                            $scheme = ($encryption === 'ssl') ? 'smtps' : null;
                        }
                        
                        config([
                            'mail.default' => 'smtp',
                            'mail.mailers.smtp.scheme' => $scheme,
                            'mail.mailers.smtp.host' => $smtp['host'] ?? '127.0.0.1',
                            'mail.mailers.smtp.port' => $port,
                            'mail.mailers.smtp.encryption' => $encryption,
                            'mail.mailers.smtp.username' => $smtp['username'] ?? '',
                            'mail.mailers.smtp.password' => $smtp['password'] ?? '',
                            'mail.from.address' => $smtp['from_address'] ?? 'noreply@whatsomni.com',
                            'mail.from.name' => !empty($smtp['from_name']) ? $smtp['from_name'] : $defaultPlatformName,
                        ]);
                    } elseif ($type === 'resend' && !empty($config['resend'])) {
                        $resend = $config['resend'];
                        config([
                            'mail.default' => 'resend',
                            'services.resend.key' => $resend['api_key'] ?? '',
                            'mail.from.address' => $resend['from_address'] ?? 'noreply@whatsomni.com',
                            'mail.from.name' => !empty($resend['from_name']) ? $resend['from_name'] : $defaultPlatformName,
                        ]);
                    }

                    // Flush resolved mailer cache to pick up the updated settings
                    if (app()->resolved('mail.manager')) {
                        app()->make('mail.manager')->forgetMailers();
                    }
                }
            }
        } catch (\Exception $e) {
            // Silently fall back if migration hasn't run or database is offline
        }
    }

    /**
     * Dynamically retrieve the active backend API URL from environment/config or request headers.
     */
    public static function getBackendUrl(): string
    {
        $appUrl = config('app.url') ?: env('APP_URL');
        if (!empty($appUrl) && !str_contains($appUrl, 'localhost') && !str_contains($appUrl, '127.0.0.1')) {
            return rtrim($appUrl, '/');
        }

        if (app()->runningInConsole() === false && request()) {
            $rootUrl = request()->getSchemeAndHttpHost();
            if (!empty($rootUrl) && !str_contains($rootUrl, 'localhost') && !str_contains($rootUrl, '127.0.0.1')) {
                return rtrim($rootUrl, '/');
            }
        }

        return rtrim((string) ($appUrl ?: url('/')), '/');
    }

    /**
     * Dynamically retrieve the active frontend URL from environment/config or request headers.
     */
    public static function getFrontendUrl($user = null): string
    {
        // 1. Explicit user/tenant frontend URL
        if ($user && !empty($user->frontend_url)) {
            return rtrim($user->frontend_url, '/');
        }

        // 2. Dynamic resolution from active incoming HTTP request (Origin or Referer)
        if (app()->runningInConsole() === false && request()) {
            $origin = request()->header('Origin') ?: request()->header('Referer');
            if ($origin) {
                $parsed = parse_url($origin);
                if (!empty($parsed['scheme']) && !empty($parsed['host'])) {
                    $reqHost = $parsed['scheme'] . '://' . $parsed['host'] . (!empty($parsed['port']) ? ':' . $parsed['port'] : '');
                    $hostOnly = $parsed['host'];

                    $allowedUrls = array_filter(array_map('trim', explode(',', (string) env('FRONTEND_URL', ''))));
                    $statefulDomains = array_filter(array_map('trim', explode(',', (string) env('SANCTUM_STATEFUL_DOMAINS', ''))));
                    $appUrlHost = parse_url((string) env('APP_URL', ''), PHP_URL_HOST);
                    $currentRequestHost = request()->getHost();

                    $isAllowed = in_array($reqHost, $allowedUrls, true)
                        || in_array($hostOnly, $statefulDomains, true)
                        || (!empty($appUrlHost) && strcasecmp($hostOnly, $appUrlHost) === 0)
                        || strcasecmp($hostOnly, $currentRequestHost) === 0
                        || (env('APP_ENV') === 'local' && (str_contains($hostOnly, 'localhost') || str_contains($hostOnly, '127.0.0.1')));

                    if ($isAllowed) {
                        return rtrim($reqHost, '/');
                    }
                }
            }

            // If no Origin/Referer header, check if current request host is non-local (e.g. tunnel, reverse proxy)
            $requestHost = request()->getHost();
            if ($requestHost && !str_contains($requestHost, 'localhost') && !str_contains($requestHost, '127.0.0.1')) {
                $configuredApp = env('APP_URL');
                if ($configuredApp && str_contains($configuredApp, $requestHost)) {
                    return rtrim($configuredApp, '/');
                }
            }
        }

        // 3. Resolve from FRONTEND_URL or APP_URL in environment
        $rawFrontendUrl = env('FRONTEND_URL') ?: config('app.frontend_url');
        $urls = array_filter(array_map('trim', explode(',', (string) $rawFrontendUrl)));

        // 3a. Prefer any non-localhost / public URL configured in FRONTEND_URL
        foreach ($urls as $candidate) {
            $host = parse_url($candidate, PHP_URL_HOST);
            if ($host && !str_contains($host, 'localhost') && !str_contains($host, '127.0.0.1')) {
                return rtrim($candidate, '/');
            }
        }

        // 3b. If FRONTEND_URL candidates are local only, but APP_URL is a public URL, prefer APP_URL
        $appUrl = config('app.url') ?: env('APP_URL');
        if (!empty($appUrl)) {
            $appHost = parse_url($appUrl, PHP_URL_HOST);
            if ($appHost && !str_contains($appHost, 'localhost') && !str_contains($appHost, '127.0.0.1')) {
                return rtrim($appUrl, '/');
            }
        }

        // 3c. In local development, probe running local ports or fallback to first configured
        if (!empty($urls)) {
            foreach ($urls as $candidate) {
                $port = parse_url($candidate, PHP_URL_PORT);
                if ($port) {
                    $connection = @fsockopen('127.0.0.1', $port, $errno, $errstr, 0.05);
                    if ($connection) {
                        fclose($connection);
                        return rtrim($candidate, '/');
                    }
                }
            }
            return rtrim(reset($urls), '/');
        }

        return rtrim((string) ($appUrl ?: 'http://localhost:3000'), '/');
    }
}
