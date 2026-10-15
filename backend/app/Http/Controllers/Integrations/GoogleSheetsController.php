<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Services\GoogleSheetsService;
use App\Models\TenantGoogleToken;
use App\Models\Contact;
use App\Models\ContactActivity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class GoogleSheetsController extends Controller
{
    protected GoogleSheetsService $sheetsService;

    public function __construct(GoogleSheetsService $sheetsService)
    {
        $this->sheetsService = $sheetsService;
    }

    /**
     * Get the status of Google integration.
     */
    public function status(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $sheetsToken = TenantGoogleToken::where('tenant_id', $tenant->id)->where('type', 'sheets')->first();
        $calendarToken = TenantGoogleToken::where('tenant_id', $tenant->id)->where('type', 'calendar')->first();

        return response()->json([
            'sheets_connected' => (bool)$sheetsToken,
            'sheets_email' => $sheetsToken ? $sheetsToken->email : null,
            'calendar_connected' => (bool)$calendarToken,
            'calendar_email' => $calendarToken ? $calendarToken->email : null,
            'configured' => $this->sheetsService->isConfigured(),
        ]);
    }

    /**
     * Get OAuth Authorization URL.
     */
    public function getAuthUrl(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $type = $request->query('type', 'sheets');
        $integrationKey = ($type === 'calendar') ? 'google_calendar' : 'google_sheets';

        if ($tenant) {
            $limitCheck = app(\App\Services\PlanLimitService::class)->canUseIntegration($tenant, $integrationKey);
            if (!$limitCheck['allowed']) {
                return response()->json([
                    'message' => $limitCheck['reason'],
                    'error_code' => $limitCheck['code']
                ], 403);
            }
        }

        $url = $this->sheetsService->getAuthUrl($tenant->id, $type, $request->user()->id);

        return response()->json(['url' => $url]);
    }

    /**
     * Google OAuth Callback receiver.
     */
    public function callback(Request $request)
    {
        $stateStr = $request->query('state');
        $code = $request->query('code');

        $frontendUrl = \App\Providers\AppServiceProvider::getFrontendUrl($request->user());

        $stateData = \App\Services\Security\OAuthStateService::validateAndConsumeState($stateStr, 'google');

        if (!$stateData || !$code) {
            return redirect($frontendUrl . '/settings/integrations?google_error=' . urlencode('Invalid or expired OAuth state token.'));
        }

        $tenantId = (int)$stateData['tenant_id'];
        $type = $stateData['meta']['type'] ?? 'sheets';

        try {
            $this->sheetsService->handleCallback($code, $tenantId, $type);
            return redirect($frontendUrl . "/settings/integrations?google_{$type}_success=true");
        } catch (Exception $e) {
            Log::error('Google callback error: ' . $e->getMessage());
            return redirect($frontendUrl . '/settings/integrations?google_error=' . urlencode($e->getMessage()));
        }
    }

    /**
     * Disconnect Google account.
     */
    public function disconnect(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $type = $request->query('type', 'sheets');
        TenantGoogleToken::where('tenant_id', $tenant->id)->where('type', $type)->delete();

        return response()->json(['message' => "Disconnected Google {$type} successfully."]);
    }

    /**
     * List user's spreadsheets.
     */
    public function listSpreadsheets(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        try {
            $files = $this->sheetsService->listSpreadsheets($tenant->id);
            return response()->json(['spreadsheets' => $files]);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * List sheet tabs for a spreadsheet.
     */
    public function listSheets(Request $request, string $spreadsheetId): JsonResponse
    {
        $tenant = $request->user()->tenant;
        try {
            $sheets = $this->sheetsService->listSheets($tenant->id, $spreadsheetId);
            return response()->json(['sheets' => $sheets]);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Preview sheets data (the first 10 rows).
     */
    public function previewSheet(Request $request, string $spreadsheetId, string $sheetName): JsonResponse
    {
        $tenant = $request->user()->tenant;
        try {
            $rows = $this->sheetsService->getSheetData($tenant->id, $spreadsheetId, $sheetName);
            $preview = array_slice($rows, 0, 11);
            return response()->json(['rows' => $preview]);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Map spreadsheet columns and import contacts.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'spreadsheet_id' => ['required', 'string'],
            'sheet_name' => ['required', 'string'],
            'mapping' => ['required', 'array'],
            'duplicate_strategy' => ['required', 'string', 'in:merge,keep'],
        ]);

        $tenant = $request->user()->tenant;
        $spreadsheetId = $request->input('spreadsheet_id');
        $sheetName = $request->input('sheet_name');
        $mapping = $request->input('mapping');
        $duplicateStrategy = $request->input('duplicate_strategy');

        try {
            $rows = $this->sheetsService->getSheetData($tenant->id, $spreadsheetId, $sheetName);
            if (empty($rows)) {
                return response()->json(['message' => 'No rows found in this sheet tab.'], 400);
            }

            $dataRows = array_slice($rows, 1);

            $imported = 0;
            $merged = 0;

            DB::beginTransaction();

            foreach ($dataRows as $row) {
                $first_name = isset($mapping['first_name']) && isset($row[$mapping['first_name']]) ? trim($row[$mapping['first_name']]) : null;
                $last_name = isset($mapping['last_name']) && isset($row[$mapping['last_name']]) ? trim($row[$mapping['last_name']]) : null;
                $email = isset($mapping['email']) && isset($row[$mapping['email']]) ? trim($row[$mapping['email']]) : null;
                $phone = isset($mapping['phone']) && isset($row[$mapping['phone']]) ? trim($row[$mapping['phone']]) : null;
                $tagsRaw = isset($mapping['tags']) && isset($row[$mapping['tags']]) ? trim($row[$mapping['tags']]) : '';
                
                $tags = $tagsRaw ? array_map('trim', explode(',', $tagsRaw)) : [];

                if (!$email && !$phone) {
                    continue;
                }

                $existing = null;
                if ($duplicateStrategy === 'merge') {
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
                        'description' => 'Merged contact data via Google Sheet sync.',
                        'created_by' => $request->user()->id,
                    ]);
                } else {
                    $contact = Contact::create([
                        'tenant_id' => $tenant->id,
                        'first_name' => $first_name,
                        'last_name' => $last_name,
                        'email' => $email,
                        'phone' => $phone,
                        'lifecycle_stage' => 'lead',
                        'tags' => $tags,
                        'custom_fields' => [],
                        'opted_out_channels' => [],
                    ]);

                    ContactActivity::create([
                        'tenant_id' => $tenant->id,
                        'contact_id' => $contact->id,
                        'type' => 'system',
                        'description' => 'Contact created via Google Sheet sync.',
                        'created_by' => $request->user()->id,
                    ]);

                    $imported++;
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Contacts imported successfully from Google Sheet.',
                'imported' => $imported,
                'merged' => $merged,
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Google Sheet import error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to import sheet values: ' . $e->getMessage()], 500);
        }
    }
}
