<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add max_workspaces to plans table
        Schema::table('plans', function (Blueprint $table) {
            if (!Schema::hasColumn('plans', 'max_workspaces')) {
                $table->integer('max_workspaces')->default(1)->after('max_team_members');
            }
        });

        // 2. Add owner_id to tenants table
        Schema::table('tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('tenants', 'owner_id')) {
                $table->foreignId('owner_id')->nullable()->after('id')->constrained('tenant_users')->nullOnDelete();
            }
        });

        // 3. Create tenant_user_memberships pivot table
        if (!Schema::hasTable('tenant_user_memberships')) {
            Schema::create('tenant_user_memberships', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('tenant_users')->cascadeOnDelete();
                $table->foreignId('role_id')->nullable()->constrained('roles')->nullOnDelete();
                $table->boolean('is_owner')->default(false);
                $table->timestamps();

                $table->unique(['tenant_id', 'user_id']);
            });
        }

        // 4. Backfill existing data
        $ownerRole = DB::table('roles')->where('name', 'owner')->first();
        $ownerRoleId = $ownerRole ? $ownerRole->id : null;

        // Backfill owner_id on existing tenants
        $tenants = DB::table('tenants')->get();
        foreach ($tenants as $tenant) {
            // Find owner user or first user for this tenant
            $ownerUser = null;
            if ($ownerRoleId) {
                $ownerUser = DB::table('tenant_users')
                    ->where('tenant_id', $tenant->id)
                    ->where('role_id', $ownerRoleId)
                    ->first();
            }
            if (!$ownerUser) {
                $ownerUser = DB::table('tenant_users')
                    ->where('tenant_id', $tenant->id)
                    ->orderBy('id', 'asc')
                    ->first();
            }

            if ($ownerUser) {
                DB::table('tenants')->where('id', $tenant->id)->update([
                    'owner_id' => $ownerUser->id,
                ]);
            }
        }

        // Backfill memberships for all existing users
        $users = DB::table('tenant_users')->get();
        foreach ($users as $user) {
            if ($user->tenant_id) {
                $isOwner = $ownerRoleId && ($user->role_id == $ownerRoleId);
                DB::table('tenant_user_memberships')->updateOrInsert(
                    ['tenant_id' => $user->tenant_id, 'user_id' => $user->id],
                    [
                        'role_id' => $user->role_id,
                        'is_owner' => $isOwner,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }

        // 5. Populate initial workspace limits for standard plans
        DB::table('plans')->where('name', 'like', '%Starter%')->update(['max_workspaces' => 1]);
        DB::table('plans')->where('name', 'like', '%Professional%')->update(['max_workspaces' => 3]);
        DB::table('plans')->where('name', 'like', '%Enterprise%')->update(['max_workspaces' => 10]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenant_user_memberships');

        Schema::table('tenants', function (Blueprint $table) {
            if (Schema::hasColumn('tenants', 'owner_id')) {
                $table->dropForeign(['owner_id']);
                $table->dropColumn('owner_id');
            }
        });

        Schema::table('plans', function (Blueprint $table) {
            if (Schema::hasColumn('plans', 'max_workspaces')) {
                $table->dropColumn('max_workspaces');
            }
        });
    }
};
