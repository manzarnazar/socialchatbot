<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('saas_admin_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->json('permissions')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('saas_admins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained('saas_admin_roles')->cascadeOnDelete();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('status')->default('active'); // active, suspended
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('plan_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('plans')->cascadeOnDelete();
            $table->foreignId('currency_id')->constrained('currencies')->cascadeOnDelete();
            $table->integer('amount'); // stored in minor units (e.g. cents)
            $table->string('stripe_price_id')->nullable()->unique();
            $table->string('billing_interval')->default('month'); // month, year
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('actor_type'); // App\Models\Admin or App\Models\User
            $table->unsignedBigInteger('actor_id');
            $table->string('action');
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('meta')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        // Seed default Super Admin role and admin user
        $roleId = DB::table('saas_admin_roles')->insertGetId([
            'name' => 'Super Admin',
            'permissions' => json_encode(['*']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('saas_admins')->insert([
            'role_id' => $roleId,
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'email' => 'admin@whatsomni.com',
            'password' => Hash::make('Password123!'),
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('plan_prices');
        Schema::dropIfExists('saas_admins');
        Schema::dropIfExists('saas_admin_roles');
    }
};
