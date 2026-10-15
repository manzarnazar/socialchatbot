<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\MessageTemplate;
use App\Models\ChannelConnection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class MessageTemplateController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $query = MessageTemplate::where('tenant_id', $tenantId);

        if ($request->has('type')) {
            $query->where('type', $request->query('type'));
        }

        if ($request->has('connection_id')) {
            $query->where('channel_connection_id', $request->query('connection_id'));
        }

        $templates = $query->with('channelConnection')->latest()->get();

        return response()->json($templates);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $tenantId = $request->user()->tenant_id ?? 1;

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:whatsapp,email',
            'category' => 'nullable|string|max:100',
            'language' => 'nullable|string|max:10',
            'channel_connection_id' => [
                'nullable',
                'integer',
                \Illuminate\Validation\Rule::exists('channel_connections', 'id')->where('tenant_id', $tenantId)
            ],
            'content' => 'required|array',
            'status' => 'nullable|string',
        ]);

        // Auto default status
        if (empty($validated['status'])) {
            $validated['status'] = $validated['type'] === 'email' ? 'ready' : 'draft';
        }

        $validated['tenant_id'] = $tenantId;
        $template = MessageTemplate::create($validated);

        return response()->json($template, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $tenantId = request()->user()->tenant_id ?? 1;
        $template = MessageTemplate::where('tenant_id', $tenantId)->with('channelConnection')->findOrFail($id);
        return response()->json($template);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $template = MessageTemplate::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'category' => 'nullable|string|max:100',
            'language' => 'nullable|string|max:10',
            'channel_connection_id' => [
                'nullable',
                'integer',
                \Illuminate\Validation\Rule::exists('channel_connections', 'id')->where('tenant_id', $tenantId)
            ],
            'content' => 'sometimes|required|array',
            'status' => 'nullable|string',
        ]);

        $template->update($validated);

        return response()->json($template);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $tenantId = request()->user()->tenant_id ?? 1;
        $template = MessageTemplate::where('tenant_id', $tenantId)->findOrFail($id);
        $template->delete();

        return response()->json(['message' => 'Message template deleted successfully.']);
    }

    /**
     * Submit WhatsApp Template to Meta Graph API.
     */
    public function submitToMeta($id)
    {
        $tenantId = request()->user()->tenant_id ?? 1;
        $template = MessageTemplate::where('tenant_id', $tenantId)->findOrFail($id);

        if ($template->type !== 'whatsapp') {
            return response()->json(['message' => 'Only WhatsApp templates can be submitted to Meta API.'], 400);
        }

        $connection = ChannelConnection::where('tenant_id', $tenantId)->find($template->channel_connection_id);
        if (!$connection) {
            return response()->json(['message' => 'No bound channel connection found.'], 422);
        }

        // Standard Baileys or Mock driver bypass logic
        if ($connection->channel_type === 'baileys' || $connection->status === 'mock') {
            $template->update([
                'status' => 'approved',
                'meta_template_id' => 'mock_meta_' . uniqid()
            ]);
            return response()->json([
                'message' => 'WhatsApp template approved successfully (Baileys/Sandbox bypass).',
                'template' => $template
            ]);
        }

        $creds = $connection->decrypted_credentials;
        $wabaId = $creds['whatsapp_business_account_id'] ?? null;
        $token = $creds['system_user_access_token'] ?? null;

        if (!$wabaId || !$token) {
            return response()->json(['message' => 'WhatsApp connection credentials (whatsapp_business_account_id, system_user_access_token) are incomplete.'], 422);
        }

        $content = $template->content;
        $components = [];

        $isCarousel = ($content['format'] ?? '') === 'carousel' || !empty($content['carousel']['cards']);

        if ($isCarousel && !empty($content['carousel']['cards'])) {
            // 1. CAROUSEL MAIN BODY (REQUIRED BY META)
            if (!empty($content['body']['text'])) {
                $components[] = [
                    'type' => 'BODY',
                    'text' => $content['body']['text']
                ];
            }

            // 2. CAROUSEL CARDS
            $cards = [];
            foreach ($content['carousel']['cards'] as $card) {
                $cardComponents = [];

                // Card Header (IMAGE / VIDEO)
                $cardHeaderFormat = strtoupper($card['header']['format'] ?? 'IMAGE');
                if (!in_array($cardHeaderFormat, ['IMAGE', 'VIDEO'])) {
                    $cardHeaderFormat = 'IMAGE';
                }

                $mediaUrl = $card['header']['media_url'] ?? ($card['header']['url'] ?? 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&q=80');

                $cardComponents[] = [
                    'type' => 'HEADER',
                    'format' => $cardHeaderFormat,
                    'example' => [
                        'header_handle' => [$mediaUrl]
                    ]
                ];

                // Card Body
                if (!empty($card['body']['text'])) {
                    $cardComponents[] = [
                        'type' => 'BODY',
                        'text' => $card['body']['text']
                    ];
                }

                // Card Buttons (up to 2 per card)
                if (!empty($card['buttons'])) {
                    $cardButtons = [];
                    foreach ($card['buttons'] as $btn) {
                        if ($btn['type'] === 'quick_reply') {
                            $cardButtons[] = [
                                'type' => 'QUICK_REPLY',
                                'text' => $btn['text']
                            ];
                        } elseif ($btn['type'] === 'url') {
                            $cardButtons[] = [
                                'type' => 'URL',
                                'text' => $btn['text'],
                                'url' => $btn['url'] ?? 'https://whatsomni.io'
                            ];
                        } elseif ($btn['type'] === 'phone') {
                            $cardButtons[] = [
                                'type' => 'PHONE_NUMBER',
                                'text' => $btn['text'],
                                'phone_number' => $btn['phone_number'] ?? '+1234567890'
                            ];
                        }
                    }
                    if (count($cardButtons) > 0) {
                        $cardComponents[] = [
                            'type' => 'BUTTONS',
                            'buttons' => array_slice($cardButtons, 0, 2)
                        ];
                    }
                }

                $cards[] = [
                    'components' => $cardComponents
                ];
            }

            $components[] = [
                'type' => 'CAROUSEL',
                'cards' => $cards
            ];
        } else {
            // STANDARD SINGLE-CARD TEMPLATE
            // 1. HEADER
            if (!empty($content['header'])) {
                $header = $content['header'];
                if (!empty($header['text'])) {
                    $components[] = [
                        'type' => 'HEADER',
                        'format' => 'TEXT',
                        'text' => $header['text']
                    ];
                }
            }

            // 2. BODY
            if (!empty($content['body']['text'])) {
                $components[] = [
                    'type' => 'BODY',
                    'text' => $content['body']['text']
                ];
            }

            // 3. FOOTER
            if (!empty($content['footer']['text'])) {
                $components[] = [
                    'type' => 'FOOTER',
                    'text' => $content['footer']['text']
                ];
            }

            // 4. BUTTONS (Supports Mixed Button Sets: QUICK_REPLY, URL, PHONE_NUMBER, COPY_CODE)
            if (!empty($content['buttons'])) {
                $buttons = [];
                foreach ($content['buttons'] as $btn) {
                    if ($btn['type'] === 'quick_reply') {
                        $buttons[] = [
                            'type' => 'QUICK_REPLY',
                            'text' => $btn['text']
                        ];
                    } elseif ($btn['type'] === 'url') {
                        $buttons[] = [
                            'type' => 'URL',
                            'text' => $btn['text'],
                            'url' => $btn['url']
                        ];
                    } elseif ($btn['type'] === 'phone') {
                        $buttons[] = [
                            'type' => 'PHONE_NUMBER',
                            'text' => $btn['text'],
                            'phone_number' => $btn['phone_number']
                        ];
                    } elseif ($btn['type'] === 'copy_code') {
                        $buttons[] = [
                            'type' => 'COPY_CODE',
                            'example' => $btn['coupon_code'] ?? ($btn['text'] ?? 'PROMO20')
                        ];
                    }
                }
                if (count($buttons) > 0) {
                    $components[] = [
                        'type' => 'BUTTONS',
                        'buttons' => $buttons
                    ];
                }
            }
        }

        $url = "https://graph.facebook.com/v19.0/{$wabaId}/message_templates";

        try {
            $response = Http::withToken($token)
                ->timeout(10)
                ->post($url, [
                    'name' => strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', $template->name)),
                    'language' => $template->language ?: 'en_US',
                    'category' => strtoupper($template->category ?: 'marketing'),
                    'components' => $components
                ]);

            if (!$response->successful()) {
                $err = $response->json();
                $msg = $err['error']['message'] ?? 'Meta API error.';
                return response()->json(['message' => 'Meta template creation failed: ' . $msg], 400);
            }

            $resData = $response->json();
            $metaTemplateId = $resData['id'] ?? 'meta_temp_' . uniqid();

            $template->update([
                'status' => 'pending', // Set to pending until webhook notification approval
                'meta_template_id' => $metaTemplateId
            ]);

            return response()->json([
                'message' => 'WhatsApp template submitted to Meta Graph API successfully.',
                'template' => $template
            ]);

        } catch (Exception $e) {
            Log::error("WhatsApp template submission error: " . $e->getMessage());
            return response()->json(['message' => 'Network error submitting template: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Send email template test email.
     */
    public function sendTestEmail(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $template = MessageTemplate::where('tenant_id', $tenantId)->findOrFail($id);

        if ($template->type !== 'email') {
            return response()->json(['message' => 'Only Email templates can trigger test sends.'], 400);
        }

        $validated = $request->validate([
            'email' => 'required|email'
        ]);

        $connection = ChannelConnection::where('tenant_id', $tenantId)->find($template->channel_connection_id);
        if (!$connection || $connection->channel_type !== 'email') {
            return response()->json(['message' => 'Template is not bound to a valid connected Email channel.'], 422);
        }

        $creds = $connection->decrypted_credentials;
        $content = $template->content;

        // Compile graphical drag-and-drop builder blocks to standard HTML string
        $htmlBody = '';
        if (is_array($content) && isset($content['blocks'])) {
            foreach ($content['blocks'] as $block) {
                if ($block['type'] === 'header') {
                    $htmlBody .= '<h2 style="font-size: 22px; font-weight: 800; font-family: sans-serif; color: #0A0A0A; margin: 10px 0 16px;">' . e($block['content']) . '</h2>';
                } elseif ($block['type'] === 'paragraph') {
                    $htmlBody .= '<p style="font-size: 14px; line-height: 1.6; font-family: sans-serif; color: #6B6B6B; margin-bottom: 16px;">' . nl2br(e($block['content'])) . '</p>';
                } elseif ($block['type'] === 'button') {
                    $htmlBody .= '<div style="margin: 20px 0;"><a href="' . e($block['url'] ?? '#') . '" style="background-color: #0A0A0A; color: #FFFFFF; font-family: sans-serif; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 12px; display: inline-block; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' . e($block['content']) . '</a></div>';
                } elseif ($block['type'] === 'divider') {
                    $htmlBody .= '<hr style="border: 0; border-top: 1px solid #E8E8E6; margin: 24px 0;" />';
                } elseif ($block['type'] === 'image') {
                    $htmlBody .= '<div style="margin-bottom: 16px;"><img src="' . e($block['src'] ?? '') . '" alt="" style="max-width: 100%; height: auto; border-radius: 6px;" /></div>';
                }
            }
        } else {
            $htmlBody = $content['body'] ?? '';
        }

        // Interpolate merge tags with preview tags values
        $htmlBody = str_replace(
            ['{{ contact.first_name }}', '{{ contact.last_name }}', '{{ contact.email }}'],
            ['Jane', 'Doe', $validated['email']],
            $htmlBody
        );

        try {
            $driver = new \App\Services\Channels\Drivers\EmailDriver();
            $res = $driver->sendMessage($creds, [
                'external_chat_id' => $validated['email'],
                'body' => "Subject: Test Template: {$template->name}\n\n" . $htmlBody
            ]);

            if ($res['delivery_status'] === 'failed') {
                return response()->json(['message' => 'Failed to send test email: ' . $res['error_message']], 500);
            }

            return response()->json(['message' => 'Test email dispatched successfully.']);

        } catch (Exception $e) {
            Log::error("SMTP template test send error: " . $e->getMessage());
            return response()->json(['message' => 'SMTP exception during test dispatch: ' . $e->getMessage()], 500);
        }
    }
}
