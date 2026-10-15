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
        Schema::table('flow_templates', function (Blueprint $table) {
            if (Schema::hasColumn('flow_templates', 'badge')) {
                $table->dropColumn('badge');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('flow_templates', function (Blueprint $table) {
            $table->string('badge')->nullable()->after('description');
        });
    }
};
