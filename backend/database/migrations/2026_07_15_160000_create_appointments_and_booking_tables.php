<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('slug');
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('duration')->default(30); // in minutes
            $table->integer('buffer_before')->default(0); // in minutes
            $table->integer('buffer_after')->default(0); // in minutes
            $table->json('working_hours')->nullable(); // JSON configuration of availability
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'slug']);
        });

        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('contact_id')->constrained('contacts')->onDelete('cascade');
            $table->foreignId('booking_link_id')->nullable()->constrained('booking_links')->onDelete('set null');
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->string('status')->default('scheduled'); // scheduled, cancelled, completed
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'start_time']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('booking_links');
    }
};
