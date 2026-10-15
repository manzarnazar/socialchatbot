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
        Schema::create('knowledge_bases', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        Schema::create('knowledge_sources', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('knowledge_base_id');
            $table->string('source_type'); // file, url, qa, sheet
            $table->string('source_name');
            $table->json('source_metadata')->nullable();
            $table->string('status')->default('pending'); // pending, indexing, indexed, failed
            $table->text('error_reason')->nullable();
            $table->timestamps();

            $table->foreign('knowledge_base_id')->references('id')->on('knowledge_bases')->onDelete('cascade');
        });

        Schema::create('knowledge_chunks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('knowledge_source_id');
            $table->integer('chunk_index');
            $table->longText('content');
            $table->longText('embedding'); // Stored as JSON float array
            $table->timestamps();

            $table->foreign('knowledge_source_id')->references('id')->on('knowledge_sources')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('knowledge_chunks');
        Schema::dropIfExists('knowledge_sources');
        Schema::dropIfExists('knowledge_bases');
    }
};
