<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FlowTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminFlowTemplateController extends Controller
{
    /**
     * List all flow templates (Superadmin).
     */
    public function index(Request $request): JsonResponse
    {
        $query = FlowTemplate::query();

        if ($request->filled('search')) {
            $search = '%' . trim($request->input('search')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', $search)
                  ->orWhere('description', 'like', $search)
                  ->orWhere('slug', 'like', $search)
                  ->orWhere('category', 'like', $search);
            });
        }

        if ($request->filled('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('status')) {
            if ($request->input('status') === 'published') {
                $query->where('is_published', true);
            } elseif ($request->input('status') === 'draft') {
                $query->where('is_published', false);
            }
        }

        $templates = $query->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json($templates);
    }

    /**
     * Show single flow template.
     */
    public function show($id): JsonResponse
    {
        $template = FlowTemplate::where('id', $id)
            ->orWhere('slug', $id)
            ->firstOrFail();

        return response()->json($template);
    }

    /**
     * Create new flow template.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:flow_templates,slug',
            'category' => 'required|string|max:100',
            'description' => 'nullable|string',
            'trigger_type' => 'required|string|max:50',
            'trigger_keywords' => 'nullable|array',
            'definition' => 'required|array',
            'is_published' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        if (empty($validated['slug'])) {
            $baseSlug = Str::slug($validated['name']);
            $slug = $baseSlug;
            $counter = 1;
            while (FlowTemplate::where('slug', $slug)->exists()) {
                $slug = $baseSlug . '-' . $counter++;
            }
            $validated['slug'] = $slug;
        }

        $validated['is_published'] = $request->boolean('is_published', true);
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        $template = FlowTemplate::create($validated);

        return response()->json([
            'message' => 'Flow template created successfully.',
            'template' => $template,
        ], 201);
    }

    /**
     * Update flow template.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $template = FlowTemplate::where('id', $id)
            ->orWhere('slug', $id)
            ->firstOrFail();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('flow_templates', 'slug')->ignore($template->id)],
            'category' => 'required|string|max:100',
            'description' => 'nullable|string',
            'trigger_type' => 'required|string|max:50',
            'trigger_keywords' => 'nullable|array',
            'definition' => 'required|array',
            'is_published' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = $template->slug;
        }

        if ($request->has('is_published')) {
            $validated['is_published'] = $request->boolean('is_published');
        }

        $template->update($validated);

        return response()->json([
            'message' => 'Flow template updated successfully.',
            'template' => $template,
        ]);
    }

    /**
     * Toggle publish status.
     */
    public function togglePublish($id): JsonResponse
    {
        $template = FlowTemplate::where('id', $id)
            ->orWhere('slug', $id)
            ->firstOrFail();

        $template->is_published = !$template->is_published;
        $template->save();

        return response()->json([
            'message' => $template->is_published ? 'Template published to workspace library.' : 'Template unpublished and moved to draft.',
            'is_published' => $template->is_published,
            'template' => $template,
        ]);
    }

    /**
     * Delete flow template.
     */
    public function destroy($id): JsonResponse
    {
        $template = FlowTemplate::where('id', $id)
            ->orWhere('slug', $id)
            ->firstOrFail();

        $template->delete();

        return response()->json([
            'message' => 'Flow template deleted successfully.',
        ]);
    }
}
