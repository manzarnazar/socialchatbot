<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\KnowledgeBase;
use App\Models\KnowledgeSource;
use App\Models\KnowledgeChunk;
use App\Jobs\IngestKnowledgeSourceJob;
use App\Services\EmbeddingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Exception;

class KnowledgeBaseController extends Controller
{
    /**
     * List all knowledge bases for the current tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $bases = KnowledgeBase::where('tenant_id', $tenantId)
            ->withCount('sources')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($bases);
    }

    /**
     * Create a new knowledge base.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $tenantId = $request->user()->tenant_id ?? 1;

        $kb = KnowledgeBase::create([
            'tenant_id' => $tenantId,
            'name' => trim($request->input('name')),
            'description' => trim($request->input('description')),
        ]);

        return response()->json($kb, 201);
    }

    /**
     * Update a knowledge base name/description.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $tenantId = $request->user()->tenant_id ?? 1;
        $kb = KnowledgeBase::where('tenant_id', $tenantId)->findOrFail($id);

        $kb->update([
            'name' => trim($request->input('name')),
            'description' => trim($request->input('description')),
        ]);

        return response()->json($kb);
    }

    /**
     * Show a single knowledge base with its sources.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $kb = KnowledgeBase::where('tenant_id', $tenantId)
            ->with(['sources' => function ($q) {
                $q->orderBy('id', 'desc');
            }])
            ->findOrFail($id);

        return response()->json($kb);
    }

    /**
     * Delete a knowledge base.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $kb = KnowledgeBase::where('tenant_id', $tenantId)->findOrFail($id);
        
        // Delete any uploaded source files associated with this KB
        foreach ($kb->sources as $source) {
            if ($source->source_type === 'file') {
                $meta = $source->source_metadata;
                if (!empty($meta['file_path'])) {
                    if (Storage::disk('local')->exists($meta['file_path'])) {
                        Storage::disk('local')->delete($meta['file_path']);
                    }
                    if (Storage::disk('public')->exists($meta['file_path'])) {
                        Storage::disk('public')->delete($meta['file_path']);
                    }
                }
            }
        }

        $kb->delete();

        return response()->json(['message' => 'Knowledge base deleted successfully.']);
    }

    /**
     * Add a resource source to a knowledge base.
     */
    public function addSource(Request $request, $id): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $kb = KnowledgeBase::where('tenant_id', $tenantId)->findOrFail($id);

        $request->validate([
            'source_type' => 'required|string|in:file,url,qa,sheet',
            'source_name' => 'nullable|string|max:255',
            // File upload validators
            'file' => 'nullable|file|mimes:pdf,txt,doc,docx,csv,json,xlsx,md|max:10240',
            // URL validator
            'url' => 'nullable|url',
            // Q&A validators
            'question' => 'nullable|string',
            'answer' => 'nullable|string',
            // Google Sheet validators
            'spreadsheet_id' => 'nullable|string',
            'spreadsheet_name' => 'nullable|string',
            'sheet_name' => 'nullable|string',
        ]);

        $type = $request->input('source_type');
        $name = $request->input('source_name');
        $metadata = [];

        switch ($type) {
            case 'file':
                if (!$request->hasFile('file')) {
                    return response()->json(['message' => 'No file was uploaded.'], 422);
                }
                $file = $request->file('file');
                $path = $file->store('knowledge_files', 'local');
                $name = $name ?: $file->getClientOriginalName();
                $metadata = [
                    'file_path' => $path,
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getClientMimeType(),
                ];
                break;

            case 'url':
                $url = $request->input('url');
                if (empty($url)) {
                    return response()->json(['message' => 'URL input field is required.'], 422);
                }
                $name = $name ?: $url;
                $metadata = ['url' => $url];
                break;

            case 'qa':
                $question = $request->input('question');
                $answer = $request->input('answer');
                if (empty($question) || empty($answer)) {
                    return response()->json(['message' => 'Both question and answer fields are required.'], 422);
                }
                $name = $name ?: 'Q&A: ' . substr($question, 0, 40) . '...';
                $metadata = [
                    'question' => $question,
                    'answer' => $answer
                ];
                break;

            case 'sheet':
                $spreadsheetId = $request->input('spreadsheet_id');
                $spreadsheetName = $request->input('spreadsheet_name') ?: 'Google Sheet';
                $sheetName = $request->input('sheet_name');
                if (empty($spreadsheetId) || empty($sheetName)) {
                    return response()->json(['message' => 'Google Spreadsheet ID and Tab Name are required.'], 422);
                }
                $name = $name ?: "{$spreadsheetName} ({$sheetName})";
                $metadata = [
                    'spreadsheet_id' => $spreadsheetId,
                    'spreadsheet_name' => $spreadsheetName,
                    'sheet_name' => $sheetName,
                ];
                break;
        }

        $source = KnowledgeSource::create([
            'knowledge_base_id' => $kb->id,
            'source_type' => $type,
            'source_name' => $name,
            'source_metadata' => $metadata,
            'status' => 'pending',
        ]);

        // Dispatch chunking and indexing job
        IngestKnowledgeSourceJob::dispatch($source->id);

        return response()->json($source, 201);
    }

    /**
     * Delete a single knowledge source.
     */
    public function deleteSource(Request $request, $sourceId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $source = KnowledgeSource::whereHas('knowledgeBase', function ($q) use ($tenantId) {
            $q->where('tenant_id', $tenantId);
        })->findOrFail($sourceId);

        if ($source->source_type === 'file') {
            $meta = $source->source_metadata;
            if (!empty($meta['file_path'])) {
                if (Storage::disk('local')->exists($meta['file_path'])) {
                    Storage::disk('local')->delete($meta['file_path']);
                }
                if (Storage::disk('public')->exists($meta['file_path'])) {
                    Storage::disk('public')->delete($meta['file_path']);
                }
            }
        }

        $source->delete();

        return response()->json(['message' => 'Knowledge source deleted successfully.']);
    }

    /**
     * Manually trigger re-indexing of a knowledge source.
     */
    public function reindexSource(Request $request, $sourceId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $source = KnowledgeSource::whereHas('knowledgeBase', function ($q) use ($tenantId) {
            $q->where('tenant_id', $tenantId);
        })->findOrFail($sourceId);

        $source->update([
            'status' => 'pending',
            'error_reason' => null
        ]);

        IngestKnowledgeSourceJob::dispatch($source->id);

        return response()->json(['message' => 'Re-indexing queued.', 'status' => 'pending']);
    }

    /**
     * Perform vector search similarity matching query on knowledge base.
     */
    public function query(Request $request, $id, EmbeddingService $embeddingService): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? 1;
        $kb = KnowledgeBase::where('tenant_id', $tenantId)->findOrFail($id);

        $request->validate([
            'query' => 'required|string|max:500',
            'limit' => 'nullable|integer|min:1|max:10',
        ]);

        $queryText = trim($request->input('query'));
        $limit = (int) $request->input('limit', 4);

        // A. Generate embedding for query string
        $queryVector = $embeddingService->getEmbedding($tenantId, $queryText);

        // B. Fetch all chunks belonging to this KB
        $chunks = KnowledgeChunk::whereHas('source', function ($q) use ($id) {
            $q->where('knowledge_base_id', $id)->where('status', 'indexed');
        })->with('source')->get();

        // C. Calculate cosine similarity
        $matches = [];
        foreach ($chunks as $chunk) {
            $similarity = $embeddingService->cosineSimilarity($queryVector, $chunk->embedding);
            $matches[] = [
                'chunk_id' => $chunk->id,
                'source_name' => $chunk->source->source_name,
                'source_type' => $chunk->source->source_type,
                'content' => $chunk->content,
                'similarity' => round($similarity, 4),
            ];
        }

        // D. Sort descending by similarity
        usort($matches, function ($a, $b) {
            return $b['similarity'] <=> $a['similarity'];
        });

        // E. Take top-k results
        $results = array_slice($matches, 0, $limit);

        return response()->json([
            'query' => $queryText,
            'matches' => $results,
        ]);
    }
}
