<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('lifecycle_stage')->default('lead');
            $table->json('opted_out_channels')->nullable();
            $table->json('custom_fields')->nullable();
            $table->json('tags')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'email']);
            $table->index(['tenant_id', 'phone']);
        });

        Schema::create('deals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('contact_id')->nullable()->constrained('contacts')->onDelete('set null');
            $table->string('title');
            $table->decimal('amount', 15, 2)->default(0.00);
            $table->string('stage')->default('lead');
            $table->integer('pipeline_stage_order')->default(0);
            $table->timestamps();

            $table->index(['tenant_id', 'stage']);
        });

        Schema::create('contact_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('contact_id')->constrained('contacts')->onDelete('cascade');
            $table->string('type');
            $table->text('description');
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('tenant_users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_activities');
        Schema::dropIfExists('deals');
        Schema::dropIfExists('contacts');
    }
};
