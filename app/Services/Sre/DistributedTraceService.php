<?php

namespace App\Services\Sre;

use App\Models\DistributedTrace;
use App\Models\Organization;
use App\Models\ServiceNode;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

class DistributedTraceService
{
    /**
     * Get dashboard data for distributed tracing studio.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function getDashboardData(Organization $organization, array $filters = []): array
    {
        if ($organization->serviceNodes()->count() === 0) {
            $this->seedDefaultTracesAndTopology($organization);
        }

        $serviceNodes = $organization->serviceNodes()->orderBy('name')->get();

        $traceQuery = $organization->distributedTraces()->latest('created_at');

        if (! empty($filters['service'])) {
            $traceQuery->where('root_service', $filters['service']);
        }

        if (! empty($filters['status'])) {
            $traceQuery->where('status', $filters['status']);
        }

        if (! empty($filters['http_method'])) {
            $traceQuery->where('http_method', $filters['http_method']);
        }

        if (! empty($filters['min_duration'])) {
            $traceQuery->where('total_duration_ms', '>=', (float) $filters['min_duration']);
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $traceQuery->where(function ($q) use ($search) {
                $q->where('trace_id', 'like', "%{$search}%")
                    ->orWhere('root_operation', 'like', "%{$search}%");
            });
        }

        $traces = $traceQuery->take(50)->get();

        // Calculate KPI Metrics
        $allTraces = $organization->distributedTraces()->get();
        $totalTraces = $allTraces->count();
        $avgDuration = $totalTraces > 0 ? round($allTraces->avg('total_duration_ms'), 1) : 0;

        $durations = $allTraces->pluck('total_duration_ms')->sort()->values()->all();
        $p95Index = $totalTraces > 0 ? (int) floor($totalTraces * 0.95) : 0;
        $p99Index = $totalTraces > 0 ? (int) floor($totalTraces * 0.99) : 0;
        $p95Latency = $totalTraces > 0 ? round($durations[$p95Index] ?? 0, 1) : 0;
        $p99Latency = $totalTraces > 0 ? round($durations[$p99Index] ?? 0, 1) : 0;

        $errorTracesCount = $allTraces->where('status', 'error')->count();
        $errorRatePct = $totalTraces > 0 ? round(($errorTracesCount / $totalTraces) * 100, 2) : 0.0;

        $healthyNodesCount = $serviceNodes->where('status', 'healthy')->count();

        // Build Topology Nodes and Edges
        $topology = $this->buildTopologyGraph($serviceNodes);

        return [
            'kpi' => [
                'total_traces_24h' => $totalTraces,
                'avg_duration_ms' => $avgDuration,
                'p95_latency_ms' => $p95Latency,
                'p99_latency_ms' => $p99Latency,
                'error_rate_pct' => $errorRatePct,
                'total_services' => $serviceNodes->count(),
                'healthy_services' => $healthyNodesCount,
            ],
            'topology' => $topology,
            'service_nodes' => $serviceNodes,
            'traces' => $traces,
            'services_list' => $serviceNodes->pluck('name')->unique()->values()->all(),
            'filters' => $filters,
        ];
    }

    /**
     * Build nodes and edges for service mesh visualizer.
     *
     * @param  Collection<int, ServiceNode>  $nodes
     * @return array<string, mixed>
     */
    public function buildTopologyGraph($nodes): array
    {
        $nodeList = [];
        $edges = [];

        foreach ($nodes as $node) {
            $nodeList[] = [
                'id' => $node->id,
                'name' => $node->name,
                'service_type' => $node->service_type,
                'environment' => $node->environment,
                'status' => $node->status,
                'throughput_rpm' => $node->throughput_rpm,
                'error_rate_pct' => $node->error_rate_pct,
                'p95_latency_ms' => $node->p95_latency_ms,
                'p99_latency_ms' => $node->p99_latency_ms,
                'dependencies' => $node->dependencies ?? [],
            ];

            if (! empty($node->dependencies) && is_array($node->dependencies)) {
                foreach ($node->dependencies as $targetName) {
                    $edges[] = [
                        'source' => $node->name,
                        'target' => $targetName,
                        'rpm' => (int) ($node->throughput_rpm * 0.8),
                        'latency_ms' => $node->p95_latency_ms,
                        'status' => $node->status,
                    ];
                }
            }
        }

        return [
            'nodes' => $nodeList,
            'edges' => $edges,
        ];
    }

    /**
     * Simulate and ingest a new distributed trace with multi-span waterfall.
     *
     * @param  array<string, mixed>  $data
     */
    public function simulateTrace(Organization $organization, array $data = []): DistributedTrace
    {
        $scenario = $data['scenario'] ?? 'checkout_flow';
        $traceId = 'trace_'.Str::lower(Str::random(12));

        $traceData = match ($scenario) {
            'user_auth_flow' => $this->buildAuthFlowTrace($traceId),
            'document_export_flow' => $this->buildDocumentExportTrace($traceId),
            'ai_inference_pipeline' => $this->buildAiInferenceTrace($traceId),
            'failing_payment_flow' => $this->buildFailingPaymentTrace($traceId),
            default => $this->buildCheckoutFlowTrace($traceId),
        };

        // Allow overriding root_service or http_method if provided
        if (! empty($data['root_service'])) {
            $traceData['root_service'] = $data['root_service'];
        }
        if (! empty($data['http_method'])) {
            $traceData['http_method'] = $data['http_method'];
        }
        if (! empty($data['root_operation'])) {
            $traceData['root_operation'] = $data['root_operation'];
        }

        $traceData['organization_id'] = $organization->id;
        $traceData['trace_id'] = $traceId;
        $traceData['user_agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
        $traceData['client_ip'] = '192.168.1.'.rand(10, 250);

        return $organization->distributedTraces()->create($traceData);
    }

    /**
     * Build checkout transaction trace spans.
     *
     * @return array<string, mixed>
     */
    private function buildCheckoutFlowTrace(string $traceId): array
    {
        $spans = [
            [
                'id' => 'span_root_'.Str::random(6),
                'parent_id' => null,
                'name' => 'POST /api/v1/checkout/process',
                'service' => 'api-gateway',
                'span_kind' => 'SERVER',
                'start_offset_ms' => 0.0,
                'duration_ms' => 142.5,
                'status' => 'OK',
                'tags' => ['http.status' => 200, 'http.route' => '/api/v1/checkout/process'],
            ],
            [
                'id' => 'span_auth_'.Str::random(6),
                'parent_id' => 'span_root',
                'name' => 'TokenAuthGuard::validateBearer',
                'service' => 'auth-service',
                'span_kind' => 'INTERNAL',
                'start_offset_ms' => 2.4,
                'duration_ms' => 14.8,
                'status' => 'OK',
                'tags' => ['user.id' => 'usr_98a4bc1', 'scope' => 'orders:write'],
            ],
            [
                'id' => 'span_redis_auth_'.Str::random(6),
                'parent_id' => 'span_auth',
                'name' => 'GET session:usr_98a4bc1',
                'service' => 'redis-cluster',
                'span_kind' => 'CLIENT',
                'start_offset_ms' => 4.1,
                'duration_ms' => 2.1,
                'status' => 'OK',
                'tags' => ['db.system' => 'redis', 'db.operation' => 'GET'],
            ],
            [
                'id' => 'span_order_svc_'.Str::random(6),
                'parent_id' => 'span_root',
                'name' => 'OrderService::createOrder',
                'service' => 'order-service',
                'span_kind' => 'INTERNAL',
                'start_offset_ms' => 18.2,
                'duration_ms' => 118.0,
                'status' => 'OK',
                'tags' => ['order.items_count' => 3, 'currency' => 'IDR'],
            ],
            [
                'id' => 'span_db_query_'.Str::random(6),
                'parent_id' => 'span_order_svc',
                'name' => 'SELECT * FROM inventory WHERE sku IN (?) FOR UPDATE',
                'service' => 'postgres-primary',
                'span_kind' => 'CLIENT',
                'start_offset_ms' => 24.0,
                'duration_ms' => 18.6,
                'status' => 'OK',
                'sql_query' => 'SELECT id, sku, stock_qty FROM product_inventory WHERE sku IN ("SKU-4981", "SKU-9021") FOR UPDATE',
                'tags' => ['db.system' => 'postgresql', 'db.statement_type' => 'SELECT_FOR_UPDATE'],
            ],
            [
                'id' => 'span_payment_'.Str::random(6),
                'parent_id' => 'span_order_svc',
                'name' => 'HTTP POST https://api.stripe.com/v1/charges',
                'service' => 'payment-gateway',
                'span_kind' => 'CLIENT',
                'start_offset_ms' => 45.2,
                'duration_ms' => 62.4,
                'status' => 'OK',
                'tags' => ['http.status' => 200, 'payment.provider' => 'stripe', 'amount' => 450000],
            ],
            [
                'id' => 'span_db_insert_'.Str::random(6),
                'parent_id' => 'span_order_svc',
                'name' => 'INSERT INTO orders (id, user_id, amount, status) VALUES (...)',
                'service' => 'postgres-primary',
                'span_kind' => 'CLIENT',
                'start_offset_ms' => 110.0,
                'duration_ms' => 12.4,
                'status' => 'OK',
                'sql_query' => 'INSERT INTO orders (id, user_id, total_amount, status, created_at) VALUES ("ord_78fa", "usr_98a4bc1", 450000, "paid", NOW())',
                'tags' => ['db.system' => 'postgresql', 'db.statement_type' => 'INSERT'],
            ],
            [
                'id' => 'span_queue_pub_'.Str::random(6),
                'parent_id' => 'span_order_svc',
                'name' => 'AMQP Publish queue:notifications.email',
                'service' => 'notification-worker',
                'span_kind' => 'PRODUCER',
                'start_offset_ms' => 124.0,
                'duration_ms' => 8.2,
                'status' => 'OK',
                'tags' => ['messaging.system' => 'rabbitmq', 'messaging.destination' => 'notifications.email'],
            ],
        ];

        return [
            'root_service' => 'api-gateway',
            'root_operation' => 'POST /api/v1/checkout/process',
            'http_method' => 'POST',
            'http_status_code' => 200,
            'total_duration_ms' => 142.5,
            'span_count' => count($spans),
            'error_count' => 0,
            'status' => 'ok',
            'spans' => $spans,
            'breakdown' => [
                'app_pct' => 28,
                'db_pct' => 22,
                'cache_pct' => 2,
                'network_pct' => 4,
                'external_pct' => 44,
            ],
        ];
    }

    /**
     * Build user authentication trace.
     *
     * @return array<string, mixed>
     */
    private function buildAuthFlowTrace(string $traceId): array
    {
        $spans = [
            [
                'id' => 'span_root_'.Str::random(6),
                'parent_id' => null,
                'name' => 'POST /api/v1/auth/login',
                'service' => 'api-gateway',
                'span_kind' => 'SERVER',
                'start_offset_ms' => 0.0,
                'duration_ms' => 38.4,
                'status' => 'OK',
                'tags' => ['http.status' => 200, 'http.route' => '/api/v1/auth/login'],
            ],
            [
                'id' => 'span_auth_svc_'.Str::random(6),
                'parent_id' => 'span_root',
                'name' => 'AuthenticationController::attempt',
                'service' => 'auth-service',
                'span_kind' => 'INTERNAL',
                'start_offset_ms' => 1.8,
                'duration_ms' => 34.2,
                'status' => 'OK',
                'tags' => ['auth.method' => 'password+totp'],
            ],
            [
                'id' => 'span_user_query_'.Str::random(6),
                'parent_id' => 'span_auth_svc',
                'name' => 'SELECT * FROM users WHERE email = ? LIMIT 1',
                'service' => 'postgres-primary',
                'span_kind' => 'CLIENT',
                'start_offset_ms' => 4.2,
                'duration_ms' => 9.5,
                'status' => 'OK',
                'sql_query' => 'SELECT * FROM users WHERE email = "sre.lead@pandu.id" AND deleted_at IS NULL LIMIT 1',
                'tags' => ['db.system' => 'postgresql'],
            ],
            [
                'id' => 'span_redis_session_'.Str::random(6),
                'parent_id' => 'span_auth_svc',
                'name' => 'SETEX session:usr_10928 86400',
                'service' => 'redis-cluster',
                'span_kind' => 'CLIENT',
                'start_offset_ms' => 26.0,
                'duration_ms' => 1.8,
                'status' => 'OK',
                'tags' => ['db.system' => 'redis', 'db.operation' => 'SETEX'],
            ],
        ];

        return [
            'root_service' => 'api-gateway',
            'root_operation' => 'POST /api/v1/auth/login',
            'http_method' => 'POST',
            'http_status_code' => 200,
            'total_duration_ms' => 38.4,
            'span_count' => count($spans),
            'error_count' => 0,
            'status' => 'ok',
            'spans' => $spans,
            'breakdown' => [
                'app_pct' => 65,
                'db_pct' => 25,
                'cache_pct' => 5,
                'network_pct' => 5,
                'external_pct' => 0,
            ],
        ];
    }

    /**
     * Build document export background trace.
     *
     * @return array<string, mixed>
     */
    private function buildDocumentExportTrace(string $traceId): array
    {
        $spans = [
            [
                'id' => 'span_root_'.Str::random(6),
                'parent_id' => null,
                'name' => 'GET /api/v1/reports/compliance-export',
                'service' => 'api-gateway',
                'span_kind' => 'SERVER',
                'start_offset_ms' => 0.0,
                'duration_ms' => 248.0,
                'status' => 'OK',
                'tags' => ['http.status' => 200, 'report.format' => 'pdf'],
            ],
            [
                'id' => 'span_doc_builder_'.Str::random(6),
                'parent_id' => 'span_root',
                'name' => 'ComplianceReportBuilder::generatePdf',
                'service' => 'order-service',
                'span_kind' => 'INTERNAL',
                'start_offset_ms' => 3.2,
                'duration_ms' => 236.4,
                'status' => 'OK',
                'tags' => ['pages' => 24],
            ],
            [
                'id' => 'span_db_heavy_'.Str::random(6),
                'parent_id' => 'span_doc_builder',
                'name' => 'SELECT audit_logs JOIN incidents WHERE created_at >= NOW() - 90d',
                'service' => 'postgres-primary',
                'span_kind' => 'CLIENT',
                'start_offset_ms' => 8.5,
                'duration_ms' => 184.2,
                'status' => 'OK',
                'sql_query' => 'SELECT a.*, i.title FROM compliance_audit_logs a LEFT JOIN security_incidents i ON a.incident_id = i.id WHERE a.created_at >= NOW() - INTERVAL "90 DAYS"',
                'tags' => ['db.system' => 'postgresql', 'db.slow_query' => true],
            ],
            [
                'id' => 'span_s3_upload_'.Str::random(6),
                'parent_id' => 'span_doc_builder',
                'name' => 'PUT s3://pandu-compliance-vault/reports/2026/q3_audit.pdf',
                'service' => 'notification-worker',
                'span_kind' => 'CLIENT',
                'start_offset_ms' => 198.0,
                'duration_ms' => 38.5,
                'status' => 'OK',
                'tags' => ['storage.provider' => 'aws-s3', 'storage.bucket' => 'pandu-compliance-vault'],
            ],
        ];

        return [
            'root_service' => 'api-gateway',
            'root_operation' => 'GET /api/v1/reports/compliance-export',
            'http_method' => 'GET',
            'http_status_code' => 200,
            'total_duration_ms' => 248.0,
            'span_count' => count($spans),
            'error_count' => 0,
            'status' => 'degraded', // duration exceeds typical 200ms threshold
            'spans' => $spans,
            'breakdown' => [
                'app_pct' => 15,
                'db_pct' => 74,
                'cache_pct' => 0,
                'network_pct' => 3,
                'external_pct' => 8,
            ],
        ];
    }

    /**
     * Build AI inference pipeline trace.
     *
     * @return array<string, mixed>
     */
    private function buildAiInferenceTrace(string $traceId): array
    {
        $spans = [
            [
                'id' => 'span_root_'.Str::random(6),
                'parent_id' => null,
                'name' => 'POST /api/v1/ai/synthesize-sprint-risks',
                'service' => 'api-gateway',
                'span_kind' => 'SERVER',
                'start_offset_ms' => 0.0,
                'duration_ms' => 312.0,
                'status' => 'OK',
                'tags' => ['http.status' => 200, 'ai.model' => 'gemini-3.7-flash'],
            ],
            [
                'id' => 'span_ai_pipeline_'.Str::random(6),
                'parent_id' => 'span_root',
                'name' => 'AiSprintRiskAdvisor::predictBottlenecks',
                'service' => 'order-service',
                'span_kind' => 'INTERNAL',
                'start_offset_ms' => 2.4,
                'duration_ms' => 304.5,
                'status' => 'OK',
                'tags' => ['tokens.prompt' => 1420, 'tokens.completion' => 340],
            ],
            [
                'id' => 'span_embedding_cache_'.Str::random(6),
                'parent_id' => 'span_ai_pipeline',
                'name' => 'MGET cache:embeddings:sprint_81_*',
                'service' => 'redis-cluster',
                'span_kind' => 'CLIENT',
                'start_offset_ms' => 6.1,
                'duration_ms' => 3.4,
                'status' => 'OK',
                'tags' => ['db.system' => 'redis', 'cache.hit_rate' => 0.85],
            ],
            [
                'id' => 'span_llm_call_'.Str::random(6),
                'parent_id' => 'span_ai_pipeline',
                'name' => 'HTTPS POST https://generativelanguage.googleapis.com/v1beta/models',
                'service' => 'payment-gateway',
                'span_kind' => 'CLIENT',
                'start_offset_ms' => 14.5,
                'duration_ms' => 285.2,
                'status' => 'OK',
                'tags' => ['http.status' => 200, 'ai.latency_ms' => 285],
            ],
        ];

        return [
            'root_service' => 'api-gateway',
            'root_operation' => 'POST /api/v1/ai/synthesize-sprint-risks',
            'http_method' => 'POST',
            'http_status_code' => 200,
            'total_duration_ms' => 312.0,
            'span_count' => count($spans),
            'error_count' => 0,
            'status' => 'ok',
            'spans' => $spans,
            'breakdown' => [
                'app_pct' => 6,
                'db_pct' => 0,
                'cache_pct' => 1,
                'network_pct' => 2,
                'external_pct' => 91,
            ],
        ];
    }

    /**
     * Build failing payment 500 trace with error stack trace tags.
     *
     * @return array<string, mixed>
     */
    private function buildFailingPaymentTrace(string $traceId): array
    {
        $spans = [
            [
                'id' => 'span_root_'.Str::random(6),
                'parent_id' => null,
                'name' => 'POST /api/v1/checkout/process',
                'service' => 'api-gateway',
                'span_kind' => 'SERVER',
                'start_offset_ms' => 0.0,
                'duration_ms' => 104.2,
                'status' => 'ERROR',
                'tags' => ['http.status' => 500, 'error' => true, 'error.type' => 'PaymentGatewayTimeoutException'],
            ],
            [
                'id' => 'span_order_svc_'.Str::random(6),
                'parent_id' => 'span_root',
                'name' => 'OrderService::createOrder',
                'service' => 'order-service',
                'span_kind' => 'INTERNAL',
                'start_offset_ms' => 4.2,
                'duration_ms' => 98.0,
                'status' => 'ERROR',
                'tags' => ['error' => true, 'exception.message' => 'Upstream gateway payment provider timed out after 90ms'],
            ],
            [
                'id' => 'span_payment_err_'.Str::random(6),
                'parent_id' => 'span_order_svc',
                'name' => 'HTTP POST https://api.stripe.com/v1/charges',
                'service' => 'payment-gateway',
                'span_kind' => 'CLIENT',
                'start_offset_ms' => 12.0,
                'duration_ms' => 90.0,
                'status' => 'ERROR',
                'tags' => [
                    'http.status' => 504,
                    'error' => true,
                    'error.message' => 'Gateway Timeout (504): upstream connect timeout',
                    'exception.stacktrace' => "GuzzleHttp\Exception\ConnectException: cURL error 28: Connection timed out after 90002 milliseconds\n  at /app/vendor/guzzlehttp/guzzle/src/Handler/CurlHandler.php:40\n  at App\Services\PaymentGateway::charge()",
                ],
            ],
        ];

        return [
            'root_service' => 'api-gateway',
            'root_operation' => 'POST /api/v1/checkout/process',
            'http_method' => 'POST',
            'http_status_code' => 500,
            'total_duration_ms' => 104.2,
            'span_count' => count($spans),
            'error_count' => 3,
            'status' => 'error',
            'spans' => $spans,
            'breakdown' => [
                'app_pct' => 10,
                'db_pct' => 0,
                'cache_pct' => 0,
                'network_pct' => 4,
                'external_pct' => 86,
            ],
        ];
    }

    /**
     * Seed default topology nodes and initial traces for an organization.
     */
    public function seedDefaultTracesAndTopology(Organization $organization): void
    {
        // 1. Seed Service Nodes
        $nodes = [
            [
                'organization_id' => $organization->id,
                'name' => 'api-gateway',
                'service_type' => 'gateway',
                'environment' => 'production',
                'status' => 'healthy',
                'throughput_rpm' => 4820,
                'error_rate_pct' => 0.42,
                'p95_latency_ms' => 18,
                'p99_latency_ms' => 45,
                'dependencies' => ['auth-service', 'order-service'],
            ],
            [
                'organization_id' => $organization->id,
                'name' => 'auth-service',
                'service_type' => 'service',
                'environment' => 'production',
                'status' => 'healthy',
                'throughput_rpm' => 3240,
                'error_rate_pct' => 0.15,
                'p95_latency_ms' => 24,
                'p99_latency_ms' => 60,
                'dependencies' => ['redis-cluster', 'postgres-primary'],
            ],
            [
                'organization_id' => $organization->id,
                'name' => 'order-service',
                'service_type' => 'service',
                'environment' => 'production',
                'status' => 'healthy',
                'throughput_rpm' => 1950,
                'error_rate_pct' => 0.85,
                'p95_latency_ms' => 85,
                'p99_latency_ms' => 220,
                'dependencies' => ['postgres-primary', 'payment-gateway', 'notification-worker'],
            ],
            [
                'organization_id' => $organization->id,
                'name' => 'postgres-primary',
                'service_type' => 'database',
                'environment' => 'production',
                'status' => 'healthy',
                'throughput_rpm' => 6100,
                'error_rate_pct' => 0.02,
                'p95_latency_ms' => 12,
                'p99_latency_ms' => 35,
                'dependencies' => [],
            ],
            [
                'organization_id' => $organization->id,
                'name' => 'redis-cluster',
                'service_type' => 'cache',
                'environment' => 'production',
                'status' => 'healthy',
                'throughput_rpm' => 14200,
                'error_rate_pct' => 0.00,
                'p95_latency_ms' => 2,
                'p99_latency_ms' => 6,
                'dependencies' => [],
            ],
            [
                'organization_id' => $organization->id,
                'name' => 'payment-gateway',
                'service_type' => 'third_party',
                'environment' => 'production',
                'status' => 'healthy',
                'throughput_rpm' => 840,
                'error_rate_pct' => 1.20,
                'p95_latency_ms' => 95,
                'p99_latency_ms' => 340,
                'dependencies' => [],
            ],
            [
                'organization_id' => $organization->id,
                'name' => 'notification-worker',
                'service_type' => 'queue',
                'environment' => 'production',
                'status' => 'healthy',
                'throughput_rpm' => 1100,
                'error_rate_pct' => 0.05,
                'p95_latency_ms' => 45,
                'p99_latency_ms' => 110,
                'dependencies' => [],
            ],
        ];

        foreach ($nodes as $nodeData) {
            $organization->serviceNodes()->create($nodeData);
        }

        // 2. Seed Initial Varied Traces
        $this->simulateTrace($organization, ['scenario' => 'checkout_flow']);
        $this->simulateTrace($organization, ['scenario' => 'user_auth_flow']);
        $this->simulateTrace($organization, ['scenario' => 'document_export_flow']);
        $this->simulateTrace($organization, ['scenario' => 'ai_inference_pipeline']);
        $this->simulateTrace($organization, ['scenario' => 'failing_payment_flow']);
    }
}
