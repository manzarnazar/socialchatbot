<?php

namespace App\Jobs;

use App\Models\Conversation;
use App\Models\EcommerceAbandonedCart;
use App\Models\Flow;
use App\Models\FlowExecution;
use App\Services\Flow\FlowRunner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendAbandonedCartRecoveryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected int $cartId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $cartId)
    {
        $this->cartId = $cartId;
    }

    /**
     * Execute the job.
     */
    public function handle(FlowRunner $flowRunner): void
    {
        // Fetch the cart
        $cart = EcommerceAbandonedCart::find($this->cartId);

        if (!$cart) {
            Log::warning("SendAbandonedCartRecoveryJob: Cart ID {$this->cartId} not found.");
            return;
        }

        // Check if tenant's plan allows abandoned cart recovery
        $tenant = \App\Models\Tenant::find($cart->tenant_id);
        if ($tenant && !$tenant->canUseAbandonedCartRecovery()) {
            Log::info("SendAbandonedCartRecoveryJob: Tenant {$cart->tenant_id} plan does not permit abandoned cart recovery. Skipping.");
            $cart->update(['recovery_status' => 'plan_restricted']);
            return;
        }

        // Only proceed if still pending
        if ($cart->recovery_status !== 'pending') {
            Log::info("SendAbandonedCartRecoveryJob: Cart {$this->cartId} has recovery status '{$cart->recovery_status}'. Skipping dispatch.");
            return;
        }

        // Find contact
        $contact = $cart->contact;
        if (!$contact) {
            Log::warning("SendAbandonedCartRecoveryJob: Cart {$this->cartId} has no associated contact.");
            return;
        }

        // Find active flow with checkout trigger
        $flow = Flow::where('tenant_id', $cart->tenant_id)
            ->where('trigger_type', 'ecommerceCheckoutAbandoned')
            ->where('is_active', true)
            ->first();

        if (!$flow) {
            Log::info("SendAbandonedCartRecoveryJob: No active flow. Dispatching fallback direct text message.");
            $connection = \App\Models\ChannelConnection::where('tenant_id', $cart->tenant_id)
                ->whereIn('status', ['connected', 'active'])
                ->first();
            if ($connection) {
                // Find or create conversation
                $conversation = Conversation::firstOrCreate([
                    'tenant_id' => $cart->tenant_id,
                    'contact_id' => $contact->id,
                    'channel_connection_id' => $connection->id,
                    'external_chat_id' => $contact->phone ?: $contact->email ?: 'unknown',
                ], [
                    'status' => 'open',
                ]);

                $body = "Hi {$contact->first_name}! We noticed you left some items in your cart. Complete your purchase here: " . $cart->checkout_url;

                // Send outbound message
                $channelManager = app(\App\Services\Channels\ChannelManager::class);
                $driver = $channelManager->driver($connection->channel_type);
                $res = $driver->sendMessage($connection->decrypted_credentials, [
                    'external_chat_id' => $conversation->external_chat_id,
                    'body' => $body,
                    'media_url' => '',
                ]);

                \App\Models\Message::create([
                    'conversation_id' => $conversation->id,
                    'tenant_id' => $cart->tenant_id,
                    'direction' => 'outbound',
                    'message_type' => 'text',
                    'sender_identifier' => 'System Cart Recovery',
                    'body' => $body,
                    'media_url' => '',
                    'external_message_id' => $res['external_message_id'] ?? 'cart_' . uniqid(),
                    'delivery_status' => $res['delivery_status'] ?? 'sent',
                    'error_message' => $res['error_message'] ?? null,
                ]);

                $cart->update(['recovery_status' => 'contacted', 'updated_at' => now()]);
            }
            return;
        }

        // Get published version or fall back
        $version = $flow->publishedVersion ?: $flow->versions()->orderBy('version_number', 'desc')->first();
        if (!$version) {
            Log::warning("SendAbandonedCartRecoveryJob: Flow {$flow->id} has no versions.");
            $cart->update(['recovery_status' => 'expired']);
            return;
        }

        // Find trigger node ID
        $definition = $version->definition;
        $triggerNode = null;
        foreach ($definition['nodes'] ?? [] as $node) {
            if ($node['type'] === 'ecommerceCheckoutAbandoned') {
                $triggerNode = $node;
                break;
            }
        }

        if (!$triggerNode) {
            Log::warning("SendAbandonedCartRecoveryJob: Flow version {$version->id} has no trigger node.");
            $cart->update(['recovery_status' => 'expired']);
            return;
        }

        // Find or fallback conversation
        $conversation = Conversation::where('tenant_id', $cart->tenant_id)
            ->where('contact_id', $contact->id)
            ->orderBy('updated_at', 'desc')
            ->first();

        // Create execution context
        $execution = FlowExecution::create([
            'tenant_id' => $cart->tenant_id,
            'flow_version_id' => $version->id,
            'contact_id' => $contact->id,
            'conversation_id' => $conversation?->id,
            'status' => 'running',
            'current_node_id' => $triggerNode['id'],
            'context' => [
                'variables' => [
                    'checkout_url' => $cart->checkout_url,
                    'cart_total' => (string)$cart->total_price,
                    'items_summary' => json_encode($cart->items_summary),
                ],
                'loop_count' => []
            ]
        ]);

        // Mark cart as contacted to prevent duplicate triggers
        $cart->update([
            'recovery_status' => 'contacted',
        ]);

        // Run the flow
        $flowRunner->execute($execution);

        Log::info("SendAbandonedCartRecoveryJob: Successfully triggered recovery flow {$flow->id} for cart {$cart->id}.");
    }
}
