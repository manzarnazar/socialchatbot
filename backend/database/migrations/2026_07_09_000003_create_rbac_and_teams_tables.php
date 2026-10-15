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
        // 1. Roles table (nullable tenant_id for global/system roles)
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->string('display_name');
            $table->json('permissions')->nullable(); // e.g. {"inbox": ["read", "write"], "campaigns": ["read", "write"], "settings": ["read", "write"]}
            $table->timestamps();
        });

        // Add foreign key constraint to tenant_users role_id column
        Schema::table('tenant_users', function (Blueprint $table) {
            $table->foreign('role_id')->references('id')->on('roles')->nullOnDelete();
        });

        // 2. Teams table (workspace-specific named groups)
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();
        });

        // 3. Team members pivot table
        Schema::create('team_tenant_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_user_id')->constrained('tenant_users')->cascadeOnDelete();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->timestamps();
        });

        // 4. Team Invitations table
        Schema::create('team_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('email');
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->string('token')->unique();
            $table->string('status')->default('pending'); // pending, accepted, expired
            $table->timestamp('expires_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('team_invitations');
        Schema::dropIfExists('team_tenant_user');
        Schema::dropIfExists('teams');
        
        Schema::table('tenant_users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
        });
        
        Schema::dropIfExists('roles');
    }
};
