<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Campaign;
use App\Models\Appointment;
use App\Models\AiAgentLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardAnalyticsController extends Controller
{
    /**
     * Retrieve tenant-level dynamic workspace analytics.
     */
    public function getAnalytics(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        
        $startDate = $request->query('start_date')
            ? Carbon::parse($request->query('start_date'))->startOfDay()
            : Carbon::now()->subDays(30)->startOfDay();

        $endDate = $request->query('end_date')
            ? Carbon::parse($request->query('end_date'))->endOfDay()
            : Carbon::now()->endOfDay();

        // 1. Conversation Volume
        $conversationVolume = Conversation::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();

        // 2. Average Response Times
        $convIds = Conversation::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->pluck('id');

        $messages = Message::whereIn('conversation_id', $convIds)
            ->orderBy('conversation_id')
            ->orderBy('created_at')
            ->get();

        $diffs = [];
        $lastInboundTime = null;
        $currentConvId = null;

        foreach ($messages as $msg) {
            if ($currentConvId !== $msg->conversation_id) {
                $currentConvId = $msg->conversation_id;
                $lastInboundTime = null;
            }

            if ($msg->direction === 'inbound') {
                $lastInboundTime = $msg->created_at;
            } elseif ($msg->direction === 'outbound' && $lastInboundTime) {
                $diffs[] = $msg->created_at->diffInSeconds($lastInboundTime);
                $lastInboundTime = null; // Only count first response per conversation cycle
            }
        }

        $avgResponseTimeSec = count($diffs) > 0 ? array_sum($diffs) / count($diffs) : 0;
        $avgResponseTimeMinutes = $avgResponseTimeSec > 0 ? round($avgResponseTimeSec / 60, 1) : 0;

        // 3. AI Performance
        $aiTriggers = AiAgentLog::whereIn('conversation_id', $convIds)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        $aiTriggersCount = $aiTriggers->count();
        $avgLatencyMs = $aiTriggersCount > 0 ? round($aiTriggers->avg('latency_ms')) : 0;
        $totalTokens = $aiTriggersCount > 0 ? $aiTriggers->sum(fn($log) => $log->request_tokens + $log->response_tokens) : 0;
        $estimatedCost = $aiTriggersCount > 0 ? $aiTriggers->sum('estimated_cost') : 0.0;

        // 4. Campaign Performance
        $campaigns = Campaign::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        $campaignStats = [
            'sent' => $campaigns->sum('sent_count'),
            'delivered' => $campaigns->sum('delivered_count'),
            'read' => $campaigns->sum('read_count'),
            'replied' => $campaigns->sum('replied_count'),
        ];

        // 5. Appointment Conversion
        $appointments = Appointment::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        $appointmentsCount = $appointments->count();
        $scheduledCount = $appointments->where('status', 'scheduled')->count();
        $cancelledCount = $appointments->where('status', 'cancelled')->count();
        $completedCount = $appointments->where('status', 'completed')->count();

        // 6. Daily Trend for Conversation Volume Charting
        $trend = [];
        $tempDate = clone $startDate;
        // Limit daily intervals to maximum of 31 days to keep SVG rendering simple
        $daysCount = $startDate->diffInDays($endDate);
        $stepDays = $daysCount > 31 ? ceil($daysCount / 10) : 1;

        while ($tempDate->lte($endDate)) {
            $dayStart = (clone $tempDate)->startOfDay();
            $dayEnd = $stepDays > 1 ? (clone $tempDate)->addDays($stepDays - 1)->endOfDay() : (clone $tempDate)->endOfDay();

            $count = Conversation::where('tenant_id', $tenantId)
                ->whereBetween('created_at', [$dayStart, $dayEnd])
                ->count();

            $aiCount = AiAgentLog::whereIn('conversation_id', $convIds)
                ->whereBetween('created_at', [$dayStart, $dayEnd])
                ->count();

            $trend[] = [
                'label' => $tempDate->format('M d'),
                'count' => $count,
                'ai_count' => $aiCount
            ];

            $tempDate->addDays($stepDays);
        }

        // 7. Recent List Data for Tables
        $recentCampaigns = Campaign::where('tenant_id', $tenantId)
            ->orderBy('id', 'desc')
            ->take(5)
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'status' => $c->status,
                'sent' => $c->sent_count,
                'read' => $c->read_count
            ]);

        $recentAppointments = Appointment::where('tenant_id', $tenantId)
            ->with('contact')
            ->orderBy('start_time', 'desc')
            ->take(5)
            ->get()
            ->map(fn($app) => [
                'id' => $app->id,
                'contact_name' => $app->contact ? trim($app->contact->first_name . ' ' . $app->contact->last_name) : 'Anonymous',
                'start_time' => $app->start_time->toIso8601String(),
                'status' => $app->status
            ]);

        $tenant = $request->user()->tenant;
        $currencyInfo = $tenant->currency ? [
            'code' => $tenant->currency->code,
            'symbol' => $tenant->currency->symbol
        ] : [
            'code' => 'USD',
            'symbol' => '$'
        ];

        return response()->json([
            'conversation_volume' => $conversationVolume,
            'avg_response_time' => $avgResponseTimeMinutes,
            'ai_performance' => [
                'triggers' => $aiTriggersCount,
                'avg_latency_ms' => $avgLatencyMs,
                'total_tokens' => $totalTokens,
                'estimated_cost' => (float)$estimatedCost,
            ],
            'campaign_stats' => $campaignStats,
            'appointments' => [
                'total' => $appointmentsCount,
                'scheduled' => $scheduledCount,
                'cancelled' => $cancelledCount,
                'completed' => $completedCount,
            ],
            'trend' => $trend,
            'recent_campaigns' => $recentCampaigns,
            'recent_appointments' => $recentAppointments,
            'currency' => $currencyInfo
        ]);
    }
}
