<?php

namespace App\Services\Dashboard;

use App\Models\DailyStandup;
use App\Models\DashboardWidgetConfig;
use App\Models\Organization;
use App\Models\Release;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkflowStatus;

class WidgetBuilderService
{
    /**
     * Get default executive layout schema.
     */
    public function getDefaultLayout(): array
    {
        return [
            [
                'id' => 'kpi_summary_grid',
                'type' => 'kpi_summary',
                'title' => 'Ringkasan KPI Eksekutif',
                'size' => 'full',
                'enabled' => true,
            ],
            [
                'id' => 'velocity_trend_chart',
                'type' => 'velocity_trend',
                'title' => 'Tren Sprint Velocity & Throughput',
                'size' => 'half',
                'enabled' => true,
            ],
            [
                'id' => 'status_distribution_donut',
                'type' => 'status_distribution',
                'title' => 'Distribusi Status Tugas',
                'size' => 'half',
                'enabled' => true,
            ],
            [
                'id' => 'team_workload_bars',
                'type' => 'team_workload',
                'title' => 'Alokasi Beban Kerja Tim',
                'size' => 'half',
                'enabled' => true,
            ],
            [
                'id' => 'overdue_blocker_radar',
                'type' => 'overdue_radar',
                'title' => 'Radar Blocker & Task Overdue',
                'size' => 'half',
                'enabled' => true,
            ],
            [
                'id' => 'recent_release_standup_feed',
                'type' => 'recent_feed',
                'title' => 'Highlight Standup & Rilis Terkini',
                'size' => 'full',
                'enabled' => true,
            ],
        ];
    }

    /**
     * Get or initialize user's dashboard configuration.
     */
    public function getUserConfig(User $user, Organization $organization): DashboardWidgetConfig
    {
        return DashboardWidgetConfig::firstOrCreate(
            [
                'user_id' => $user->id,
                'organization_id' => $organization->id,
            ],
            [
                'name' => 'Executive BI Overview',
                'is_default' => true,
                'layout' => $this->getDefaultLayout(),
            ]
        );
    }

    /**
     * Save user dashboard layout.
     */
    public function saveConfig(User $user, Organization $organization, array $layout): DashboardWidgetConfig
    {
        $config = $this->getUserConfig($user, $organization);
        $config->update([
            'layout' => $layout,
            'is_default' => false,
        ]);

        return $config;
    }

    /**
     * Reset config to default.
     */
    public function resetConfig(User $user, Organization $organization): DashboardWidgetConfig
    {
        $config = $this->getUserConfig($user, $organization);
        $config->update([
            'layout' => $this->getDefaultLayout(),
            'is_default' => true,
        ]);

        return $config;
    }

    /**
     * Compute live metrics dataset for widgets.
     */
    public function computeLiveMetrics(Organization $organization, ?string $projectId = null): array
    {
        $tasksQuery = Task::where('organization_id', $organization->id)
            ->when($projectId, fn ($q) => $q->where('project_id', $projectId));

        $totalTasks = (clone $tasksQuery)->count();
        $completedTasks = (clone $tasksQuery)->whereNotNull('completed_at')->count();
        $overdueTasks = (clone $tasksQuery)
            ->whereNull('completed_at')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->count();

        $activeSprints = Sprint::whereHas('project', fn ($q) => $q->where('organization_id', $organization->id))
            ->where('status', 'active')
            ->count();

        $releasesCount = Release::where('organization_id', $organization->id)
            ->where('status', 'published')
            ->count();

        $standupCountToday = DailyStandup::where('organization_id', $organization->id)
            ->where('date', now()->toDateString())
            ->count();

        // Status Distribution
        $statuses = WorkflowStatus::whereHas('workflow', fn ($q) => $q->where('organization_id', $organization->id))
            ->withCount(['tasks' => fn ($q) => $projectId ? $q->where('project_id', $projectId) : $q])
            ->get();

        $statusDistribution = $statuses->map(fn ($s) => [
            'id' => $s->id,
            'name' => $s->name,
            'color' => $s->color ?? '#6366f1',
            'category' => $s->category,
            'count' => $s->tasks_count,
        ]);

        if ($statusDistribution->isEmpty()) {
            $statusDistribution = collect([
                ['id' => '1', 'name' => 'To Do', 'color' => '#94a3b8', 'category' => 'todo', 'count' => max(0, $totalTasks - $completedTasks)],
                ['id' => '2', 'name' => 'In Progress', 'color' => '#3b82f6', 'category' => 'in_progress', 'count' => (int) round(($totalTasks - $completedTasks) * 0.4)],
                ['id' => '3', 'name' => 'Done', 'color' => '#10b981', 'category' => 'done', 'count' => $completedTasks],
            ]);
        }

        // Team Workload
        $members = $organization->users()
            ->withCount(['assignedTasks' => fn ($q) => $projectId ? $q->where('project_id', $projectId) : $q])
            ->take(6)
            ->get()
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'avatar' => $u->avatar,
                'task_count' => $u->assigned_tasks_count,
            ]);

        // Velocity Trend
        $sprints = Sprint::whereHas('project', fn ($q) => $q->where('organization_id', $organization->id))
            ->when($projectId, fn ($q) => $q->where('project_id', $projectId))
            ->with('tasks:id,sprint_id,completed_at,estimate_points')
            ->orderByDesc('created_at')
            ->take(5)
            ->get()
            ->map(function ($s) {
                $totalPoints = $s->tasks->sum('estimate_points') ?: $s->tasks->count() * 3;
                $donePoints = $s->tasks->whereNotNull('completed_at')->sum('estimate_points') ?: $s->tasks->whereNotNull('completed_at')->count() * 3;

                return [
                    'sprint_name' => $s->name,
                    'committed_points' => $totalPoints,
                    'completed_points' => $donePoints,
                    'velocity_rate' => $totalPoints > 0 ? round(($donePoints / $totalPoints) * 100) : 0,
                ];
            });

        // Recent Standup & Releases
        $recentStandups = DailyStandup::where('organization_id', $organization->id)
            ->with('user:id,name,avatar')
            ->orderByDesc('created_at')
            ->take(3)
            ->get();

        $recentReleases = Release::where('organization_id', $organization->id)
            ->orderByDesc('created_at')
            ->take(3)
            ->get();

        return [
            'kpis' => [
                'total_tasks' => $totalTasks,
                'completed_tasks' => $completedTasks,
                'completion_rate' => $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0,
                'overdue_tasks' => $overdueTasks,
                'active_sprints' => $activeSprints,
                'releases_count' => $releasesCount,
                'standup_today' => $standupCountToday,
            ],
            'status_distribution' => $statusDistribution,
            'team_workload' => $members,
            'velocity_trend' => $sprints,
            'recent_standups' => $recentStandups,
            'recent_releases' => $recentReleases,
        ];
    }
}
