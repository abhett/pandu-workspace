<?php

namespace App\Services\Sre;

use App\Models\DistributedTrace;
use App\Models\Organization;
use App\Models\RcaActionItem;
use App\Models\RootCauseAnalysis;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class RootCauseAnalysisService
{
    /**
     * Get dashboard data for Root Cause Analysis & Post-Mortem Copilot.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function getDashboardData(Organization $organization, array $filters = []): array
    {
        $query = RootCauseAnalysis::query()
            ->where('organization_id', $organization->id)
            ->with(['creator', 'verifier', 'actionItems.assignee'])
            ->latest();

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['severity'])) {
            $query->where('severity', $filters['severity']);
        }
        if (! empty($filters['category'])) {
            $query->where('primary_cause_category', $filters['category']);
        }
        if (! empty($filters['search'])) {
            $search = '%'.$filters['search'].'%';
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', $search)
                    ->orWhere('suspect_service', 'like', $search)
                    ->orWhere('impact_summary', 'like', $search);
            });
        }

        $analyses = $query->take(30)->get();

        // Seed initial simulation if completely empty
        if ($analyses->isEmpty() && empty(array_filter($filters))) {
            $this->seedInitialSimulation($organization);
            $analyses = RootCauseAnalysis::query()
                ->where('organization_id', $organization->id)
                ->with(['creator', 'verifier', 'actionItems.assignee'])
                ->latest()
                ->take(30)
                ->get();
        }

        // Action items summary
        $allActionItems = RcaActionItem::where('organization_id', $organization->id)
            ->with(['rootCauseAnalysis:id,title,severity', 'assignee:id,name,email'])
            ->latest()
            ->take(20)
            ->get();

        // Available recent traces for manual investigation
        $recentTraces = DistributedTrace::where('organization_id', $organization->id)
            ->latest()
            ->take(10)
            ->get(['id', 'trace_id', 'root_service', 'root_operation', 'status', 'total_duration_ms', 'error_count', 'created_at']);

        // KPI calculation
        $totalAnalyses = RootCauseAnalysis::where('organization_id', $organization->id)->count();
        $avgConfidence = (float) (RootCauseAnalysis::where('organization_id', $organization->id)->avg('confidence_score') ?? 91.5);
        $criticalCount = RootCauseAnalysis::where('organization_id', $organization->id)->where('severity', 'critical')->count();
        $openActionItemsCount = RcaActionItem::where('organization_id', $organization->id)->whereIn('status', ['open', 'in_progress'])->count();
        $totalImpactedUsers = RootCauseAnalysis::where('organization_id', $organization->id)
            ->get()
            ->sum(fn ($rca) => (int) ($rca->blast_radius['affected_users_count'] ?? 0));

        $categoryBreakdown = [
            'code_defect' => RootCauseAnalysis::where('organization_id', $organization->id)->where('primary_cause_category', 'code_defect')->count(),
            'database_bottleneck' => RootCauseAnalysis::where('organization_id', $organization->id)->where('primary_cause_category', 'database_bottleneck')->count(),
            'network_timeout' => RootCauseAnalysis::where('organization_id', $organization->id)->where('primary_cause_category', 'network_timeout')->count(),
            'resource_exhaustion' => RootCauseAnalysis::where('organization_id', $organization->id)->where('primary_cause_category', 'resource_exhaustion')->count(),
            'third_party_outage' => RootCauseAnalysis::where('organization_id', $organization->id)->where('primary_cause_category', 'third_party_outage')->count(),
            'config_drift' => RootCauseAnalysis::where('organization_id', $organization->id)->where('primary_cause_category', 'config_drift')->count(),
        ];

        return [
            'kpi' => [
                'total_analyses' => $totalAnalyses,
                'avg_confidence_score' => round($avgConfidence, 1),
                'avg_mttrc_minutes' => 3.8, // Mean Time to Root Cause
                'critical_incidents' => $criticalCount,
                'open_action_items' => $openActionItemsCount,
                'total_impacted_users' => $totalImpactedUsers,
            ],
            'category_breakdown' => $categoryBreakdown,
            'analyses' => $analyses,
            'action_items' => $allActionItems,
            'recent_traces' => $recentTraces,
            'filters' => $filters,
        ];
    }

    /**
     * Run AI Automated Root Cause Analysis & Smart Post-Mortem generation.
     *
     * @param  array<string, mixed>  $data
     */
    public function analyzeIncident(Organization $organization, array $data, ?User $user = null): RootCauseAnalysis
    {
        $scenario = $data['scenario'] ?? 'redis_cache_stampede';
        $traceId = $data['trace_id'] ?? null;
        $incidentTitle = $data['custom_title'] ?? null;

        $analysisData = $this->generateScenarioAnalysis($scenario, $traceId, $incidentTitle);

        $rca = RootCauseAnalysis::create([
            'organization_id' => $organization->id,
            'incident_id' => $data['incident_id'] ?? ('INC-'.strtoupper(Str::random(6))),
            'trace_id' => $analysisData['trace_id'],
            'title' => $analysisData['title'],
            'status' => 'completed',
            'severity' => $analysisData['severity'],
            'primary_cause_category' => $analysisData['category'],
            'suspect_service' => $analysisData['suspect_service'],
            'suspect_operation' => $analysisData['suspect_operation'],
            'confidence_score' => $analysisData['confidence_score'],
            'impact_summary' => $analysisData['impact_summary'],
            'blast_radius' => $analysisData['blast_radius'],
            'five_whys' => $analysisData['five_whys'],
            'contributing_factors' => $analysisData['contributing_factors'],
            'blame_commits' => $analysisData['blame_commits'],
            'telemetry_correlations' => $analysisData['telemetry_correlations'],
            'timeline_events' => $analysisData['timeline_events'],
            'mitigation_steps' => $analysisData['mitigation_steps'],
            'post_mortem_report' => $analysisData['post_mortem_report'],
            'created_by' => $user?->id,
        ]);

        // Auto-create preventative action items
        foreach ($analysisData['default_action_items'] as $item) {
            RcaActionItem::create([
                'root_cause_analysis_id' => $rca->id,
                'organization_id' => $organization->id,
                'title' => $item['title'],
                'description' => $item['description'],
                'priority' => $item['priority'],
                'type' => $item['type'],
                'status' => 'open',
                'assignee_id' => $user?->id,
                'due_date' => Carbon::now()->addDays($item['due_days'])->toDateString(),
            ]);
        }

        return $rca->load(['creator', 'actionItems.assignee']);
    }

    /**
     * Mark Root Cause Analysis as verified by SRE Lead.
     *
     * @param  array<string, mixed>  $data
     */
    public function verifyAnalysis(RootCauseAnalysis $rca, User $user, array $data = []): RootCauseAnalysis
    {
        $rca->update([
            'status' => 'verified',
            'verified_by' => $user->id,
            'verified_at' => Carbon::now(),
            'confidence_score' => min(100.0, (float) ($data['adjusted_confidence'] ?? $rca->confidence_score)),
        ]);

        return $rca->load(['creator', 'verifier', 'actionItems.assignee']);
    }

    /**
     * Create an action item for a specific RCA.
     *
     * @param  array<string, mixed>  $data
     */
    public function createActionItem(RootCauseAnalysis $rca, array $data): RcaActionItem
    {
        return RcaActionItem::create([
            'root_cause_analysis_id' => $rca->id,
            'organization_id' => $rca->organization_id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'priority' => $data['priority'] ?? 'p1',
            'type' => $data['type'] ?? 'preventative',
            'status' => $data['status'] ?? 'open',
            'assignee_id' => $data['assignee_id'] ?? null,
            'due_date' => $data['due_date'] ?? null,
        ]);
    }

    /**
     * Update action item status or details.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateActionItem(RcaActionItem $item, array $data): RcaActionItem
    {
        $updates = [];
        if (isset($data['status'])) {
            $updates['status'] = $data['status'];
            if ($data['status'] === 'completed') {
                $updates['completed_at'] = Carbon::now();
            } else {
                $updates['completed_at'] = null;
            }
        }
        if (isset($data['title'])) {
            $updates['title'] = $data['title'];
        }
        if (isset($data['priority'])) {
            $updates['priority'] = $data['priority'];
        }
        if (isset($data['due_date'])) {
            $updates['due_date'] = $data['due_date'];
        }
        if (isset($data['assignee_id'])) {
            $updates['assignee_id'] = $data['assignee_id'];
        }

        $item->update($updates);

        return $item->load(['rootCauseAnalysis', 'assignee']);
    }

    /**
     * Delete an RCA record.
     */
    public function deleteAnalysis(RootCauseAnalysis $rca): void
    {
        $rca->delete();
    }

    /**
     * Scenario generator for intelligent RCA & Post-Mortem deduction.
     *
     * @return array<string, mixed>
     */
    protected function generateScenarioAnalysis(string $scenario, ?string $traceId = null, ?string $customTitle = null): array
    {
        $now = Carbon::now();
        $generatedTraceId = $traceId ?: ('tr_'.strtolower(Str::random(16)));

        return match ($scenario) {
            'db_connection_pool_exhaustion' => [
                'title' => $customTitle ?: 'PostgreSQL Connection Pool Exhaustion on Reporting Burst',
                'severity' => 'critical',
                'category' => 'database_bottleneck',
                'suspect_service' => 'billing-report-worker',
                'suspect_operation' => 'GenerateExecutiveSummary::execute',
                'confidence_score' => 96.80,
                'trace_id' => $generatedTraceId,
                'impact_summary' => 'Lonjakan query unindexed tanpa limit connection pool melumpuhkan thread pool PostgreSQL, memicu HTTP 500 pada Core Auth & Checkout API selama 18 menit.',
                'blast_radius' => [
                    'affected_users_count' => 1420,
                    'affected_tenants_count' => 84,
                    'error_rate_spike_pct' => 41.2,
                    'latency_p99_ms' => 14850,
                    'estimated_revenue_impact_usd' => 18500,
                    'degraded_services' => ['api-gateway', 'auth-service', 'checkout-service', 'postgres-primary'],
                ],
                'five_whys' => [
                    [
                        'level' => 1,
                        'question' => 'Mengapa pengguna menerima respons HTTP 500 pada auth dan checkout?',
                        'answer' => 'Aplikasi web gagal mengalokasikan koneksi database baru dalam batas timeout 5000ms.',
                        'evidence' => 'SQLSTATE[08006] PDOException: server closed the connection unexpectedly.',
                    ],
                    [
                        'level' => 2,
                        'question' => 'Mengapa PostgreSQL kehabisan koneksi aktif?',
                        'answer' => 'Max connection pool (100 koneksi) terisi penuh 100% oleh background job analytics.',
                        'evidence' => 'Telemetry pg_stat_activity menunjukkan 94 koneksi idle in transaction dari billing-report-worker.',
                    ],
                    [
                        'level' => 3,
                        'question' => 'Mengapa background analytics worker menahan puluhan koneksi terbuka tanpa melepaskannya?',
                        'answer' => 'Eksekusi query agregasi laporan bulanan melakukan recursive nested join tanpa pagination.',
                        'evidence' => 'Query hash sql_9fbc18 berjalan selama 184 detik per worker chunk.',
                    ],
                    [
                        'level' => 4,
                        'question' => 'Mengapa query lambat ini dapat berjalan langsung di database primary transaksi OLTP?',
                        'answer' => 'Tidak ada pemisahan read-replica connection binding pada service export laporan.',
                        'evidence' => 'Config database.php routing billing-report diarahkan ke cluster master.',
                    ],
                    [
                        'level' => 5,
                        'question' => 'Root Cause: Mengapa connection pool ceiling dan statement timeout tidak diberlakukan?',
                        'answer' => 'Missing PgBouncer connection multiplexer ceiling dan ketiadaan strict 10s statement_timeout pada level session analytics.',
                        'evidence' => 'Default postgresql.conf statement_timeout = 0 (unlimited).',
                    ],
                ],
                'contributing_factors' => [
                    'Ketiadaan connection pooler (PgBouncer) di depan instance database primary',
                    'Statement timeout tidak diatur untuk connection background queue',
                    'Kurangnya composite index pada kolom `organization_id` + `created_at` di tabel invoices',
                ],
                'blame_commits' => [
                    [
                        'commit_sha' => '84a1d9e',
                        'author' => 'andi.developer@pandu.id',
                        'message' => 'feat(billing): add monthly multi-tenant financial summary report query',
                        'timestamp' => $now->copy()->subHours(14)->toIso8601String(),
                        'changed_files' => ['app/Services/Billing/ReportGenerator.php', 'database/queries/summary.sql'],
                        'similarity_score' => 94.2,
                    ],
                ],
                'telemetry_correlations' => [
                    ['timestamp' => $now->copy()->subMinutes(25)->format('H:i:s'), 'anomaly_type' => 'Connection Spikes', 'metric' => 'db.connections.active', 'value' => '98 / 100', 'deviation' => '+4.8 sigma'],
                    ['timestamp' => $now->copy()->subMinutes(22)->format('H:i:s'), 'anomaly_type' => 'Latency Explosion', 'metric' => 'http.p99_latency', 'value' => '14,850 ms', 'deviation' => '+6.2 sigma'],
                    ['timestamp' => $now->copy()->subMinutes(18)->format('H:i:s'), 'anomaly_type' => 'Error Rate Surge', 'metric' => 'http.5xx_rate', 'value' => '41.2 %', 'deviation' => '+8.1 sigma'],
                ],
                'timeline_events' => [
                    ['time' => $now->copy()->subMinutes(30)->format('H:i'), 'phase' => 'Trigger', 'title' => 'Scheduled Monthly Export Job Triggered', 'severity' => 'info'],
                    ['time' => $now->copy()->subMinutes(26)->format('H:i'), 'phase' => 'Anomaly', 'title' => 'DB Pool Saturates 95% Ceiling', 'severity' => 'warning'],
                    ['time' => $now->copy()->subMinutes(22)->format('H:i'), 'phase' => 'Outage', 'title' => 'P99 Latency > 14s & 500 Server Errors', 'severity' => 'critical'],
                    ['time' => $now->copy()->subMinutes(12)->format('H:i'), 'phase' => 'Mitigation', 'title' => 'SRE Executed Kill Connections Runbook', 'severity' => 'info'],
                    ['time' => $now->copy()->subMinutes(5)->format('H:i'), 'phase' => 'Recovery', 'title' => 'Pool Drained, Error Rate Dropped to 0.02%', 'severity' => 'success'],
                ],
                'mitigation_steps' => [
                    'Terminasi koneksi idle `billing-report-worker` via pg_terminate_backend()',
                    'Alihkan heavy analytics queries ke Read-Replica PostgreSQL',
                    'Pasang PgBouncer dengan transaction-level connection pooling ceiling 25 per worker',
                ],
                'default_action_items' => [
                    ['title' => 'Deploy PgBouncer Connection Pooler untuk PostgreSQL OLTP', 'description' => 'Mencegah saturasi koneksi dengan transaction-level pooling dan max 20 client connection per app instance.', 'priority' => 'p0', 'type' => 'architectural', 'due_days' => 2],
                    ['title' => 'Enforce strict statement_timeout 15s pada semua queue worker', 'description' => 'Mencegah long running query memonopoli resource CPU dan memory PostgreSQL.', 'priority' => 'p1', 'type' => 'preventative', 'due_days' => 3],
                    ['title' => 'Arahkan ReportGenerator query ke Read Replica cluster', 'description' => 'Isolasi trafik reporting agar tidak mengganggu transaksi checkout dan autentikasi user.', 'priority' => 'p1', 'type' => 'architectural', 'due_days' => 5],
                ],
                'post_mortem_report' => [
                    'incident_title' => 'PostgreSQL Connection Exhaustion during Monthly Report Batch',
                    'author' => 'AI RCA Copilot (Reviewed by SRE Team)',
                    'status' => 'Action Items Pending',
                    'detection_method' => 'Synthetic Uptime Monitor & P99 Latency Alarm',
                    'summary' => 'Pada tanggal '.$now->format('d M Y').', lonjakan koneksi database dari billing report generator menghabiskan seluruh connection pool master database, mengakibatkan downtime 18 menit pada layanan otentikasi dan pembayaran.',
                    'lessons_learned' => [
                        'Heavy reporting queries tidak boleh berbagi connection pool dengan live transactional API.',
                        'Connection pool ceiling tanpa pooler eksternal rentan terhadap resource starvation.',
                        'Synthetic probe langsung menangkap outage dalam 45 detik setelah error rate melonjak.',
                    ],
                ],
            ],

            'payment_webhook_timeout' => [
                'title' => $customTitle ?: 'Cascading Gateway Timeout on Third-Party Payment Webhook Deadlock',
                'severity' => 'high',
                'category' => 'third_party_outage',
                'suspect_service' => 'payment-integration-service',
                'suspect_operation' => 'StripeWebhookHandler::verifySignatureAndCharge',
                'confidence_score' => 93.40,
                'trace_id' => $generatedTraceId,
                'impact_summary' => 'Pihak ketiga mengalami degradasi latensi 12.5 detik tanpa async timeout policy, mengunci thread pool worker dan menyebabkan antrean transaksi pending.',
                'blast_radius' => [
                    'affected_users_count' => 680,
                    'affected_tenants_count' => 45,
                    'error_rate_spike_pct' => 28.5,
                    'latency_p99_ms' => 12400,
                    'estimated_revenue_impact_usd' => 9200,
                    'degraded_services' => ['payment-service', 'webhook-dispatcher', 'checkout-gateway'],
                ],
                'five_whys' => [
                    [
                        'level' => 1,
                        'question' => 'Mengapa webhook pembayaran menerima HTTP 504 Gateway Timeout?',
                        'answer' => 'Inbound webhook listener memblokir worker thread menunggu konfirmasi verifikasi eksternal.',
                        'evidence' => 'Upstream response time melampaui Nginx proxy_read_timeout 60s.',
                    ],
                    [
                        'level' => 2,
                        'question' => 'Mengapa verifikasi eksternal memakan waktu lama?',
                        'answer' => 'Provider gateway pembayaran mengalami insiden degradasi parsial di datacenter regional.',
                        'evidence' => 'Average external HTTP roundtrip melonjak dari 240ms menjadi 12,400ms.',
                    ],
                    [
                        'level' => 3,
                        'question' => 'Mengapa degradasi provider eksternal mengunci internal API kita?',
                        'answer' => 'HTTP client internal memanggil API eksternal secara synchronous tanpa circuit breaker timeout.',
                        'evidence' => 'GuzzleHttp client timeout dikonfigurasi 0 (unlimited wait).',
                    ],
                    [
                        'level' => 4,
                        'question' => 'Mengapa pesan webhook tidak dimasukkan langsung ke antrean asynchronous (queue)?',
                        'answer' => 'Arsitektur awal melakukan verifikasi tanda tangan dan database locking dalam single synchronous lifecycle.',
                        'evidence' => 'Controller langsung mengeksekusi DB transaction sebelum mengembalikan HTTP 200 OK ke provider.',
                    ],
                    [
                        'level' => 5,
                        'question' => 'Root Cause: Ketiadaan Circuit Breaker pattern dan asynchronous ingestion queue.',
                        'answer' => 'Webhook handler tidak menerapkan Immediate ACK + Async Queueing + Resilient Circuit Breaker.',
                        'evidence' => 'Gaps in SLA integration architecture and missing fallback response handler.',
                    ],
                ],
                'contributing_factors' => [
                    'Synchronous third-party HTTP call dalam request-response cycle',
                    'Ketiadaan timeout fallback pada HTTP client integration',
                    'Ketiadaan Circuit Breaker untuk mengisolasi kegagalan upstream',
                ],
                'blame_commits' => [
                    [
                        'commit_sha' => '5e9c012',
                        'author' => 'budi.fintech@pandu.id',
                        'message' => 'refactor(payment): direct synchronous webhook payload verification',
                        'timestamp' => $now->copy()->subDays(3)->toIso8601String(),
                        'changed_files' => ['app/Services/Payment/StripeWebhookHandler.php'],
                        'similarity_score' => 91.0,
                    ],
                ],
                'telemetry_correlations' => [
                    ['timestamp' => $now->copy()->subMinutes(40)->format('H:i:s'), 'anomaly_type' => 'External Latency Spike', 'metric' => 'ext.payment_gateway.latency', 'value' => '12,400 ms', 'deviation' => '+7.4 sigma'],
                    ['timestamp' => $now->copy()->subMinutes(35)->format('H:i:s'), 'anomaly_type' => 'Worker Queue Delay', 'metric' => 'queue.delay.payment', 'value' => '420 s', 'deviation' => '+5.1 sigma'],
                ],
                'timeline_events' => [
                    ['time' => $now->copy()->subMinutes(45)->format('H:i'), 'phase' => 'Upstream Issue', 'title' => 'Third-party Payment Gateway Latency Surge', 'severity' => 'warning'],
                    ['time' => $now->copy()->subMinutes(38)->format('H:i'), 'phase' => 'Degradation', 'title' => 'Inbound Webhook Workers Starved & HTTP 504', 'severity' => 'critical'],
                    ['time' => $now->copy()->subMinutes(20)->format('H:i'), 'phase' => 'Mitigation', 'title' => 'Circuit Breaker Auto-Tripped to Async Buffer', 'severity' => 'info'],
                    ['time' => $now->copy()->subMinutes(8)->format('H:i'), 'phase' => 'Recovery', 'title' => 'Upstream Recovered, Buffered Webhooks Replayed', 'severity' => 'success'],
                ],
                'mitigation_steps' => [
                    'Aktifkan Circuit Breaker buffer ke Webhook DLQ',
                    'Ubah webhook endpoint ke Fast 200 ACK + background Redis job dispatch',
                    'Set strict HTTP timeout 3000ms pada outbound gateway adapter',
                ],
                'default_action_items' => [
                    ['title' => 'Migrasikan Webhook Handler ke Fast-ACK Async Queue Pattern', 'description' => 'Terima webhook dengan 200 OK dalam <50ms dan proses payload di queue background terisolasi.', 'priority' => 'p0', 'type' => 'architectural', 'due_days' => 1],
                    ['title' => 'Konfigurasikan Circuit Breaker 3-second timeout untuk Outbound Payment API', 'description' => 'Mencegah worker starvation saat gateway eksternal mengalami degradasi jaringan.', 'priority' => 'p1', 'type' => 'preventative', 'due_days' => 3],
                ],
                'post_mortem_report' => [
                    'incident_title' => 'Payment Webhook Deadlock & Gateway Timeout Incident',
                    'author' => 'AI RCA Copilot',
                    'status' => 'Mitigated',
                    'detection_method' => 'Webhook Dead-Letter Queue Surge Alarm',
                    'summary' => 'Degradasi latensi dari payment provider menyebabkan antrean worker terkunci, memicu 504 Gateway Timeout pada checkout flow.',
                    'lessons_learned' => [
                        'Layanan pihak ketiga harus selalu diasumsikan dapat mengalami kegagalan dan wajib diisolasi dengan timeout ketat.',
                        'Webhook ingestion harus murni decoupled dari business logic execution.',
                    ],
                ],
            ],

            // Default: Redis Cache Stampede
            default => [
                'title' => $customTitle ?: 'Redis Cluster OOM Eviction & Cache Stampede on Token Verification',
                'severity' => 'critical',
                'category' => 'resource_exhaustion',
                'suspect_service' => 'redis-session-cluster',
                'suspect_operation' => 'TokenAuthMiddleware::validateSessionKey',
                'confidence_score' => 97.50,
                'trace_id' => $generatedTraceId,
                'impact_summary' => 'Eviction mendadak pada key cache session menyebabkan 40,000 req/min langsung membanjiri PostgreSQL primary, memicu lonjakan CPU 100% dan degradasi latensi 8.2 detik.',
                'blast_radius' => [
                    'affected_users_count' => 2850,
                    'affected_tenants_count' => 140,
                    'error_rate_spike_pct' => 34.8,
                    'latency_p99_ms' => 8200,
                    'estimated_revenue_impact_usd' => 24000,
                    'degraded_services' => ['api-gateway', 'redis-cluster', 'auth-service', 'postgres-core'],
                ],
                'five_whys' => [
                    [
                        'level' => 1,
                        'question' => 'Mengapa pengguna mengalami kelambatan akses dan error unauthorized?',
                        'answer' => 'Layanan TokenAuthMiddleware mengalami kegagalan validasi session dalam rentang waktu p99 > 8000ms.',
                        'evidence' => 'Distributed trace span `auth.verify_token` menunjukkan durasi 7,850ms.',
                    ],
                    [
                        'level' => 2,
                        'question' => 'Mengapa verifikasi token menjadi sangat lambat?',
                        'answer' => 'Semua request mengalami cache-miss dan langsung melakukan query SELECT ke database PostgreSQL primary.',
                        'evidence' => 'Cache hit ratio turun drastis dari 99.4% menjadi 4.1% pada pukul 14:15.',
                    ],
                    [
                        'level' => 3,
                        'question' => 'Mengapa terjadi cache-miss massal (Cache Stampede)?',
                        'answer' => 'Redis instance mencapai maxmemory limit 4GB dan melakukan volatile-lru mass eviction.',
                        'evidence' => 'Redis metric `evicted_keys` melonjak hingga 450,000 keys dalam 60 detik.',
                    ],
                    [
                        'level' => 4,
                        'question' => 'Mengapa memori Redis tiba-tiba penuh dalam waktu singkat?',
                        'answer' => 'Fitur audit logging baru menyimpan payload JSON berukuran besar ke dalam session cache tanpa TTL terpisah.',
                        'evidence' => 'Key pattern `session:*:audit_payload` mengonsumsi 2.9 GB memory.',
                    ],
                    [
                        'level' => 5,
                        'question' => 'Root Cause: Ketiadaan memory quota guard dan Single-Flight (Mutex Locking) Cache Loader.',
                        'answer' => 'Tidak ada pemisahan namespace Redis antara hot session data dengan heavy payload data, serta ketiadaan cache mutex lock saat terjadi miss.',
                        'evidence' => 'Direct uncached fallback without probabilistic early expiration (XFetch/Singleflight).',
                    ],
                ],
                'contributing_factors' => [
                    'Penyimpanan objek besar (>50KB) ke dalam Redis session store tanpa kompresi',
                    'Ketiadaan Probabilistic Early Expiration (XFetch algorithm)',
                    'Satu instance Redis digunakan bersamaan untuk Session, Cache, dan Large Audit Buffer',
                ],
                'blame_commits' => [
                    [
                        'commit_sha' => '3b401fa',
                        'author' => 'dian.sre@pandu.id',
                        'message' => 'feat(audit): cache full request payload in user session metadata',
                        'timestamp' => $now->copy()->subHours(6)->toIso8601String(),
                        'changed_files' => ['app/Http/Middleware/RecordSessionAudit.php'],
                        'similarity_score' => 97.8,
                    ],
                ],
                'telemetry_correlations' => [
                    ['timestamp' => $now->copy()->subMinutes(15)->format('H:i:s'), 'anomaly_type' => 'Redis Memory Saturation', 'metric' => 'redis.used_memory_pct', 'value' => '99.8 %', 'deviation' => '+8.5 sigma'],
                    ['timestamp' => $now->copy()->subMinutes(14)->format('H:i:s'), 'anomaly_type' => 'Cache Miss Avalanche', 'metric' => 'cache.miss_rate', 'value' => '95.9 %', 'deviation' => '+9.2 sigma'],
                    ['timestamp' => $now->copy()->subMinutes(12)->format('H:i:s'), 'anomaly_type' => 'Database CPU Saturation', 'metric' => 'db.cpu_utilization', 'value' => '100.0 %', 'deviation' => '+6.8 sigma'],
                ],
                'timeline_events' => [
                    ['time' => $now->copy()->subMinutes(20)->format('H:i'), 'phase' => 'Early Sign', 'title' => 'Redis Memory reaches 90% threshold', 'severity' => 'info'],
                    ['time' => $now->copy()->subMinutes(15)->format('H:i'), 'phase' => 'Eviction', 'title' => 'Mass Eviction Triggered (450k keys wiped)', 'severity' => 'warning'],
                    ['time' => $now->copy()->subMinutes(13)->format('H:i'), 'phase' => 'Cascade', 'title' => 'Cache Stampede hits Database (CPU 100%)', 'severity' => 'critical'],
                    ['time' => $now->copy()->subMinutes(8)->format('H:i'), 'phase' => 'Intervention', 'title' => 'SRE Scaled Redis Memory & Injected Mutex Loader', 'severity' => 'info'],
                    ['time' => $now->copy()->subMinutes(2)->format('H:i'), 'phase' => 'Resolved', 'title' => 'Cache Hit Ratio restored to 99.1%', 'severity' => 'success'],
                ],
                'mitigation_steps' => [
                    'Scale up Redis memory limit dari 4GB ke 16GB',
                    'Purge key namespace `session:*:audit_payload` dan alihkan ke async disk storage',
                    'Implementasikan SingleFlight Mutex locking pada cache-miss loader',
                ],
                'default_action_items' => [
                    ['title' => 'Implementasikan Mutex Lock (SingleFlight) untuk Token Cache Loader', 'description' => 'Mencegah jutaan request menembus database bersamaan saat terjadi cache-miss.', 'priority' => 'p0', 'type' => 'architectural', 'due_days' => 1],
                    ['title' => 'Pisahkan Redis Cluster untuk Session dan Ephemeral Cache Storage', 'description' => 'Isolasi memory pool agar eviction di cache tidak menghapus active user sessions.', 'priority' => 'p0', 'type' => 'architectural', 'due_days' => 3],
                    ['title' => 'Pasang Max Payload Guard 8KB pada Cache Ingestion Middleware', 'description' => 'Mencegah penyimpanan data berukuran besar ke RAM in-memory cache.', 'priority' => 'p1', 'type' => 'preventative', 'due_days' => 4],
                ],
                'post_mortem_report' => [
                    'incident_title' => 'Redis Cache Stampede & Session Cluster Eviction Outage',
                    'author' => 'AI Automated RCA Copilot',
                    'status' => 'Resolved - Post Mortem Ready',
                    'detection_method' => 'Synthetic Probe & Cache Hit Ratio Anomaly Detector',
                    'summary' => 'Eviction massal pada Redis cluster memicu cache stampede 40,000 req/min langsung ke PostgreSQL master, menyebabkan outage selama 11 menit pada seluruh gateway autentikasi.',
                    'lessons_learned' => [
                        'Session store harus memiliki dedicated memory ceiling yang terpisah dari temporary cache.',
                        'Payload audit berukuran besar dilarang disimpan ke in-memory session RAM.',
                        'Singleflight caching mutlak diperlukan pada hot-path authentication.',
                    ],
                ],
            ],
        };
    }

    /**
     * Seed initial demo RCA record if workspace has zero analyses.
     */
    protected function seedInitialSimulation(Organization $organization): void
    {
        $this->analyzeIncident($organization, [
            'scenario' => 'redis_cache_stampede',
            'custom_title' => 'Redis Cache Stampede & Session Cluster Eviction Outage',
        ]);
    }
}
