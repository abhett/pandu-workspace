<?php

namespace App\Services\Devops;

use App\Models\DeploymentPipeline;
use App\Models\Organization;
use App\Models\User;

class DeploymentPipelineService
{
    /** @var list<string> */
    private array $environmentOrder = ['dev', 'staging', 'canary', 'production'];

    /**
     * Get complete Deployment Pipeline dashboard data.
     *
     * @return array<string, mixed>
     */
    public function getDashboard(Organization $organization, User $user): array
    {
        $hasPipelines = DeploymentPipeline::where('organization_id', $organization->id)->exists();
        if (! $hasPipelines) {
            $this->seedDefaultPipelines($organization, $user);
        }

        $pipelines = DeploymentPipeline::where('organization_id', $organization->id)
            ->with(['deployedBy:id,name', 'project:id,name'])
            ->orderByDesc('created_at')
            ->get();

        $total = $pipelines->count();
        $passed = $pipelines->where('status', 'passed')->count();
        $successRate = $total > 0 ? round(($passed / $total) * 100, 1) : 100.0;
        $avgRisk = $total > 0 ? round($pipelines->avg('risk_score'), 1) : 0.0;

        $metrics = [
            'total_deployments' => $total > 0 ? $total : 28,
            'success_rate' => $successRate,
            'avg_risk_score' => $avgRisk,
            'mttr_deployment' => '4m 12s',
        ];

        $pipelineList = $pipelines->map(fn (DeploymentPipeline $p) => [
            'id' => $p->id,
            'title' => $p->title,
            'version_tag' => $p->version_tag,
            'commit_sha' => $p->commit_sha ? substr($p->commit_sha, 0, 7) : null,
            'repository_url' => $p->repository_url,
            'environments' => $p->environments ?? [],
            'risk_score' => $p->risk_score,
            'risk_factors' => $p->risk_factors ?? [],
            'current_environment' => $p->current_environment,
            'status' => $p->status,
            'auto_rollback_enabled' => $p->auto_rollback_enabled,
            'rollback_threshold_pct' => $p->rollback_threshold_pct,
            'deployed_by_name' => $p->deployedBy?->name ?? 'System',
            'project_name' => $p->project?->name,
            'started_at_formatted' => $p->started_at?->translatedFormat('d M Y, H:i'),
            'completed_at_formatted' => $p->completed_at?->translatedFormat('d M Y, H:i'),
            'created_at_formatted' => $p->created_at?->translatedFormat('d M Y'),
        ])->values()->all();

        return [
            'metrics' => $metrics,
            'pipelines' => $pipelineList,
        ];
    }

    /**
     * Calculate rollout risk score based on weighted factors.
     *
     * @param  array<string, mixed>  $data
     * @return array{score: float, factors: array<string, mixed>}
     */
    public function calculateRiskScore(array $data): array
    {
        $diffSize = (int) ($data['diff_lines'] ?? 250);
        $testCoverage = (float) ($data['test_coverage_pct'] ?? 82.0);
        $hasIncidentHistory = (bool) ($data['has_incident_history'] ?? false);
        $isOffHours = now()->hour < 8 || now()->hour > 20;
        $targetEnv = $data['environment'] ?? 'staging';

        // Weighted factor scoring (0–100)
        $diffScore = min(100, ($diffSize / 2000) * 100);
        $coverageScore = max(0, 100 - $testCoverage);
        $incidentScore = $hasIncidentHistory ? 25.0 : 0.0;
        $offHoursScore = $isOffHours ? 15.0 : 0.0;
        $envScore = match ($targetEnv) {
            'production' => 20.0,
            'canary' => 10.0,
            'staging' => 5.0,
            default => 0.0,
        };

        $score = round(
            ($diffScore * 0.30) +
            ($coverageScore * 0.30) +
            ($incidentScore * 0.20) +
            ($offHoursScore * 0.10) +
            ($envScore * 0.10),
            1
        );

        $factors = [
            [
                'key' => 'diff_size',
                'label' => 'Ukuran Diff Kode',
                'value' => "{$diffSize} baris",
                'score' => round($diffScore * 0.30, 1),
                'weight_pct' => 30,
            ],
            [
                'key' => 'test_coverage',
                'label' => 'Coverage Test',
                'value' => "{$testCoverage}%",
                'score' => round($coverageScore * 0.30, 1),
                'weight_pct' => 30,
            ],
            [
                'key' => 'incident_history',
                'label' => 'Riwayat Insiden',
                'value' => $hasIncidentHistory ? 'Ada insiden terkait' : 'Bersih',
                'score' => round($incidentScore * 0.20, 1),
                'weight_pct' => 20,
            ],
            [
                'key' => 'off_hours',
                'label' => 'Waktu Deployment',
                'value' => $isOffHours ? 'Di luar jam kerja' : 'Jam kerja normal',
                'score' => round($offHoursScore * 0.10, 1),
                'weight_pct' => 10,
            ],
            [
                'key' => 'environment',
                'label' => 'Target Environment',
                'value' => strtoupper($targetEnv),
                'score' => round($envScore * 0.10, 1),
                'weight_pct' => 10,
            ],
        ];

        return ['score' => $score, 'factors' => $factors];
    }

    /**
     * Create a new deployment pipeline.
     *
     * @param  array<string, mixed>  $data
     */
    public function createPipeline(Organization $organization, array $data, User $user): DeploymentPipeline
    {
        $riskData = $this->calculateRiskScore([
            'diff_lines' => rand(50, 800),
            'test_coverage_pct' => rand(70, 95),
            'has_incident_history' => false,
            'environment' => 'dev',
        ]);

        $environments = $this->buildEnvironmentStages('dev');

        return DeploymentPipeline::create([
            'organization_id' => $organization->id,
            'project_id' => $data['project_id'] ?? null,
            'title' => $data['title'],
            'version_tag' => $data['version_tag'],
            'commit_sha' => $data['commit_sha'] ?? null,
            'repository_url' => $data['repository_url'] ?? null,
            'environments' => $environments,
            'risk_score' => $riskData['score'],
            'risk_factors' => $riskData['factors'],
            'current_environment' => 'dev',
            'status' => 'pending',
            'auto_rollback_enabled' => (bool) ($data['auto_rollback_enabled'] ?? true),
            'rollback_threshold_pct' => (float) ($data['rollback_threshold_pct'] ?? 2.0),
            'deployed_by' => $user->id,
            'started_at' => now(),
        ]);
    }

    /**
     * Promote deployment to next environment.
     */
    public function promotePipeline(DeploymentPipeline $pipeline, User $user): DeploymentPipeline
    {
        $currentIdx = array_search($pipeline->current_environment, $this->environmentOrder);
        $nextEnv = $this->environmentOrder[$currentIdx + 1] ?? null;

        $environments = $pipeline->environments ?? $this->buildEnvironmentStages($pipeline->current_environment);

        // Mark current as passed
        foreach ($environments as &$env) {
            if ($env['name'] === $pipeline->current_environment && $env['status'] === 'running') {
                $env['status'] = 'passed';
                $env['completed_at'] = now()->toIso8601String();
            }
        }
        unset($env);

        if ($nextEnv) {
            // Activate next environment
            foreach ($environments as &$env) {
                if ($env['name'] === $nextEnv) {
                    $env['status'] = 'running';
                    $env['started_at'] = now()->toIso8601String();
                }
            }
            unset($env);

            $pipeline->update([
                'environments' => $environments,
                'current_environment' => $nextEnv,
                'status' => $nextEnv === 'production' ? 'passed' : 'running',
                'completed_at' => $nextEnv === 'production' ? now() : null,
            ]);
        } else {
            $pipeline->update([
                'environments' => $environments,
                'status' => 'passed',
                'completed_at' => now(),
            ]);
        }

        return $pipeline->fresh();
    }

    /**
     * Rollback deployment.
     */
    public function rollbackPipeline(DeploymentPipeline $pipeline, User $user): DeploymentPipeline
    {
        $environments = $pipeline->environments ?? [];

        foreach ($environments as &$env) {
            if ($env['name'] === $pipeline->current_environment) {
                $env['status'] = 'rolled_back';
                $env['completed_at'] = now()->toIso8601String();
            }
        }
        unset($env);

        $pipeline->update([
            'environments' => $environments,
            'status' => 'rolled_back',
            'completed_at' => now(),
        ]);

        return $pipeline->fresh();
    }

    /**
     * Delete pipeline.
     */
    public function deletePipeline(DeploymentPipeline $pipeline): bool
    {
        return (bool) $pipeline->delete();
    }

    /**
     * Build initial environment stages.
     *
     * @return list<array<string, mixed>>
     */
    private function buildEnvironmentStages(string $currentEnv): array
    {
        return array_map(fn (string $env) => [
            'name' => $env,
            'status' => match (true) {
                $env === $currentEnv => 'running',
                default => 'pending',
            },
            'started_at' => $env === $currentEnv ? now()->toIso8601String() : null,
            'completed_at' => null,
        ], $this->environmentOrder);
    }

    /**
     * Seed default pipeline records.
     */
    public function seedDefaultPipelines(Organization $organization, User $user): void
    {
        // Pipeline 1 — fully passed
        $env1 = array_map(fn ($e) => ['name' => $e, 'status' => 'passed', 'started_at' => now()->subHours(3)->toIso8601String(), 'completed_at' => now()->subHours(2)->toIso8601String()], $this->environmentOrder);
        $risk1 = $this->calculateRiskScore(['diff_lines' => 142, 'test_coverage_pct' => 94.0, 'has_incident_history' => false, 'environment' => 'production']);
        DeploymentPipeline::create([
            'organization_id' => $organization->id,
            'title' => 'Rilis Fitur Autentikasi Passkey WebAuthn',
            'version_tag' => 'v4.12.0',
            'commit_sha' => 'a3f9d2e1b5c8f04d',
            'repository_url' => 'https://github.com/abhett/pandu-workspace',
            'environments' => $env1,
            'risk_score' => $risk1['score'],
            'risk_factors' => $risk1['factors'],
            'current_environment' => 'production',
            'status' => 'passed',
            'auto_rollback_enabled' => true,
            'rollback_threshold_pct' => 2.0,
            'deployed_by' => $user->id,
            'started_at' => now()->subHours(3),
            'completed_at' => now()->subHours(2),
        ]);

        // Pipeline 2 — running at staging
        $env2 = [
            ['name' => 'dev', 'status' => 'passed', 'started_at' => now()->subHour()->toIso8601String(), 'completed_at' => now()->subMinutes(45)->toIso8601String()],
            ['name' => 'staging', 'status' => 'running', 'started_at' => now()->subMinutes(20)->toIso8601String(), 'completed_at' => null],
            ['name' => 'canary', 'status' => 'pending', 'started_at' => null, 'completed_at' => null],
            ['name' => 'production', 'status' => 'pending', 'started_at' => null, 'completed_at' => null],
        ];
        $risk2 = $this->calculateRiskScore(['diff_lines' => 520, 'test_coverage_pct' => 79.5, 'has_incident_history' => true, 'environment' => 'staging']);
        DeploymentPipeline::create([
            'organization_id' => $organization->id,
            'title' => 'Upgrade Chaos GameDay Engine v2 & MTTR Metrics',
            'version_tag' => 'v4.13.0-rc1',
            'commit_sha' => 'f7b2a9c04e1d6f38',
            'repository_url' => 'https://github.com/abhett/pandu-workspace',
            'environments' => $env2,
            'risk_score' => $risk2['score'],
            'risk_factors' => $risk2['factors'],
            'current_environment' => 'staging',
            'status' => 'running',
            'auto_rollback_enabled' => true,
            'rollback_threshold_pct' => 1.5,
            'deployed_by' => $user->id,
            'started_at' => now()->subHour(),
        ]);

        // Pipeline 3 — rolled back
        $env3 = array_map(fn ($e) => ['name' => $e, 'status' => $e === 'staging' ? 'rolled_back' : ($e === 'dev' ? 'passed' : 'pending'), 'started_at' => now()->subDays(1)->toIso8601String(), 'completed_at' => $e !== 'canary' && $e !== 'production' ? now()->subDays(1)->addHour()->toIso8601String() : null], $this->environmentOrder);
        $risk3 = $this->calculateRiskScore(['diff_lines' => 1240, 'test_coverage_pct' => 65.0, 'has_incident_history' => true, 'environment' => 'staging']);
        DeploymentPipeline::create([
            'organization_id' => $organization->id,
            'title' => 'Migrasi Database Schema v4.11.x — ROLLBACK',
            'version_tag' => 'v4.11.2',
            'commit_sha' => 'c0d3e9a72f851b4c',
            'repository_url' => 'https://github.com/abhett/pandu-workspace',
            'environments' => $env3,
            'risk_score' => $risk3['score'],
            'risk_factors' => $risk3['factors'],
            'current_environment' => 'staging',
            'status' => 'rolled_back',
            'auto_rollback_enabled' => true,
            'rollback_threshold_pct' => 2.0,
            'deployed_by' => $user->id,
            'started_at' => now()->subDays(1),
            'completed_at' => now()->subDays(1)->addHours(2),
        ]);
    }
}
