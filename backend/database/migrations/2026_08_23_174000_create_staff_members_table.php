<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('staff_members')) {
            Schema::create('staff_members', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
                $table->foreignId('user_id')->nullable()->constrained('tenant_users')->onDelete('set null');
                $table->string('name');
                $table->string('email')->nullable();
                $table->string('phone')->nullable();
                $table->string('title')->nullable();
                $table->string('type')->default('staff'); // 'staff' | 'resource'
                $table->string('color')->nullable(); // hex badge color
                $table->text('avatar_url')->nullable();
                $table->json('working_hours')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index(['tenant_id', 'type', 'is_active']);
            });
        }

        Schema::table('appointments', function (Blueprint $table) {
            if (!Schema::hasColumn('appointments', 'staff_id')) {
                $table->foreignId('staff_id')->nullable()->after('booking_link_id')->constrained('staff_members')->onDelete('set null');
            }
        });

        Schema::table('booking_links', function (Blueprint $table) {
            if (!Schema::hasColumn('booking_links', 'staff_id')) {
                $table->foreignId('staff_id')->nullable()->after('tenant_id')->constrained('staff_members')->onDelete('set null');
            }
        });
    }

    public function down(): void
    {
        Schema::table('booking_links', function (Blueprint $table) {
            if (Schema::hasColumn('booking_links', 'staff_id')) {
                $table->dropForeign(['staff_id']);
                $table->dropColumn('staff_id');
            }
        });

        Schema::table('appointments', function (Blueprint $table) {
            if (Schema::hasColumn('appointments', 'staff_id')) {
                $table->dropForeign(['staff_id']);
                $table->dropColumn('staff_id');
            }
        });

        Schema::dropIfExists('staff_members');
    }
};
