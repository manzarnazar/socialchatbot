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
        Schema::create('channel_connections', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->string('channel_type'); // whatsapp, baileys, instagram, facebook, telegram, sms, email, mock
            $table->string('name');
            $table->string('status')->default('connected'); // connected, disconnected, error
            $table->text('credentials'); // encrypted payload
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('channel_connection_id');
            $table->unsignedBigInteger('contact_id')->nullable();
            $table->string('external_chat_id'); // e.g. sender telephone or username
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('channel_connection_id')->references('id')->on('channel_connections')->onDelete('cascade');
            $table->foreign('contact_id')->references('id')->on('contacts')->onDelete('set null');

            $table->unique(['channel_connection_id', 'external_chat_id']);
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('conversation_id');
            $table->string('direction'); // inbound, outbound
            $table->string('message_type')->default('text'); // text, image, video, document, audio, location, template
            $table->string('sender_identifier')->nullable(); // e.g. phone number or sender profile name
            $table->text('body')->nullable();
            $table->string('media_url')->nullable();
            $table->string('external_message_id')->nullable();
            $table->string('delivery_status')->default('sent'); // sent, delivered, read, failed
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->foreign('conversation_id')->references('id')->on('conversations')->onDelete('cascade');
            $table->index('external_message_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversations');
        Schema::dropIfExists('channel_connections');
    }
};
