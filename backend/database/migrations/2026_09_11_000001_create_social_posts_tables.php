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
        if (!Schema::hasTable('social_posts')) {
            Schema::create('social_posts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->string('title');
                $table->text('content');
                $table->json('media_urls')->nullable();
                $table->string('post_type', 30)->default('feed_post');
                $table->string('timing_type', 30)->default('draft');
                $table->timestamp('scheduled_at')->nullable();
                $table->timestamp('published_at')->nullable();
                $table->string('status', 30)->default('draft');
                $table->text('ai_prompt')->nullable();
                $table->string('ai_model', 100)->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->index(['tenant_id', 'status']);
                $table->index(['status', 'scheduled_at']);
            });
        }

        if (!Schema::hasTable('social_post_channels')) {
            Schema::create('social_post_channels', function (Blueprint $table) {
                $table->id();
                $table->foreignId('social_post_id')->constrained('social_posts')->cascadeOnDelete();
                $table->foreignId('channel_connection_id')->constrained('channel_connections')->cascadeOnDelete();
                $table->string('platform', 30);
                $table->string('status', 30)->default('pending');
                $table->string('external_post_id')->nullable();
                $table->string('permalink', 500)->nullable();
                $table->text('error_message')->nullable();
                $table->unsignedInteger('attempts')->default(0);
                $table->timestamp('published_at')->nullable();
                $table->timestamps();

                $table->index(['social_post_id', 'channel_connection_id'], 'spc_post_channel_idx');
                $table->index('status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('social_post_channels');
        Schema::dropIfExists('social_posts');
    }
};
