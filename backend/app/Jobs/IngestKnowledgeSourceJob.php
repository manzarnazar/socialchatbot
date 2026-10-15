<?php

namespace App\Jobs;

use App\Models\KnowledgeSource;
use App\Models\KnowledgeChunk;
use App\Services\EmbeddingService;
use App\Services\GoogleSheetsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class IngestKnowledgeSourceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $sourceId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $sourceId)
    {
        $this->sourceId = $sourceId;
    }

    /**
     * Execute the job.
     */
    public function handle(EmbeddingService $embeddingService, GoogleSheetsService $sheetsService): void
    {
        $source = KnowledgeSource::find($this->sourceId);
        if (!$source) {
            Log::error("IngestKnowledgeSourceJob: Source ID {$this->sourceId} not found.");
            return;
        }

        try {
            $source->update([
                'status' => 'indexing',
                'error_reason' => null
            ]);

            // Clear previous chunks
            $source->chunks()->delete();

            $text = '';
            $meta = $source->source_metadata ?: [];

            // 1. Read source data depending on type
            switch ($source->source_type) {
                case 'file':
                    $filePath = $meta['file_path'] ?? null;
                    $disk = 'local';
                    if ($filePath && Storage::disk('local')->exists($filePath)) {
                        $disk = 'local';
                    } elseif ($filePath && Storage::disk('public')->exists($filePath)) {
                        $disk = 'public';
                    } else {
                        throw new Exception("Source file not found at path: " . ($filePath ?: 'empty'));
                    }
                    
                    $fullPath = Storage::disk($disk)->path($filePath);
                    $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
                    
                    if ($extension === 'pdf') {
                        $parser = new \Smalot\PdfParser\Parser();
                        $pdf = $parser->parseFile($fullPath);
                        $text = $pdf->getText();
                    } else {
                        $text = Storage::disk($disk)->get($filePath);
                    }
                    break;

                case 'url':
                    $url = $meta['url'] ?? null;
                    if (!$url) {
                        throw new Exception("URL configuration is missing.");
                    }
                    
                    \App\Services\Security\UrlSecurityValidator::assertSafeUrl($url);

                    $response = \App\Services\Security\UrlSecurityValidator::client(15)->get($url);
                    if (!$response->successful()) {
                        throw new Exception("HTTP request failed with status: " . $response->status());
                    }
                    $text = strip_tags($response->body());
                    break;

                case 'qa':
                    $question = $meta['question'] ?? '';
                    $answer = $meta['answer'] ?? '';
                    if (empty($question) || empty($answer)) {
                        throw new Exception("Q&A Question or Answer cannot be empty.");
                    }
                    $text = "Question: {$question}\nAnswer: {$answer}";
                    break;

                case 'sheet':
                    $spreadsheetId = $meta['spreadsheet_id'] ?? null;
                    $sheetName = $meta['sheet_name'] ?? null;
                    if (!$spreadsheetId || !$sheetName) {
                        throw new Exception("Google Sheet spreadsheet_id or sheet_name is missing.");
                    }

                    $rows = $sheetsService->getSheetData(
                        $source->knowledgeBase->tenant_id,
                        $spreadsheetId,
                        $sheetName
                    );

                    if (empty($rows)) {
                        throw new Exception("Google Sheet returned no row data.");
                    }

                    // Format 2D sheet rows into standard layout text
                    $formattedRows = [];
                    foreach ($rows as $index => $row) {
                        $formattedRows[] = "Row " . ($index + 1) . ": " . implode(' | ', $row);
                    }
                    $text = implode("\n", $formattedRows);
                    break;

                default:
                    throw new Exception("Unsupported source type: " . $source->source_type);
            }

            // 2. Chunk text
            $chunks = $this->chunkText($text, 800, 100);

            // 3. Generate embeddings and save chunks
            $tenantId = $source->knowledgeBase->tenant_id;
            foreach ($chunks as $index => $chunkContent) {
                if (empty(trim($chunkContent))) {
                    continue;
                }

                $vector = $embeddingService->getEmbedding($tenantId, $chunkContent);

                KnowledgeChunk::create([
                    'knowledge_source_id' => $source->id,
                    'chunk_index' => $index,
                    'content' => $chunkContent,
                    'embedding' => $vector
                ]);
            }

            $source->update([
                'status' => 'indexed'
            ]);

        } catch (Exception $e) {
            Log::error("Ingestion failed for source ID {$this->sourceId}: " . $e->getMessage());
            $source->update([
                'status' => 'failed',
                'error_reason' => $e->getMessage()
            ]);
        }
    }

    /**
     * Helper to split text into chunks with overlap.
     */
    private function chunkText(string $text, int $chunkSize = 800, int $overlap = 100): array
    {
        $chunks = [];
        $textLength = mb_strlen($text);
        
        if ($textLength <= $chunkSize) {
            return [$text];
        }
        
        $start = 0;
        while ($start < $textLength) {
            $chunk = mb_substr($text, $start, $chunkSize);
            $chunks[] = $chunk;
            
            $start += ($chunkSize - $overlap);
            if ($chunkSize <= $overlap) {
                $start += $chunkSize;
            }
        }
        
        return $chunks;
    }
}
