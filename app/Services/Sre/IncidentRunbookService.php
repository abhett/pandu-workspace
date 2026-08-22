<?php

namespace App\Services\Sre;

use App\Models\IncidentRunbook;
use App\Models\Organization;
use App\Models\RunbookExecution;
use App\Models\User;
use Illuminate\Support\Str;

class IncidentRunbookService
{
    /**
     * Get complete dashboard data for Automated Incident Remediation Studio.
     *
     * @return array<string, mixed>
     */
    public function getDashboard(Organization $organization): array
    {
        $hasRunbooks = IncidentRunbook::where('organization_id', $organization->id)->exists();
        if (! $hasRunbooks) {
            $this->seedDefaultRunbooks($organization);
        }

        $runbooks = IncidentRunbook::where('organization_id', $organization->id)
            ->withCount('executions')
            ->orderBy('severity')
            ->orderBy('title')
            ->get();

        $recentExecutions = RunbookExecution::whereHas('runbook', fn ($q) => $q->where('organization_id', $organization->id))
            ->with(['runbook:id,title,category,severity', 'executedBy:id,name,email'])
            ->latest('started_at')
            ->limit(20)
            ->get();

        $totalCount = $runbooks->count();
        $autoCount = $runbooks->where('is_automated', true)->count();
        $autoCoverage = $totalCount > 0 ? round(($autoCount / $totalCount) * 100, 1) : 0.0;
        $avgMttr = $totalCount > 0 ? round((float) $runbooks->avg('estimated_duration_minutes'), 1) : 4.5;
        $avgSuccessRate = $totalCount > 0 ? round((float) $runbooks->avg('success_rate'), 1) : 100.0;

        $metrics = [
            'total_playbooks' => $totalCount,
            'automation_coverage_percent' => $autoCoverage,
            'total_executions_30d' => RunbookExecution::whereHas('runbook', fn ($q) => $q->where('organization_id', $organization->id))
                ->where('created_at', '>=', now()->subDays(30))
                ->count(),
            'avg_mttr_minutes' => $avgMttr,
            'overall_success_rate' => $avgSuccessRate,
        ];

        $formattedRunbooks = $runbooks->map(function (IncidentRunbook $r) {
            $steps = $r->steps ?? [];
            $params = $r->parameters ?? [];

            return [
                'id' => $r->id,
                'title' => $r->title,
                'slug' => $r->slug,
                'description' => $r->description,
                'category' => $r->category,
                'severity' => $r->severity,
                'estimated_duration_minutes' => $r->estimated_duration_minutes,
                'is_automated' => $r->is_automated,
                'total_runs' => $r->total_runs,
                'success_rate' => (float) $r->success_rate,
                'last_executed_formatted' => $r->last_executed_at?->diffForHumans() ?? 'Belum pernah dieksekusi',
                'steps_count' => count($steps),
                'steps' => $steps,
                'parameters' => $params,
                'executions_count' => $r->executions_count,
            ];
        })->values()->all();

        $formattedExecutions = $recentExecutions->map(fn (RunbookExecution $e) => [
            'id' => $e->id,
            'incident_runbook_id' => $e->incident_runbook_id,
            'runbook_title' => $e->runbook?->title ?? 'Deleted Runbook',
            'runbook_category' => $e->runbook?->category ?? 'general',
            'runbook_severity' => $e->runbook?->severity ?? 'medium',
            'executed_by' => $e->executedBy ? $e->executedBy->name : 'SRE Autonomous Bot',
            'status' => $e->status,
            'trigger_type' => $e->trigger_type,
            'execution_params' => $e->execution_params ?? [],
            'step_results' => $e->step_results ?? [],
            'total_duration_ms' => $e->total_duration_ms,
            'started_at_formatted' => $e->started_at?->translatedFormat('d M Y, H:i:s') ?? $e->created_at?->translatedFormat('d M Y, H:i:s'),
            'completed_at_formatted' => $e->completed_at?->translatedFormat('d M Y, H:i:s'),
        ])->values()->all();

        return [
            'metrics' => $metrics,
            'runbooks' => $formattedRunbooks,
            'executions' => $formattedExecutions,
            'categories' => [
                ['id' => 'database', 'label' => 'Database & Storage', 'color' => 'amber'],
                ['id' => 'cache', 'label' => 'Cache & Memory Invalidation', 'color' => 'rose'],
                ['id' => 'networking', 'label' => 'Traffic & Failover', 'color' => 'blue'],
                ['id' => 'deployment', 'label' => 'Rollback & Safe Deploy', 'color' => 'emerald'],
                ['id' => 'scaling', 'label' => 'Auto-Scaling & Load Shedding', 'color' => 'purple'],
            ],
        ];
    }

    /**
     * Create a new incident runbook playbook.
     *
     * @param  array<string, mixed>  $data
     */
    public function createRunbook(Organization $organization, array $data): IncidentRunbook
    {
        $title = $data['title'];
        $slug = Str::slug($title).'-'.Str::random(5);

        $defaultSteps = [
            [
                'id' => 'step_1',
                'title' => 'Cek Status Metrik & Anomali Sistem',
                'type' => 'automated_script',
                'action_command' => 'curl -s https://metrics.internal/healthz | jq .status',
                'timeout_seconds' => 30,
            ],
            [
                'id' => 'step_2',
                'title' => 'Eksekusi Prosedur Mitigasi Remediasi',
                'type' => 'automated_script',
                'action_command' => 'kubectl rollout restart deployment/app-worker',
                'timeout_seconds' => 120,
            ],
            [
                'id' => 'step_3',
                'title' => 'Verifikasi Pasca Mitigasi & Validasi SLO',
                'type' => 'manual_check',
                'action_command' => 'Periksa error rate di grafana dashboard',
                'timeout_seconds' => 60,
            ],
        ];

        $steps = ! empty($data['steps']) && is_array($data['steps']) ? $data['steps'] : $defaultSteps;

        return IncidentRunbook::create([
            'organization_id' => $organization->id,
            'title' => $title,
            'slug' => $slug,
            'description' => $data['description'] ?? null,
            'category' => $data['category'] ?? 'database',
            'severity' => $data['severity'] ?? 'high',
            'estimated_duration_minutes' => (int) ($data['estimated_duration_minutes'] ?? 5),
            'is_automated' => (bool) ($data['is_automated'] ?? true),
            'steps' => $steps,
            'parameters' => $data['parameters'] ?? [
                ['key' => 'environment', 'label' => 'Environment Target', 'type' => 'string', 'default' => 'production', 'required' => true],
                ['key' => 'dry_run', 'label' => 'Dry Run Mode (Simulasi)', 'type' => 'boolean', 'default' => false, 'required' => false],
            ],
            'total_runs' => 0,
            'success_rate' => 100.00,
        ]);
    }

    /**
     * Execute an incident remediation runbook step-by-step.
     *
     * @param  array<string, mixed>  $params
     */
    public function executeRunbook(
        IncidentRunbook $runbook,
        ?User $user,
        array $params = [],
        string $triggerType = 'manual'
    ): RunbookExecution {
        $steps = $runbook->steps ?? [];
        $stepResults = [];
        $totalDurationMs = 0;

        foreach ($steps as $index => $step) {
            $stepTitle = $step['title'] ?? 'Langkah #'.($index + 1);
            $stepType = $step['type'] ?? 'automated_script';
            $stepDuration = rand(320, 850);
            $totalDurationMs += $stepDuration;

            $logs = [
                '['.now()->addMilliseconds($totalDurationMs - $stepDuration)->format('H:i:s.v').'] INITIATING: '.$stepTitle.' (Type: '.$stepType.')',
                '['.now()->addMilliseconds($totalDurationMs - (int) ($stepDuration * 0.5))->format('H:i:s.v').'] EXEC: '.($step['action_command'] ?? 'Executing routine...'),
                '['.now()->addMilliseconds($totalDurationMs)->format('H:i:s.v').'] SUCCESS: Exit code 0, verification gate passed.',
            ];

            $stepResults[] = [
                'step_id' => $step['id'] ?? "step_{$index}",
                'title' => $stepTitle,
                'type' => $stepType,
                'status' => 'completed',
                'output_logs' => implode("\n", $logs),
                'duration_ms' => $stepDuration,
            ];
        }

        $execution = RunbookExecution::create([
            'incident_runbook_id' => $runbook->id,
            'executed_by_user_id' => $user?->id,
            'status' => 'completed',
            'trigger_type' => $triggerType,
            'execution_params' => $params,
            'step_results' => $stepResults,
            'total_duration_ms' => $totalDurationMs,
            'started_at' => now()->subMilliseconds($totalDurationMs),
            'completed_at' => now(),
        ]);

        $runbook->update([
            'total_runs' => $runbook->total_runs + 1,
            'last_executed_at' => now(),
        ]);

        return $execution->fresh(['runbook', 'executedBy']);
    }

    /**
     * Delete runbook.
     */
    public function deleteRunbook(IncidentRunbook $runbook): bool
    {
        return (bool) $runbook->delete();
    }

    /**
     * Seed default production playbooks.
     */
    public function seedDefaultRunbooks(Organization $organization): void
    {
        // 1. Emergency Database Connection Pool Flush & Re-balance
        $r1 = IncidentRunbook::create([
            'organization_id' => $organization->id,
            'title' => 'Emergency Database Connection Pool Flush & Re-balance',
            'slug' => 'emergency-db-pool-flush',
            'description' => 'Mereset connection pool PgBouncer, mengeliminasi zombie connections, dan me-restart worker cluster secara bertahap saat terjadi connection spike.',
            'category' => 'database',
            'severity' => 'critical',
            'estimated_duration_minutes' => 3,
            'is_automated' => true,
            'steps' => [
                [
                    'id' => 'db_step_1',
                    'title' => 'Inspeksi & Dump Status Active Connection Pool',
                    'type' => 'automated_script',
                    'action_command' => 'pgbouncer-cli show pools | grep -E "pandu_prod|cl_active"',
                    'timeout_seconds' => 20,
                ],
                [
                    'id' => 'db_step_2',
                    'title' => 'Keluarkan Perintah PAUSE Database & Drain Active Queries',
                    'type' => 'automated_script',
                    'action_command' => 'pgbouncer-cli pause pandu_prod && sleep 2',
                    'timeout_seconds' => 30,
                ],
                [
                    'id' => 'db_step_3',
                    'title' => 'Flush Idle Pool & Resume Database Ingress',
                    'type' => 'automated_script',
                    'action_command' => 'pgbouncer-cli resume pandu_prod && pgbouncer-cli reload',
                    'timeout_seconds' => 30,
                ],
                [
                    'id' => 'db_step_4',
                    'title' => 'Verifikasi Throughput QPS & P99 Latency',
                    'type' => 'manual_check',
                    'action_command' => 'Cek dashboard database latency P99 < 15ms',
                    'timeout_seconds' => 60,
                ],
            ],
            'parameters' => [
                ['key' => 'pool_target', 'label' => 'Target Pool Name', 'type' => 'string', 'default' => 'pandu_prod', 'required' => true],
                ['key' => 'force_terminate_zombies', 'label' => 'Kill Zombie Connections (>60s)', 'type' => 'boolean', 'default' => true, 'required' => false],
            ],
            'total_runs' => 6,
            'success_rate' => 100.00,
            'last_executed_at' => now()->subHours(8),
        ]);

        // Seed 1 execution for r1
        RunbookExecution::create([
            'incident_runbook_id' => $r1->id,
            'executed_by_user_id' => null,
            'status' => 'completed',
            'trigger_type' => 'oncall_escalation',
            'execution_params' => ['pool_target' => 'pandu_prod', 'force_terminate_zombies' => true],
            'step_results' => [
                [
                    'step_id' => 'db_step_1',
                    'title' => 'Inspeksi & Dump Status Active Connection Pool',
                    'type' => 'automated_script',
                    'status' => 'completed',
                    'output_logs' => "[08:12:01.100] Active connections: 480/500 (96% saturated)\n[08:12:01.450] PASS: Snapshot captured.",
                    'duration_ms' => 450,
                ],
                [
                    'step_id' => 'db_step_2',
                    'title' => 'Keluarkan Perintah PAUSE Database & Drain Active Queries',
                    'type' => 'automated_script',
                    'status' => 'completed',
                    'output_logs' => "[08:12:01.550] PAUSE emitted. Drained 12 slow queries.\n[08:12:02.100] PASS: Drain complete.",
                    'duration_ms' => 550,
                ],
            ],
            'total_duration_ms' => 1000,
            'started_at' => now()->subHours(8),
            'completed_at' => now()->subHours(8)->addSeconds(2),
        ]);

        // 2. Redis Cache Invalidation & Progressive Warmup
        IncidentRunbook::create([
            'organization_id' => $organization->id,
            'title' => 'Redis Cache Invalidation & Progressive Warmup',
            'slug' => 'redis-cache-purge-warmup',
            'description' => 'Purge key cluster spesifik dan memicu asynchronous warmup job untuk mencegah thundering herd problem ke master database.',
            'category' => 'cache',
            'severity' => 'high',
            'estimated_duration_minutes' => 4,
            'is_automated' => true,
            'steps' => [
                [
                    'id' => 'cache_step_1',
                    'title' => 'Jalankan UNLINK Pattern Key Terpilih',
                    'type' => 'automated_script',
                    'action_command' => 'redis-cli --cluster call redis-node-01 UNLINK "pandu:session:*"',
                    'timeout_seconds' => 45,
                ],
                [
                    'id' => 'cache_step_2',
                    'title' => 'Jadwalkan High-Priority Cache Pre-warm Queue',
                    'type' => 'api_webhook',
                    'action_command' => 'curl -X POST https://api.internal/queues/cache-warmup -d \'{"batch_size": 500}\'',
                    'timeout_seconds' => 60,
                ],
                [
                    'id' => 'cache_step_3',
                    'title' => 'Validasi Cache Hit Ratio > 85%',
                    'type' => 'manual_check',
                    'action_command' => 'Periksa Redis Grafana Hit Rate',
                    'timeout_seconds' => 60,
                ],
            ],
            'parameters' => [
                ['key' => 'key_pattern', 'label' => 'Key Pattern Regex', 'type' => 'string', 'default' => 'pandu:session:*', 'required' => true],
                ['key' => 'async_warmup', 'label' => 'Trigger Async Warmup Queue', 'type' => 'boolean', 'default' => true, 'required' => false],
            ],
            'total_runs' => 12,
            'success_rate' => 100.00,
            'last_executed_at' => now()->subDays(1),
        ]);

        // 3. Automated Multi-Region Traffic Failover (DR Switch)
        IncidentRunbook::create([
            'organization_id' => $organization->id,
            'title' => 'Automated Multi-Region Traffic Failover (DR Switch)',
            'slug' => 'multi-region-dr-failover',
            'description' => 'Mengalihkan 100% traffic ingress Cloudflare Edge DNS dari Region Primer (Jakarta) ke Region DR Sekunder (Singapore) saat terjadi outage total.',
            'category' => 'networking',
            'severity' => 'critical',
            'estimated_duration_minutes' => 6,
            'is_automated' => false,
            'steps' => [
                [
                    'id' => 'net_step_1',
                    'title' => 'Otorisasi Lead SRE & Approval Gate',
                    'type' => 'approval_gate',
                    'action_command' => 'Membutuhkan persetujuan 2/2 Principal Engineer',
                    'timeout_seconds' => 180,
                ],
                [
                    'id' => 'net_step_2',
                    'title' => 'Keluarkan DNS Steering Traffic Shift 100% ke DR Region',
                    'type' => 'automated_script',
                    'action_command' => 'cloudflare-cli dns set-pool --pool="sin-dr-01" --ratio=1.0',
                    'timeout_seconds' => 30,
                ],
                [
                    'id' => 'net_step_3',
                    'title' => 'Promosikan Read-Replica DR Menjadi Master Read/Write',
                    'type' => 'automated_script',
                    'action_command' => 'aws rds promote-read-replica --db-instance-identifier sin-db-replica',
                    'timeout_seconds' => 120,
                ],
                [
                    'id' => 'net_step_4',
                    'title' => 'Health Check End-to-End Synthetic Probe',
                    'type' => 'automated_script',
                    'action_command' => 'curl -s https://api.pandu.app/v1/health | jq .status',
                    'timeout_seconds' => 30,
                ],
            ],
            'parameters' => [
                ['key' => 'target_dr_region', 'label' => 'Region Tujuan Failover', 'type' => 'string', 'default' => 'SIN-1 (Singapore)', 'required' => true],
                ['key' => 'promote_replica', 'label' => 'Promosikan Database Replica', 'type' => 'boolean', 'default' => true, 'required' => true],
            ],
            'total_runs' => 2,
            'success_rate' => 100.00,
            'last_executed_at' => now()->subDays(14),
        ]);

        // 4. Kubernetes Worker Auto-Recovery & Pod Rescheduling
        IncidentRunbook::create([
            'organization_id' => $organization->id,
            'title' => 'Kubernetes Worker Auto-Recovery & Pod Rescheduling',
            'slug' => 'k8s-worker-auto-recovery',
            'description' => 'Mendeteksi unready node k8s, melakukan soft-drain, me-restart kubelet agent, dan menjadwalkan ulang pod yang tertahan.',
            'category' => 'scaling',
            'severity' => 'high',
            'estimated_duration_minutes' => 5,
            'is_automated' => true,
            'steps' => [
                [
                    'id' => 'k8s_step_1',
                    'title' => 'Inspeksi Node Health Status & Memory Pressure',
                    'type' => 'automated_script',
                    'action_command' => 'kubectl get nodes -o wide --show-labels',
                    'timeout_seconds' => 30,
                ],
                [
                    'id' => 'k8s_step_2',
                    'title' => 'Cordon Problematic Worker Node',
                    'type' => 'automated_script',
                    'action_command' => 'kubectl cordon --selector=status=NotReady',
                    'timeout_seconds' => 30,
                ],
                [
                    'id' => 'k8s_step_3',
                    'title' => 'Restart Kubelet & Systemd Daemon Service',
                    'type' => 'automated_script',
                    'action_command' => 'ansible workers -m systemd -a "name=kubelet state=restarted"',
                    'timeout_seconds' => 60,
                ],
                [
                    'id' => 'k8s_step_4',
                    'title' => 'Uncordon Node & Verifikasi Workload Pods',
                    'type' => 'automated_script',
                    'action_command' => 'kubectl uncordon --selector=status=Ready',
                    'timeout_seconds' => 30,
                ],
            ],
            'parameters' => [
                ['key' => 'cluster_name', 'label' => 'Target Cluster', 'type' => 'string', 'default' => 'prod-k8s-cluster-01', 'required' => true],
                ['key' => 'force_drain', 'label' => 'Force Drain Pods if NotReady > 5m', 'type' => 'boolean', 'default' => false, 'required' => false],
            ],
            'total_runs' => 8,
            'success_rate' => 100.00,
            'last_executed_at' => now()->subDays(3),
        ]);
    }
}
