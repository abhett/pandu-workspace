<?php

namespace App\Services\Agile;

use App\Models\Project;
use App\Models\ProjectForecastScenario;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Carbon;

class SprintForecastService
{
    /**
     * Get historical velocities of completed sprints in a project.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getHistoricalSprints(Project $project, int $limit = 8): array
    {
        $sprints = Sprint::where('project_id', $project->id)
            ->where(function ($q) {
                $q->where('status', 'completed')
                    ->orWhereNotNull('completed_at');
            })
            ->orderByDesc('completed_at')
            ->orderByDesc('created_at')
            ->take($limit)
            ->get();

        if ($sprints->isEmpty()) {
            // Check active or previous sprints with task points
            $sprints = Sprint::where('project_id', $project->id)
                ->orderByDesc('created_at')
                ->take($limit)
                ->get();
        }

        $result = [];
        foreach ($sprints as $sprint) {
            $completedPoints = (float) ($sprint->completed_points ?? 0);

            if ($completedPoints <= 0) {
                // Compute from tasks in done status
                $completedPoints = (float) Task::where('sprint_id', $sprint->id)
                    ->whereHas('status', fn ($q) => $q->where('category', 'done'))
                    ->sum('estimate_points');
            }

            if ($completedPoints <= 0 && $sprint->committed_points > 0) {
                $completedPoints = (float) $sprint->committed_points * 0.85;
            }

            $result[] = [
                'id' => $sprint->id,
                'name' => $sprint->name,
                'status' => $sprint->status,
                'completed_points' => $completedPoints > 0 ? $completedPoints : 15.0,
                'committed_points' => (float) ($sprint->committed_points ?? $completedPoints),
                'completed_at' => $sprint->completed_at ? $sprint->completed_at->toDateString() : null,
            ];
        }

        // Default fallback if no sprints exist yet in the project
        if (empty($result)) {
            $result = [
                ['id' => 'sample-1', 'name' => 'Sprint 1 (Baseline)', 'status' => 'completed', 'completed_points' => 16.0, 'committed_points' => 18.0, 'completed_at' => now()->subWeeks(6)->toDateString()],
                ['id' => 'sample-2', 'name' => 'Sprint 2 (Baseline)', 'status' => 'completed', 'completed_points' => 19.0, 'committed_points' => 20.0, 'completed_at' => now()->subWeeks(4)->toDateString()],
                ['id' => 'sample-3', 'name' => 'Sprint 3 (Baseline)', 'status' => 'completed', 'completed_points' => 14.0, 'committed_points' => 16.0, 'completed_at' => now()->subWeeks(2)->toDateString()],
            ];
        }

        return $result;
    }

    /**
     * Compute statistical velocity metrics (Average, StdDev, Stability index).
     *
     * @param  array<int, float>  $velocities
     * @return array<string, mixed>
     */
    public function calculateVelocityMetrics(array $velocities): array
    {
        if (empty($velocities)) {
            $velocities = [15.0, 18.0, 14.0];
        }

        $count = count($velocities);
        $sum = array_sum($velocities);
        $avg = round($sum / $count, 2);

        // Standard deviation
        $variance = 0.0;
        foreach ($velocities as $v) {
            $variance += pow($v - $avg, 2);
        }
        $stdDev = $count > 1 ? round(sqrt($variance / ($count - 1)), 2) : 1.5;

        // Stability index % (100 - CoeffOfVariation clamped to 20-99)
        $cv = $avg > 0 ? ($stdDev / $avg) * 100 : 20.0;
        $stability = max(20.0, min(99.0, round(100.0 - $cv, 1)));

        return [
            'sample_size' => $count,
            'avg_velocity' => $avg,
            'std_dev' => $stdDev,
            'min_velocity' => min($velocities),
            'max_velocity' => max($velocities),
            'stability_index' => $stability,
        ];
    }

    /**
     * Execute Monte Carlo Simulation for probabilistic release forecast.
     *
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    public function runMonteCarloSimulation(Project $project, array $params): array
    {
        $historicalSprints = $this->getHistoricalSprints($project, (int) ($params['historical_sprints_count'] ?? 5));
        $velocities = array_column($historicalSprints, 'completed_points');
        $metrics = $this->calculateVelocityMetrics($velocities);

        $targetPoints = (float) ($params['target_points'] ?? 60.0);
        if ($targetPoints <= 0) {
            $targetPoints = 30.0;
        }

        $runs = (int) ($params['simulation_runs'] ?? 1000);
        $runs = max(100, min(5000, $runs));

        $sprintDays = (int) ($params['sprint_duration_days'] ?? 14);
        $startDateStr = $params['start_date'] ?? now()->toDateString();
        $startDate = Carbon::parse($startDateStr);

        $sprintsNeededArray = [];
        $sampleCount = count($velocities);

        for ($i = 0; $i < $runs; $i++) {
            $delivered = 0.0;
            $sprintsCount = 0;

            while ($delivered < $targetPoints && $sprintsCount < 100) {
                $sprintsCount++;
                // Bootstrap random draw with replacement
                $drawnVelocity = $velocities[mt_rand(0, $sampleCount - 1)];

                // Add slight gaussian perturbation (-10% to +10%)
                $jitter = 1.0 + (mt_rand(-10, 10) / 100.0);
                $simulatedSprintVelocity = max(1.0, $drawnVelocity * $jitter);

                $delivered += $simulatedSprintVelocity;
            }

            $sprintsNeededArray[] = $sprintsCount;
        }

        sort($sprintsNeededArray);

        // Percentiles: P50, P85, P95
        $p50Index = (int) floor($runs * 0.50);
        $p85Index = (int) floor($runs * 0.85);
        $p95Index = (int) floor($runs * 0.95);

        $p50Sprints = $sprintsNeededArray[$p50Index] ?? 1;
        $p85Sprints = $sprintsNeededArray[$p85Index] ?? 1;
        $p95Sprints = $sprintsNeededArray[$p95Index] ?? 1;

        $p50Date = $startDate->copy()->addDays($p50Sprints * $sprintDays)->toDateString();
        $p85Date = $startDate->copy()->addDays($p85Sprints * $sprintDays)->toDateString();
        $p95Date = $startDate->copy()->addDays($p95Sprints * $sprintDays)->toDateString();

        // Frequency Distribution & S-Curve / CDF
        $frequencyMap = array_count_values($sprintsNeededArray);
        ksort($frequencyMap);

        $distributionBins = [];
        $runningCumulative = 0;

        foreach ($frequencyMap as $sprintCount => $freq) {
            $runningCumulative += $freq;
            $probability = round(($freq / $runs) * 100, 1);
            $cumulativeProb = round(($runningCumulative / $runs) * 100, 1);

            $distributionBins[] = [
                'sprints' => $sprintCount,
                'projected_date' => $startDate->copy()->addDays($sprintCount * $sprintDays)->format('d M Y'),
                'frequency' => $freq,
                'probability_pct' => $probability,
                'cumulative_prob_pct' => $cumulativeProb,
            ];
        }

        // Release Readiness Score (0-100%)
        $readinessScore = round(($metrics['stability_index'] * 0.6) + min(40.0, 40.0 * ($metrics['avg_velocity'] / max(1.0, $targetPoints / $p85Sprints))), 1);
        $readinessScore = max(10.0, min(100.0, $readinessScore));

        return [
            'target_points' => $targetPoints,
            'simulation_runs' => $runs,
            'sprint_duration_days' => $sprintDays,
            'start_date' => $startDateStr,
            'metrics' => $metrics,
            'percentiles' => [
                'p50' => [
                    'sprints' => $p50Sprints,
                    'date' => $p50Date,
                    'label' => '50% Keyakinan (Optimis)',
                    'confidence_pct' => 50,
                ],
                'p85' => [
                    'sprints' => $p85Sprints,
                    'date' => $p85Date,
                    'label' => '85% Keyakinan (Rekomendasi Agile)',
                    'confidence_pct' => 85,
                ],
                'p95' => [
                    'sprints' => $p95Sprints,
                    'date' => $p95Date,
                    'label' => '95% Keyakinan (Konservatif/Aman)',
                    'confidence_pct' => 95,
                ],
            ],
            'distribution_bins' => $distributionBins,
            'readiness_score' => $readinessScore,
            'historical_velocities' => $velocities,
        ];
    }

    /**
     * Get complete forecast dashboard for a project.
     *
     * @return array<string, mixed>
     */
    public function getForecastDashboard(Project $project, ?string $scenarioId = null): array
    {
        $historicalSprints = $this->getHistoricalSprints($project, 6);
        $velocities = array_column($historicalSprints, 'completed_points');
        $velocityMetrics = $this->calculateVelocityMetrics($velocities);

        // Backlog analysis
        $uncompletedTasks = Task::where('project_id', $project->id)
            ->whereHas('status', fn ($q) => $q->where('category', '!=', 'done'))
            ->get();

        $remainingBacklogPoints = (float) $uncompletedTasks->sum('estimate_points');
        $unestimatedTasksCount = $uncompletedTasks->filter(fn ($t) => empty($t->estimate_points) || $t->estimate_points <= 0)->count();
        $totalBacklogTasks = $uncompletedTasks->count();

        $targetPoints = $remainingBacklogPoints > 0 ? $remainingBacklogPoints : 50.0;

        // Run default simulation
        $simulationResult = $this->runMonteCarloSimulation($project, [
            'target_points' => $targetPoints,
            'simulation_runs' => 1000,
            'historical_sprints_count' => 5,
            'sprint_duration_days' => 14,
            'start_date' => now()->toDateString(),
        ]);

        // Saved Scenarios
        $scenarios = ProjectForecastScenario::where('project_id', $project->id)
            ->with('creator')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($sc) => [
                'id' => $sc->id,
                'title' => $sc->title,
                'target_scope_type' => $sc->target_scope_type,
                'target_points' => $sc->target_points,
                'simulation_runs' => $sc->simulation_runs,
                'sprint_duration_days' => $sc->sprint_duration_days,
                'start_date' => $sc->start_date->toDateString(),
                'results' => $sc->results,
                'creator' => [
                    'id' => $sc->creator?->id,
                    'name' => $sc->creator?->name,
                ],
                'created_at' => $sc->created_at->toIso8601String(),
            ]);

        return [
            'historical_sprints' => $historicalSprints,
            'velocity_metrics' => $velocityMetrics,
            'backlog_stats' => [
                'remaining_points' => $remainingBacklogPoints,
                'total_tasks' => $totalBacklogTasks,
                'unestimated_tasks' => $unestimatedTasksCount,
                'estimated_ratio_pct' => $totalBacklogTasks > 0
                    ? round((($totalBacklogTasks - $unestimatedTasksCount) / $totalBacklogTasks) * 100, 1)
                    : 100.0,
            ],
            'simulation' => $simulationResult,
            'scenarios' => $scenarios,
        ];
    }

    /**
     * Save forecast scenario.
     *
     * @param  array<string, mixed>  $data
     */
    public function saveScenario(Project $project, User $user, array $data): ProjectForecastScenario
    {
        $simulationResult = $this->runMonteCarloSimulation($project, $data);

        return ProjectForecastScenario::create([
            'project_id' => $project->id,
            'created_by' => $user->id,
            'title' => $data['title'],
            'target_scope_type' => $data['target_scope_type'] ?? 'remaining_backlog',
            'target_points' => (float) $data['target_points'],
            'simulation_runs' => (int) ($data['simulation_runs'] ?? 1000),
            'historical_sprints_count' => (int) ($data['historical_sprints_count'] ?? 5),
            'sprint_duration_days' => (int) ($data['sprint_duration_days'] ?? 14),
            'start_date' => $data['start_date'] ?? now()->toDateString(),
            'results' => $simulationResult,
        ]);
    }

    /**
     * Destroy forecast scenario.
     */
    public function destroyScenario(ProjectForecastScenario $scenario): bool
    {
        return (bool) $scenario->delete();
    }
}
