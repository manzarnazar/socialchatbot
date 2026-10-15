<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->string('media_url', 1000)->nullable()->after('custom_message');
            $table->string('media_type', 50)->nullable()->default('image')->after('media_url');
            $table->string('cta_button_text', 100)->nullable()->after('media_type');
            $table->string('cta_button_url', 1000)->nullable()->after('cta_button_text');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn(['media_url', 'media_type', 'cta_button_text', 'cta_button_url']);
        });
    }
};
