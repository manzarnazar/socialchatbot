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
        Schema::create('flows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('trigger_type', 50); // inbound_message, contact_created, webhook, deal_updated, manual
            $table->boolean('is_active')->default(false);
            $table->unsignedBigInteger('current_published_version_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'is_active']);
        });

        Schema::create('flow_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('flow_id')->constrained('flows')->cascadeOnDelete();
            $table->unsignedInteger('version_number');
            $table->json('definition'); // Contains { nodes: [...], edges: [...] }
            $table->boolean('is_published')->default(false);
            $table->foreignId('created_by')->constrained('tenant_users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['flow_id', 'version_number']);
        });

        // Add foreign key constraint to flows table now that flow_versions exists
        Schema::table('flows', function (Blueprint $table) {
            $table->foreign('current_published_version_id')
                ->references('id')
                ->on('flow_versions')
                ->nullOnDelete();
        });

        Schema::create('flow_executions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('flow_version_id')->constrained('flow_versions')->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained('contacts')->cascadeOnDelete();
            $table->foreignId('conversation_id')->nullable()->constrained('conversations')->nullOnDelete();
            $table->string('status', 50)->default('running'); // running, completed, failed, paused_waiting_reply, paused_delay
            $table->string('current_node_id', 100);
            $table->json('context'); // { variables: {...}, loop_count: {...} }
            $table->timestamp('resume_after')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->index(['status', 'resume_after']);
        });

        Schema::create('flow_execution_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('flow_execution_id')->constrained('flow_executions')->cascadeOnDelete();
            $table->string('node_id', 100);
            $table->string('node_type', 100);
            $table->string('node_title', 255);
            $table->string('status', 50); // success, failed
            $table->unsignedInteger('execution_time_ms')->default(0);
            $table->json('details')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('flow_execution_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('flow_execution_logs');
        Schema::dropIfExists('flow_executions');

        // Drop foreign key from flows before dropping flow_versions
        Schema::table('flows', function (Blueprint $table) {
            $table->dropForeign(['current_published_version_id']);
        });

        Schema::dropIfExists('flow_versions');
        Schema::dropIfExists('flows');
    }
};
