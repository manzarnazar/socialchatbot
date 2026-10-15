<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\FlowTemplate;

class FlowTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $templates = [
            [
                'slug' => 'lead_qualification',
                'name' => 'Smart Lead Qualification & CRM Sync',
                'category' => 'Sales & Growth',
                'description' => 'Automated conversational lead triage, budget assessment, CRM deal creation, and VIP tagging.',
                'trigger_type' => 'inbound_message',
                'trigger_keywords' => ['quote', 'price', 'pricing', 'hire', 'service', 'lead'],
                'sort_order' => 1,
                'is_published' => true,
                'definition' => [
                    'nodes' => [
                        [
                            'id' => 'trigger_1',
                            'type' => 'inbound_message',
                            'position' => ['x' => 380, 'y' => 50],
                            'data' => ['title' => 'Inbound Lead Trigger', 'channel' => 'all', 'keyword' => 'quote, price, pricing, hire', 'is_root_trigger' => true]
                        ],
                        [
                            'id' => 'msg_welcome',
                            'type' => 'send_message',
                            'position' => ['x' => 380, 'y' => 180],
                            'data' => ['title' => 'Welcome Greeting', 'body' => "Hello! 👋 Thank you for contacting us. Let's find the perfect solution for your business!"]
                        ],
                        [
                            'id' => 'ask_name',
                            'type' => 'ask_question',
                            'position' => ['x' => 380, 'y' => 310],
                            'data' => ['title' => 'Ask Full Name', 'question' => 'Could you please share your full name?', 'questionText' => 'Could you please share your full name?', 'saveVariable' => 'lead_name', 'saveVariableLabel' => 'Lead Name', 'variableDataType' => 'text']
                        ],
                        [
                            'id' => 'ask_budget',
                            'type' => 'ask_question',
                            'position' => ['x' => 380, 'y' => 450],
                            'data' => ['title' => 'Ask Monthly Budget', 'question' => "What is your estimated monthly budget for this project (in USD)?\n(e.g., 500, 1500, 5000)", 'questionText' => "What is your estimated monthly budget for this project (in USD)?\n(e.g., 500, 1500, 5000)", 'saveVariable' => 'lead_budget', 'saveVariableLabel' => 'Lead Budget', 'variableDataType' => 'number']
                        ],
                        [
                            'id' => 'cond_budget',
                            'type' => 'condition',
                            'position' => ['x' => 380, 'y' => 600],
                            'data' => ['title' => 'Budget >= $1,000?', 'operator' => 'AND', 'conditions' => [['field' => 'variables.lead_budget', 'operator' => 'greater_than_or_equal', 'value' => '1000']]]
                        ],
                        [
                            'id' => 'deal_vip',
                            'type' => 'create_deal',
                            'position' => ['x' => 180, 'y' => 750],
                            'data' => ['title' => 'Create VIP Deal', 'dealName' => 'VIP Sales Opportunity', 'dealValue' => 2500, 'stageId' => 'qualified', 'currency' => 'USD']
                        ],
                        [
                            'id' => 'tag_vip',
                            'type' => 'tag_contact',
                            'position' => ['x' => 180, 'y' => 890],
                            'data' => ['title' => 'Tag VIP Lead', 'tagAction' => 'add_tag', 'targetTag' => 'vip-qualified']
                        ],
                        [
                            'id' => 'msg_vip',
                            'type' => 'send_message',
                            'position' => ['x' => 180, 'y' => 1020],
                            'data' => ['title' => 'VIP Fast-Track Note', 'body' => "Excellent, {{variables.lead_name}}! 🎉 Your project fits our Enterprise tier. A senior specialist is reviewing your details and will call you within 15 minutes."]
                        ],
                        [
                            'id' => 'tag_standard',
                            'type' => 'tag_contact',
                            'position' => ['x' => 580, 'y' => 750],
                            'data' => ['title' => 'Tag Standard Lead', 'tagAction' => 'add_tag', 'targetTag' => 'standard-lead']
                        ],
                        [
                            'id' => 'msg_standard',
                            'type' => 'send_message',
                            'position' => ['x' => 580, 'y' => 890],
                            'data' => ['title' => 'Standard Catalog Note', 'body' => "Thank you, {{variables.lead_name}}! We have sent our starter catalog and pricing guide. Let us know if you have any questions!"]
                        ],
                        [
                            'id' => 'end_node',
                            'type' => 'end_flow',
                            'position' => ['x' => 380, 'y' => 1180],
                            'data' => ['title' => 'Conclude Journey', 'body' => 'Lead qualification complete.']
                        ]
                    ],
                    'edges' => [
                        ['id' => 'e1', 'source' => 'trigger_1', 'target' => 'msg_welcome', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e2', 'source' => 'msg_welcome', 'target' => 'ask_name', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e3', 'source' => 'ask_name', 'target' => 'ask_budget', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e4', 'source' => 'ask_budget', 'target' => 'cond_budget', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e5', 'source' => 'cond_budget', 'target' => 'deal_vip', 'sourceHandle' => 'true', 'targetHandle' => 'in'],
                        ['id' => 'e6', 'source' => 'deal_vip', 'target' => 'tag_vip', 'sourceHandle' => 'success', 'targetHandle' => 'in'],
                        ['id' => 'e7', 'source' => 'tag_vip', 'target' => 'msg_vip', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e8', 'source' => 'msg_vip', 'target' => 'end_node', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e9', 'source' => 'cond_budget', 'target' => 'tag_standard', 'sourceHandle' => 'false', 'targetHandle' => 'in'],
                        ['id' => 'e10', 'source' => 'tag_standard', 'target' => 'msg_standard', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e11', 'source' => 'msg_standard', 'target' => 'end_node', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                    ]
                ]
            ],
            [
                'slug' => 'welcome_menu',
                'name' => 'Interactive Welcome Menu with WhatsApp Quick Buttons',
                'category' => 'Engagement',
                'description' => 'Omnichannel greeting with interactive WhatsApp buttons/lists for instant booking, pricing lookup, and support.',
                'trigger_type' => 'inbound_message',
                'trigger_keywords' => ['hi', 'hello', 'start', 'menu', 'hey'],
                'sort_order' => 2,
                'is_published' => true,
                'definition' => [
                    'nodes' => [
                        [
                            'id' => 'trigger_1',
                            'type' => 'inbound_message',
                            'position' => ['x' => 380, 'y' => 50],
                            'data' => ['title' => 'Inbound Greeting Trigger', 'channel' => 'all', 'keyword' => 'hi, hello, start, menu', 'is_root_trigger' => true]
                        ],
                        [
                            'id' => 'msg_greet',
                            'type' => 'send_message',
                            'position' => ['x' => 380, 'y' => 180],
                            'data' => ['title' => 'Welcome Greeting', 'body' => "Welcome to WhatsOmni! 🚀 We're here to help you automate communications and accelerate your business."]
                        ],
                        [
                            'id' => 'menu_interactive',
                            'type' => 'interactive_menu',
                            'position' => ['x' => 380, 'y' => 320],
                            'data' => [
                                'title' => 'Main Options Menu',
                                'menuType' => 'list',
                                'buttonText' => 'View Services',
                                'body' => 'Please choose one of the options below to get started:',
                                'saveVariable' => 'user_choice',
                                'items' => [
                                    ['id' => 'item_0', 'title' => '📅 Book Consultation', 'description' => 'Schedule a live 1-on-1 strategy call', 'keywords' => '1, book', 'value' => 'book'],
                                    ['id' => 'item_1', 'title' => '💼 Plans & Pricing', 'description' => 'Explore packages and features', 'keywords' => '2, price', 'value' => 'pricing'],
                                    ['id' => 'item_2', 'title' => '💬 Live Agent Support', 'description' => 'Connect to our customer success team', 'keywords' => '3, support', 'value' => 'support'],
                                ]
                            ]
                        ],
                        [
                            'id' => 'book_appointment',
                            'type' => 'create_appointment',
                            'position' => ['x' => 100, 'y' => 520],
                            'data' => ['title' => 'Schedule Call', 'bookingDuration' => 30, 'calendarProvider' => 'built_in', 'conferenceProvider' => 'built_in']
                        ],
                        [
                            'id' => 'msg_booked',
                            'type' => 'send_message',
                            'position' => ['x' => 100, 'y' => 680],
                            'data' => ['title' => 'Booking Confirmed', 'body' => "Your consultation is reserved! 📅 Check your email and calendar for meeting details."]
                        ],
                        [
                            'id' => 'rag_pricing',
                            'type' => 'rag_query',
                            'position' => ['x' => 380, 'y' => 520],
                            'data' => ['title' => 'Pricing Knowledgebase', 'query' => 'Provide a clear summary of all our service plans and monthly pricing tiers.', 'saveKey' => 'pricing_info']
                        ],
                        [
                            'id' => 'msg_pricing',
                            'type' => 'send_message',
                            'position' => ['x' => 380, 'y' => 680],
                            'data' => ['title' => 'Send Pricing Info', 'body' => "Here is our current pricing overview:\n\n{{variables.pricing_info}}\n\nReply 'book' anytime to schedule a consultation!"]
                        ],
                        [
                            'id' => 'handoff_support',
                            'type' => 'human_handoff',
                            'position' => ['x' => 660, 'y' => 520],
                            'data' => ['title' => 'Transfer to Support Agent', 'queueTarget' => 'support_inbox', 'internalNote' => 'Customer selected Live Agent from Main Welcome Menu']
                        ],
                        [
                            'id' => 'end_menu',
                            'type' => 'end_flow',
                            'position' => ['x' => 240, 'y' => 840],
                            'data' => ['title' => 'Complete Session', 'body' => 'Thank you for chatting with us!']
                        ]
                    ],
                    'edges' => [
                        ['id' => 'e1', 'source' => 'trigger_1', 'target' => 'msg_greet', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e2', 'source' => 'msg_greet', 'target' => 'menu_interactive', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e3', 'source' => 'menu_interactive', 'target' => 'book_appointment', 'sourceHandle' => 'item_0', 'targetHandle' => 'in'],
                        ['id' => 'e4', 'source' => 'book_appointment', 'target' => 'msg_booked', 'sourceHandle' => 'scheduled', 'targetHandle' => 'in'],
                        ['id' => 'e5', 'source' => 'msg_booked', 'target' => 'end_menu', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e6', 'source' => 'menu_interactive', 'target' => 'rag_pricing', 'sourceHandle' => 'item_1', 'targetHandle' => 'in'],
                        ['id' => 'e7', 'source' => 'rag_pricing', 'target' => 'msg_pricing', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e8', 'source' => 'msg_pricing', 'target' => 'end_menu', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e9', 'source' => 'menu_interactive', 'target' => 'handoff_support', 'sourceHandle' => 'item_2', 'targetHandle' => 'in'],
                    ]
                ]
            ],
            [
                'slug' => 'booking_scheduler',
                'name' => 'Appointment Booking & Calendar Scheduler',
                'category' => 'Bookings',
                'description' => 'Collects topic preferences, checks slot availability, and books appointments directly to your calendar.',
                'trigger_type' => 'inbound_message',
                'trigger_keywords' => ['book', 'schedule', 'calendar', 'meeting', 'demo', 'call'],
                'sort_order' => 3,
                'is_published' => true,
                'definition' => [
                    'nodes' => [
                        [
                            'id' => 'trigger_1',
                            'type' => 'inbound_message',
                            'position' => ['x' => 380, 'y' => 50],
                            'data' => ['title' => 'Booking Keyword Trigger', 'channel' => 'all', 'keyword' => 'book, schedule, calendar, meeting, demo', 'is_root_trigger' => true]
                        ],
                        [
                            'id' => 'ask_topic',
                            'type' => 'ask_question',
                            'position' => ['x' => 380, 'y' => 180],
                            'data' => ['title' => 'Ask Consultation Topic', 'question' => "What would you like to focus on during our call?\n(e.g., Omnichannel CRM, WhatsApp API, AI ChatBots, Custom Integration)", 'questionText' => "What would you like to focus on during our call?\n(e.g., Omnichannel CRM, WhatsApp API, AI ChatBots, Custom Integration)", 'saveVariable' => 'call_topic', 'saveVariableLabel' => 'Call Topic', 'variableDataType' => 'text']
                        ],
                        [
                            'id' => 'book_slot',
                            'type' => 'create_appointment',
                            'position' => ['x' => 380, 'y' => 340],
                            'data' => ['title' => 'Book Google Calendar Slot', 'bookingDuration' => 30, 'calendarProvider' => 'google_calendar', 'conferenceProvider' => 'google_meet']
                        ],
                        [
                            'id' => 'deal_booking',
                            'type' => 'create_deal',
                            'position' => ['x' => 200, 'y' => 500],
                            'data' => ['title' => 'Log CRM Booking Deal', 'dealName' => 'Scheduled Demo Call', 'dealValue' => 750, 'stageId' => 'meeting_booked', 'currency' => 'USD']
                        ],
                        [
                            'id' => 'msg_success',
                            'type' => 'send_message',
                            'position' => ['x' => 200, 'y' => 650],
                            'data' => ['title' => 'Confirmation Notice', 'body' => "You're all set! 📅 Your session has been confirmed. A calendar invite with Google Meet link has been sent."]
                        ],
                        [
                            'id' => 'msg_retry',
                            'type' => 'send_message',
                            'position' => ['x' => 560, 'y' => 500],
                            'data' => ['title' => 'Slot Unavailable Message', 'body' => "That slot was just booked by another customer. Let's connect you directly with a coordinator to secure your spot."]
                        ],
                        [
                            'id' => 'handoff_booking',
                            'type' => 'human_handoff',
                            'position' => ['x' => 560, 'y' => 650],
                            'data' => ['title' => 'Live Booking Coordinator', 'queueTarget' => 'booking_team', 'internalNote' => 'Manual slot assistance needed for booking']
                        ]
                    ],
                    'edges' => [
                        ['id' => 'e1', 'source' => 'trigger_1', 'target' => 'ask_topic', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e2', 'source' => 'ask_topic', 'target' => 'book_slot', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e3', 'source' => 'book_slot', 'target' => 'deal_booking', 'sourceHandle' => 'scheduled', 'targetHandle' => 'in'],
                        ['id' => 'e4', 'source' => 'deal_booking', 'target' => 'msg_success', 'sourceHandle' => 'success', 'targetHandle' => 'in'],
                        ['id' => 'e5', 'source' => 'book_slot', 'target' => 'msg_retry', 'sourceHandle' => 'unavailable', 'targetHandle' => 'in'],
                        ['id' => 'e6', 'source' => 'msg_retry', 'target' => 'handoff_booking', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                    ]
                ]
            ],
            [
                'slug' => 'cart_recovery',
                'name' => 'E-Commerce Order Status & Abandoned Cart Recovery',
                'category' => 'E-Commerce',
                'description' => 'Timed abandoned cart follow-up with incentive discount codes and instant live checkout assistance.',
                'trigger_type' => 'ecommerceCheckoutAbandoned',
                'trigger_keywords' => ['cart', 'order', 'checkout', 'discount'],
                'sort_order' => 4,
                'is_published' => true,
                'definition' => [
                    'nodes' => [
                        [
                            'id' => 'trigger_1',
                            'type' => 'ecommerceCheckoutAbandoned',
                            'position' => ['x' => 380, 'y' => 50],
                            'data' => ['title' => 'Abandoned Cart Webhook', 'channel' => 'all', 'is_root_trigger' => true]
                        ],
                        [
                            'id' => 'wait_30m',
                            'type' => 'wait_delay',
                            'position' => ['x' => 380, 'y' => 180],
                            'data' => ['title' => 'Wait 30 Minutes', 'delayType' => 'duration', 'value' => 30, 'unit' => 'minutes']
                        ],
                        [
                            'id' => 'msg_cart',
                            'type' => 'send_message',
                            'position' => ['x' => 380, 'y' => 310],
                            'data' => ['title' => 'Cart Reminder', 'body' => "Hey there! 🛒 We noticed you left some amazing items in your cart. Would you like a 10% discount code to complete your order right now?"]
                        ],
                        [
                            'id' => 'menu_cart',
                            'type' => 'interactive_menu',
                            'position' => ['x' => 380, 'y' => 450],
                            'data' => [
                                'title' => 'Discount Offer Menu',
                                'menuType' => 'buttons',
                                'body' => 'Select an option below:',
                                'saveVariable' => 'cart_action',
                                'items' => [
                                    ['id' => 'item_0', 'title' => '🎁 Claim 10% Off', 'value' => 'discount'],
                                    ['id' => 'item_1', 'title' => '❓ I Need Help', 'value' => 'help'],
                                ]
                            ]
                        ],
                        [
                            'id' => 'tag_recovered',
                            'type' => 'tag_contact',
                            'position' => ['x' => 200, 'y' => 610],
                            'data' => ['title' => 'Tag Cart Recovered', 'tagAction' => 'add_tag', 'targetTag' => 'cart-incentivized']
                        ],
                        [
                            'id' => 'msg_promo',
                            'type' => 'send_message',
                            'position' => ['x' => 200, 'y' => 750],
                            'data' => ['title' => 'Send Discount Code', 'body' => "Awesome! Use promo code *SAVE10* at checkout to take 10% off your entire order:\n👉 https://yourstore.com/checkout"]
                        ],
                        [
                            'id' => 'handoff_cart',
                            'type' => 'human_handoff',
                            'position' => ['x' => 560, 'y' => 610],
                            'data' => ['title' => 'Checkout Support Agent', 'queueTarget' => 'sales_support', 'internalNote' => 'Customer requested help with abandoned cart checkout']
                        ]
                    ],
                    'edges' => [
                        ['id' => 'e1', 'source' => 'trigger_1', 'target' => 'wait_30m', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e2', 'source' => 'wait_30m', 'target' => 'msg_cart', 'sourceHandle' => 'resume', 'targetHandle' => 'in'],
                        ['id' => 'e3', 'source' => 'msg_cart', 'target' => 'menu_cart', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e4', 'source' => 'menu_cart', 'target' => 'tag_recovered', 'sourceHandle' => 'item_0', 'targetHandle' => 'in'],
                        ['id' => 'e5', 'source' => 'tag_recovered', 'target' => 'msg_promo', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e6', 'source' => 'menu_cart', 'target' => 'handoff_cart', 'sourceHandle' => 'item_1', 'targetHandle' => 'in'],
                    ]
                ]
            ],
            [
                'slug' => 'support_triage',
                'name' => 'Customer Support Triage with Human Agent Escalation',
                'category' => 'Customer Support',
                'description' => 'AI sentiment detection, knowledge base RAG query matching, and seamless escalation to human inbox agents.',
                'trigger_type' => 'inbound_message',
                'trigger_keywords' => ['help', 'issue', 'problem', 'support', 'broken', 'error'],
                'sort_order' => 5,
                'is_published' => true,
                'definition' => [
                    'nodes' => [
                        [
                            'id' => 'trigger_1',
                            'type' => 'inbound_message',
                            'position' => ['x' => 380, 'y' => 50],
                            'data' => ['title' => 'Support Entry Trigger', 'channel' => 'all', 'keyword' => 'help, issue, problem, support', 'is_root_trigger' => true]
                        ],
                        [
                            'id' => 'ask_issue',
                            'type' => 'ask_question',
                            'position' => ['x' => 380, 'y' => 180],
                            'data' => ['title' => 'Ask Issue Description', 'question' => "Hello! Our support team is ready to assist. Please describe what you're experiencing in detail:", 'questionText' => "Hello! Our support team is ready to assist. Please describe what you're experiencing in detail:", 'saveVariable' => 'issue_desc', 'saveVariableLabel' => 'Issue Description', 'variableDataType' => 'text']
                        ],
                        [
                            'id' => 'ai_sentiment',
                            'type' => 'ai_condition',
                            'position' => ['x' => 380, 'y' => 330],
                            'data' => ['title' => 'Is Issue Urgent / Critical?', 'question' => 'Is the customer reporting a critical bug, payment blockage, server downtime, or expressing high frustration/anger?', 'contentKey' => '{{variables.issue_desc}}', 'model' => 'gpt-4o-mini']
                        ],
                        [
                            'id' => 'tag_urgent',
                            'type' => 'tag_contact',
                            'position' => ['x' => 180, 'y' => 500],
                            'data' => ['title' => 'Tag Urgent Priority', 'tagAction' => 'add_tag', 'targetTag' => 'priority-urgent']
                        ],
                        [
                            'id' => 'msg_urgent',
                            'type' => 'send_message',
                            'position' => ['x' => 180, 'y' => 640],
                            'data' => ['title' => 'Urgent Notification', 'body' => "We understand this is critical. 🚨 Connecting you immediately with our Priority Escalation team..."]
                        ],
                        [
                            'id' => 'handoff_urgent',
                            'type' => 'human_handoff',
                            'position' => ['x' => 180, 'y' => 780],
                            'data' => ['title' => 'Priority Queue Handoff', 'queueTarget' => 'priority_inbox', 'internalNote' => 'Urgent priority issue flagged by AI Sentiment triage']
                        ],
                        [
                            'id' => 'rag_search',
                            'type' => 'rag_query',
                            'position' => ['x' => 580, 'y' => 500],
                            'data' => ['title' => 'Search Knowledgebase', 'query' => '{{variables.issue_desc}}', 'saveKey' => 'kb_solution']
                        ],
                        [
                            'id' => 'msg_kb',
                            'type' => 'send_message',
                            'position' => ['x' => 580, 'y' => 640],
                            'data' => ['title' => 'Send Suggested Solution', 'body' => "Here is what our system found to help resolve your issue:\n\n{{variables.kb_solution}}\n\nDid this solve your problem? Reply 'yes' or 'agent' if you still need assistance."]
                        ],
                        [
                            'id' => 'end_support',
                            'type' => 'end_flow',
                            'position' => ['x' => 580, 'y' => 780],
                            'data' => ['title' => 'Session Resolved', 'body' => 'Support triage concluded.']
                        ]
                    ],
                    'edges' => [
                        ['id' => 'e1', 'source' => 'trigger_1', 'target' => 'ask_issue', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e2', 'source' => 'ask_issue', 'target' => 'ai_sentiment', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e3', 'source' => 'ai_sentiment', 'target' => 'tag_urgent', 'sourceHandle' => 'yes', 'targetHandle' => 'in'],
                        ['id' => 'e4', 'source' => 'tag_urgent', 'target' => 'msg_urgent', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e5', 'source' => 'msg_urgent', 'target' => 'handoff_urgent', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e6', 'source' => 'ai_sentiment', 'target' => 'rag_search', 'sourceHandle' => 'no', 'targetHandle' => 'in'],
                        ['id' => 'e7', 'source' => 'rag_search', 'target' => 'msg_kb', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                        ['id' => 'e8', 'source' => 'msg_kb', 'target' => 'end_support', 'sourceHandle' => 'out', 'targetHandle' => 'in'],
                    ]
                ]
            ],
        ];

        foreach ($templates as $data) {
            FlowTemplate::updateOrCreate(
                ['slug' => $data['slug']],
                $data
            );
        }
    }
}
