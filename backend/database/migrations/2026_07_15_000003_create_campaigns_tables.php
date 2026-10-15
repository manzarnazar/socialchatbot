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
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('name');
            $table->foreignId('channel_connection_id')->constrained('channel_connections')->onDelete('cascade');
            $table->json('audience_filter'); // { type: 'all'|'lifecycle_stage'|'tags', value: string|null }
            $table->string('source_type'); // template, agent
            $table->foreignId('message_template_id')->nullable()->constrained('message_templates')->onDelete('cascade');
            $table->foreignId('ai_agent_id')->nullable()->constrained('ai_agents')->onDelete('cascade');
            $table->string('schedule_type'); // immediate, scheduled
            $table->timestamp('scheduled_at')->nullable();
            $table->string('status')->default('draft'); // draft, scheduled, sending, completed, failed
            $table->integer('total_contacts')->default(0);
            $table->integer('sent_count')->default(0);
            $table->integer('delivered_count')->default(0);
            $table->integer('read_count')->default(0);
            $table->integer('replied_count')->default(0);
            $table->integer('failed_count')->default(0);
            $table->text('error_log')->nullable();
            $table->timestamps();
        });

        Schema::create('campaign_dispatches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('campaigns')->onDelete('cascade');
            $table->foreignId('contact_id')->constrained('contacts')->onDelete('cascade');
            $table->foreignId('message_id')->nullable()->constrained('messages')->onDelete('cascade');
            $table->string('status')->default('queued'); // queued, sent, delivered, read, replied, failed
            $table->text('error_message')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaign_dispatches');
        Schema::dropIfExists('campaigns');
    }
};
