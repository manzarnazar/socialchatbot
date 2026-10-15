<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\PlatformSetting;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Initial Channel Connection Modes (default: 'both' for all 3 Meta channels)
        // Options per channel: 'both', 'embedded', 'manual'
        if (!PlatformSetting::where('key', 'channel_connection_modes')->exists()) {
            PlatformSetting::create([
                'key' => 'channel_connection_modes',
                'value' => [
                    'whatsapp_cloud' => 'both',
                    'instagram' => 'both',
                    'messenger' => 'both',
                ],
            ]);
        }

        // 2. Initial Meta Embedded App Configuration
        if (!PlatformSetting::where('key', 'meta_embedded_config')->exists()) {
            PlatformSetting::create([
                'key' => 'meta_embedded_config',
                'value' => [
                    'app_id' => config('services.facebook.client_id') ?? '',
                    'app_secret' => config('services.facebook.client_secret') ?? '',
                    'whatsapp_config_id' => '',
                    'instagram_config_id' => '',
                    'messenger_config_id' => '',
                ],
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        PlatformSetting::whereIn('key', [
            'channel_connection_modes',
            'meta_embedded_config',
        ])->delete();
    }
};
