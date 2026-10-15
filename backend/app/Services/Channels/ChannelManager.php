<?php

namespace App\Services\Channels;

use App\Contracts\ChannelProviderInterface;
use InvalidArgumentException;

class ChannelManager
{
    protected array $drivers = [];

    public function __construct()
    {
        $cloudDriver = new \App\Services\Channels\Drivers\WhatsAppCloudApiDriver();
        $this->registerDriver('whatsapp', $cloudDriver);
        $this->registerDriver('whatsapp_cloud', $cloudDriver);
        $this->registerDriver('whatsapp_cloud_api', $cloudDriver);

        $baileysDriver = new \App\Services\Channels\Drivers\WhatsAppBaileysDriver();
        $this->registerDriver('whatsapp_baileys', $baileysDriver);
        $this->registerDriver('baileys', $baileysDriver);

        $this->registerDriver('instagram', new \App\Services\Channels\Drivers\InstagramDriver());

        $messengerDriver = new \App\Services\Channels\Drivers\FacebookMessengerDriver();
        $this->registerDriver('messenger', $messengerDriver);
        $this->registerDriver('facebook_messenger', $messengerDriver);
        $this->registerDriver('facebook', $messengerDriver);

        $this->registerDriver('telegram', new \App\Services\Channels\Drivers\TelegramDriver());
        $this->registerDriver('sms', new \App\Services\Channels\Drivers\SmsDriver());
        $this->registerDriver('email', new \App\Services\Channels\Drivers\EmailDriver());
        $this->registerDriver('tiktok', new \App\Services\Channels\Drivers\TikTokDriver());
        $this->registerDriver('linkedin', new \App\Services\Channels\Drivers\LinkedInDriver());
    }

    /**
     * Register a custom channel driver.
     */
    public function registerDriver(string $name, ChannelProviderInterface $driver): void
    {
        $this->drivers[$name] = $driver;
    }

    /**
     * Resolve channel driver.
     */
    public function driver(string $name): ChannelProviderInterface
    {
        if (!isset($this->drivers[$name])) {
            throw new InvalidArgumentException("Channel driver [{$name}] is not registered.");
        }

        $configKeyMap = [
            'whatsapp' => 'whatsapp_cloud',
            'whatsapp_cloud' => 'whatsapp_cloud',
            'whatsapp_cloud_api' => 'whatsapp_cloud',
            'whatsapp_baileys' => 'whatsapp_baileys',
            'baileys' => 'whatsapp_baileys',
            'instagram' => 'instagram',
            'messenger' => 'messenger',
            'facebook_messenger' => 'messenger',
            'facebook' => 'messenger',
            'telegram' => 'telegram',
            'sms' => 'sms',
            'email' => 'email',
            'tiktok' => 'tiktok',
            'linkedin' => 'linkedin',
        ];

        $configKey = $configKeyMap[$name] ?? $name;

        $settings = \App\Models\PlatformSetting::where('key', 'channels_enabled')->first();
        $channelsEnabled = $settings ? $settings->value : [
            'whatsapp_cloud' => true,
            'whatsapp_baileys' => true,
            'instagram' => true,
            'messenger' => true,
            'telegram' => true,
            'sms' => true,
            'email' => true,
            'tiktok' => true,
            'linkedin' => true,
        ];

        if (!($channelsEnabled[$configKey] ?? true)) {
            throw new InvalidArgumentException("Channel [{$name}] is globally disabled by platform administrator.");
        }

        return $this->drivers[$name];
    }
}
