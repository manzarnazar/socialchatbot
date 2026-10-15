# Changelog — WhatsOmni

All notable changes to the **WhatsOmni** platform are documented in this file.

---

## [Version 2.5.0] — 2026-10-03

### 🤖 Copilot Credits Engine, AI Token Quota Isolation, Dedicated Safeguards & BYOK Uncapped Exemption

WhatsOmni 2.5.0 introduces a comprehensive architectural overhaul to platform AI resource management, establishing a dedicated **Credits System** for Copilot, isolating **Monthly AI Tokens** for Chatbots and Visual Flows, adding granular **Copilot Safeguards**, and guaranteeing **Uncapped Usage in BYOK Mode**:

- **Dedicated Copilot Credits System**:
  - **Plan-Level Quotas (`copilot_credits`)**: Configurable per subscription plan (default: 100 credits/month, `-1` for unlimited, `0` to disable).
  - **Tenant Balance Tracking**: Added `used_copilot_credits` tracking with model helper methods (`getCopilotCreditsLimit()`, `getUsedCopilotCredits()`, `getRemainingCopilotCredits()`, `hasCopilotCredits()`).
  - **Real-Time Credits API (`GET /api/copilot/credits`)**: Endpoint returns active balance, limit, usage, and operational mode for immediate UI consumption.
  - **Superadmin Plans Studio**: Added Copilot AI Credits controls and summary indicators in plan creation, editing, and listing tables.

- **Strict Isolation of Monthly AI Tokens & Copilot Usage**:
  - **Separation of Quotas**: Copilot usage is charged via Credits and **never consumes or deducts from the tenant's Monthly AI Tokens quota**.
  - **Chatbot & Flow Quotas**: `monthly_ai_tokens` remains strictly reserved for conversational Chatbots, Inbound auto-replies, and Workflow LLM nodes.
  - **Zero Cross-Throttle**: Tenants exhausting Chatbot monthly tokens retain access to Copilot as long as Copilot credits remain, and vice versa.

- **Dedicated Copilot Safeguards & Cost Protections**:
  - **Copilot Rate Limiter (`copilot_rate_limit_per_minute`)**: Independent rate throttle per workspace (Default: 20 req/min) to prevent prompt spam and runaway automated triggers.
  - **Extended Context Clamping (`copilot_max_input_tokens`)**: Configurable input context window up to 32,000 tokens (Default: 12,000 tokens) supporting complex workflow topologies, telemetry, and conversational history.
  - **Generation Cap (`copilot_max_output_tokens`)**: Configurable generation ceiling (Default: 2,048 tokens) optimized for multi-node flow synthesis, campaign drafting, and CRM analytics reports.
  - **Superadmin Safeguards Studio**: Direct management of Copilot safeguard thresholds within the AI Providers Safeguards panel.

- **BYOK Mode Uncapped Architecture**:
  - **Zero Cap in BYOK Mode**: When operating under BYOK mode, neither the Monthly AI Tokens cap nor the Copilot Credits cap apply, allowing unlimited workspace execution against tenant-supplied provider credentials.
  - **Dynamic Copilot UI Badge**: Floating Copilot dynamically reflects live credits and displays an **"Unlimited Credits (BYOK Mode)"** status badge with an active green pulse.

- **AI Feature Routing & Copilot Enhancements**:
  - **Full Routing Matrix Integration**: Copilot provider and model selection is dynamically routed through AI Feature Routing (Superadmin in Master Fixed mode, Workspace in BYOK mode).
  - **Clean Formatting**: Polished Copilot table responses to eliminate raw technical jargon ("data table"), rendering clean, executive markdown tables with plain status values.
  - **Streamlined Visual Flow Designer**: Visual Flow Designer Copilot modal refined with clean prompt inputs and unified flow architect capabilities.

---

## [Version 2.4.5] — 2026-10-01

### 💬 Shared Inbox WhatsApp Catalog Studio & Streamlined Catalog Management

WhatsOmni 2.4.5 refactors the WhatsApp Catalog workflow by relocating all customer-facing dispatching into the **Shared Inbox** where agents actively converse with contacts, while streamlining the global **WhatsApp Catalog** page into a focused inventory management and Meta configuration workspace:

- **Streamlined WhatsApp Catalog Page (`/ecommerce/whatsapp-catalog`)**:
  - **Clean 2-Tab Architecture**: Simplified the workspace to 2 focused tabs — **Catalog Products** and **Settings & Integration** — eliminating out-of-context customer messaging from settings.
  - **Inventory Management**: Retained search, stock filtering, Table/Grid switcher, external storefront links, and real-time synchronization with Shopify/WooCommerce.
  - **Removed Redundant Customer Dispatch**: Removed manual phone input forms, standalone dispatch tabs, and modal popups in favor of native omnichannel inbox dispatching.

- **Deep Shared Inbox WhatsApp Catalog Integration (`/inbox`)**:
  - **Context-Aware Customer Dispatch**: Automatically targets the active conversation customer (`activeConv`) with zero manual phone entry.
  - **Dedicated WhatsApp Catalog Hub Tab**: Embedded directly inside the Shared Inbox E-Commerce modal when chatting on WhatsApp:
    - **Full Catalog**: 1-click dispatch of Meta's official "View catalog" interactive invitation button.
    - **Specific Product (SPM)**: Single Product Message with native "View item" button and custom notes.
    - **Product Collection (MPM)**: Curated collection builder with header title, section name, search filter, and multi-product selector.
  - **Live WhatsApp Interactive Preview**: Real-time visual chat bubble displaying header, thumbnail, body, footer, interactive Meta action CTAs, and delivery status.
  - **1-Click Card Dispatch**: Retained instant "Send as WhatsApp Product" on every product card in the catalog grid.
  - **Omnichannel Sidebar Shortcuts**: Added dedicated "WA Catalog" quick button in the customer details sidebar next to "Send Product" and "Create Discount".

- **Controller & API Enhancement**:
  - Added field normalization in [`WhatsAppCatalogController.php`](file:///Users/neerajyadav/Documents/WhatsOmni/backend/app/Http/Controllers/Integrations/WhatsAppCatalogController.php) to seamlessly accept both standard and alias parameter naming (`message_type`/`interactive_type`, `body`/`body_text`, `sections`/`product_retailer_ids`).

---

## [Version 2.4.4] — 2026-10-01

### 🛍️ Official WhatsApp Catalog Integration, Interactive Message Studio & Shared Inbox SPM Dispatch

WhatsOmni 2.4.4 introduces official **WhatsApp Catalog & Meta Commerce** integration, enabling businesses to sync product inventories, showcase interactive Single-Product (SPM) and Multi-Product (MPM) messages, and enable native in-chat shopping carts directly within WhatsApp:

- **WhatsApp Catalog Workspace (`/ecommerce/whatsapp-catalog`)**:
  - **Live Connection Status Strip**: Minimal, single-line status strip displaying connected WhatsApp phone number, linked Meta Catalog ID, active in-chat cart state, and instant configuration link.
  - **Intuitive Segmented Switcher Tab Bar**: Seamlessly toggle between **Catalog Products**, **Send to Customer**, and **Settings & Integration** using the platform's standard tab bar.
  - **Catalog Products Explorer**: Real-time search by product name, SKU, or ID, inventory filter (`All`, `In Stock`, `Out of Stock`), Table & Grid switcher, 1-click **Send to Customer** modal, and 1-click **Send Full Catalog** invitation button.
  - **Simplified Message Composer & Preview**:
    - **Full Catalog**: Send official Meta "View catalog" button invitation so customers can browse your entire storefront natively in WhatsApp.
    - **Specific Product**: Share a single product card with instant view and order CTA.
    - **Product Collection**: Curate up to 30 products into an interactive menu collection.
    - **Real-Time WhatsApp Preview**: Live visual preview reflecting official Meta interactive bubble, action CTAs, and delivery status.
  - **Meta Commerce & Storefront Controls**:
    - Easily configure Meta Catalog ID and storefront display name.
    - Toggle **In-Chat WhatsApp Shopping Cart** (`cart_enabled`) for direct chat ordering.
    - Toggle **Profile Catalog Button** (`catalog_enabled`) on business profile headers.
    - Toggle **Automated Catalog Sync** (`auto_sync`) with Shopify & WooCommerce.

- **Shared Inbox Native WhatsApp Catalog Dispatch**:
  - **Direct WhatsApp SPM Dispatch**: When chatting on a WhatsApp channel, agents can send any store product as an official WhatsApp Single Product Message (SPM) with 1 click.
  - **Full Storefront CTA**: One-click **Send Catalog CTA** button in the inbox e-commerce modal toolbar to invite customers to explore the catalog inside WhatsApp.

- **WhatsApp Cloud API Driver & Inbound Order Processing**:
  - **Driver Support for Interactive Catalog Messages**: Added payload generation for `catalog_message`, `product`, and `product_list` interactive types in [`WhatsAppCloudApiDriver.php`](file:///Users/neerajyadav/Documents/WhatsOmni/backend/app/Services/Channels/Drivers/WhatsAppCloudApiDriver.php).
  - **Native Inbound Order Normalization**: Full processing of customer orders placed via the WhatsApp cart (`type === 'order'`), itemizing products, quantities, prices, notes, and logging them in CRM conversations.

---

## [Version 2.4.3] — 2026-10-01

### 💬 Shared Inbox E-Commerce Integration, Instant Product Dispatch & Promo Generator

WhatsOmni 2.4.3 brings deep E-Commerce superpowers directly inside the **Shared Inbox**, empowering agents to recommend products, dispatch checkout links, generate store promo codes, and recover abandoned carts without leaving the conversation:

- **Shared Inbox E-Commerce Modal & Product Catalog Explorer**:
  - **Product Recommendation & Checkout Dispatch**: Instantly browse connected Shopify and WooCommerce products with real-time title/SKU search, in-stock filtering, and currency-aware pricing.
  - **Send to Chat & Insert in Reply**: One-click actions to either dispatch rich product cards with checkout links directly into the active conversation or insert pre-formatted recommendation text into the reply composer.
  - **Custom Promo Code Attachment**: Easily attach active promo discount codes to generated checkout links using the custom portaled `DropdownSelect` component.
  - **Store Catalog Sync Toolbar**: Integrated 1-click **Sync Store** button in the catalog toolbar for on-demand synchronization with connected storefronts.

- **Dynamic Promo Code Generation Engine**:
  - **Flexible Discount Rules**: Create store promo codes on the fly with percentage (% OFF) or fixed amount ($ OFF) rules and configurable expiry durations (24 Hours, 3 Days, 7 Days, 30 Days).
  - **Instant Store Sync**: Codes are generated and immediately registered with connected store APIs.
  - **Productivity-First Layout**: Streamlined 2-column workspace featuring instant copy, chat dispatch, composer insertion, and recent store promo codes history.

- **Customer E-Commerce Context & Cart Recovery**:
  - **Active Cart & Orders Panel**: Displays live customer cart items, item counts, totals, and complete order history directly in the customer detail sidebar.
  - **1-Click Cart Recovery**: Generates and inserts checkout recovery URLs directly into customer replies.

- **Design System Consistency & Minimal UI Refinement**:
  - **Strict Tab Bar Alignment**: Segmented modal switcher tabs strictly adhere to the WhatsOmni design language (`rounded-lg border border-[#E8E8E6]`, `shadow-3xs`, `flex-1` buttons, and count badges).
  - **Custom Dropdown Selector**: Integrated the platform's portaled `DropdownSelect` component for promo code selection with clear badges and smooth viewport positioning.
  - **Clean Badge Architecture**: Removed redundant status chips (`Connected`, `Live Store`, `Active`), keeping the interface professional, minimal, and typography-focused.

---

## [Version 2.4.2] — 2026-10-01

### 📦 Unified E-Commerce Orders Management & Real-Time Store Sync

WhatsOmni 2.4.2 introduces the new **Orders** module under the `E-COMMERCE` navigation hub, enabling real-time synchronization, tracking, and customer linkage for connected Shopify and WooCommerce stores:

- **Dedicated Orders Workspace (`/ecommerce/orders`)**:
  - **Sidebar & Navigation Integration**: Added `Orders` with direct top bar title binding and full internationalization keys.
  - **Standard Action Bar**: Real-time search across order numbers, customer names, emails, and tracking numbers; multi-store filter; payment status filter (`Paid`, `Pending`, `Refunded`); and fulfillment status filter (`Fulfilled`, `Processing`, `Unfulfilled`).
  - **Enterprise Orders Datatable**: Displays order numbers, placement dates, customer info with automatic CRM contact matching badges, storefront platform icons, item counts, total order values, and color-coded status pills.
  - **Interactive Order Detail Modal**: Complete order inspection modal showing customer profile, shipping and billing addresses, tracking number with carrier dispatch links, line items table (SKU, unit price, quantity, totals), and financial breakdowns (subtotal, tax, discounts, total).
  - **On-Demand & Background Sync**: 1-click order sync dispatcher with background scheduling via `SyncEcommerceCatalogJob`.

- **Database Architecture & Model Enhancements**:
  - **Enhanced Migration (`ecommerce_orders`)**: Added `customer_name`, `currency`, `subtotal_price`, `total_tax`, `total_discounts`, `items_count`, `line_items`, `shipping_address`, `billing_address`, `status`, `metadata`, `contact_id`, and `softDeletes`.
  - **Model & API Endpoints**: Enhanced [`EcommerceOrder`](file:///Users/neerajyadav/Documents/WhatsOmni/backend/app/Models/EcommerceOrder.php) with relationships to `EcommerceConnection` and `Contact`. Registered endpoints for `/api/ecommerce/orders`, `/api/ecommerce/orders/{id}`, `/api/ecommerce/orders/sync`, and order deletion.

---

## [Version 2.4.1] — 2026-10-01

### 🔐 OAuth 2.0 & 1-Click Store Integrations for Shopify & WooCommerce

WhatsOmni 2.4.1 introduces official **OAuth 2.0** and **1-Click REST API Authorization** for both Shopify and WooCommerce store connections:

- **Shopify Official OAuth 2.0 Integration**:
  - **1-Click Store Authorization**: Dispatches to `https://{shop}/admin/oauth/authorize` with preconfigured permissions (`read_products,write_products,read_orders,read_customers,read_checkouts,read_inventory,read_draft_orders`).
  - **AES-256 Tamper-Proof State & Nonce Token**: State payloads are encrypted with Laravel's `Crypt::encryptString` containing tenant ID, shop domain, and expiry timestamp to prevent CSRF and session hijacking.
  - **HMAC Signature Verification & Token Exchange**: Securely exchanges authorization codes at `/admin/oauth/access_token` for permanent offline access tokens and automatically provisions store connections.
  - **Automatic Catalog Synchronization**: Dispatches background `SyncEcommerceCatalogJob` immediately upon OAuth callback completion.

- **WooCommerce 1-Click REST API Auth Flow**:
  - **Standardized WooCommerce Auth Protocol**: Connects to `https://{store}/wc-auth/v1/authorize` with automated app name, `read_write` scope, state token, callback and return URLs.
  - **Secure Key Exchange Callback**: Captures generated `consumer_key` and `consumer_secret` via direct encrypted callback, registers connection, and begins immediate catalog synchronization.

- **Enhanced Store Connection Modal & User Interface**:
  - **Unified OAuth 2.0 Primary Flow**: Clear 1-click authorization buttons with platform badges and live permission summaries.
  - **Advanced Manual API Keys Fallback**: Toggle to input custom app Admin API tokens or consumer key/secret pairs when working with non-public staging environments.
  - **Seamless Callback Feedback**: Automatic toast notification and clean URL rewriting upon OAuth return.

---

## [Version 2.4.0] — 2026-09-30

### 🛍️ WhatsOmni 2.4.0 — Dedicated E-Commerce Hub, Store Connections & Real-Time Product Catalog Sync Engine

WhatsOmni 2.4.0 elevates E-Commerce to a first-class citizen with a dedicated **E-Commerce** platform module, elevating Shopify and WooCommerce store connections into a unified commerce hub with automated catalog synchronization, persistent database storage, multi-filter catalog inspection, and AI RAG knowledge embedding:

- **Dedicated E-Commerce Navigation & Platform Architecture**:
  - **New Primary Sidebar Section**: Introduced the dedicated `E-COMMERCE` navigation group with two specialized modules:
    - **Stores (`/ecommerce/stores`)**: Multi-store connection management for Shopify and WooCommerce with real-time health indicators, webhook configuration, and catalog synchronization controls.
    - **Products (`/ecommerce/products`)**: Centralized catalog explorer with real-time search, multi-store filtering, stock status indicators, dual grid/table view modes, and full product variant/image inspection.
  - **Decoupled from General Integrations**: Removed Shopify and WooCommerce cards from the general `/settings/integrations` page, adding an elegant cross-navigation notice directing users to the new E-Commerce hub.
  - **Seamless Route Handlers**: Added automatic root redirect from `/ecommerce` to `/ecommerce/stores`.

- **E-Commerce Stores Management Console (`/ecommerce/stores`)**:
  - **Active Stores Datatable & Action Bar**:
    - Real-time search by store URL or provider, status filtering, and refresh trigger.
    - Active connected storefronts table with authentic brand marks (Shopify and WooCommerce), live connection status badges (`Connected` with pulsing emerald indicator, `Syncing`, `Disconnected`), catalog counts, and last sync timestamp.
    - Webhook Ingress URL box with 1-click clipboard copy and masked/revealable signature secrets.
    - Ultra-clean and streamlined interface directly matching platform layout standards (e.g. Campaigns list).
  - **Store Connection Modal**:
    - Intuitive tab selector for Shopify and WooCommerce.
    - Shopify: Support for custom app Admin API Access Tokens (`shpat_...`) and API key/secret credentials.
    - WooCommerce: Support for REST API v3 Consumer Key and Consumer Secret credentials.
    - Automatic catalog sync dispatch immediately upon successful connection.
  - **Credentials Reconfiguration Modal**: Update API keys or tokens in-place without needing to disconnect and reconnect.
  - **Safe Disconnection Confirmation**: Protected store disconnect dialog warning of catalog removal and webhook cessation.

- **Unified Product Catalog & AI RAG Integration (`/ecommerce/products`)**:
  - **Inventory Metrics Snapshot**: Quick-stat cards for Total Products, In Stock items, Out of Stock items, and Connected Stores.
  - **Search & Multi-Filter Toolbar**:
    - Debounced full-text search querying product title, SKU, handle, and description.
    - Multi-store filter dropdown to isolate specific stores or view the unified catalog.
    - Stock inventory filter (`All Inventory`, `In Stock`, `Out of Stock`).
    - View mode switcher: High-density Visual Grid View vs Enterprise Data Table.
  - **Product Card & Row Design**:
    - Image thumbnails with automatic fallback state.
    - Store source badge (`Shopify` / `Woo`).
    - Dynamic stock availability pills (`X in stock` vs `Out of Stock`).
    - Pricing display with currency formatting and compare-at sale price strikethroughs.
    - Direct 1-click external link to live storefront item.
  - **Interactive Product Detail Modal**:
    - Multi-image gallery carousel.
    - Attribute summary grid (Price, Inventory, SKU, Platform).
    - Formatted product description viewer.
    - Variants breakdown table detailing variant titles, SKUs, prices, and stock units.
    - Category tag chips.
  - **Manual Catalog Synchronization**: 1-click on-demand catalog sync dispatch across all connected stores.

- **Backend Architecture & Database Persistence**:
  - **Dedicated Database Migration (`ecommerce_products`)**:
    - Created `ecommerce_products` table partitioned by `tenant_id` and linked to `ecommerce_connections`.
    - Stores `external_product_id`, `title`, `handle`, `description`, `price`, `compare_at_price`, `currency`, `sku`, `stock_quantity`, `status`, `image_url`, `images` (JSON), `variants` (JSON), `categories` (JSON), `external_url`, `metadata` (JSON), and `softDeletes`.
  - **Eloquent Models & Relationships**:
    - Created `EcommerceProduct` model with `BelongsToTenant`, `SoftDeletes`, and relational link to `EcommerceConnection`.
    - Enhanced `EcommerceConnection` with `products()` and `abandonedCarts()` relations.
  - **Enhanced Catalog Sync Job (`SyncEcommerceCatalogJob`)**:
    - Automatically parses products from Shopify REST/GraphQL & WooCommerce REST API.
    - Upserts structured product records into the `ecommerce_products` table.
    - Vectorizes catalog content into `RagKnowledgeChunk` embeddings for AI Sales Agents to answer shopper questions with precise prices and inventory levels.
  - **Dedicated API Routing (`routes/api.php`)**:
    - Added dedicated `/api/ecommerce/*` routes for stores (`GET/POST/PUT/DELETE/SYNC`) and products (`GET/DELETE/SYNC`), maintaining legacy backward compatibility.

- **Platform Design Language & Consistency**:
  - Full dark and light theme consistency (`dark:bg-zinc-900`, `dark:border-zinc-800`).
  - Standardized micro-shadows (`shadow-3xs`, `shadow-sm`), rounded borders (`rounded-xl`), and typography tokens.
  - Portal-based modal dialog architecture (`createPortal`) matching platform dialog conventions.
  - Toast feedback powered by `sonner`.

---

## [Version 2.3.0] — 2026-09-30

### 🎠 WhatsOmni 2.3.0 — WhatsApp Carousel Message Templates & Mixed Button Action Sets

WhatsOmni 2.3.0 introduces enterprise support for **WhatsApp Carousel Message Templates** and **WhatsApp Mixed Button Templates**, bringing interactive multi-card product showcases and versatile mixed-action messaging directly into the visual template builder, Meta API submission pipeline, and broadcast campaign dispatcher:

- **WhatsApp Carousel Message Templates (`/templates`)**:
  - **Multi-Card Visual Builder**: Interactive builder supporting 2 to 10 sequential carousel cards per Meta Graph API specifications with dynamic card insertion, deletion, and real-time validation.
  - **Per-Card Rich Media Headers**: Configurable `IMAGE` or `VIDEO` headers for each individual card with automatic fallback handling.
  - **Per-Card Body Text & Action Buttons**: Custom descriptive text and up to 2 action buttons per card (`Quick Reply`, `Website URL`, `Phone Call`).
  - **Real-Time Interactive Swiper Mockup**: Live WhatsApp chat phone simulation featuring interactive slide navigation (`<` / `>`), active card pagination indicator pills, smooth transitions, and instant button interaction previews.
  - **Meta Graph API Compliant Payload Engine**: Direct template compilation and submission to Meta Graph API (`POST /{waba_id}/message_templates`) with structured `CAROUSEL` and `cards` component serialization.

- **WhatsApp Mixed Button Templates (Official Meta Multi-Action Guidelines)**:
  - **Full Mixed Action Support**: Allows combining multiple button types simultaneously in a single WhatsApp template without either/or restrictions, strictly complying with Meta Graph API limits:
    - `QUICK_REPLY` (up to 3 buttons)
    - `URL` / Website Redirection (up to 2 buttons)
    - `PHONE_NUMBER` / Direct Voice Call (up to 1 button)
    - `COPY_CODE` / Promo & Coupon Code Clipboard (up to 1 button)
    - Total button limit: up to 10 buttons per template.
  - **Interactive Button Builder Toolbar**: Dedicated action buttons for adding `+ Quick Reply`, `+ Website URL`, `+ Phone Number`, and `+ Copy Code` with dynamic per-type limit enforcement and toast alerts.
  - **Interactive Card Editor**: Distinct color-accented cards (Emerald for Quick Reply, Sky for URL, Amber for Phone, Purple for Copy Code) with dedicated fields for Coupon Code, Phone Number, URL, and Button Label.
  - **Real-Time WhatsApp Preview Bubble**: Chat bubble preview dynamically rendering specialized action icons (`Link2`, `Phone`, `Copy`, `MessageSquare`) and badge indicators.

- **Outbound Campaign Broadcast Engine (`SendCampaignMessageJob`)**:
  - **Meta Cloud API Templates**: Automated dispatch of approved Carousel and Mixed Button templates with contact variable interpolation (`{{1}}`, `first_name`).
  - **Omnichannel Plain-Text Bypass**: Formatted text-based fallbacks with card summaries (`📍 Card 1`, `📍 Card 2`) and styled button action rows (`🌐 Visit`, `📞 Call`, `✂️ Promo Code`, `💬 Reply`) for Baileys, SMS, and mock drivers.

- **Full Multi-Language Localization (10 Supported Locales)**:
  - Synchronized all 165 `Templates` namespace translation keys across all 10 platform language dictionaries: English (`en`), Arabic (`ar`), Spanish (`es`), French (`fr`), Hebrew (`he`), Hindi (`hi`), Indonesian (`id`), Italian (`it`), Portuguese (`pt`), and Vietnamese (`vi`).

---

## [Version 2.2.0] — 2026-09-29

### 📱 WhatsOmni 2.2.0 — WhatsApp Flow Forms, Meta Review Sync, Shared Inbox & Automation Node Integration

WhatsOmni 2.2.0 introduces native enterprise support for **WhatsApp Flow Forms (Meta WhatsApp Flows)**, allowing businesses to create, visually customize, submit, review, and dispatch rich interactive native form flows inside WhatsApp, with real-time Meta approval synchronization, deep Shared Inbox integration, and dynamic Automation Visual Flow branching:

- **WhatsApp Flows Designer & Form Builder (`/whatsapp-flows`)**:
  - **Visual Form Designer**: Multi-screen form builder supporting text fields, emails, phone numbers, textareas, single-choice dropdowns, radio groups, checkboxes, and rating stars.
  - **Pre-Built Industry Blueprints**: Instant 1-click starter blueprints for *Appointment Booking*, *Lead Generation / Quotation*, *Customer Feedback & CSAT*, and *Customer Support Ticket / Bug Report*.
  - **Live WhatsApp Phone Mockup**: Real-time simulated phone viewport updating dynamically as fields and labels are adjusted.
  - **Meta Review & Sync Engine**:
    - Direct submission to Meta Graph API (`POST /{waba_id}/flows`, assets publishing, and validation).
    - Status badges tracking: `DRAFT`, `SUBMITTED` / `IN_REVIEW`, `PUBLISHED`, `REJECTED`, `DEPRECATED`.
    - 1-click status synchronization with Meta Graph API (`/api/whatsapp-flows/{id}/sync-status`).
    - Deprecation management (`/api/whatsapp-flows/{id}/deprecate`).
  - **Submissions Data Inspector**:
    - Filterable table displaying all customer submissions with completion timestamps and channel details.
    - Expandable submission drawer showing structured questions and responses.
    - Instant CSV Export of form entries for offline reporting and CRM enrichment.
  - **Interactive Test Send Sandbox**: Test form dispatch to any phone number directly from the dashboard.
  - **Platform Design Language & Consistency**:
    - Integrated with `useHeaderStore` to synchronize the global top bar (`<- Back to WhatsApp Flows`, flow name, `Cancel`, `Templates`, `Save Changes`, `Submit to Meta`), eliminating duplicate sub-headers.
    - Standardized two-column composer layout with `divide-y divide-[#E8E8E6]` section dividers matching `templates` and `social-posts`.
    - Edge-to-edge realtime preview viewport covering 100% of available space (`h-[calc(100vh-4rem)]`), removing outer device frames and title/description chips for a clean, distraction-free live simulation with optimized 4-column / 3-column responsive width.
    - Unified button design hierarchy across designer, component palette, field cards, and all 5 modals with consistent sizing (`h-8`), standardized radius (`rounded-[6px]`), font tokens (`text-xs font-semibold`), and micro-shadows (`shadow-3xs`).
  - **Full Multi-Language Localization (10 Supported Locales)**:
    - Added comprehensive `WhatsAppFlows` namespace (143 translation keys) and `Navigation.whatsappFlows` to all 10 platform language dictionaries: English (`en`), Arabic (`ar`), Spanish (`es`), French (`fr`), Hebrew (`he`), Hindi (`hi`), Indonesian (`id`), Italian (`it`), Portuguese (`pt`), and Vietnamese (`vi`).
    - Localized all UI elements in `/whatsapp-flows` and `/inbox` including visual designer composer, screen configuration, component palette, live preview simulator, search and category filters, data table headers, submission counters, action modals, and dynamic toast notifications.

- **Shared Inbox Integration (`/inbox`)**:
  - **Interactive Message Card Rendering**: Outbound WhatsApp Flow messages render in the chat thread with flow category badge, header, body text, optional footer, and a realistic `Open Form` CTA button preview.
  - **Structured Inbound Form Responses**: When a customer completes a form on WhatsApp (`nfm_reply`), the inbound message displays a distinct emerald-accented submission card with structured question-answer badge grids.
  - **Composer Toolbar Action Button**: Added `FormInput` button in the inbox composer toolbar opening the "Send WhatsApp Flow Form" modal with live flow preview and message customization.

- **Visual Automations Flow Builder Node (`/flows/[id]/edit`)**:
  - **New Visual Node**: `whatsapp_flow` / `WhatsApp Flow Form` registered under the Communication group in the flow builder catalog with emerald `#10B981` styling.
  - **Dual Output Branch Handles**:
    - `Next (out)`: Immediate continuation for non-blocking broadcasts.
    - `Form Submitted (on_submit)`: Executes when customer completes and submits the form.
  - **Workflow Context Injection**: Form answers are automatically extracted and injected into the execution context (`flow_answers`, `flow_*`) for downstream branching, tags, CRM deals, and webhooks.
  - **Wait-for-Submission Toggle**: Automatically pauses the flow runner in `paused_waiting_reply` until the customer submits the flow form, then resumes execution from the `on_submit` branch.

- **Backend Architecture & Webhooks (`WhatsAppCloudApiDriver` & `ProcessInboundMessageJob`)**:
  - Outbound interactive `type: 'flow'` message payload construction with header, body, footer, parameters, and action tokens.
  - Inbound webhook normalization of interactive `nfm_reply` responses into `flow_response` message types with auto-parsed answers saved in message metadata.
  - Automatic `WhatsAppFlowSubmission` recording and real-time counter incrementing.

---

## [Version 2.1.0] — 2026-09-27

### ⚡ WhatsOmni 2.1.0 — Omnichannel Quick Replies & Automated Keyword Trigger Answers

WhatsOmni 2.1.0 introduces **Quick Replies & Canned Answers**, an essential customer support and automation capability for fast agent replies and automated instant customer answers across all communication channels:

- **Platform-Consistent Dialog Modal & Directory Architecture (`/quick-replies`)**:
  - Re-architected Quick Reply creation and editing to use the platform-consistent **Dialog Modal** directly over the Directory DataTable.
  - Easy and user-friendly dialog creation flow:
    - Row 1: Reply Name / Title and Shortcut command (`/shortcut` auto-prefixing).
    - Row 2: Interactive Keyword Chips with Enter/comma adding and 1-click pre-built suggestions (`+pricing`, `+support`, `+hours`, `+refund`, etc.).
    - Row 3: Trigger Match Type selector (`Contains Keywords`, `Exact Match Only`, `Starts With Keyword`) and Target Channel scope (`All Channels` vs. visual channel brand pills).
    - Row 4: Reply Message textarea with 1-click dynamic variable insertion chips (`{contact_name}`, `{first_name}`, `{phone}`, `{email}`, `{company_name}`).
    - Row 5: Media Attachment uploader (Image, Video, PDF) and Inbound Auto-Reply toggle switch.
    - Real-Time Live Message Preview toggle: customer speech balloon and rendered agent/bot reply mockup.
  - Unified directory datatable (`border-[#E8E8E6]`, `bg-zinc-50` header, and `#FAFAFA` hover) with columns for Shortcut, Triggers, Response Preview, Target Channels, Usage, Status Toggle, and Action Buttons (Edit, Delete).
  - Standard DialogModals for Quick Reply Creation/Editing, Status Toggling, and Permanent Deletion confirmations.

- **Automated Inbound Message Execution Engine (`ProcessInboundMessageJob`)**:
  - Intelligent priority routing for incoming customer webhooks:
    - Priority 1: Human Agent assigned $\rightarrow$ pause bot automations.
    - Priority 2: Inbound Visual Flows.
    - Priority 3: Active Automated Quick Replies matching trigger words.
    - Priority 4: Direct AI ChatBots & RAG Knowledge Base.
    - Priority 5: Legacy AI Agents.
  - Dynamic contact variable interpolation (`{first_name}`, `{name}`, `{email}`, `{phone}`).
  - Outbound dispatch through connected channel driver with real-time WebSocket broadcast (`MessageReceivedEvent`).

- **Shared Inbox Shortcut Commands & Space-Expansion Engine (`/inbox`)**:
  - Instant shortcut command expansion: typing any `/shortcut` (e.g., `/pricing`, `/support`, `/hours`, `/refund`) in the message composer and pressing **Space** instantly replaces the command token with the complete canned response.
  - Dynamic Contact & Workspace Variable Interpolation: automatically fills `{first_name}`, `{last_name}`, `{contact_name}`, `{email}`, `{phone}`, `{company_name}`, `{agent_name}` based on the active conversation's contact and tenant channel.
  - Floating Autocomplete Suggestion Popover: triggers live as agents type `/...` in the textarea, featuring keyboard navigation (`↑`/`↓` arrows, `Tab`, `Enter`, `Space`, `Esc`), shortcut badge highlights, and response previews.
  - Quick reply button popover in composer toolbar with search filter and 1-click insertion.

- **Full Native Localization**:
  - Complete native translations across all 10 platform languages: English, Hindi, Spanish, Arabic, French, Hebrew, Indonesian, Italian, Portuguese, and Vietnamese.

---

## [Version 2.0.0] — 2026-09-26

<div align="center">
  <img src="./paddle_logo.png" alt="Paddle Billing Integration" width="220" />
  <h3>🚀 WhatsOmni 2.0.0 — Next-Gen Omnichannel Platform & Paddle Billing Integration</h3>
</div>

### 🌟 Major Release Highlights

---

### 💳 1. Paddle Billing Payment Gateway Integration (Paddle.js v2 SDK)

WhatsOmni 2.0 introduces native enterprise support for **Paddle Billing**, enabling global SaaS subscription management, tax compliance, and seamless multi-currency billing:

- **Paddle Gateway Driver (`PaddleGatewayDriver`)**:
  - Full implementation of `PaymentGatewayInterface` with end-to-end sandbox and production environment support.
  - Automatic creation and synchronization of Products and recurring Prices in Paddle directly from WhatsOmni pricing tiers.
  - Customer entity mapping (`paddle_customer_id`) and subscription tracking (`paddle_subscription_id`).

- **Paddle.js v2 In-App Overlay Checkout**:
  - Zero-redirect client-side checkout overlay powered by Paddle.js v2 SDK (`https://cdn.paddle.com/paddle/v2/paddle.js`).
  - Seamless in-app subscription flow without taking customers away from the tenant workspace.

- **Global Transaction Listener (`<PaddleGlobalCheckout />`)**:
  - Global URL parameter detection for `_ptxn` / `paddle_transaction_id` across all platform pages (landing pages, dashboard, pricing, billing settings).
  - Automatic checkout overlay opening when returning from default payment links or external redirects.
  - Real-time event listener capturing `checkout.completed` and triggering automatic subscription activation.

- **Automated Verification & Webhook Ingress (`/api/webhooks/billing/paddle`)**:
  - Real-time transaction verification endpoint (`/api/billing/paddle/verify` & `/api/public/billing/paddle/verify`).
  - Secure HMAC SHA-256 webhook signature verification via `Paddle-Signature` header.
  - Complete subscription lifecycle handling (`subscription.activated`, `subscription.updated`, `subscription.canceled`, `subscription.past_due`, `transaction.completed`).

- **Super Admin Gateway Management UI**:
  - Dedicated configuration module in Super Admin Panel (`/superadmin/settings/payment-gateways`) for Paddle.
  - Live/Sandbox toggle, API Key, Client-Side Token, Webhook Secret, and live connection testing tool.
  - Full localization in 10 languages for all Paddle settings and modal dialogs.

- **Official Paddle Branding & UI Assets**:
  - Integrated official Paddle branding (`paddle_logo.png` / `paddle.png`) into Super Admin, Tenant billing views, currency selectors, and documentation.

---

### 🌍 2. Multi-Payment Gateway Architecture & Intelligent Currency Routing

- **Expanded Gateway Matrix**:
  - Now supporting **Paddle**, **Stripe**, **Razorpay**, **Paystack**, **Flutterwave**, and **PayPal**.
- **GeoIP Currency & Gateway Binding**:
  - Automatic currency detection based on client IP / GeoIP.
  - Ability to bind specific currencies directly to preferred payment gateways (e.g., INR to Razorpay, USD to Paddle/Stripe, NGN to Paystack/Flutterwave).
- **Flexible Billing Intervals**:
  - Support for monthly, annual, semi-annual, and custom plan pricing intervals with prorated upgrades and downgrades.

---

### 💬 3. WhatsApp Multi-Device (Baileys) & Omnichannel Core

- **Baileys Worker Microservice Engine**:
  - Persistent WhatsApp Web Multi-Device socket management with real-time QR stream generation.
  - Auto-reconnection logic, session health monitors, and background worker state recovery.
- **Unified Real-time Shared Inbox**:
  - Bi-directional messaging powered by Laravel Reverb WebSockets.
  - Multi-agent collaboration, assignment rules, conversation tagging, and real-time typing indicators.

---

### 🤖 4. AI Chatbots, Autonomous Agents & Visual Automation Flow

- **Dual AI Operational Architecture**:
  - **BYOK (Bring Your Own Key)**: Tenants can configure their own LLM API keys.
  - **Master Vault**: SaaS Admin can provide pooled AI credits across models.
- **Supported AI Providers**:
  - OpenAI (GPT-4o, GPT-4o-mini), Anthropic Claude 3.5 Sonnet, Google Gemini 2.0 / 1.5, DeepSeek, Groq, Mistral, and local Ollama instances.
- **RAG Knowledge Base**:
  - Vector document indexing, text chunking, and contextual semantic search for AI customer support agents.
- **Prompt-to-Flow Visual Automation**:
  - Interactive drag-and-drop canvas with conditional nodes, AI prompt nodes, webhook dispatchers, and delay timers.

---

### 📊 5. CRM Deals Pipeline & Appointment Booking System

- **Kanban Sales Pipeline**:
  - Customizable stages, deal value calculations, lead source tracking, and contact association.
- **Staff Calendar & Meeting Booking**:
  - Public booking links with automated conflict detection.
  - Two-way synchronization with **Google Calendar**, **Zoom**, and **Microsoft Teams**.

---

### 🌐 6. Complete 10-Language Internationalization (LTR & RTL)

- Full native translations across all Tenant and Super Admin interfaces:
  - 🇺🇸 English (`en`)
  - 🇪🇸 Spanish (`es`)
  - 🇸🇦 Arabic (`ar` - RTL)
  - 🇮🇱 Hebrew (`he` - RTL)
  - 🇮🇳 Hindi (`hi`)
  - 🇫🇷 French (`fr`)
  - 🇩🇪 German (`de`)
  - 🇮🇹 Italian (`it`)
  - 🇵🇹 Portuguese (`pt`)
  - 🇮🇩 Indonesian (`id`)
  - 🇻🇳 Vietnamese (`vi`)

---

### 🧪 7. Automated Testing & Reliability

- **100% Passing Feature Test Suites**:
  - `Tests\Feature\PaddleBillingTest` (8 tests, 38 assertions).
  - `Tests\Feature\BillingTest` (Stripe, Razorpay, Paystack, Flutterwave, PayPal).
  - `Tests\Feature\SecurityHardeningAndAuditTest`.
  - Zero TypeScript compilation errors (`npx tsc --noEmit`).

---

## [Version 1.0.0] — 2026-09-01

- Initial release of WhatsOmni multi-tenant SaaS platform.
- Multi-tenant database architecture with automated tenant subdomains.
- Baileys WhatsApp integration & Meta Cloud API connectivity.
- Visual flow builder & AI chatbot core.
- Stripe & Razorpay recurring billing integrations.
- Super Admin plane for tenant provisioning, plan management, and platform analytics.
