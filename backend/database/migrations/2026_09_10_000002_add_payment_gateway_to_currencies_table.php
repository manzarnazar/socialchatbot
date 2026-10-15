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
        if (!Schema::hasColumn('currencies', 'payment_gateway')) {
            Schema::table('currencies', function (Blueprint $table) {
                $table->string('payment_gateway', 30)->default('stripe')->after('name');
            });
        }

        // Seed smart defaults for existing active currencies
        DB::table('currencies')->where('code', 'INR')->update(['payment_gateway' => 'razorpay']);
        DB::table('currencies')->where('code', 'NGN')->update(['payment_gateway' => 'paystack']);
        DB::table('currencies')->whereIn('code', ['USD', 'EUR', 'GBP', 'CAD', 'AUD'])->update(['payment_gateway' => 'stripe']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('currencies', 'payment_gateway')) {
            Schema::table('currencies', function (Blueprint $table) {
                $table->dropColumn('payment_gateway');
            });
        }
    }
};
