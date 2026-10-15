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
        if (!Schema::hasTable('whatsapp_flows')) {
            Schema::create('whatsapp_flows', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->unsignedBigInteger('channel_connection_id')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->string('name');
                $table->text('description')->nullable();
                $table->string('meta_flow_id')->nullable()->index();
                $table->string('status')->default('DRAFT'); // DRAFT, SUBMITTED, PUBLISHED, DEPRECATED, BLOCKED, REJECTED
                $table->json('categories')->nullable();
                $table->json('flow_json')->nullable();
                $table->json('ui_schema')->nullable();
                $table->string('endpoint_uri')->nullable();
                $table->string('preview_url')->nullable();
                $table->boolean('is_active')->default(true);
                $table->string('sync_status')->default('synced'); // synced, pending, failed
                $table->text('sync_error_message')->nullable();
                $table->unsignedInteger('submissions_count')->default(0);
                $table->timestamp('last_synced_at')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
                $table->foreign('channel_connection_id')->references('id')->on('channel_connections')->nullOnDelete();
                $table->foreign('created_by')->references('id')->on('tenant_users')->nullOnDelete();
                $table->index(['tenant_id', 'status']);
            });
        } else {
            Schema::table('whatsapp_flows', function (Blueprint $table) {
                if (!Schema::hasColumn('whatsapp_flows', 'description')) {
                    $table->text('description')->nullable()->after('name');
                }
            });
        }

        if (!Schema::hasTable('whatsapp_flow_submissions')) {
            Schema::create('whatsapp_flow_submissions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->unsignedBigInteger('whatsapp_flow_id');
                $table->unsignedBigInteger('contact_id')->nullable();
                $table->unsignedBigInteger('conversation_id')->nullable();
                $table->unsignedBigInteger('channel_connection_id')->nullable();
                $table->string('flow_token')->nullable()->index();
                $table->json('response_data')->nullable();
                $table->json('field_labels')->nullable();
                $table->string('external_message_id')->nullable()->index();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
                $table->foreign('whatsapp_flow_id')->references('id')->on('whatsapp_flows')->cascadeOnDelete();
                $table->foreign('contact_id')->references('id')->on('contacts')->nullOnDelete();
                $table->foreign('conversation_id')->references('id')->on('conversations')->nullOnDelete();
                $table->foreign('channel_connection_id')->references('id')->on('channel_connections')->nullOnDelete();
                $table->index(['tenant_id', 'whatsapp_flow_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_flow_submissions');
        Schema::dropIfExists('whatsapp_flows');
    }
};
