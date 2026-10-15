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
        Schema::create('message_templates', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('channel_connection_id')->nullable();
            $table->string('name');
            $table->string('type'); // whatsapp, email
            $table->string('category')->default('utility'); // utility, marketing, authentication
            $table->string('language')->default('en');
            $table->string('status')->default('draft'); // draft, pending, approved, rejected, ready
            $table->string('meta_template_id')->nullable(); // For WhatsApp Cloud API approved template reference
            $table->json('content'); // template structure/blocks JSON
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('channel_connection_id')->references('id')->on('channel_connections')->onDelete('set null');
            $table->index(['tenant_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('message_templates');
    }
};
