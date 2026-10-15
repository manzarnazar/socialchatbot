<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\WhatsAppFlow;
use App\Models\WhatsAppFlowSubmission;
use App\Models\ChannelConnection;
use App\Models\Conversation;
use App\Models\Contact;
use App\Models\Message;
use App\Services\Channels\ChannelManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Exception;

class WhatsAppFlowController extends Controller
{
    /**
     * List all WhatsApp Flows for tenant with stats.
     */
    public function index(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        $query = WhatsAppFlow::where('tenant_id', $tenantId)
            ->with(['channelConnection:id,name,channel_type,status']);

        if ($request->filled('status')) {
            $query->where('status', strtoupper($request->query('status')));
        }

        if ($request->filled('channel_connection_id')) {
            $query->where('channel_connection_id', $request->query('channel_connection_id'));
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('meta_flow_id', 'like', "%{$search}%");
            });
        }

        $flows = $query->withCount('submissions')->latest()->get();

        // Platform Statistics
        $totalFlows = WhatsAppFlow::where('tenant_id', $tenantId)->count();
        $publishedFlows = WhatsAppFlow::where('tenant_id', $tenantId)->where('status', 'PUBLISHED')->count();
        $draftFlows = WhatsAppFlow::where('tenant_id', $tenantId)->whereIn('status', ['DRAFT', 'SUBMITTED', 'IN_REVIEW'])->count();
        $totalSubmissions = WhatsAppFlowSubmission::where('tenant_id', $tenantId)->count();

        return response()->json([
            'flows' => $flows,
            'data' => $flows,
            'stats' => [
                'total_flows' => $totalFlows,
                'published_flows' => $publishedFlows,
                'draft_flows' => $draftFlows,
                'total_submissions' => $totalSubmissions,
            ]
        ]);
    }

    /**
     * Provide pre-built WhatsApp Flow blueprints.
     */
    public function templates()
    {
        $templates = [
            [
                'id' => 'lead_qualification',
                'name' => 'Lead Qualification & Consultation Form',
                'category' => 'LEAD_GENERATION',
                'description' => 'Collect prospect details, budget tier, service requirements, and consultation preferences.',
                'categories' => ['LEAD_GENERATION'],
                'screens' => [
                    [
                        'id' => 'SCREEN_ONE',
                        'title' => 'Request a Consultation',
                        'fields' => [
                            [
                                'id' => 'full_name',
                                'type' => 'TextInput',
                                'label' => 'Full Name',
                                'placeholder' => 'Enter your full name',
                                'required' => true,
                            ],
                            [
                                'id' => 'work_email',
                                'type' => 'TextInput',
                                'input_type' => 'email',
                                'label' => 'Work Email Address',
                                'placeholder' => 'alex@company.com',
                                'required' => true,
                            ],
                            [
                                'id' => 'company_size',
                                'type' => 'Dropdown',
                                'label' => 'Company Size',
                                'required' => true,
                                'options' => [
                                    ['id' => '1-10', 'title' => '1 - 10 employees'],
                                    ['id' => '11-50', 'title' => '11 - 50 employees'],
                                    ['id' => '51-200', 'title' => '51 - 200 employees'],
                                    ['id' => '201+', 'title' => '201+ employees'],
                                ],
                            ],
                            [
                                'id' => 'budget',
                                'type' => 'RadioButtonsGroup',
                                'label' => 'Estimated Monthly Budget',
                                'required' => true,
                                'options' => [
                                    ['id' => 'under_1k', 'title' => 'Under $1,000 / month'],
                                    ['id' => '1k_5k', 'title' => '$1,000 - $5,000 / month'],
                                    ['id' => '5k_20k', 'title' => '$5,000 - $20,000 / month'],
                                    ['id' => 'enterprise', 'title' => '$20,000+ Enterprise'],
                                ],
                            ],
                            [
                                'id' => 'requirements',
                                'type' => 'TextArea',
                                'label' => 'Primary Goals & Challenges',
                                'placeholder' => 'Tell us about your project requirements...',
                                'required' => false,
                            ],
                        ]
                    ]
                ]
            ],
            [
                'id' => 'csat_survey',
                'name' => 'Customer Satisfaction & NPS Survey',
                'category' => 'SURVEY',
                'description' => 'Gather instant customer feedback, 1-5 star service rating, and suggestions after support resolution.',
                'categories' => ['SURVEY', 'CUSTOMER_SUPPORT'],
                'screens' => [
                    [
                        'id' => 'SCREEN_ONE',
                        'title' => 'Share Your Feedback',
                        'fields' => [
                            [
                                'id' => 'rating',
                                'type' => 'RadioButtonsGroup',
                                'label' => 'How satisfied are you with our service?',
                                'required' => true,
                                'options' => [
                                    ['id' => '5', 'title' => '⭐⭐⭐⭐⭐ Extremely Satisfied'],
                                    ['id' => '4', 'title' => '⭐⭐⭐⭐ Satisfied'],
                                    ['id' => '3', 'title' => '⭐⭐⭐ Neutral'],
                                    ['id' => '2', 'title' => '⭐⭐ Dissatisfied'],
                                    ['id' => '1', 'title' => '⭐ Very Dissatisfied'],
                                ],
                            ],
                            [
                                'id' => 'support_agent_rating',
                                'type' => 'Dropdown',
                                'label' => 'How helpful was our team agent?',
                                'required' => true,
                                'options' => [
                                    ['id' => 'excellent', 'title' => 'Exceptional & Quick'],
                                    ['id' => 'good', 'title' => 'Helpful & Polite'],
                                    ['id' => 'average', 'title' => 'Average resolution'],
                                    ['id' => 'poor', 'title' => 'Needs improvement'],
                                ],
                            ],
                            [
                                'id' => 'feedback_notes',
                                'type' => 'TextArea',
                                'label' => 'What could we have done better?',
                                'placeholder' => 'Your honest comments help us improve...',
                                'required' => false,
                            ],
                            [
                                'id' => 'recommend_nps',
                                'type' => 'Dropdown',
                                'label' => 'How likely are you to recommend us to a colleague? (0-10)',
                                'required' => true,
                                'options' => [
                                    ['id' => '10', 'title' => '10 - Absolutely likely'],
                                    ['id' => '9', 'title' => '9 - Very likely'],
                                    ['id' => '8', 'title' => '8 - Likely'],
                                    ['id' => '7', 'title' => '7 - Neutral'],
                                    ['id' => '5', 'title' => '5 or lower - Unlikely'],
                                ],
                            ],
                        ]
                    ]
                ]
            ],
            [
                'id' => 'appointment_booking',
                'name' => 'Appointment & Service Booking Form',
                'category' => 'APPOINTMENT_BOOKING',
                'description' => 'Book time slots, select services, specify attendee numbers and notes natively in WhatsApp.',
                'categories' => ['APPOINTMENT_BOOKING'],
                'screens' => [
                    [
                        'id' => 'SCREEN_ONE',
                        'title' => 'Schedule an Appointment',
                        'fields' => [
                            [
                                'id' => 'service_type',
                                'type' => 'Dropdown',
                                'label' => 'Select Service',
                                'required' => true,
                                'options' => [
                                    ['id' => 'demo', 'title' => 'Product Demo & Walkthrough (30 min)'],
                                    ['id' => 'technical_support', 'title' => 'Technical Implementation (45 min)'],
                                    ['id' => 'strategy_call', 'title' => 'Strategy & Scaling Call (60 min)'],
                                ],
                            ],
                            [
                                'id' => 'preferred_date',
                                'type' => 'DatePicker',
                                'label' => 'Preferred Date',
                                'required' => true,
                            ],
                            [
                                'id' => 'preferred_time',
                                'type' => 'Dropdown',
                                'label' => 'Preferred Time Slot',
                                'required' => true,
                                'options' => [
                                    ['id' => 'morning_10am', 'title' => '10:00 AM - 11:00 AM'],
                                    ['id' => 'morning_11am', 'title' => '11:00 AM - 12:00 PM'],
                                    ['id' => 'afternoon_2pm', 'title' => '02:00 PM - 03:00 PM'],
                                    ['id' => 'afternoon_4pm', 'title' => '04:00 PM - 05:00 PM'],
                                ],
                            ],
                            [
                                'id' => 'special_notes',
                                'type' => 'TextArea',
                                'label' => 'Additional Notes or Topics',
                                'placeholder' => 'Any specific questions you want covered?',
                                'required' => false,
                            ],
                        ]
                    ]
                ]
            ],
            [
                'id' => 'event_registration',
                'name' => 'Webinar & Event Registration',
                'category' => 'SIGN_UP',
                'description' => 'One-click registration for upcoming webinars, masterclasses, and community events.',
                'categories' => ['SIGN_UP', 'OTHER'],
                'screens' => [
                    [
                        'id' => 'SCREEN_ONE',
                        'title' => 'Register for Event',
                        'fields' => [
                            [
                                'id' => 'attendee_name',
                                'type' => 'TextInput',
                                'label' => 'Full Name',
                                'placeholder' => 'Enter your full name',
                                'required' => true,
                            ],
                            [
                                'id' => 'attendee_email',
                                'type' => 'TextInput',
                                'input_type' => 'email',
                                'label' => 'Email for Confirmation & Calendar Invite',
                                'placeholder' => 'you@domain.com',
                                'required' => true,
                            ],
                            [
                                'id' => 'job_role',
                                'type' => 'Dropdown',
                                'label' => 'Your Role',
                                'required' => true,
                                'options' => [
                                    ['id' => 'founder', 'title' => 'Founder / CEO'],
                                    ['id' => 'marketing', 'title' => 'Marketing Manager / Growth'],
                                    ['id' => 'sales', 'title' => 'Sales Leader / SDR'],
                                    ['id' => 'support', 'title' => 'Customer Success / Support'],
                                    ['id' => 'developer', 'title' => 'Engineer / Developer'],
                                ],
                            ],
                            [
                                'id' => 'opt_in_updates',
                                'type' => 'OptIn',
                                'label' => 'Send me calendar reminder and webinar recording afterwards.',
                                'required' => true,
                            ]
                        ]
                    ]
                ]
            ]
        ];

        return response()->json($templates);
    }

    /**
     * Store a newly created WhatsApp Flow.
     */
    public function store(Request $request)
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'categories' => 'required|array|min:1',
            'channel_connection_id' => 'nullable|integer|exists:channel_connections,id',
            'flow_json' => 'nullable|array',
            'ui_schema' => 'nullable|array',
            'status' => 'nullable|string|in:DRAFT,SUBMITTED,PUBLISHED',
        ]);

        // Auto-assign default WhatsApp channel if none provided
        if (empty($validated['channel_connection_id'])) {
            $defaultChannel = ChannelConnection::where('tenant_id', $tenantId)
                ->whereIn('channel_type', ['whatsapp', 'whatsapp_cloud', 'whatsapp_cloud_api', 'whatsapp_baileys', 'baileys'])
                ->where('status', 'connected')
                ->first();
            $validated['channel_connection_id'] = $defaultChannel?->id;
        }

        $validated['tenant_id'] = $tenantId;
        $validated['created_by'] = $request->user()->id;
        $validated['status'] = $validated['status'] ?? 'DRAFT';
        $validated['sync_status'] = 'synced';

        // Build standard Flow JSON if only ui_schema / screens were provided
        if (empty($validated['flow_json']) && !empty($validated['ui_schema']['screens'])) {
            $validated['flow_json'] = $this->buildMetaFlowJsonFromUiSchema(
                $validated['name'],
                $validated['description'] ?? '',
                $validated['ui_schema']['screens']
            );
        }

        $flow = WhatsAppFlow::create($validated);

        return response()->json([
            'message' => 'WhatsApp Flow Form created successfully.',
            'flow' => $flow->load('channelConnection')
        ], 201);
    }

    /**
     * Show a single WhatsApp Flow.
     */
    public function show(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $flow = WhatsAppFlow::where('tenant_id', $tenantId)
            ->with(['channelConnection:id,name,channel_type,status', 'creator:id,first_name,last_name,email'])
            ->withCount('submissions')
            ->findOrFail($id);

        return response()->json($flow);
    }

    /**
     * Update a WhatsApp Flow.
     */
    public function update(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $flow = WhatsAppFlow::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'categories' => 'sometimes|required|array|min:1',
            'channel_connection_id' => 'nullable|integer|exists:channel_connections,id',
            'flow_json' => 'nullable|array',
            'ui_schema' => 'nullable|array',
            'is_active' => 'nullable|boolean',
            'status' => 'nullable|string|in:DRAFT,SUBMITTED,PUBLISHED,DEPRECATED',
        ]);

        if (!empty($validated['ui_schema']['screens'])) {
            $validated['flow_json'] = $this->buildMetaFlowJsonFromUiSchema(
                $validated['name'] ?? $flow->name,
                $validated['description'] ?? ($flow->description ?? ''),
                $validated['ui_schema']['screens']
            );
        }

        $flow->update($validated);

        return response()->json([
            'message' => 'WhatsApp Flow Form updated successfully.',
            'flow' => $flow->fresh(['channelConnection'])
        ]);
    }

    /**
     * Delete a WhatsApp Flow.
     */
    public function destroy(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $flow = WhatsAppFlow::where('tenant_id', $tenantId)->findOrFail($id);

        // If flow has a meta_flow_id, attempt deprecation on Meta in background
        if ($flow->meta_flow_id && $flow->channelConnection) {
            try {
                $this->deprecateMetaFlow($flow);
            } catch (Exception $e) {
                Log::warning("WhatsApp Flow Meta deprecate warning on delete: " . $e->getMessage());
            }
        }

        $flow->delete();

        return response()->json([
            'message' => 'WhatsApp Flow Form deleted successfully.'
        ]);
    }

    /**
     * Submit Flow to Meta Graph API for review & publishing.
     */
    public function submitToMeta(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $flow = WhatsAppFlow::where('tenant_id', $tenantId)->findOrFail($id);

        $channel = $flow->channelConnection;
        if (!$channel) {
            // Attempt to bind default connected WhatsApp channel
            $channel = ChannelConnection::where('tenant_id', $tenantId)
                ->whereIn('channel_type', ['whatsapp', 'whatsapp_cloud', 'whatsapp_cloud_api', 'whatsapp_baileys', 'baileys'])
                ->where('status', 'connected')
                ->first();

            if ($channel) {
                $flow->update(['channel_connection_id' => $channel->id]);
            }
        }

        if (!$channel) {
            return response()->json([
                'message' => 'No active WhatsApp channel found. Please connect a WhatsApp channel in Channels Connect first.'
            ], 422);
        }

        // Sandbox / Baileys Mock Approval Bypass
        if (in_array($channel->channel_type, ['baileys', 'whatsapp_baileys']) || $channel->status === 'mock' || !app()->environment('production')) {
            $mockMetaId = $flow->meta_flow_id ?: ('flow_' . rand(100000000000000, 999999999999999));
            $flow->update([
                'meta_flow_id' => $mockMetaId,
                'status' => 'PUBLISHED',
                'meta_status' => 'PUBLISHED',
                'sync_status' => 'synced',
                'sync_error_message' => null,
                'last_synced_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'WhatsApp Flow Form successfully approved and published! (Active for messaging & automations).',
                'flow' => $flow->fresh(['channelConnection'])
            ]);
        }

        // Live Meta Cloud API Submission
        $creds = $channel->decrypted_credentials;
        $wabaId = $creds['whatsapp_business_account_id'] ?? null;
        $token = $creds['system_user_access_token'] ?? null;

        if (!$wabaId || !$token) {
            return response()->json([
                'message' => 'WhatsApp Cloud API credentials (whatsapp_business_account_id or system_user_access_token) are missing or incomplete.'
            ], 422);
        }

        try {
            // Step 1: Create Flow on Meta if not already created
            $metaFlowId = $flow->meta_flow_id;
            if (!$metaFlowId) {
                $createUrl = "https://graph.facebook.com/v19.0/{$wabaId}/flows";
                $cleanName = substr(preg_replace('/[^a-zA-Z0-9_\-\s]/', '', $flow->name), 0, 100);

                $createRes = Http::withToken($token)->timeout(15)->post($createUrl, [
                    'name' => $cleanName,
                    'categories' => $flow->categories ?: ['LEAD_GENERATION'],
                ]);

                if (!$createRes->successful()) {
                    $err = $createRes->json()['error']['message'] ?? 'Failed to register Flow on Meta.';
                    $flow->update([
                        'sync_status' => 'failed',
                        'sync_error_message' => $err,
                    ]);

                    return response()->json([
                        'message' => "Meta API Registration Error: {$err}"
                    ], 400);
                }

                $metaFlowId = $createRes->json('id');
                $flow->meta_flow_id = $metaFlowId;
                $flow->save();
            }

            // Step 2: Upload Flow JSON specification Asset
            $assetUrl = "https://graph.facebook.com/v19.0/{$metaFlowId}/assets";
            $flowJsonContent = json_encode($flow->toMetaFlowJson(), JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

            $assetRes = Http::withToken($token)
                ->timeout(20)
                ->attach('file', $flowJsonContent, 'flow.json', ['Content-Type' => 'application/json'])
                ->post($assetUrl, [
                    'name' => 'flow.json',
                    'asset_type' => 'FLOW_JSON',
                ]);

            if (!$assetRes->successful()) {
                $err = $assetRes->json()['error']['message'] ?? 'Failed to upload Flow JSON schema.';
                $validationErrors = $assetRes->json()['error']['error_data']['details'] ?? null;
                $flow->update([
                    'sync_status' => 'failed',
                    'sync_error_message' => $err,
                    'meta_validation_errors' => $validationErrors ? [$validationErrors] : null,
                ]);

                return response()->json([
                    'message' => "Flow Schema Validation Error: {$err}",
                    'validation_errors' => $validationErrors
                ], 422);
            }

            // Step 3: Publish the Flow
            $publishUrl = "https://graph.facebook.com/v19.0/{$metaFlowId}/publish";
            $publishRes = Http::withToken($token)->timeout(15)->post($publishUrl);

            $isPublished = $publishRes->successful();
            $metaStatus = $isPublished ? 'PUBLISHED' : 'SUBMITTED';

            $flow->update([
                'status' => $metaStatus,
                'meta_status' => $metaStatus,
                'sync_status' => 'synced',
                'sync_error_message' => null,
                'meta_validation_errors' => null,
                'last_synced_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'WhatsApp Flow Form successfully submitted and published on Meta!',
                'flow' => $flow->fresh(['channelConnection'])
            ]);

        } catch (Exception $e) {
            Log::error("WhatsApp Flow Meta Submission Exception: " . $e->getMessage());
            $flow->update([
                'sync_status' => 'failed',
                'sync_error_message' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Network error connecting to Meta Graph API: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Synchronize live approval status directly from Meta Graph API.
     */
    public function syncMetaStatus(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $flow = WhatsAppFlow::where('tenant_id', $tenantId)->findOrFail($id);

        if (!$flow->meta_flow_id) {
            return response()->json([
                'message' => 'This flow has not been submitted to Meta yet.'
            ], 400);
        }

        $channel = $flow->channelConnection;
        if (!$channel || in_array($channel->channel_type, ['baileys', 'whatsapp_baileys']) || $channel->status === 'mock' || !app()->environment('production')) {
            $flow->update([
                'status' => 'PUBLISHED',
                'meta_status' => 'PUBLISHED',
                'sync_status' => 'synced',
                'last_synced_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Flow status synchronized: PUBLISHED (Active)',
                'flow' => $flow->fresh(['channelConnection'])
            ]);
        }

        $creds = $channel->decrypted_credentials;
        $token = $creds['system_user_access_token'] ?? null;

        if (!$token) {
            return response()->json(['message' => 'Channel access token is missing.'], 422);
        }

        try {
            $url = "https://graph.facebook.com/v19.0/{$flow->meta_flow_id}?fields=id,name,status,categories,validation_errors,preview";
            $res = Http::withToken($token)->timeout(10)->get($url);

            if ($res->successful()) {
                $data = $res->json();
                $metaStatus = strtoupper($data['status'] ?? 'DRAFT');
                $previewUrl = $data['preview']['preview_url'] ?? null;
                $valErrors = $data['validation_errors'] ?? null;

                $flow->update([
                    'status' => $metaStatus,
                    'meta_status' => $metaStatus,
                    'preview_url' => $previewUrl,
                    'meta_validation_errors' => $valErrors,
                    'sync_status' => 'synced',
                    'sync_error_message' => null,
                    'last_synced_at' => now(),
                ]);

                return response()->json([
                    'success' => true,
                    'message' => "Flow status synchronized from Meta: {$metaStatus}",
                    'flow' => $flow->fresh(['channelConnection'])
                ]);
            }

            return response()->json([
                'message' => 'Failed to query Meta Graph API status: ' . ($res->json()['error']['message'] ?? 'Unknown error')
            ], 400);

        } catch (Exception $e) {
            return response()->json([
                'message' => 'Error querying Meta: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Deprecate flow on Meta.
     */
    public function deprecate(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $flow = WhatsAppFlow::where('tenant_id', $tenantId)->findOrFail($id);

        $this->deprecateMetaFlow($flow);

        $flow->update([
            'status' => 'DEPRECATED',
            'meta_status' => 'DEPRECATED',
            'is_active' => false,
            'last_synced_at' => now(),
        ]);

        return response()->json([
            'message' => 'Flow has been deprecated successfully.',
            'flow' => $flow->fresh(['channelConnection'])
        ]);
    }

    /**
     * List submissions for a specific flow or across all tenant flows.
     */
    public function submissions(Request $request, $id = null)
    {
        $tenantId = $request->user()->tenant_id;
        $query = WhatsAppFlowSubmission::where('tenant_id', $tenantId)
            ->with(['flow:id,name,status', 'contact:id,first_name,last_name,phone,email', 'channelConnection:id,name,channel_type']);

        if ($id) {
            $query->where('whatsapp_flow_id', $id);
        } elseif ($request->filled('whatsapp_flow_id')) {
            $query->where('whatsapp_flow_id', $request->query('whatsapp_flow_id'));
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->whereHas('contact', function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $submissions = $query->latest()->paginate(25);

        return response()->json($submissions);
    }

    /**
     * Dispatch interactive WhatsApp Flow directly to a contact or active conversation.
     */
    public function send(Request $request, ChannelManager $channelManager)
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'whatsapp_flow_id' => 'required|integer|exists:whatsapp_flows,id',
            'conversation_id' => 'nullable|integer|exists:conversations,id',
            'contact_id' => 'nullable|integer|exists:contacts,id',
            'phone' => 'nullable|string',
            'header' => 'nullable|string|max:60',
            'body' => 'required|string|max:1024',
            'footer' => 'nullable|string|max:60',
            'flow_cta' => 'nullable|string|max:20',
        ]);

        $flow = WhatsAppFlow::where('tenant_id', $tenantId)->findOrFail($validated['whatsapp_flow_id']);

        // Resolve Conversation & Contact
        $conversation = null;
        if (!empty($validated['conversation_id'])) {
            $conversation = Conversation::where('tenant_id', $tenantId)->find($validated['conversation_id']);
        }

        if ($conversation) {
            $contact = $conversation->contact;
            $channel = $conversation->channelConnection;
        } else {
            $contactId = $validated['contact_id'] ?? null;
            $contact = $contactId ? Contact::where('tenant_id', $tenantId)->find($contactId) : null;
            $targetPhone = $validated['phone'] ?? ($contact?->phone);

            if (!$targetPhone) {
                return response()->json(['message' => 'Recipient phone number is required.'], 422);
            }

            $channel = $flow->channelConnection ?: ChannelConnection::where('tenant_id', $tenantId)
                ->whereIn('channel_type', ['whatsapp', 'whatsapp_cloud', 'whatsapp_cloud_api', 'whatsapp_baileys', 'baileys'])
                ->where('status', 'connected')
                ->first();

            if (!$channel) {
                return response()->json(['message' => 'No active WhatsApp channel connection available.'], 422);
            }

            // Find or create conversation
            $conversation = Conversation::firstOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'channel_connection_id' => $channel->id,
                    'external_chat_id' => preg_replace('/[^0-9]/', '', $targetPhone)
                ],
                [
                    'contact_id' => $contact?->id,
                    'status' => 'open',
                    'last_message_at' => now(),
                ]
            );
        }

        // Check if tenant has reached monthly outbound messages cap
        $tenant = $request->user()->tenant;
        $limitCheck = app(\App\Services\PlanLimitService::class)->canSendOutboundMessage($tenant);
        if (!$limitCheck['allowed']) {
            return response()->json([
                'message' => $limitCheck['reason'],
                'code' => $limitCheck['code'],
                'limit' => $limitCheck['limit'] ?? null,
                'current' => $limitCheck['current'] ?? null,
            ], 403);
        }

        $recipientPhone = $conversation->external_chat_id;
        $driver = $channelManager->driver($channel->channel_type);
        $flowToken = 'flow_token_' . uniqid();
        $flowIdToSend = $flow->meta_flow_id ?: (string)$flow->id;

        // Prepare outbound Flow message payload
        $messageData = [
            'type' => 'flow',
            'external_chat_id' => $recipientPhone,
            'header' => $validated['header'] ?? null,
            'body' => $validated['body'],
            'footer' => $validated['footer'] ?? null,
            'flow_id' => $flowIdToSend,
            'flow_token' => $flowToken,
            'flow_cta' => $validated['flow_cta'] ?: 'Open Form',
            'flow_action' => 'navigate',
            'screen' => 'SCREEN_ONE',
        ];

        // Send through channel driver
        try {
            $creds = $channel->decrypted_credentials;
            $result = $driver->sendMessage($creds, $messageData);

            $isSuccess = ($result['delivery_status'] ?? '') === 'sent' || !empty($result['external_message_id']);

            // Record message in Conversation history
            $message = Message::create([
                'conversation_id' => $conversation->id,
                'tenant_id' => $tenantId,
                'direction' => 'outbound',
                'message_type' => 'whatsapp_flow',
                'sender_identifier' => $request->user()->first_name . ' ' . $request->user()->last_name,
                'body' => $validated['body'],
                'external_message_id' => $result['external_message_id'] ?? ('flow_msg_' . uniqid()),
                'delivery_status' => $isSuccess ? 'sent' : 'failed',
                'error_message' => $result['error_message'] ?? null,
                'metadata' => [
                    'whatsapp_flow_id' => $flow->id,
                    'flow_name' => $flow->name,
                    'flow_token' => $flowToken,
                    'flow_cta' => $validated['flow_cta'] ?: 'Open Form',
                    'header' => $validated['header'] ?? null,
                    'footer' => $validated['footer'] ?? null,
                ]
            ]);

            $conversation->update(['last_message_at' => Carbon::now()]);

            // Broadcast message to Echo
            try {
                broadcast(new \App\Events\MessageReceived($message))->toOthers();
            } catch (Exception $e) {}

            return response()->json([
                'success' => true,
                'message' => 'WhatsApp Flow Form sent successfully!',
                'chat_message' => $message,
                'conversation_id' => $conversation->id,
            ]);

        } catch (Exception $e) {
            Log::error("WhatsApp Flow Send Exception: " . $e->getMessage());
            return response()->json([
                'message' => 'Failed to send Flow message: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper to deprecate a flow on Meta API.
     */
    protected function deprecateMetaFlow(WhatsAppFlow $flow): void
    {
        if (!$flow->meta_flow_id || !$flow->channelConnection) {
            return;
        }

        $creds = $flow->channelConnection->decrypted_credentials;
        $token = $creds['system_user_access_token'] ?? null;
        if ($token) {
            Http::withToken($token)
                ->timeout(10)
                ->post("https://graph.facebook.com/v19.0/{$flow->meta_flow_id}/deprecate");
        }
    }

    /**
     * Build standard Meta Flow JSON (v6.0) from simple visual screens array.
     */
    protected function buildMetaFlowJsonFromUiSchema(string $name, string $description, array $screens): array
    {
        $metaScreens = [];

        foreach ($screens as $idx => $screen) {
            $screenId = !empty($screen['id']) ? strtoupper(Str::slug($screen['id'], '_')) : ('SCREEN_' . ($idx + 1));
            $isTerminal = ($idx === count($screens) - 1);
            $children = [];

            // Title
            $children[] = [
                'type' => 'TextHeading',
                'text' => $screen['title'] ?? $name,
            ];

            // Subtitle / Intro
            if (!empty($screen['subtitle'])) {
                $children[] = [
                    'type' => 'TextSubheading',
                    'text' => $screen['subtitle'],
                ];
            } elseif ($idx === 0 && !empty($description)) {
                $children[] = [
                    'type' => 'TextBody',
                    'text' => $description,
                ];
            }

            // Fields
            foreach ($screen['fields'] ?? [] as $f) {
                $fieldType = $f['type'] ?? 'TextInput';
                $fieldId = !empty($f['id']) ? Str::slug($f['id'], '_') : ('field_' . uniqid());
                $label = $f['label'] ?? 'Field Label';
                $required = !empty($f['required']);

                if ($fieldType === 'TextInput') {
                    $children[] = [
                        'type' => 'TextInput',
                        'name' => $fieldId,
                        'label' => $label,
                        'required' => $required,
                        'input-type' => $f['input_type'] ?? 'text',
                        'helper-text' => $f['placeholder'] ?? null,
                    ];
                } elseif ($fieldType === 'TextArea') {
                    $children[] = [
                        'type' => 'TextArea',
                        'name' => $fieldId,
                        'label' => $label,
                        'required' => $required,
                        'helper-text' => $f['placeholder'] ?? null,
                    ];
                } elseif ($fieldType === 'Dropdown') {
                    $options = [];
                    foreach ($f['options'] ?? [] as $opt) {
                        $options[] = [
                            'id' => (string)($opt['id'] ?? Str::slug($opt['title'], '_')),
                            'title' => (string)($opt['title'] ?? 'Option'),
                        ];
                    }
                    $children[] = [
                        'type' => 'Dropdown',
                        'name' => $fieldId,
                        'label' => $label,
                        'required' => $required,
                        'data-source' => $options,
                    ];
                } elseif ($fieldType === 'RadioButtonsGroup') {
                    $options = [];
                    foreach ($f['options'] ?? [] as $opt) {
                        $options[] = [
                            'id' => (string)($opt['id'] ?? Str::slug($opt['title'], '_')),
                            'title' => (string)($opt['title'] ?? 'Option'),
                        ];
                    }
                    $children[] = [
                        'type' => 'RadioButtonsGroup',
                        'name' => $fieldId,
                        'label' => $label,
                        'required' => $required,
                        'data-source' => $options,
                    ];
                } elseif ($fieldType === 'CheckboxGroup') {
                    $options = [];
                    foreach ($f['options'] ?? [] as $opt) {
                        $options[] = [
                            'id' => (string)($opt['id'] ?? Str::slug($opt['title'], '_')),
                            'title' => (string)($opt['title'] ?? 'Option'),
                        ];
                    }
                    $children[] = [
                        'type' => 'CheckboxGroup',
                        'name' => $fieldId,
                        'label' => $label,
                        'required' => $required,
                        'data-source' => $options,
                    ];
                } elseif ($fieldType === 'DatePicker') {
                    $children[] = [
                        'type' => 'DatePicker',
                        'name' => $fieldId,
                        'label' => $label,
                        'required' => $required,
                    ];
                } elseif ($fieldType === 'OptIn') {
                    $children[] = [
                        'type' => 'OptIn',
                        'name' => $fieldId,
                        'label' => $label,
                        'required' => $required,
                    ];
                }
            }

            // Footer
            $nextScreenId = !$isTerminal && isset($screens[$idx + 1]) 
                ? strtoupper(Str::slug($screens[$idx + 1]['id'] ?? ('SCREEN_' . ($idx + 2)), '_')) 
                : null;

            $children[] = [
                'type' => 'Footer',
                'label' => $isTerminal ? 'Submit' : 'Continue',
                'on-click-action' => $isTerminal ? [
                    'name' => 'complete',
                    'payload' => (object)[]
                ] : [
                    'name' => 'navigate',
                    'next' => [
                        'type' => 'screen',
                        'name' => $nextScreenId
                    ],
                    'payload' => (object)[]
                ]
            ];

            $metaScreens[] = [
                'id' => $screenId,
                'title' => $screen['title'] ?? $name,
                'data' => (object)[],
                'terminal' => $isTerminal,
                'layout' => [
                    'type' => 'SingleColumnLayout',
                    'children' => $children,
                ]
            ];
        }

        return [
            'version' => '6.0',
            'screens' => $metaScreens,
        ];
    }
}
