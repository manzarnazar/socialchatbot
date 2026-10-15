<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('tenant_google_tokens')
            ->whereNull('type')
            ->update(['type' => 'sheets']);
    }

    public function down(): void
    {
        // No-op
    }
};
