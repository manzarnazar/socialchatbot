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
        Schema::create('flow_templates', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('category')->default('General');
            $table->text('description')->nullable();
            $table->string('badge')->nullable();
            $table->string('trigger_type', 50)->default('inbound_message');
            $table->json('trigger_keywords')->nullable();
            $table->json('definition'); // Contains { nodes: [...], edges: [...] }
            $table->unsignedInteger('nodes_count')->default(0);
            $table->boolean('is_published')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_published');
            $table->index('category');
            $table->index('sort_order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('flow_templates');
    }
};
