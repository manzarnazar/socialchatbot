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
        Schema::create('quick_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('tenant_users')->nullOnDelete();
            $table->string('name');
            $table->string('shortcut', 100)->nullable()->index();
            $table->json('trigger_keywords')->nullable();
            $table->string('match_type', 30)->default('contains'); // 'contains', 'exact', 'starts_with'
            $table->string('channel_target_type', 30)->default('all'); // 'all', 'custom'
            $table->text('body');
            $table->text('media_url')->nullable();
            $table->string('media_type', 50)->nullable(); // 'image', 'video', 'document', 'audio'
            $table->boolean('is_active')->default(true)->index();
            $table->boolean('auto_reply_enabled')->default(true);
            $table->unsignedInteger('usage_count')->default(0);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'is_active']);
        });

        Schema::create('quick_reply_channels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quick_reply_id')->constrained('quick_replies')->cascadeOnDelete();
            $table->foreignId('channel_connection_id')->constrained('channel_connections')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['quick_reply_id', 'channel_connection_id'], 'qr_channel_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quick_reply_channels');
        Schema::dropIfExists('quick_replies');
    }
};
