<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Plan;
use App\Models\PlanPrice;
use App\Models\Currency;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Support\Facades\Log;

class SyncPaymentGatewaysCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'payments:sync-plans {--gateway=paddle : Gateway to sync (paddle, stripe, or all)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Synchronize plans and prices with configured payment gateways (Paddle, Stripe, etc.)';

    public function handle(PaymentGatewayManager $paymentManager): int
    {
        $gatewayFilter = strtolower($this->option('gateway') ?: 'paddle');
        $this->info("Starting payment gateway synchronization (Target: {$gatewayFilter})...");

        $plans = Plan::with(['prices.currency'])->where('is_active', true)->get();

        if ($plans->isEmpty()) {
            $this->warn('No active plans found in the database.');
            return 0;
        }

        if ($gatewayFilter === 'paddle' || $gatewayFilter === 'all') {
            $this->syncPaddlePlans($paymentManager, $plans);
        }

        $this->info('Payment gateway synchronization completed successfully.');
        return 0;
    }

    protected function syncPaddlePlans(PaymentGatewayManager $paymentManager, $plans): void
    {
        $this->line('');
        $this->info('--- Synchronizing Paddle Billing Products and Prices ---');

        /** @var \App\Services\Payments\Drivers\PaddleGatewayDriver $paddleDriver */
        $paddleDriver = $paymentManager->driver('paddle');

        if (!$paddleDriver->isConfigured()) {
            $this->error('Paddle is not configured with an API key. Skipping Paddle sync.');
            return;
        }

        $isTest = $paddleDriver->isTestMode();
        $this->line("Mode: " . ($isTest ? 'Sandbox / Test' : 'Live Production'));

        foreach ($plans as $plan) {
            $this->line('');
            $this->info("Checking Plan: {$plan->name} (ID: {$plan->id})");

            $productId = $plan->paddle_product_id;
            $productValid = false;

            if (!empty($productId) && str_starts_with($productId, 'pro_')) {
                $productValid = true;
            }

            if (!$productValid || empty($productId)) {
                try {
                    $productId = $paddleDriver->createProduct($plan->name, $plan->description ?? "{$plan->name} Subscription Plan");
                    $plan->update(['paddle_product_id' => $productId]);
                    $this->info("  [+] Created Paddle Product: {$productId}");
                } catch (\Exception $e) {
                    $this->error("  [!] Failed to create Paddle product for '{$plan->name}': " . $e->getMessage());
                    continue;
                }
            } else {
                $this->line("  [OK] Paddle Product: {$productId}");
            }

            // Sync prices
            foreach ($plan->prices as $price) {
                $currencyCode = $price->currency ? strtoupper($price->currency->code) : 'USD';
                $amount = (int) $price->amount;
                $interval = $price->billing_interval ?: 'month';

                // Skip free plans (amount 0) since Paddle does not support zero-amount subscription prices
                if ($amount <= 0) {
                    $this->line("  [-] Price ID {$price->id} ({$currencyCode} {$amount}/{$interval}): Skipped (amount 0)");
                    continue;
                }

                $existingPriceId = $price->paddle_price_id;

                if (!empty($existingPriceId) && str_starts_with($existingPriceId, 'pri_')) {
                    $this->line("  [OK] Price ID {$price->id} ({$currencyCode} {$amount}/{$interval}): {$existingPriceId}");
                    continue;
                }

                try {
                    $newPriceId = $paddleDriver->createPrice($productId, $amount, $currencyCode, $interval);
                    $price->update(['paddle_price_id' => $newPriceId]);
                    $this->info("  [+] Provisioned Price ID {$price->id} ({$currencyCode} {$amount}/{$interval}): {$newPriceId}");
                } catch (\Exception $e) {
                    $this->error("  [!] Failed to create Paddle price for ID {$price->id} ({$currencyCode}): " . $e->getMessage());
                }
            }
        }
    }
}
