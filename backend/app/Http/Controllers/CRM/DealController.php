<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\Deal;
use App\Models\Contact;
use App\Models\ContactActivity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class DealController extends Controller
{
    /**
     * Middleware check for crm plan access.
     */
    protected function checkCrmAccess(Request $request): ?JsonResponse
    {
        $tenant = $request->user()->tenant;
        if (!$tenant || !$tenant->plan || !$tenant->plan->own_crm_access) {
            return response()->json([
                'message' => \App\Services\PlanLimitService::trans('CRM_GATED'),
                'code' => 'CRM_GATED'
            ], 403);
        }
        return null;
    }

    /**
     * List all deals (gated).
     */
    /**
     * List all deals (gated).
     */
    public function index(Request $request): JsonResponse
    {
        if ($gate = $this->checkCrmAccess($request)) {
            return $gate;
        }

        $tenant = $request->user()->tenant;
        $deals = Deal::where('tenant_id', $tenant->id)
            ->with('contact:id,first_name,last_name,email,phone')
            ->orderBy('pipeline_stage_order', 'asc')
            ->get();

        $stages = \App\Models\PipelineStage::where('tenant_id', $tenant->id)
            ->orderBy('sort_order', 'asc')
            ->get();

        if ($stages->isEmpty()) {
            $stages = collect([
                ['key' => 'lead', 'name' => 'Lead Inbox', 'color' => 'bg-zinc-100 text-zinc-700'],
                ['key' => 'qualified', 'name' => 'Qualified', 'color' => 'bg-blue-50 text-blue-800'],
                ['key' => 'proposal', 'name' => 'Proposal', 'color' => 'bg-purple-50 text-purple-800'],
                ['key' => 'negotiation', 'name' => 'Negotiation', 'color' => 'bg-amber-50 text-amber-800'],
                ['key' => 'won', 'name' => 'Closed Won', 'color' => 'bg-emerald-50 text-emerald-800'],
                ['key' => 'lost', 'name' => 'Closed Lost', 'color' => 'bg-red-50 text-red-800'],
            ]);
        }

        return response()->json([
            'deals' => $deals,
            'stages' => $stages,
            'currency' => $tenant->currency ? [
                'code' => $tenant->currency->code,
                'symbol' => $tenant->currency->symbol
            ] : [
                'code' => 'USD',
                'symbol' => '$'
            ]
        ]);
    }

    /**
     * Create a custom pipeline stage (gated).
     */
    public function storeStage(Request $request): JsonResponse
    {
        if ($gate = $this->checkCrmAccess($request)) {
            return $gate;
        }

        $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'color' => ['nullable', 'string', 'max:50'],
        ]);

        $tenant = $request->user()->tenant;
        $key = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $request->name));

        $existingKeys = \App\Models\PipelineStage::where('tenant_id', $tenant->id)->pluck('key')->toArray();
        if (empty($existingKeys)) {
            $defaults = [
                ['key' => 'lead', 'name' => 'Lead Inbox', 'color' => 'bg-zinc-100 text-zinc-700', 'sort_order' => 1],
                ['key' => 'qualified', 'name' => 'Qualified', 'color' => 'bg-blue-50 text-blue-800', 'sort_order' => 2],
                ['key' => 'proposal', 'name' => 'Proposal', 'color' => 'bg-purple-50 text-purple-800', 'sort_order' => 3],
                ['key' => 'negotiation', 'name' => 'Negotiation', 'color' => 'bg-amber-50 text-amber-800', 'sort_order' => 4],
                ['key' => 'won', 'name' => 'Closed Won', 'color' => 'bg-emerald-50 text-emerald-800', 'sort_order' => 5],
                ['key' => 'lost', 'name' => 'Closed Lost', 'color' => 'bg-red-50 text-red-800', 'sort_order' => 6],
            ];
            foreach ($defaults as $d) {
                \App\Models\PipelineStage::create([
                    'tenant_id' => $tenant->id,
                    'key' => $d['key'],
                    'name' => $d['name'],
                    'color' => $d['color'],
                    'sort_order' => $d['sort_order'],
                ]);
            }
            $existingKeys = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
        }

        if (in_array($key, $existingKeys)) {
            return response()->json(['message' => 'A pipeline stage with this name already exists.'], 422);
        }

        $maxSortOrder = \App\Models\PipelineStage::where('tenant_id', $tenant->id)->max('sort_order') ?? 0;
        $color = $request->color ?: 'bg-zinc-100 text-zinc-700';

        $stage = \App\Models\PipelineStage::create([
            'tenant_id' => $tenant->id,
            'key' => $key,
            'name' => $request->name,
            'color' => $color,
            'sort_order' => $maxSortOrder + 1,
        ]);

        return response()->json([
            'message' => 'Pipeline stage created successfully.',
            'stage' => $stage
        ], 201);
    }

    /**
     * Create a deal (gated).
     */
    public function store(Request $request): JsonResponse
    {
        if ($gate = $this->checkCrmAccess($request)) {
            return $gate;
        }

        $tenant = $request->user()->tenant;
        $validKeys = \App\Models\PipelineStage::where('tenant_id', $tenant->id)->pluck('key')->toArray();
        if (empty($validKeys)) {
            $validKeys = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
        }

        $request->validate([
            'title' => ['required', 'string', 'max:100'],
            'amount' => ['required', 'numeric', 'min:0'],
            'stage' => ['required', 'string', 'in:' . implode(',', $validKeys)],
            'contact_id' => [
                'nullable',
                Rule::exists('contacts', 'id')->where('tenant_id', $tenant->id)
            ],
        ]);

        // Calculate sequence order
        $maxOrder = Deal::where('tenant_id', $tenant->id)
            ->where('stage', $request->stage)
            ->max('pipeline_stage_order') ?? 0;

        $deal = Deal::create([
            'tenant_id' => $tenant->id,
            'contact_id' => $request->contact_id,
            'title' => $request->title,
            'amount' => $request->amount,
            'stage' => $request->stage,
            'pipeline_stage_order' => $maxOrder + 1,
        ]);

        // Add timeline log if linked to a contact
        if ($deal->contact_id) {
            ContactActivity::create([
                'tenant_id' => $tenant->id,
                'contact_id' => $deal->contact_id,
                'type' => 'system',
                'description' => "Deal created: '{$deal->title}' with stage: '{$deal->stage}' (Value: \${$deal->amount}).",
                'created_by' => $request->user()->id,
            ]);
        }

        return response()->json([
            'message' => 'Deal created successfully.',
            'deal' => $deal->load('contact:id,first_name,last_name'),
        ], 201);
    }

    /**
     * Drag-reorder deal stage sequence.
     */
    public function updateStageOrder(Request $request): JsonResponse
    {
        if ($gate = $this->checkCrmAccess($request)) {
            return $gate;
        }

        $tenant = $request->user()->tenant;
        $validKeys = \App\Models\PipelineStage::where('tenant_id', $tenant->id)->pluck('key')->toArray();
        if (empty($validKeys)) {
            $validKeys = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
        }

        $request->validate([
            'deal_id' => ['required', 'exists:deals,id'],
            'stage' => ['required', 'string', 'in:' . implode(',', $validKeys)],
            'pipeline_stage_order' => ['required', 'integer'],
        ]);

        $deal = Deal::where('tenant_id', $tenant->id)->findOrFail($request->deal_id);

        $oldStage = $deal->stage;
        $newStage = $request->stage;

        DB::transaction(function() use ($deal, $request) {
            // Shift positions of other deals in target stage
            Deal::where('tenant_id', $deal->tenant_id)
                ->where('stage', $request->stage)
                ->where('pipeline_stage_order', '>=', $request->pipeline_stage_order)
                ->increment('pipeline_stage_order');

            $deal->update([
                'stage' => $request->stage,
                'pipeline_stage_order' => $request->pipeline_stage_order,
            ]);
        });

        // Add timeline log if stage changed and linked to contact
        if ($oldStage !== $newStage && $deal->contact_id) {
            ContactActivity::create([
                'tenant_id' => $tenant->id,
                'contact_id' => $deal->contact_id,
                'type' => 'system',
                'description' => "Deal stage moved from '{$oldStage}' to '{$newStage}'.",
                'created_by' => $request->user()->id,
            ]);
        }

        if ($oldStage !== $newStage) {
            try {
                app(\App\Services\Flow\FlowTriggerService::class)->handleDealUpdated($deal, $oldStage, $newStage);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Failed to trigger deal_updated flow: " . $e->getMessage());
            }
        }

        return response()->json(['message' => 'Deal pipeline stage updated successfully.']);
    }

    /**
     * Delete deal.
     */
    public function destroy(string $id, Request $request): JsonResponse
    {
        if ($gate = $this->checkCrmAccess($request)) {
            return $gate;
        }

        $tenant = $request->user()->tenant;
        $deal = Deal::where('tenant_id', $tenant->id)->findOrFail($id);
        $deal->delete();

        return response()->json(['message' => 'Deal deleted successfully.']);
    }
}
