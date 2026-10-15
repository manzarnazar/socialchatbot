<?php

namespace App\Contracts;

use App\Models\Tenant;

interface PaymentGatewayInterface
{
    /**
     * Get the unique gateway identifier slug (e.g. 'stripe', 'razorpay', 'paypal').
     */
    public function getSlug(): string;

    /**
     * Get the human-readable display name.
     */
    public function getName(): string;

    /**
     * Check if this gateway is configured and enabled.
     */
    public function isConfigured(): bool;

    /**
     * Check if gateway is operating in test mode vs live mode.
     */
    public function isTestMode(): bool;

    /**
     * Get public credentials for frontend checkout/SDKs.
     */
    public function getPublicCredentials(): array;

    /**
     * Create a Product in the payment gateway.
     */
    public function createProduct(string $name, ?string $description = null): string;

    /**
     * Create a recurring Price/Plan linked to a Product.
     */
    public function createPrice(string $productId, int $amountCents, string $currency, string $interval = 'month'): string;

    /**
     * Archive or deactivate an existing Price.
     */
    public function archivePrice(string $priceId): void;

    /**
     * Create a Checkout Session URL for a tenant workspace subscription.
     */
    public function createCheckoutSession(Tenant $tenant, string $priceId, string $successUrl, string $cancelUrl): string;

    /**
     * Create a Billing Portal Session URL for customer self-service invoice/card management.
     */
    public function createPortalSession(Tenant $tenant, string $returnUrl): string;

    /**
     * Modify/Upgrade an active subscription.
     */
    public function changeSubscriptionPlan(Tenant $tenant, string $newPriceId): void;

    /**
     * Cancel an active subscription.
     */
    public function cancelSubscription(Tenant $tenant): void;

    /**
     * Test connection and credentials validity with the provider.
     */
    public function testConnection(?array $overrideCredentials = null): array;
}
