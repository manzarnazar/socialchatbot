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
        // 1. Ensure composite index for fast multi-currency lookups on plan_prices
        Schema::table('plan_prices', function (Blueprint $table) {
            $table->index(['plan_id', 'currency_id', 'billing_interval'], 'idx_plan_prices_lookup');
        });

        // 2. Ensure all 7 standard platform currencies are registered and active
        $standardCurrencies = [
            ['code' => 'USD', 'symbol' => '$', 'name' => 'US Dollar', 'is_active' => true, 'is_default' => false],
            ['code' => 'EUR', 'symbol' => '€', 'name' => 'Euro', 'is_active' => true, 'is_default' => false],
            ['code' => 'GBP', 'symbol' => '£', 'name' => 'British Pound', 'is_active' => true, 'is_default' => false],
            ['code' => 'INR', 'symbol' => '₹', 'name' => 'Indian Rupee', 'is_active' => true, 'is_default' => true],
            ['code' => 'CAD', 'symbol' => 'C$', 'name' => 'Canadian Dollar', 'is_active' => true, 'is_default' => false],
            ['code' => 'AUD', 'symbol' => 'A$', 'name' => 'Australian Dollar', 'is_active' => true, 'is_default' => false],
            ['code' => 'NGN', 'symbol' => '₦', 'name' => 'Nigerian Naira', 'is_active' => true, 'is_default' => false],
        ];

        foreach ($standardCurrencies as $sc) {
            $existing = DB::table('currencies')->where('code', $sc['code'])->first();
            if (!$existing) {
                DB::table('currencies')->insert(array_merge($sc, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            } else {
                DB::table('currencies')->where('id', $existing->id)->update([
                    'symbol' => $sc['symbol'],
                    'name' => $sc['name'],
                    'is_active' => true,
                    'updated_at' => now(),
                ]);
            }
        }

        // 3. Populate default multi-currency rates for all existing plans
        $currencyMap = DB::table('currencies')->pluck('id', 'code')->toArray();
        $plans = DB::table('plans')->get();

        // Baseline rate matrices in minor units (cents / paise / kobo)
        $rateMatrix = [
            'USD' => ['month' => 1900, 'year' => 19000],
            'EUR' => ['month' => 1800, 'year' => 18000],
            'GBP' => ['month' => 1500, 'year' => 15000],
            'CAD' => ['month' => 2500, 'year' => 25000],
            'AUD' => ['month' => 2900, 'year' => 29000],
            'INR' => ['month' => 10000, 'year' => 1000000],
            'NGN' => ['month' => 1500000, 'year' => 15000000],
        ];

        // Multipliers based on plan level
        $multipliers = [
            'Starter' => 1.0,
            'Professional' => 2.5,
            'Enterprise' => 5.0,
        ];

        foreach ($plans as $plan) {
            $mult = $multipliers[$plan->name] ?? 1.0;

            foreach ($rateMatrix as $code => $rates) {
                $currencyId = $currencyMap[$code] ?? null;
                if (!$currencyId) continue;

                foreach (['month', 'year'] as $interval) {
                    $existingPrice = DB::table('plan_prices')
                        ->where('plan_id', $plan->id)
                        ->where('currency_id', $currencyId)
                        ->where('billing_interval', $interval)
                        ->first();

                    if (!$existingPrice) {
                        $baseAmount = $rates[$interval];
                        $finalAmount = (int) round($baseAmount * $mult);

                        DB::table('plan_prices')->insert([
                            'plan_id' => $plan->id,
                            'currency_id' => $currencyId,
                            'amount' => $finalAmount,
                            'stripe_price_id' => "price_plan_{$plan->id}_{$currencyId}_{$interval}",
                            'billing_interval' => $interval,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plan_prices', function (Blueprint $table) {
            $table->dropIndex('idx_plan_prices_lookup');
        });
    }
};
