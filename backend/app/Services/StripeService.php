<?php

namespace App\Services;

use App\Services\Payments\PaymentGatewayManager;
use App\Services\Payments\Drivers\StripeGatewayDriver;
use Stripe\StripeClient;
use App\Models\Tenant;

class StripeService
{
    protected PaymentGatewayManager $paymentManager;
    protected StripeGatewayDriver $driver;

    public function __construct(?PaymentGatewayManager $paymentManager = null)
    {
        $this->paymentManager = $paymentManager ?: app(PaymentGatewayManager::class);
        $this->driver = $this->paymentManager->driver('stripe');
    }

    /**
     * Get underlying StripeClient instance.
     */
    public function getClient(): ?StripeClient
    {
        return $this->driver->getClient();
    }

    /**
     * Create a Product in Stripe.
     */
    public function createProduct(string $name, ?string $description = null): string
    {
        return $this->driver->createProduct($name, $description);
    }

    /**
     * Create a Price in Stripe linked to a Product.
     */
    public function createPrice(string $productId, int $amountCents, string $currency, string $interval = 'month'): string
    {
        return $this->driver->createPrice($productId, $amountCents, $currency, $interval);
    }

    /**
     * Archive/Deactivate an existing Price in Stripe.
     */
    public function archivePrice(string $priceId): void
    {
        $this->driver->archivePrice($priceId);
    }

    /**
     * Create a Stripe Checkout Session for a tenant.
     */
    public function createCheckoutSession(Tenant $tenant, string $priceId, string $successUrl, string $cancelUrl): string
    {
        return $this->driver->createCheckoutSession($tenant, $priceId, $successUrl, $cancelUrl);
    }

    /**
     * Create a Stripe Customer Portal Session for a tenant.
     */
    public function createPortalSession(Tenant $tenant, string $returnUrl): string
    {
        return $this->driver->createPortalSession($tenant, $returnUrl);
    }

    /**
     * Update an active subscription's plan tier on Stripe directly (Upgrade/Downgrade with proration).
     */
    public function changeSubscriptionPlan(Tenant $tenant, string $newPriceId): void
    {
        $this->driver->changeSubscriptionPlan($tenant, $newPriceId);
    }

    /**
     * Set Stripe subscription cancellation state (runs at period end).
     */
    public function cancelSubscription(Tenant $tenant): void
    {
        $this->driver->cancelSubscription($tenant);
    }
}
