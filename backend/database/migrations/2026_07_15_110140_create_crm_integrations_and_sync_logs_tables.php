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
        Schema::create('crm_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('provider');
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->string('email')->nullable();
            $table->json('field_mapping')->nullable();
            $table->string('sync_direction')->default('bidirectional');
            $table->timestamp('last_sync_at')->nullable();
            $table->timestamps();

            // Ensure unique provider per tenant
            $table->unique(['tenant_id', 'provider']);
        });

        Schema::create('crm_sync_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('crm_integration_id')->constrained('crm_integrations')->cascadeOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained('contacts')->cascadeOnDelete();
            $table->string('external_id')->nullable();
            $table->string('action'); // push, pull
            $table->string('status'); // success, failed
            $table->text('error_message')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('crm_sync_logs');
        Schema::dropIfExists('crm_integrations');
    }
};
