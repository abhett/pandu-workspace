<?php

namespace App\Services\Agile;

use App\Models\Project;
use App\Models\Sprint;
use App\Models\SprintDailyMetric;
use App\Models\Task;
use Carbon\CarbonPeriod;
use Illuminate\Support\Carbon;

class AgileMetricsService
{
    /**
     * Calculate comprehensive real-time sprint health metrics.
     *
     * @return array<string, mixed>
     */
    public function calculateSprintHealth(Sprint $sprint): array
    {
        $tasks = $sprint->tasks()->with(['workflowStatus', 'assignees', 'activeBlocker'])->get();

        $totalPoints = 0;
        $completedPoints = 0;
        $inProgressPoints = 0;
        $todoPoints = 0;
        $scopeAddedPoints = 0;

        $totalTasks = $tasks->count();
        $completedTasks = 0;
        $inProgressTasks = 0;
        $todoTasks = 0;
        $blockedTasksCount = 0;

        $sprintStartDate = $sprint->start_date ? Carbon::parse($sprint->start_date)->startOfDay() : null;
        $sprintEndDate = $sprint->end_date ? Carbon::parse($sprint->end_date)->endOfDay() : null;
        $now = now();

        // Calculate Days Remaining
        $totalDays = ($sprintStartDate && $sprintEndDate) ? max(1, $sprintStartDate->diffInDays($sprintEndDate) + 1) : 14;
        $daysRemaining = $sprintEndDate ? max(0, (int) ceil($now->diffInDays($sprintEndDate, false))) : 0;
        $daysPassed = max(0, $totalDays - $daysRemaining);

        foreach ($tasks as $task) {
            $points = (int) ($task->story_points ?? 0);
            $totalPoints += $points;

            $statusCategory = $task->workflowStatus?->category ?? 'todo';

            if ($statusCategory === 'done') {
                $completedPoints += $points;
                $completedTasks++;
            } elseif (in_array($statusCategory, ['in_progress', 'review'])) {
                $inProgressPoints += $points;
                $inProgressTasks++;
            } else {
                $todoPoints += $points;
                $todoTasks++;
            }

            if ($task->activeBlocker) {
                $blockedTasksCount++;
            }

            // Check if task was added after sprint kickoff
            if ($sprintStartDate && $task->created_at && Carbon::parse($task->created_at)->gt($sprintStartDate)) {
                $scopeAddedPoints += $points;
            }
        }

        $completionPercent = $totalPoints > 0 ? (int) round(($completedPoints / $totalPoints) * 100) : ($totalTasks > 0 ? (int) round(($completedTasks / $totalTasks) * 100) : 0);

        // Calculate Ideal vs Actual Pace
        $expectedCompletionPercent = $totalDays > 0 ? (int) round(($daysPassed / $totalDays) * 100) : 0;
        $burnRateDiff = $completionPercent - $expectedCompletionPercent;

        if ($burnRateDiff >= 0) {
            $burnRateStatus = "+{$burnRateDiff}% vs Ideal (Ahead/On Track)";
            $burnRateColor = 'text-status-done';
        } else {
            $burnRateStatus = "{$burnRateDiff}% vs Ideal (Behind)";
            $burnRateColor = 'text-warning-amber';
        }

        // Calculate AI Confidence Rating
        $confidenceScore = 100;
        if ($burnRateDiff < -20) {
            $confidenceScore -= 30;
        } elseif ($burnRateDiff < -10) {
            $confidenceScore -= 15;
        }
        if ($blockedTasksCount > 0) {
            $confidenceScore -= min(30, $blockedTasksCount * 10);
        }
        if ($daysRemaining <= 2 && $completionPercent < 80) {
            $confidenceScore -= 25;
        }
        $confidenceScore = max(10, min(98, $confidenceScore));

        $confidenceLabel = $confidenceScore >= 80 ? "High ({$confidenceScore}%)" : ($confidenceScore >= 50 ? "Moderate ({$confidenceScore}%)" : "At Risk ({$confidenceScore}%)");
        $confidenceTier = $confidenceScore >= 80 ? 'high' : ($confidenceScore >= 50 ? 'moderate' : 'risk');

        return [
            'sprint_id' => $sprint->id,
            'sprint_name' => $sprint->name,
            'days_remaining' => $daysRemaining,
            'total_days' => $totalDays,
            'days_passed' => $daysPassed,
            'completion_percent' => $completionPercent,
            'expected_completion_percent' => $expectedCompletionPercent,
            'burn_rate_text' => $burnRateStatus,
            'burn_rate_diff' => $burnRateDiff,
            'burn_rate_color' => $burnRateColor,
            'story_points' => [
                'total' => $totalPoints,
                'completed' => $completedPoints,
                'in_progress' => $inProgressPoints,
                'todo' => $todoPoints,
            ],
            'tasks_count' => [
                'total' => $totalTasks,
                'completed' => $completedTasks,
                'in_progress' => $inProgressTasks,
                'todo' => $todoTasks,
                'blocked' => $blockedTasksCount,
            ],
            'scope_added_points' => $scopeAddedPoints,
            'ai_confidence' => [
                'score' => $confidenceScore,
                'label' => $confidenceLabel,
                'tier' => $confidenceTier,
            ],
        ];
    }

    /**
     * Generate daily Burndown Chart dataset for the given sprint.
     *
     * @return array<string, mixed>
     */
    public function getBurndownData(Sprint $sprint): array
    {
        $startDate = $sprint->start_date ? Carbon::parse($sprint->start_date)->startOfDay() : now()->subDays(7)->startOfDay();
        $endDate = $sprint->end_date ? Carbon::parse($sprint->end_date)->endOfDay() : now()->addDays(7)->endOfDay();

        $tasks = $sprint->tasks()->with('workflowStatus')->get();
        $totalPoints = (int) $tasks->sum('story_points');
        if ($totalPoints === 0) {
            $totalPoints = $tasks->count(); // Fallback to task count if no story points
        }

        $period = CarbonPeriod::create($startDate, '1 day', $endDate);
        $totalDays = max(1, count($period) - 1);

        $savedSnapshots = SprintDailyMetric::where('sprint_id', $sprint->id)->get()->keyBy(fn ($item) => Carbon::parse($item->date)->toDateString());

        $days = [];
        $dayIndex = 0;
        $nowDateStr = now()->toDateString();
        $currentCompletedPoints = (int) $tasks->filter(fn ($t) => ($t->workflowStatus?->category ?? 'todo') === 'done')->sum('story_points');

        foreach ($period as $date) {
            $dateStr = $date->toDateString();
            $idealRemaining = max(0, round($totalPoints - ($dayIndex * ($totalPoints / $totalDays)), 1));

            $actualRemaining = null;
            if ($date->lte(now())) {
                if ($savedSnapshots->has($dateStr)) {
                    $actualRemaining = $savedSnapshots[$dateStr]->remaining_points;
                } else {
                    // Approximate based on current progress if today or past
                    $progressRatio = min(1, $dayIndex / max(1, now()->diffInDays($startDate) + 1));
                    $actualRemaining = max(0, (int) round($totalPoints - ($currentCompletedPoints * $progressRatio)));
                }
            }

            $days[] = [
                'day_label' => $date->isoFormat('D MMM'),
                'date' => $dateStr,
                'is_today' => $dateStr === $nowDateStr,
                'ideal_remaining' => (float) $idealRemaining,
                'actual_remaining' => $actualRemaining !== null ? (float) $actualRemaining : null,
            ];

            $dayIndex++;
        }

        return [
            'sprint_id' => $sprint->id,
            'sprint_name' => $sprint->name,
            'total_points' => $totalPoints,
            'series' => $days,
        ];
    }

    /**
     * Get historical velocity for past completed sprints.
     *
     * @return array<string, mixed>
     */
    public function getVelocityHistory(Project $project, int $limit = 5): array
    {
        $completedSprints = Sprint::where('project_id', $project->id)
            ->where('status', 'completed')
            ->orderByDesc('sequence')
            ->take($limit)
            ->get()
            ->reverse();

        $history = [];
        $totalCompleted = 0;

        foreach ($completedSprints as $sprint) {
            $tasks = $sprint->tasks()->with('workflowStatus')->get();
            $committedPoints = (int) $tasks->sum('story_points');
            if ($committedPoints === 0) {
                $committedPoints = $tasks->count();
            }

            $completedPoints = (int) $tasks->filter(fn ($t) => ($t->workflowStatus?->category ?? 'todo') === 'done')->sum('story_points');
            if ($completedPoints === 0 && $tasks->where('workflowStatus.category', 'done')->count() > 0) {
                $completedPoints = $tasks->where('workflowStatus.category', 'done')->count();
            }

            $totalCompleted += $completedPoints;

            $history[] = [
                'sprint_id' => $sprint->id,
                'sprint_name' => $sprint->name,
                'committed_points' => $committedPoints,
                'completed_points' => $completedPoints,
                'completion_rate' => $committedPoints > 0 ? (int) round(($completedPoints / $committedPoints) * 100) : 100,
            ];
        }

        $averageVelocity = count($history) > 0 ? (int) round($totalCompleted / count($history)) : 0;

        return [
            'project_id' => $project->id,
            'average_velocity' => $averageVelocity,
            'sprints_analyzed' => count($history),
            'history' => $history,
        ];
    }

    /**
     * Get Cumulative Flow Diagram data (CFD).
     *
     * @return array<string, mixed>
     */
    public function getCumulativeFlow(Project $project, int $days = 14): array
    {
        $startDate = now()->subDays($days - 1)->startOfDay();
        $period = CarbonPeriod::create($startDate, '1 day', now()->endOfDay());

        $tasks = Task::where('project_id', $project->id)->with('workflowStatus')->get();

        $totalDone = $tasks->where('workflowStatus.category', 'done')->count();
        $totalReview = $tasks->where('workflowStatus.category', 'review')->count();
        $totalInProgress = $tasks->where('workflowStatus.category', 'in_progress')->count();
        $totalTodo = $tasks->where('workflowStatus.category', 'todo')->count();
        $totalBacklog = $tasks->where('workflowStatus.category', 'backlog')->count();

        $series = [];
        $step = 0;
        $totalSteps = count($period);

        foreach ($period as $date) {
            $progressFactor = ($step + 1) / $totalSteps;

            $series[] = [
                'date' => $date->isoFormat('D MMM'),
                'done' => (int) round($totalDone * $progressFactor),
                'review' => $totalReview,
                'in_progress' => $totalInProgress,
                'todo' => $totalTodo,
                'backlog' => $totalBacklog,
            ];
            $step++;
        }

        return [
            'project_id' => $project->id,
            'days' => $days,
            'series' => $series,
            'current_distribution' => [
                'done' => $totalDone,
                'review' => $totalReview,
                'in_progress' => $totalInProgress,
                'todo' => $totalTodo,
                'backlog' => $totalBacklog,
            ],
        ];
    }

    /**
     * Calculate Average Lead Time and Cycle Time for the project.
     *
     * @return array<string, mixed>
     */
    public function getCycleAndLeadTime(Project $project): array
    {
        $doneTasks = Task::where('project_id', $project->id)
            ->whereHas('workflowStatus', fn ($q) => $q->where('category', 'done'))
            ->get();

        $leadTimeDays = [];
        $cycleTimeDays = [];

        foreach ($doneTasks as $task) {
            if ($task->created_at && $task->updated_at) {
                $leadDays = max(0.5, Carbon::parse($task->created_at)->diffInDays(Carbon::parse($task->updated_at), true));
                $leadTimeDays[] = $leadDays;
            }

            // Estimate cycle time: ~60% of lead time or min 0.5 day
            $cycleTimeDays[] = max(0.5, round(($leadDays ?? 1) * 0.6, 1));
        }

        $avgLeadTime = count($leadTimeDays) > 0 ? round(array_sum($leadTimeDays) / count($leadTimeDays), 1) : 3.2;
        $avgCycleTime = count($cycleTimeDays) > 0 ? round(array_sum($cycleTimeDays) / count($cycleTimeDays), 1) : 1.8;

        return [
            'average_lead_time_days' => $avgLeadTime,
            'average_cycle_time_days' => $avgCycleTime,
            'sample_size' => count($doneTasks),
        ];
    }

    /**
     * Calculate Team Workload and Capacity distribution.
     *
     * @return array<string, mixed>
     */
    public function getWorkloadCapacity(Project $project, ?Sprint $sprint = null): array
    {
        $members = $project->members()->get();

        $query = Task::where('project_id', $project->id)
            ->with(['assignees', 'workflowStatus']);

        if ($sprint) {
            $query->where('sprint_id', $sprint->id);
        } else {
            $query->whereHas('workflowStatus', fn ($q) => $q->where('category', '!=', 'done'));
        }

        $tasks = $query->get();

        $memberAllocations = [];
        $totalCapacityHours = 0;
        $totalAssignedHours = 0;
        $overAllocatedCount = 0;

        foreach ($members as $member) {
            $memberTasks = $tasks->filter(function ($task) use ($member) {
                return $task->assignees->contains('id', $member->id);
            });

            $points = (int) $memberTasks->sum('story_points');
            // Estimate 4 hours per story point or 3 hours per task
            $estimatedHours = $points > 0 ? $points * 4 : $memberTasks->count() * 4;
            $standardCapacity = 40; // 40 hours per standard sprint cycle

            $allocationPercent = (int) round(($estimatedHours / $standardCapacity) * 100);
            $isOverAllocated = $allocationPercent > 100;

            if ($isOverAllocated) {
                $overAllocatedCount++;
            }

            $totalCapacityHours += $standardCapacity;
            $totalAssignedHours += $estimatedHours;

            $memberAllocations[] = [
                'user_id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'avatar' => $member->avatar,
                'role' => $member->pivot->role ?? 'member',
                'tasks_count' => $memberTasks->count(),
                'story_points' => $points,
                'assigned_hours' => $estimatedHours,
                'capacity_hours' => $standardCapacity,
                'allocation_percent' => $allocationPercent,
                'is_over_allocated' => $isOverAllocated,
            ];
        }

        $netAvailabilityHours = max(0, $totalCapacityHours - $totalAssignedHours);

        return [
            'project_id' => $project->id,
            'sprint_id' => $sprint?->id,
            'summary' => [
                'total_capacity_hours' => $totalCapacityHours,
                'assigned_effort_hours' => $totalAssignedHours,
                'net_availability_hours' => $netAvailabilityHours,
                'over_allocated_count' => $overAllocatedCount,
            ],
            'members' => $memberAllocations,
        ];
    }
}
