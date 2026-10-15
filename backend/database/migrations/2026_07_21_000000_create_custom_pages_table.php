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
        Schema::create('custom_pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique(); // e.g., 'about', 'privacy', 'terms'
            $table->string('title');
            $table->longText('content');
            $table->text('meta_description')->nullable();
            $table->boolean('is_published')->default(true);
            $table->timestamps();
        });

        // Seed default initial content for About Us, Privacy Policy, and Terms & Conditions
        $now = now();

        DB::table('custom_pages')->insert([
            [
                'slug' => 'about',
                'title' => 'About Us',
                'content' => '<h1>About Our Platform</h1><p>Welcome to our all-in-one conversational messaging and CRM platform. We bring WhatsApp, Instagram, Messenger, Telegram, SMS, and Email into a single, unified workspace powered by intelligent AI agents, visual automation builders, and seamless CRM integrations.</p><h2>Our Mission</h2><p>Our mission is to help growing businesses turn every message into a customer relationship by automating repetitive workflows while giving human support teams complete control.</p><h2>What We Offer</h2><ul><li><strong>Unified Multi-Channel Inbox:</strong> Respond to customer inquiries across all messaging channels in one synchronized stream.</li><li><strong>AI Support Agents:</strong> Deploy 24/7 AI assistants grounded in your knowledge base to qualify leads and answer questions instantly.</li><li><strong>No-Code Flow Builder:</strong> Design rich interactive multi-channel automation flows without writing code.</li><li><strong>Built-in CRM & E-Commerce:</strong> Sync contacts, deal pipelines, and active abandoned carts seamlessly.</li></ul>',
                'meta_description' => 'Learn more about our mission, vision, and multi-channel conversational platform.',
                'is_published' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'privacy',
                'title' => 'Privacy Policy',
                'content' => '<h1>Privacy Policy</h1><p><em>Last updated: July 2026</em></p><p>We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, store, and safeguard information when you use our services.</p><h2>1. Information We Collect</h2><p>We collect information provided directly by you, including your name, email address, phone number, payment details, and workspace configurations, as well as data transmitted via connected messaging channels.</p><h2>2. How We Use Your Data</h2><p>Your data is processed to provide core platform services, manage billing, deliver automated messaging flows, maintain security, and continuously improve customer experience.</p><h2>3. Data Protection & Security</h2><p>All sensitive information, including API keys, tokens, and stored messages, is encrypted at rest and in transit using industry-standard protocols. Access permissions are strictly scoped to authenticated workspace users.</p><h2>4. Contact Us</h2><p>If you have any questions or concerns regarding our privacy practices, please contact our support team.</p>',
                'meta_description' => 'Read our comprehensive Privacy Policy to understand how we protect your personal and business data.',
                'is_published' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'terms',
                'title' => 'Terms & Conditions',
                'content' => '<h1>Terms & Conditions</h1><p><em>Last updated: July 2026</em></p><p>Please read these Terms & Conditions carefully before using our website and services. By accessing or registering an account, you agree to be bound by these terms.</p><h2>1. Service Terms</h2><p>Our platform provides software-as-a-service tools for multi-channel messaging, visual workflow design, AI agent integration, and customer relationship management.</p><h2>2. User Responsibilities</h2><p>You agree to use the platform in compliance with all applicable local, national, and international laws, as well as channel-specific policies (including WhatsApp Business terms and anti-spam regulations).</p><h2>3. Subscriptions & Billing</h2><p>Platform services are billed on a recurring basis according to your selected plan. You may upgrade, downgrade, or cancel your subscription at any time via your billing settings.</p><h2>4. Limitation of Liability</h2><p>In no event shall the platform be liable for indirect, incidental, or consequential damages arising out of your use or inability to use the service.</p>',
                'meta_description' => 'Read the Terms & Conditions governing your use of our platform and services.',
                'is_published' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('custom_pages');
    }
};
