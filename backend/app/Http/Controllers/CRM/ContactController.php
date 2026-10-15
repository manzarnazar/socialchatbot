<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactActivity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ContactController extends Controller
{
    /**
     * List all contacts.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $query = Contact::where('tenant_id', $tenant->id);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('stage')) {
            $query->where('lifecycle_stage', $request->stage);
        }

        $contacts = $query->orderBy('created_at', 'desc')->paginate(30);

        return response()->json([
            'contacts' => $contacts->items(),
            'total' => $contacts->total(),
            'pages' => $contacts->lastPage(),
        ]);
    }

    /**
     * Create contact (with auto-deduplication/merge logic).
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'first_name' => ['nullable', 'string', 'max:50'],
            'last_name' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'lifecycle_stage' => ['nullable', 'string', 'max:30'],
            'tags' => ['nullable', 'array'],
            'custom_fields' => ['nullable', 'array'],
            'opted_out_channels' => ['nullable', 'array'],
            'keep_separate' => ['nullable', 'boolean'],
        ]);

        $tenant = $request->user()->tenant;
        $email = $request->email;
        $phone = $request->phone;
        $keepSeparate = $request->boolean('keep_separate', false);

        $existing = null;

        // Deduplication lookup
        if (!$keepSeparate) {
            if ($email) {
                $existing = Contact::where('tenant_id', $tenant->id)
                    ->where('email', $email)
                    ->first();
            }
            if (!$existing && $phone) {
                $existing = Contact::where('tenant_id', $tenant->id)
                    ->where('phone', $phone)
                    ->first();
            }
        }

        if ($existing) {
            // Merge logic
            $existing->first_name = $existing->first_name ?: $request->first_name;
            $existing->last_name = $existing->last_name ?: $request->last_name;
            if ($request->email) $existing->email = $request->email;
            if ($request->phone) $existing->phone = $request->phone;
            if ($request->lifecycle_stage) $existing->lifecycle_stage = $request->lifecycle_stage;

            // Merge tags
            $newTags = $request->tags ?? [];
            $existing->tags = array_values(array_unique(array_merge($existing->tags ?? [], $newTags)));

            // Merge custom fields
            $newFields = $request->custom_fields ?? [];
            $existing->custom_fields = array_merge($existing->custom_fields ?? [], $newFields);

            // Merge opt-outs
            $newOptOuts = $request->opted_out_channels ?? [];
            $existing->opted_out_channels = array_values(array_unique(array_merge($existing->opted_out_channels ?? [], $newOptOuts)));

            $existing->save();

            // Log activity
            ContactActivity::create([
                'tenant_id' => $tenant->id,
                'contact_id' => $existing->id,
                'type' => 'system',
                'description' => 'Contact automatically merged with new incoming record data.',
                'created_by' => $request->user()->id,
            ]);

            return response()->json([
                'message' => 'Contact matched and merged successfully.',
                'contact' => $existing,
                'merged' => true,
            ]);
        }

        // Create new contact
        $contact = Contact::create([
            'tenant_id' => $tenant->id,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'phone' => $request->phone,
            'lifecycle_stage' => $request->lifecycle_stage ?? 'lead',
            'tags' => $request->tags ?? [],
            'custom_fields' => $request->custom_fields ?? [],
            'opted_out_channels' => $request->opted_out_channels ?? [],
        ]);

        ContactActivity::create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'type' => 'system',
            'description' => 'Contact record created.',
            'created_by' => $request->user()->id,
        ]);

        try {
            app(\App\Services\Flow\FlowTriggerService::class)->handleContactCreated($contact);
        } catch (\Throwable $e) {
            Log::error("Failed to trigger contact_created flow: " . $e->getMessage());
        }

        return response()->json([
            'message' => 'Contact created successfully.',
            'contact' => $contact,
            'merged' => false,
        ], 201);
    }

    /**
     * Show contact detail view.
     */
    public function show(string $id, Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $contact = Contact::where('tenant_id', $tenant->id)->findOrFail($id);

        $activities = ContactActivity::where('contact_id', $contact->id)
            ->with('creator:id,first_name,last_name')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'contact' => $contact,
            'activities' => $activities,
        ]);
    }

    /**
     * Update contact.
     */
    public function update(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'first_name' => ['nullable', 'string', 'max:50'],
            'last_name' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'lifecycle_stage' => ['nullable', 'string', 'max:30'],
            'tags' => ['nullable', 'array'],
            'custom_fields' => ['nullable', 'array'],
            'opted_out_channels' => ['nullable', 'array'],
        ]);

        $tenant = $request->user()->tenant;
        $contact = Contact::where('tenant_id', $tenant->id)->findOrFail($id);

        $changes = [];
        if ($request->filled('lifecycle_stage') && $request->lifecycle_stage !== $contact->lifecycle_stage) {
            $changes[] = "lifecycle stage changed from '{$contact->lifecycle_stage}' to '{$request->lifecycle_stage}'";
        }

        $contact->update($request->only([
            'first_name',
            'last_name',
            'email',
            'phone',
            'lifecycle_stage',
            'tags',
            'custom_fields',
            'opted_out_channels',
        ]));

        if (!empty($changes)) {
            ContactActivity::create([
                'tenant_id' => $tenant->id,
                'contact_id' => $contact->id,
                'type' => 'lifecycle_change',
                'description' => implode(', ', $changes) . '.',
                'created_by' => $request->user()->id,
            ]);
        }

        return response()->json([
            'message' => 'Contact details updated.',
            'contact' => $contact,
        ]);
    }

    /**
     * Delete contact.
     */
    public function destroy(string $id, Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $contact = Contact::where('tenant_id', $tenant->id)->findOrFail($id);
        $contact->delete();

        return response()->json([
            'message' => 'Contact deleted successfully.',
        ]);
    }

    /**
     * Append a timeline activity note.
     */
    public function addNote(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'note' => ['required', 'string'],
        ]);

        $tenant = $request->user()->tenant;
        $contact = Contact::where('tenant_id', $tenant->id)->findOrFail($id);

        $activity = ContactActivity::create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'type' => 'note',
            'description' => $request->note,
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Note added to activity log.',
            'activity' => $activity->load('creator:id,first_name,last_name'),
        ], 201);
    }

    /**
     * Import Contacts from CSV.
     */
    public function importCsv(Request $request): JsonResponse
    {
        if ($request->has('contacts')) {
            $request->validate([
                'contacts' => ['required', 'array'],
                'contacts.*.email' => ['nullable', 'string'],
                'contacts.*.phone' => ['nullable', 'string'],
            ]);
            $tenant = $request->user()->tenant;
            $contactsData = $request->input('contacts');
            $imported = 0;
            $merged = 0;
            $createdContacts = [];
            DB::beginTransaction();
            try {
                foreach ($contactsData as $item) {
                    $first_name = isset($item['first_name']) ? trim($item['first_name']) : null;
                    $last_name = isset($item['last_name']) ? trim($item['last_name']) : null;
                    $email = isset($item['email']) ? trim($item['email']) : null;
                    $phone = isset($item['phone']) ? trim($item['phone']) : null;
                    $stage = isset($item['lifecycle_stage']) ? trim($item['lifecycle_stage']) : 'lead';
                    $tags = isset($item['tags']) ? (is_array($item['tags']) ? $item['tags'] : array_map('trim', explode(',', $item['tags']))) : [];

                    if (!$email && !$phone) continue;

                    $existing = null;
                    if ($request->input('duplicate_strategy', 'merge') === 'merge') {
                        if ($email) {
                            $existing = Contact::where('tenant_id', $tenant->id)->where('email', $email)->first();
                        }
                        if (!$existing && $phone) {
                            $existing = Contact::where('tenant_id', $tenant->id)->where('phone', $phone)->first();
                        }
                    }

                    if ($existing) {
                        $existing->first_name = $existing->first_name ?: $first_name;
                        $existing->last_name = $existing->last_name ?: $last_name;
                        if ($tags) {
                            $existing->tags = array_values(array_unique(array_merge($existing->tags ?? [], $tags)));
                        }
                        $existing->save();
                        $merged++;
                        ContactActivity::create([
                            'tenant_id' => $tenant->id,
                            'contact_id' => $existing->id,
                            'type' => 'system',
                            'description' => 'Merged contact data via bulk import.',
                            'created_by' => $request->user()->id,
                        ]);
                    } else {
                        $contact = Contact::create([
                            'tenant_id' => $tenant->id,
                            'first_name' => $first_name,
                            'last_name' => $last_name,
                            'email' => $email,
                            'phone' => $phone,
                            'lifecycle_stage' => $stage ?: 'lead',
                            'tags' => $tags,
                            'custom_fields' => [],
                            'opted_out_channels' => [],
                        ]);
                        ContactActivity::create([
                            'tenant_id' => $tenant->id,
                            'contact_id' => $contact->id,
                            'type' => 'system',
                            'description' => 'Contact created via bulk import.',
                            'created_by' => $request->user()->id,
                        ]);
                        $createdContacts[] = $contact;
                        $imported++;
                    }
                }
                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                \Log::error('Bulk import failed: ' . $e->getMessage());
                return response()->json(['message' => 'Failed to import records.'], 500);
            }

            foreach ($createdContacts as $newContact) {
                try {
                    app(\App\Services\Flow\FlowTriggerService::class)->handleContactCreated($newContact);
                } catch (\Throwable $e) {
                    \Log::error("Failed to trigger contact_created flow for imported contact: " . $e->getMessage());
                }
            }
            return response()->json([
                'message' => 'Bulk contacts imported successfully.',
                'imported' => $imported,
                'merged' => $merged,
            ]);
        }

        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ]);

        $tenant = $request->user()->tenant;
        $file = $request->file('file');
        $path = $file->getRealPath();

        $rows = array_map(function($line) {
            return str_getcsv($line);
        }, file($path));

        if (count($rows) <= 1) {
            return response()->json(['message' => 'CSV file is empty.'], 400);
        }

        $header = array_shift($rows);
        $headerMap = array_flip(array_map('strtolower', $header));

        $imported = 0;
        $merged = 0;
        $createdContacts = [];

        DB::beginTransaction();
        try {
            foreach ($rows as $row) {
                if (empty($row) || count($row) < count($headerMap)) continue;

                $first_name = isset($headerMap['first_name']) ? trim($row[$headerMap['first_name']]) : null;
                $last_name = isset($headerMap['last_name']) ? trim($row[$headerMap['last_name']]) : null;
                $email = isset($headerMap['email']) ? trim($row[$headerMap['email']]) : null;
                $phone = isset($headerMap['phone']) ? trim($row[$headerMap['phone']]) : null;
                $stage = isset($headerMap['lifecycle_stage']) ? trim($row[$headerMap['lifecycle_stage']]) : 'lead';
                
                $tagsRaw = isset($headerMap['tags']) ? trim($row[$headerMap['tags']]) : '';
                $tags = $tagsRaw ? array_map('trim', explode(',', $tagsRaw)) : [];

                if (!$email && !$phone) continue; // Skip rows without identifiers

                // Deduplicate check
                $existing = null;
                if ($email) {
                    $existing = Contact::where('tenant_id', $tenant->id)->where('email', $email)->first();
                }
                if (!$existing && $phone) {
                    $existing = Contact::where('tenant_id', $tenant->id)->where('phone', $phone)->first();
                }

                if ($existing) {
                    // Merge
                    $existing->first_name = $existing->first_name ?: $first_name;
                    $existing->last_name = $existing->last_name ?: $last_name;
                    if ($tags) {
                        $existing->tags = array_values(array_unique(array_merge($existing->tags ?? [], $tags)));
                    }
                    $existing->save();
                    $merged++;

                    ContactActivity::create([
                        'tenant_id' => $tenant->id,
                        'contact_id' => $existing->id,
                        'type' => 'system',
                        'description' => 'Merged contact data via CSV import.',
                        'created_by' => $request->user()->id,
                    ]);
                } else {
                    // Create new
                    $contact = Contact::create([
                        'tenant_id' => $tenant->id,
                        'first_name' => $first_name,
                        'last_name' => $last_name,
                        'email' => $email,
                        'phone' => $phone,
                        'lifecycle_stage' => $stage ?: 'lead',
                        'tags' => $tags,
                        'custom_fields' => [],
                        'opted_out_channels' => [],
                    ]);

                    ContactActivity::create([
                        'tenant_id' => $tenant->id,
                        'contact_id' => $contact->id,
                        'type' => 'system',
                        'description' => 'Contact imported via CSV file.',
                        'created_by' => $request->user()->id,
                    ]);
                    $createdContacts[] = $contact;
                    $imported++;
                }
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CSV CRM Import failed: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to parse and import CSV records.'], 500);
        }

        foreach ($createdContacts as $newContact) {
            try {
                app(\App\Services\Flow\FlowTriggerService::class)->handleContactCreated($newContact);
            } catch (\Throwable $e) {
                Log::error("Failed to trigger contact_created flow for CSV imported contact: " . $e->getMessage());
            }
        }

        return response()->json([
            'message' => 'CSV file processed successfully.',
            'imported' => $imported,
            'merged' => $merged,
        ]);
    }

    /**
     * Mute or unmute a contact.
     */
    public function mute(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $contact = Contact::where('tenant_id', $tenantId)->findOrFail($id);

        $data = $request->validate([
            'is_muted' => 'required|boolean',
        ]);

        $contact->update([
            'is_muted' => $data['is_muted']
        ]);

        ContactActivity::create([
            'tenant_id' => $tenantId,
            'contact_id' => $contact->id,
            'type' => 'system',
            'description' => $data['is_muted'] ? 'Contact muted in Shared Inbox.' : 'Contact unmuted in Shared Inbox.',
            'created_by' => $request->user()->id,
        ]);

        return response()->json($contact);
    }
}
