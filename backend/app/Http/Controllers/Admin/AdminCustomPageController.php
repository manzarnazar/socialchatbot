<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustomPage;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminCustomPageController extends Controller
{
    /**
     * List all custom pages (Super Admin).
     */
    public function index(): JsonResponse
    {
        $pages = CustomPage::orderBy('id', 'asc')->get();
        return response()->json($pages);
    }

    /**
     * Show single custom page details (Super Admin).
     */
    public function show(string $slug): JsonResponse
    {
        $page = CustomPage::where('slug', $slug)->firstOrFail();
        return response()->json($page);
    }

    /**
     * Update custom page content & settings (Super Admin).
     */
    public function update(Request $request, string $slug): JsonResponse
    {
        $page = CustomPage::where('slug', $slug)->firstOrFail();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'meta_description' => 'nullable|string|max:500',
            'is_published' => 'required|boolean',
        ]);

        $page->update($validated);

        return response()->json([
            'message' => 'Page updated successfully.',
            'page' => $page,
        ]);
    }

    /**
     * Public endpoint to fetch all published custom pages (for navigation/footers).
     */
    public function publicIndex(): JsonResponse
    {
        $pages = CustomPage::where('is_published', true)
            ->select('id', 'slug', 'title', 'meta_description', 'updated_at')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json($pages);
    }

    /**
     * Public endpoint to fetch published custom page content by slug.
     */
    public function publicShow(string $slug): JsonResponse
    {
        $page = CustomPage::where('slug', $slug)
            ->where('is_published', true)
            ->firstOrFail();

        return response()->json($page);
    }
}
