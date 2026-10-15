<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('tenants', 'trial_ends_at')) {
                $table->timestamp('trial_ends_at')->nullable()->after('status');
            }
        });

        // Backfill active trial tenants with a trial_ends_at calculated from created_at
        $trialTenants = DB::table('tenants')->where('status', 'trial')->whereNull('trial_ends_at')->get();
        foreach ($trialTenants as $t) {
            $created = $t->created_at ? \Carbon\Carbon::parse($t->created_at) : now();
            DB::table('tenants')->where('id', $t->id)->update([
                'trial_ends_at' => $created->copy()->addDays(14),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            if (Schema::hasColumn('tenants', 'trial_ends_at')) {
                $table->dropColumn('trial_ends_at');
            }
        });
    }
};
