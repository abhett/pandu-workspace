<?php

namespace App\Services\Agile;

use App\Models\Project;
use App\Models\Sprint;
use App\Models\SprintImpediment;
use App\Models\Task;
use App\Models\User;

class SprintHealthService
{
    /**
     * Get aggregate sprint health radar, blockers heatmap, and scope metrics.
     *
     * @return array<string, mixed>
     */
    public function getSprintHealthReport(Project $project, ?string $sprintId = null): array
    {
        $allSprints = Sprint::where('project_id', $project->id)
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'status', 'start_date', 'end_date']);

        $sprint = null;
        if ($sprintId) {
            $sprint = Sprint::where('project_id', $project->id)->where('id', $sprintId)->first();
        }

        if (! $sprint) {
            // Find active sprint, or latest
            $sprint = Sprint::where('project_id', $project->id)
                ->where('status', 'active')
                ->first()
                ?? Sprint::where('project_id', $project->id)->orderByDesc('created_at')->first();
        }

        if (! $sprint) {
            return [
                'current_sprint' => null,
                'all_sprints' => [],
                'health_score' => 100,
                'health_category' => 'Excellent',
                'pillars' => [
                    'scope_stability' => 100,
                    'burndown_pace' => 100,
                    'blocker_resilience' => 100,
                    'stale_task_momentum' => 100,
                    'time_progress_ratio' => 100,
                ],
                'scope_metrics' => [
                    'committed_points' => 0,
                    'completed_points' => 0,
                    'remaining_points' => 0,
                    'added_scope_points' => 0,
                    'scope_volatility_pct' => 0,
                    'total_tasks' => 0,
                    'completed_tasks' => 0,
                ],
                'heatmap' => [
                    'matrix' => [],
                    'open_count' => 0,
                    'escalated_count' => 0,
                    'resolved_count' => 0,
                    'critical_count' => 0,
                    'avg_turnaround_hours' => 0,
                ],
                'impediments' => [],
                'project_members' => $project->members()->with('user:id,name,email')->get()->map(fn ($m) => [
                    'id' => $m->user?->id,
                    'name' => $m->user?->name,
                ])->filter(fn ($m) => ! empty($m['id']))->values()->all(),
            ];
        }

        // 1. Task Points and Progress
        $sprintTasks = Task::where('sprint_id', $sprint->id)->with('status')->get();
        $totalTasks = $sprintTasks->count();
        $completedTasks = $sprintTasks->filter(fn ($t) => $t->status?->category === 'done')->count();

        $completedPoints = (float) $sprintTasks->filter(fn ($t) => $t->status?->category === 'done')->sum('estimate_points');
        $remainingPoints = (float) $sprintTasks->filter(fn ($t) => $t->status?->category !== 'done')->sum('estimate_points');
        $committedPoints = (float) ($sprint->committed_points ?? ($completedPoints + $remainingPoints));

        if ($committedPoints <= 0) {
            $committedPoints = max(1.0, $completedPoints + $remainingPoints);
        }

        $totalPoints = $completedPoints + $remainingPoints;
        $addedScopePoints = max(0.0, $totalPoints - $committedPoints);
        $scopeVolatilityPct = round(($addedScopePoints / max(1.0, $committedPoints)) * 100, 1);

        // 2. Sprint Timeline Days
        $startDate = $sprint->start_date ?? $sprint->created_at ?? now()->subDays(7);
        $endDate = $sprint->end_date ?? now()->addDays(7);
        $totalSprintDays = max(1, $startDate->diffInDays($endDate));
        $daysElapsed = min($totalSprintDays, max(0, $startDate->diffInDays(now())));
        $timeElapsedPct = round(($daysElapsed / $totalSprintDays) * 100, 1);
        $completionPct = round(($completedPoints / max(1.0, $totalPoints)) * 100, 1);

        // 3. Impediments Analysis
        $impediments = SprintImpediment::where('sprint_id', $sprint->id)
            ->with(['task:id,key,title,priority', 'raisedBy:id,name,email', 'assignedTo:id,name,email'])
            ->orderByRaw("CASE WHEN status = 'escalated' THEN 1 WHEN status = 'open' THEN 2 WHEN status = 'investigating' THEN 3 ELSE 4 END")
            ->orderByDesc('created_at')
            ->get();

        $openCount = 0;
        $escalatedCount = 0;
        $resolvedCount = 0;
        $criticalCount = 0;
        $blockerPenalty = 0;

        $categories = ['technical', 'external_dependency', 'resource_bottleneck', 'unclear_requirements', 'third_party_outage'];
        $severities = ['critical', 'high', 'medium', 'low'];
        $heatmapMatrix = [];

        foreach ($categories as $cat) {
            foreach ($severities as $sev) {
                $heatmapMatrix[$cat][$sev] = 0;
            }
        }

        $totalResolutionHours = 0;
        $resolvedWithTimesCount = 0;

        foreach ($impediments as $imp) {
            if ($imp->status === 'resolved') {
                $resolvedCount++;
                if ($imp->resolved_at && $imp->created_at) {
                    $diffHours = $imp->created_at->diffInHours($imp->resolved_at);
                    $totalResolutionHours += $diffHours;
                    $resolvedWithTimesCount++;
                }
            } else {
                if ($imp->status === 'escalated') {
                    $escalatedCount++;
                } else {
                    $openCount++;
                }

                if ($imp->severity === 'critical') {
                    $criticalCount++;
                    $blockerPenalty += 25;
                } elseif ($imp->severity === 'high') {
                    $blockerPenalty += 15;
                } elseif ($imp->severity === 'medium') {
                    $blockerPenalty += 8;
                } else {
                    $blockerPenalty += 3;
                }

                if ($imp->escalation_level > 0) {
                    $blockerPenalty += ($imp->escalation_level * 10);
                }
            }

            if (isset($heatmapMatrix[$imp->category][$imp->severity])) {
                $heatmapMatrix[$imp->category][$imp->severity]++;
            }
        }

        $avgTurnaroundHours = $resolvedWithTimesCount > 0
            ? round($totalResolutionHours / $resolvedWithTimesCount, 1)
            : 0.0;

        // 4. Stale In-Progress Tasks (> 3 days unchanged)
        $staleTasksCount = $sprintTasks->filter(function ($t) {
            return $t->status?->category === 'in_progress'
                && $t->updated_at
                && $t->updated_at->lt(now()->subDays(3));
        })->count();

        // 5. Five Health Pillars (0 - 100 each)
        $scopeStabilityPillar = max(20.0, min(100.0, 100.0 - ($scopeVolatilityPct * 1.5)));
        $burndownPillar = max(10.0, min(100.0, 100.0 - max(0.0, $timeElapsedPct - $completionPct)));
        $blockerResiliencePillar = max(10.0, min(100.0, 100.0 - $blockerPenalty));
        $staleTaskPillar = max(30.0, min(100.0, 100.0 - ($staleTasksCount * 15)));
        $timeProgressPillar = max(20.0, min(100.0, ($completionPct / max(1.0, $timeElapsedPct)) * 100.0));

        // Composite Health Score (Weighted)
        $healthScore = round(
            ($scopeStabilityPillar * 0.20) +
            ($burndownPillar * 0.25) +
            ($blockerResiliencePillar * 0.30) +
            ($staleTaskPillar * 0.15) +
            ($timeProgressPillar * 0.10),
            1
        );
        $healthScore = max(5.0, min(100.0, $healthScore));

        $healthCategory = 'Excellent';
        if ($healthScore < 50.0) {
            $healthCategory = 'Critical';
        } elseif ($healthScore < 70.0) {
            $healthCategory = 'At Risk';
        } elseif ($healthScore < 85.0) {
            $healthCategory = 'Good';
        }

        return [
            'current_sprint' => [
                'id' => $sprint->id,
                'name' => $sprint->name,
                'status' => $sprint->status,
                'start_date' => $sprint->start_date ? $sprint->start_date->toDateString() : null,
                'end_date' => $sprint->end_date ? $sprint->end_date->toDateString() : null,
                'total_days' => $totalSprintDays,
                'days_elapsed' => $daysElapsed,
                'time_elapsed_pct' => $timeElapsedPct,
            ],
            'all_sprints' => $allSprints,
            'health_score' => $healthScore,
            'health_category' => $healthCategory,
            'pillars' => [
                'scope_stability' => round($scopeStabilityPillar, 1),
                'burndown_pace' => round($burndownPillar, 1),
                'blocker_resilience' => round($blockerResiliencePillar, 1),
                'stale_task_momentum' => round($staleTaskPillar, 1),
                'time_progress_ratio' => round($timeProgressPillar, 1),
            ],
            'scope_metrics' => [
                'committed_points' => $committedPoints,
                'completed_points' => $completedPoints,
                'remaining_points' => $remainingPoints,
                'added_scope_points' => $addedScopePoints,
                'scope_volatility_pct' => $scopeVolatilityPct,
                'completion_pct' => $completionPct,
                'total_tasks' => $totalTasks,
                'completed_tasks' => $completedTasks,
                'stale_tasks' => $staleTasksCount,
            ],
            'heatmap' => [
                'matrix' => $heatmapMatrix,
                'open_count' => $openCount,
                'escalated_count' => $escalatedCount,
                'resolved_count' => $resolvedCount,
                'critical_count' => $criticalCount,
                'avg_turnaround_hours' => $avgTurnaroundHours,
            ],
            'impediments' => $impediments->map(fn ($imp) => [
                'id' => $imp->id,
                'sprint_id' => $imp->sprint_id,
                'task_id' => $imp->task_id,
                'task' => $imp->task ? [
                    'id' => $imp->task->id,
                    'key' => $imp->task->key,
                    'title' => $imp->task->title,
                    'priority' => $imp->task->priority,
                ] : null,
                'raised_by' => [
                    'id' => $imp->raisedBy?->id,
                    'name' => $imp->raisedBy?->name,
                ],
                'assigned_to' => [
                    'id' => $imp->assignedTo?->id,
                    'name' => $imp->assignedTo?->name,
                ],
                'title' => $imp->title,
                'description' => $imp->description,
                'category' => $imp->category,
                'severity' => $imp->severity,
                'status' => $imp->status,
                'escalation_level' => $imp->escalation_level,
                'escalated_at' => $imp->escalated_at ? $imp->escalated_at->diffForHumans() : null,
                'escalation_notes' => $imp->escalation_notes,
                'resolved_at' => $imp->resolved_at ? $imp->resolved_at->diffForHumans() : null,
                'resolution_summary' => $imp->resolution_summary,
                'created_at' => $imp->created_at->diffForHumans(),
            ]),
            'project_tasks' => $sprintTasks->map(fn ($t) => [
                'id' => $t->id,
                'key' => $t->key,
                'title' => $t->title,
            ])->values()->all(),
            'project_members' => $project->members()->with('user:id,name,email')->get()->map(fn ($m) => [
                'id' => $m->user?->id,
                'name' => $m->user?->name,
            ])->filter(fn ($m) => ! empty($m['id']))->values()->all(),
        ];
    }

    /**
     * Create a new sprint impediment / blocker.
     *
     * @param  array<string, mixed>  $data
     */
    public function createImpediment(Project $project, Sprint $sprint, User $user, array $data): SprintImpediment
    {
        return SprintImpediment::create([
            'project_id' => $project->id,
            'sprint_id' => $sprint->id,
            'task_id' => $data['task_id'] ?? null,
            'raised_by' => $user->id,
            'assigned_to' => $data['assigned_to'] ?? null,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'category' => $data['category'] ?? 'technical',
            'severity' => $data['severity'] ?? 'medium',
            'status' => 'open',
            'escalation_level' => 0,
        ]);
    }

    /**
     * Escalate an impediment to higher level (Scrum Master / Engineering Lead).
     *
     * @param  array<string, mixed>  $data
     */
    public function escalateImpediment(SprintImpediment $impediment, User $user, array $data = []): SprintImpediment
    {
        $newLevel = min(2, $impediment->escalation_level + 1);

        $impediment->update([
            'status' => 'escalated',
            'escalation_level' => $newLevel,
            'escalated_at' => now(),
            'escalation_notes' => $data['escalation_notes'] ?? $impediment->escalation_notes,
            'assigned_to' => $data['assigned_to'] ?? $impediment->assigned_to,
        ]);

        return $impediment->fresh(['task', 'raisedBy', 'assignedTo']);
    }

    /**
     * Resolve an impediment.
     *
     * @param  array<string, mixed>  $data
     */
    public function resolveImpediment(SprintImpediment $impediment, User $user, array $data = []): SprintImpediment
    {
        $impediment->update([
            'status' => 'resolved',
            'resolved_at' => now(),
            'resolution_summary' => $data['resolution_summary'] ?? 'Hambatan telah diselesaikan dengan sukses.',
        ]);

        return $impediment->fresh(['task', 'raisedBy', 'assignedTo']);
    }

    /**
     * Delete an impediment.
     */
    public function deleteImpediment(SprintImpediment $impediment): bool
    {
        return (bool) $impediment->delete();
    }
}
