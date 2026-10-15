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
        if (Schema::hasTable('messages') && !Schema::hasColumn('messages', 'metadata')) {
            Schema::table('messages', function (Blueprint $table) {
                $table->json('metadata')->nullable()->after('error_message');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('messages') && Schema::hasColumn('messages', 'metadata')) {
            Schema::table('messages', function (Blueprint $table) {
                $table->dropColumn('metadata');
            });
        }
    }
};
