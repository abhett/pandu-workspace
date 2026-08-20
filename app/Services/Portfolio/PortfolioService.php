<?php

namespace App\Services\Portfolio;

use App\Models\Organization;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskBlocker;
use Illuminate\Support\Carbon;

class PortfolioService
{
    /**
     * Get executive portfolio summary for an organization.
     *
     * @return array<string, mixed>
     */
    public function getPortfolioSummary(Organization $organization): array
    {
        $projects = Project::where('organization_id', $organization->id)
            ->with(['lead'])
            ->get();

        $totalProjects = $projects->count();
        $onTrackCount = 0;
        $atRiskCount = 0;
        $delayedCount = 0;

        $projectList = [];
        $today = now()->startOfDay();

        foreach ($projects as $project) {
            $tasks = Task::where('project_id', $project->id)
                ->with(['status', 'assignees'])
                ->get();

            $totalTasks = $tasks->count();
            $completedTasks = $tasks->filter(function ($t) {
                return $t->status?->category === 'done' || $t->completed_at !== null;
            })->count();

            $progress = $totalTasks > 0 ? (int) round(($completedTasks / $totalTasks) * 100) : 0;

            // Find active blockers
            $activeBlockersCount = TaskBlocker::where('project_id', $project->id)
                ->where('is_resolved', false)
                ->count();

            $hasCriticalBlocker = TaskBlocker::where('project_id', $project->id)
                ->where('is_resolved', false)
                ->where('severity', 'critical')
                ->exists();

            // Find overdue tasks
            $overdueTasksCount = $tasks->filter(function ($t) use ($today) {
                return $t->status?->category !== 'done' && $t->due_date && Carbon::parse($t->due_date)->lt($today);
            })->count();

            $overdueRatio = $totalTasks > 0 ? ($overdueTasksCount / $totalTasks) : 0;

            // Health categorization
            if ($hasCriticalBlocker || $overdueRatio > 0.3) {
                $health = 'delayed';
                $risk = 'high';
                $delayedCount++;
            } elseif ($activeBlockersCount > 0 || $overdueTasksCount > 0) {
                $health = 'at_risk';
                $risk = 'med';
                $atRiskCount++;
            } else {
                $health = 'on_track';
                $risk = 'low';
                $onTrackCount++;
            }

            // Find next milestone
            $nextMilestoneTask = $tasks->filter(function ($t) {
                return $t->is_milestone && $t->status?->category !== 'done';
            })->sortBy(function ($t) {
                return $t->due_date ? Carbon::parse($t->due_date)->timestamp : PHP_INT_MAX;
            })->first();

            $nextMilestone = null;
            if ($nextMilestoneTask) {
                $isPastDue = $nextMilestoneTask->due_date && Carbon::parse($nextMilestoneTask->due_date)->lt($today);
                $nextMilestone = [
                    'title' => $nextMilestoneTask->title,
                    'target_date' => $nextMilestoneTask->due_date ? Carbon::parse($nextMilestoneTask->due_date)->format('M d') : 'TBD',
                    'is_past_due' => $isPastDue,
                ];
            }

            // Lead User
            $leadUser = $project->lead;

            $projectList[] = [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
                'type' => $project->type,
                'category' => ucfirst($project->type),
                'lead' => [
                    'name' => $leadUser?->name ?? 'Unassigned',
                    'email' => $leadUser?->email ?? '',
                    'avatar' => $leadUser?->avatar,
                ],
                'health' => $health, // on_track, at_risk, delayed
                'risk' => $risk,     // low, med, high
                'progress' => $progress,
                'total_tasks' => $totalTasks,
                'completed_tasks' => $completedTasks,
                'active_blockers' => $activeBlockersCount,
                'overdue_tasks' => $overdueTasksCount,
                'next_milestone' => $nextMilestone,
            ];
        }

        // Calculate health matrix percentages
        $denominator = max(1, $totalProjects);
        $highRiskPercent = (int) round(($delayedCount / $denominator) * 100);
        $medRiskPercent = (int) round(($atRiskCount / $denominator) * 100);
        $lowRiskPercent = 100 - $highRiskPercent - $medRiskPercent;

        // Extract upcoming cross-project strategic milestones
        $crossProjectMilestones = Task::whereIn('project_id', $projects->pluck('id'))
            ->where('is_milestone', true)
            ->with(['project'])
            ->orderBy('due_date')
            ->take(6)
            ->get()
            ->map(function ($m) use ($today) {
                $isPastDue = $m->due_date && Carbon::parse($m->due_date)->lt($today);

                return [
                    'id' => $m->id,
                    'title' => $m->title,
                    'project_name' => $m->project?->name,
                    'project_key' => $m->project?->key,
                    'target_date' => $m->due_date ? Carbon::parse($m->due_date)->format('M d') : 'TBD',
                    'is_completed' => $m->status?->category === 'done',
                    'is_past_due' => $isPastDue,
                ];
            })->values()->all();

        return [
            'total_projects' => $totalProjects,
            'on_track_count' => $onTrackCount,
            'on_track_percent' => (int) round(($onTrackCount / $denominator) * 100),
            'at_risk_count' => $atRiskCount,
            'at_risk_percent' => (int) round(($atRiskCount / $denominator) * 100),
            'delayed_count' => $delayedCount,
            'delayed_percent' => (int) round(($delayedCount / $denominator) * 100),
            'resource_utilization' => [
                ['quarter' => 'Q1', 'utilization' => 45],
                ['quarter' => 'Q2', 'utilization' => 65],
                ['quarter' => 'Q3', 'utilization' => 85],
                ['quarter' => 'Q4', 'utilization' => 95],
                ['quarter' => 'Q1+1', 'utilization' => 70],
                ['quarter' => 'Q2+1', 'utilization' => 50],
            ],
            'health_matrix' => [
                'high_risk' => $highRiskPercent,
                'med_risk' => $medRiskPercent,
                'low_risk' => $lowRiskPercent,
            ],
            'projects' => $projectList,
            'milestones_roadmap' => $crossProjectMilestones,
        ];
    }
}
