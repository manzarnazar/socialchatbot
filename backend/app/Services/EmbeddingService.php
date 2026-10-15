<?php

namespace App\Services;

use App\Models\AIProviderConfig;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class EmbeddingService
{
    /**
     * Generate an embedding vector for the given text.
     */
    public function getEmbedding(int $tenantId, string $text): array
    {
        $aiService = app(AIProviderService::class);
        $resolvedAI = $aiService->resolveAIExecution($tenantId, 'knowledge_base_rag');
        $provider = $resolvedAI['provider'];
        $apiKey = $resolvedAI['api_key'];

        if (!empty($apiKey) && $apiKey !== 'mock_key' && !str_starts_with($apiKey, 'mock')) {

            try {
                if ($provider === 'openai') {
                    $response = Http::withToken($apiKey)
                        ->timeout(10)
                        ->post('https://api.openai.com/v1/embeddings', [
                            'input' => $text,
                            'model' => 'text-embedding-3-small',
                        ]);

                    if ($response->successful() && isset($response->json('data')[0]['embedding'])) {
                        return $response->json('data')[0]['embedding'];
                    }

                    Log::warning("OpenAI embedding API failed: " . $response->body());
                } elseif ($provider === 'gemini') {
                    $response = Http::timeout(10)
                        ->post("https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={$apiKey}", [
                            'content' => [
                                'parts' => [
                                    ['text' => $text]
                                ]
                            ]
                        ]);

                    if ($response->successful() && isset($response->json('embedding')['values'])) {
                        return $response->json('embedding')['values'];
                    }

                    Log::warning("Gemini embedding API failed: " . $response->body());
                }
            } catch (Exception $e) {
                Log::error("Embedding Service connection exception: " . $e->getMessage());
            }
        }

        // Deterministic mock fallback only during unit testing
        if (app()->runningUnitTests() || config('app.env') === 'testing') {
            return $this->generateMockVector($text);
        }

        throw new Exception("Embedding generation failed. Please verify your AI provider API key and connection configuration.");
    }

    /**
     * Compute cosine similarity between two float vectors.
     */
    public function cosineSimilarity(array $vec1, array $vec2): float
    {
        $dotProduct = 0.0;
        $normA = 0.0;
        $normB = 0.0;

        $count = min(count($vec1), count($vec2));
        for ($i = 0; $i < $count; $i++) {
            $dotProduct += $vec1[$i] * $vec2[$i];
            $normA += $vec1[$i] * $vec1[$i];
            $normB += $vec2[$i] * $vec2[$i];
        }

        if ($normA === 0.0 || $normB === 0.0) {
            return 0.0;
        }

        return $dotProduct / (sqrt($normA) * sqrt($normB));
    }

    /**
     * Compute keyword, synonym, and term overlap similarity between query and document text across any industry.
     */
    public function textSimilarity(string $query, string $content): float
    {
        $cleanQuery = strtolower(preg_replace('/[^a-z0-9 ]/i', ' ', $query));
        $cleanContent = strtolower(preg_replace('/[^a-z0-9 ]/i', ' ', $content));

        // Universal Multi-Industry Synonyms Matrix
        $synonyms = [
            // Location, Address & Directions
            'location' => ['address', 'avenue', 'street', 'city', 'located', 'where', 'place', 'map', 'directions', 'branch', 'office', 'store', 'center', 'headquarters', 'campus'],
            'located' => ['address', 'avenue', 'street', 'city', 'location', 'where', 'place', 'directions', 'branch', 'office', 'store'],
            'address' => ['location', 'located', 'avenue', 'city', 'street', 'place', 'directions', 'office', 'headquarters'],
            'directions' => ['map', 'location', 'address', 'reach', 'navigate', 'road', 'avenue'],

            // Hours, Timings & Availability
            'hours' => ['timings', 'availability', 'schedule', 'open', 'closed', '24x7', 'mon', 'sat', 'sun', 'working', 'operating', 'slots'],
            'timings' => ['hours', 'availability', 'schedule', 'open', 'closed', '24x7', 'time', 'working', 'operating', 'slots'],
            'time' => ['hours', 'timings', 'availability', 'schedule', 'open', 'closed', 'slots', 'timing'],
            'open' => ['hours', 'timings', 'availability', 'schedule', 'working', 'operating', 'open', '24x7'],

            // Contact & Communication
            'phone' => ['contact', 'call', 'telephone', 'mobile', 'number', 'reach', 'whatsapp', 'helpline', 'hotline'],
            'contact' => ['phone', 'call', 'telephone', 'mobile', 'number', 'email', 'reach', 'whatsapp', 'support', 'helpdesk'],
            'call' => ['phone', 'contact', 'telephone', 'mobile', 'number', 'reach', 'talk'],
            'email' => ['contact', 'mail', 'inbox', 'reach', 'write', 'send'],
            'support' => ['help', 'helpdesk', 'service', 'assistance', 'care', 'customer', 'issue', 'ticket'],

            // Pricing, Costs, Billing & Commercials
            'cost' => ['price', 'fee', 'charge', 'charges', 'pricing', 'package', 'rate', 'plans', 'plan', 'subscription', 'estimate', 'quote', 'costing'],
            'price' => ['cost', 'fee', 'charge', 'charges', 'pricing', 'package', 'rate', 'plans', 'plan', 'subscription', 'estimate', 'quote'],
            'pricing' => ['cost', 'price', 'fee', 'charge', 'plans', 'plan', 'package', 'rate', 'subscription', 'tier', 'tiers'],
            'fee' => ['cost', 'price', 'charge', 'charges', 'pricing', 'rate', 'tuition', 'admission'],
            'discount' => ['offer', 'offers', 'deal', 'deals', 'promo', 'coupon', 'code', 'sale', 'concession'],
            'refund' => ['return', 'moneyback', 'cancellation', 'cancel', 'reimbursement', 'credit'],

            // Booking, Scheduling, Appointments & Reservations
            'book' => ['appointment', 'schedule', 'booking', 'consultation', 'visit', 'reserve', 'reservation', 'demo', 'meeting', 'session', 'slot', 'tour'],
            'booking' => ['book', 'appointment', 'schedule', 'consultation', 'visit', 'reserve', 'reservation', 'demo', 'meeting', 'session', 'slot'],
            'appointment' => ['book', 'booking', 'schedule', 'consultation', 'visit', 'session', 'slot', 'meeting', 'doctor', 'specialist', 'advisor'],
            'reservation' => ['book', 'booking', 'reserve', 'table', 'room', 'seat', 'ticket', 'flight', 'slot'],
            'schedule' => ['timing', 'timings', 'hours', 'calendar', 'slot', 'slots', 'date', 'book', 'appointment'],

            // Products, Services, Catalog & Offerings
            'service' => ['services', 'product', 'products', 'offering', 'offerings', 'features', 'solution', 'solutions', 'facility', 'facilities', 'treatment', 'plan'],
            'services' => ['service', 'product', 'products', 'offerings', 'solutions', 'features', 'facilities', 'departments', 'specialties'],
            'product' => ['products', 'item', 'items', 'catalogue', 'catalog', 'goods', 'merchandise', 'inventory', 'sku', 'service'],
            'products' => ['product', 'items', 'catalogue', 'catalog', 'goods', 'merchandise', 'inventory', 'services'],
            'features' => ['specifications', 'specs', 'capabilities', 'details', 'options', 'functionality', 'highlights'],

            // E-Commerce, Orders & Shipping
            'order' => ['purchase', 'buy', 'track', 'tracking', 'status', 'cart', 'checkout', 'item', 'delivery', 'dispatch'],
            'delivery' => ['shipping', 'dispatch', 'courier', 'track', 'tracking', 'arrive', 'timeline', 'address'],
            'shipping' => ['delivery', 'dispatch', 'courier', 'postage', 'freight', 'tracking'],

            // Real Estate & Property
            'property' => ['apartment', 'flat', 'villa', 'house', 'plot', 'unit', 'building', 'project', 'realestate', 'residence'],
            'rent' => ['lease', 'rental', 'tenant', 'deposit', 'monthly', 'tenancy'],
            'buy' => ['purchase', 'sale', 'acquire', 'own', 'invest', 'investment'],

            // Team, Roles & People
            'team' => ['staff', 'doctor', 'physician', 'specialist', 'surgeon', 'agent', 'representative', 'consultant', 'advisor', 'expert', 'instructor', 'teacher', 'trainer', 'executive', 'manager'],
            'doctor' => ['physician', 'specialist', 'surgeon', 'dr', 'department', 'practitioner', 'consultant'],
            'staff' => ['team', 'members', 'personnel', 'crew', 'agents', 'employees', 'experts'],

            // Policy, Terms, Prerequisites & Requirements
            'policy' => ['rules', 'guidelines', 'terms', 'conditions', 'procedure', 'faq', 'disclaimer'],
            'requirements' => ['prerequisites', 'documents', 'eligibility', 'criteria', 'qualifications', 'needed', 'papers'],
            'about' => ['overview', 'company', 'business', 'who', 'background', 'mission', 'vision', 'story']
        ];

        $stopwords = ['what', 'when', 'which', 'who', 'whom', 'whose', 'why', 'how', 'does', 'do', 'did', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'can', 'could', 'should', 'would', 'may', 'might', 'must', 'the', 'a', 'an', 'and', 'or', 'but', 'if', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'tell', 'me', 'list', 'show', 'give', 'you', 'your', 'please', 'thanks', 'provide'];

        $words = array_values(array_unique(array_filter(explode(' ', $cleanQuery), fn($w) => strlen(trim($w)) >= 2 && !in_array(trim($w), $stopwords))));
        
        if (empty($words)) {
            $words = array_values(array_unique(array_filter(explode(' ', $cleanQuery), fn($w) => strlen(trim($w)) > 1)));
        }

        if (empty($words)) {
            return 0.25; // neutral base score for broad/conversational inputs
        }

        $matchedScore = 0.0;
        foreach ($words as $word) {
            $wordFound = false;

            // 1. Direct substring match
            if (str_contains($cleanContent, $word)) {
                $matchedScore += 1.0;
                $wordFound = true;
            } else {
                // 2. Stem / prefix match (e.g. 'pediatric' vs 'pediatrics', 'schedul' vs 'schedule')
                if (strlen($word) >= 4) {
                    $stem = substr($word, 0, strlen($word) - 1);
                    if (str_contains($cleanContent, $stem)) {
                        $matchedScore += 0.85;
                        $wordFound = true;
                    }
                }
            }

            // 3. Synonym dictionary expansion
            if (!$wordFound && isset($synonyms[$word])) {
                foreach ($synonyms[$word] as $syn) {
                    if (str_contains($cleanContent, $syn)) {
                        $matchedScore += 0.75;
                        break;
                    }
                }
            }
        }

        return min(1.0, $matchedScore / max(1, count($words)));
    }

    /**
     * Generate a deterministic pseudo-random float vector seeded on the text content.
     */
    private function generateMockVector(string $text): array
    {
        // Compute seed based on text content
        $seed = crc32($text);
        
        // Simple LCG (Linear Congruential Generator) to be deterministic and self-contained
        $m = 2147483647; // 2^31 - 1
        $a = 48271;
        $c = 0;
        $current = $seed % $m;
        if ($current < 0) {
            $current += $m;
        }

        $vector = [];
        $magnitude = 0.0;

        // Generate 1536 floats
        for ($i = 0; $i < 1536; $i++) {
            $current = ($a * $current + $c) % $m;
            $val = ($current / $m) * 2.0 - 1.0; // [-1.0, 1.0]
            $vector[] = $val;
            $magnitude += $val * $val;
        }

        // Normalize the vector
        if ($magnitude > 0) {
            $norm = sqrt($magnitude);
            for ($i = 0; $i < 1536; $i++) {
                $vector[$i] = $vector[$i] / $norm;
            }
        }

        return $vector;
    }
}
