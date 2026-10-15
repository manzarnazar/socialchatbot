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
        Schema::create('ai_provider_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('provider_name'); // e.g. openai, anthropic, gemini, etc.
            $table->text('api_key'); // Laravel cast: encrypted
            $table->boolean('is_active')->default(true);
            $table->json('enabled_models');
            $table->string('default_model')->nullable();
            $table->timestamps();

            // Enforce single active API key per provider name per tenant
            $table->unique(['tenant_id', 'provider_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_provider_configs');
    }
};
