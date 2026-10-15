<?php

namespace App\Services;

use App\Models\KnowledgeChunk;
use App\Models\KnowledgeBase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Exception;

class RAGService
{
    protected EmbeddingService $embeddingService;

    public function __construct(EmbeddingService $embeddingService)
    {
        $this->embeddingService = $embeddingService;
    }

    /**
     * Search similar knowledge base chunks using embedding cosine similarity and text matching.
     *
     * @param int $knowledgeBaseId
     * @param string $query
     * @param int $limit
     * @return Collection<KnowledgeChunk>
     */
    public function searchSimilarChunks(int $knowledgeBaseId, string $query, int $limit = 4): Collection
    {
        $kb = KnowledgeBase::find($knowledgeBaseId);
        if (!$kb) {
            return collect();
        }

        try {
            $queryVector = $this->embeddingService->getEmbedding($kb->tenant_id, $query);

            $chunks = KnowledgeChunk::whereHas('source', function ($q) use ($knowledgeBaseId) {
                $q->where('knowledge_base_id', $knowledgeBaseId)->where('status', 'indexed');
            })->with('source')->get();

            if ($chunks->isEmpty()) {
                return collect();
            }

            $matches = [];
            foreach ($chunks as $chunk) {
                $vectorSim = 0.0;
                if (!empty($chunk->embedding) && !empty($queryVector)) {
                    $vectorSim = $this->embeddingService->cosineSimilarity($queryVector, $chunk->embedding);
                }

                $textSim = $this->embeddingService->textSimilarity($query, $chunk->content ?? '');
                $similarity = max($vectorSim, $textSim);

                if ($similarity >= 0.05) {
                    $chunk->similarity = $similarity;
                    $matches[] = $chunk;
                }
            }

            // Fallback: If no chunks met similarity threshold, return top chunks
            if (empty($matches) && $chunks->isNotEmpty()) {
                foreach ($chunks as $chunk) {
                    $chunk->similarity = 0.1;
                    $matches[] = $chunk;
                }
            }

            usort($matches, fn($a, $b) => ($b->similarity ?? 0.0) <=> ($a->similarity ?? 0.0));

            return collect(array_slice($matches, 0, $limit));

        } catch (Exception $e) {
            Log::error("RAGService searchSimilarChunks failed: " . $e->getMessage());
            return collect();
        }
    }
}
