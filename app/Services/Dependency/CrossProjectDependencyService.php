<?php

namespace App\Services\Dependency;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskDependency;
use Illuminate\Support\Carbon;
use InvalidArgumentException;

class CrossProjectDependencyService
{
    /**
     * Get cross-project dependency blocker matrix data, circular cycle analysis, and impact metrics.
     *
     * @return array<string, mixed>
     */
    public function getCrossProjectMatrixData(Project $project): array
    {
        $projectTaskIds = Task::where('project_id', $project->id)->pluck('id')->all();

        // 1. Inbound Dependencies (External tasks blocking our tasks)
        $inboundDeps = TaskDependency::whereIn('successor_id', $projectTaskIds)
            ->whereHas('predecessor', fn ($q) => $q->where('project_id', '!=', $project->id))
            ->with([
                'predecessor.project:id,key,name',
                'predecessor.status:id,name,color,category',
                'predecessor.assignees:id,name',
                'successor.project:id,key,name',
                'successor.status:id,name,color,category',
                'successor.assignees:id,name',
            ])
            ->get();

        // 2. Outbound Dependencies (Our tasks blocking external tasks)
        $outboundDeps = TaskDependency::whereIn('predecessor_id', $projectTaskIds)
            ->whereHas('successor', fn ($q) => $q->where('project_id', '!=', $project->id))
            ->with([
                'predecessor.project:id,key,name',
                'predecessor.status:id,name,color,category',
                'predecessor.assignees:id,name',
                'successor.project:id,key,name',
                'successor.status:id,name,color,category',
                'successor.assignees:id,name',
            ])
            ->get();

        // 3. Internal Dependencies
        $internalDeps = TaskDependency::whereIn('predecessor_id', $projectTaskIds)
            ->whereIn('successor_id', $projectTaskIds)
            ->with([
                'predecessor.project:id,key,name',
                'predecessor.status:id,name,color,category',
                'predecessor.assignees:id,name',
                'successor.project:id,key,name',
                'successor.status:id,name,color,category',
                'successor.assignees:id,name',
            ])
            ->get();

        // Evaluate risk levels
        $formatDep = function (TaskDependency $dep, string $direction) {
            $pred = $dep->predecessor;
            $succ = $dep->successor;

            $isPredDone = $pred?->status?->category === 'done' || $pred?->completed_at !== null;
            $isPredOverdue = $pred?->due_date && Carbon::parse($pred->due_date)->isPast() && ! $isPredDone;

            $riskLevel = 'low';
            if (! $isPredDone) {
                if ($isPredOverdue || $pred?->priority === 'critical' || $pred?->priority === 'high') {
                    $riskLevel = 'high';
                } else {
                    $riskLevel = 'medium';
                }
            }

            return [
                'id' => $dep->id,
                'direction' => $direction,
                'type' => $dep->type,
                'lag_days' => (int) $dep->lag_days,
                'risk_level' => $riskLevel,
                'is_blocker_resolved' => $isPredDone,
                'predecessor' => $pred ? [
                    'id' => $pred->id,
                    'key' => $pred->key,
                    'title' => $pred->title,
                    'priority' => $pred->priority,
                    'due_date' => $pred->due_date,
                    'is_overdue' => $isPredOverdue,
                    'status' => $pred->status ? [
                        'name' => $pred->status->name,
                        'color' => $pred->status->color,
                        'category' => $pred->status->category,
                    ] : null,
                    'project' => $pred->project ? [
                        'id' => $pred->project->id,
                        'key' => $pred->project->key,
                        'name' => $pred->project->name,
                    ] : null,
                    'assignees' => $pred->assignees->map(fn ($u) => ['id' => $u->id, 'name' => $u->name]),
                ] : null,
                'successor' => $succ ? [
                    'id' => $succ->id,
                    'key' => $succ->key,
                    'title' => $succ->title,
                    'priority' => $succ->priority,
                    'due_date' => $succ->due_date,
                    'status' => $succ->status ? [
                        'name' => $succ->status->name,
                        'color' => $succ->status->color,
                        'category' => $succ->status->category,
                    ] : null,
                    'project' => $succ->project ? [
                        'id' => $succ->project->id,
                        'key' => $succ->project->key,
                        'name' => $succ->project->name,
                    ] : null,
                    'assignees' => $succ->assignees->map(fn ($u) => ['id' => $u->id, 'name' => $u->name]),
                ] : null,
            ];
        };

        $inboundFormatted = $inboundDeps->map(fn ($d) => $formatDep($d, 'inbound'))->values();
        $outboundFormatted = $outboundDeps->map(fn ($d) => $formatDep($d, 'outbound'))->values();
        $internalFormatted = $internalDeps->map(fn ($d) => $formatDep($d, 'internal'))->values();

        // 4. Detect Cycles
        $cycles = $this->detectCycles($project->organization_id);

        // 5. Available other projects in organization for selection
        $otherProjects = Project::where('organization_id', $project->organization_id)
            ->where('status', 'active')
            ->select(['id', 'key', 'name'])
            ->orderBy('name')
            ->get();

        $localTasks = Task::where('project_id', $project->id)
            ->select(['id', 'key', 'title', 'estimate_points', 'priority'])
            ->orderBy('sequence_number')
            ->get();

        $highRiskCount = $inboundFormatted->where('risk_level', 'high')->count() +
            $outboundFormatted->where('risk_level', 'high')->count();

        return [
            'metrics' => [
                'total_cross_dependencies' => $inboundFormatted->count() + $outboundFormatted->count(),
                'inbound_blockers_count' => $inboundFormatted->count(),
                'outbound_blockers_count' => $outboundFormatted->count(),
                'internal_dependencies_count' => $internalFormatted->count(),
                'high_risk_count' => $highRiskCount,
                'cycles_count' => count($cycles),
            ],
            'inbound_dependencies' => $inboundFormatted,
            'outbound_dependencies' => $outboundFormatted,
            'internal_dependencies' => $internalFormatted,
            'cycles' => $cycles,
            'other_projects' => $otherProjects,
            'local_tasks' => $localTasks,
        ];
    }

    /**
     * Detect circular dependency cycles using Depth-First Search.
     *
     * @return array<int, array<int, string>>
     */
    public function detectCycles(string $organizationId): array
    {
        $deps = TaskDependency::whereHas('project', fn ($q) => $q->where('organization_id', $organizationId))
            ->get();

        $adjList = [];
        $taskMap = [];

        foreach ($deps as $dep) {
            $adjList[$dep->predecessor_id][] = $dep->successor_id;
        }

        $visited = [];
        $recStack = [];
        $cycles = [];

        $dfs = function ($node, $path) use (&$dfs, &$adjList, &$visited, &$recStack, &$cycles) {
            $visited[$node] = true;
            $recStack[$node] = true;
            $path[] = $node;

            if (isset($adjList[$node])) {
                foreach ($adjList[$node] as $neighbor) {
                    if (! isset($visited[$neighbor]) || ! $visited[$neighbor]) {
                        $dfs($neighbor, $path);
                    } elseif (isset($recStack[$neighbor]) && $recStack[$neighbor]) {
                        // Cycle found! Extract cycle path
                        $cycleStartIdx = array_search($neighbor, $path);
                        if ($cycleStartIdx !== false) {
                            $cycle = array_slice($path, $cycleStartIdx);
                            $cycle[] = $neighbor; // Close the cycle
                            $cycles[] = $cycle;
                        }
                    }
                }
            }

            $recStack[$node] = false;
        };

        foreach (array_keys($adjList) as $node) {
            if (! isset($visited[$node]) || ! $visited[$node]) {
                $dfs($node, []);
            }
        }

        // Hydrate cycle task details
        $formattedCycles = [];
        foreach ($cycles as $cyclePath) {
            $tasks = Task::whereIn('id', $cyclePath)
                ->with('project:id,key,name')
                ->get()
                ->keyBy('id');

            $cycleSteps = [];
            foreach ($cyclePath as $taskId) {
                $t = $tasks->get($taskId);
                if ($t) {
                    $cycleSteps[] = [
                        'id' => $t->id,
                        'key' => $t->key,
                        'title' => $t->title,
                        'project_key' => $t->project?->key ?? 'PRJ',
                    ];
                }
            }
            if (count($cycleSteps) > 1) {
                $formattedCycles[] = $cycleSteps;
            }
        }

        return $formattedCycles;
    }

    /**
     * Simulate cascade delay impact across downstream tasks and projects.
     *
     * @return array<string, mixed>
     */
    public function simulateDelayImpact(Project $project, string $taskId, int $delayDays): array
    {
        $rootTask = Task::with('project:id,key,name')->find($taskId);
        if (! $rootTask) {
            throw new InvalidArgumentException('Tugas tidak ditemukan.');
        }

        $allDeps = TaskDependency::with(['successor.project:id,key,name', 'successor.status:id,name,category'])->get();

        $adjList = [];
        foreach ($allDeps as $dep) {
            $adjList[$dep->predecessor_id][] = [
                'successor' => $dep->successor,
                'type' => $dep->type,
                'lag_days' => $dep->lag_days,
            ];
        }

        $queue = [[
            'task_id' => $rootTask->id,
            'cumulative_delay' => $delayDays,
            'level' => 0,
        ]];

        $visited = [$rootTask->id => true];
        $affectedTasks = [];
        $affectedProjectIds = [];

        while (! empty($queue)) {
            $current = array_shift($queue);
            $currTaskId = $current['task_id'];
            $currDelay = $current['cumulative_delay'];
            $currLevel = $current['level'];

            if (isset($adjList[$currTaskId])) {
                foreach ($adjList[$currTaskId] as $edge) {
                    $succ = $edge['successor'];
                    if (! $succ || isset($visited[$succ->id])) {
                        continue;
                    }

                    $visited[$succ->id] = true;
                    $affectedProjectIds[$succ->project_id] = true;

                    $origDue = $succ->due_date ? Carbon::parse($succ->due_date) : now();
                    $projectedDue = $origDue->copy()->addDays($currDelay);

                    $affectedTasks[] = [
                        'id' => $succ->id,
                        'key' => $succ->key,
                        'title' => $succ->title,
                        'priority' => $succ->priority,
                        'project_id' => $succ->project_id,
                        'project_key' => $succ->project?->key ?? 'PRJ',
                        'project_name' => $succ->project?->name ?? 'Proyek',
                        'is_external_project' => $succ->project_id !== $project->id,
                        'level' => $currLevel + 1,
                        'delay_days' => $currDelay,
                        'original_due_date' => $succ->due_date,
                        'projected_due_date' => $projectedDue->toDateString(),
                        'status' => $succ->status?->name ?? 'Open',
                    ];

                    $queue[] = [
                        'task_id' => $succ->id,
                        'cumulative_delay' => $currDelay,
                        'level' => $currLevel + 1,
                    ];
                }
            }
        }

        return [
            'root_task' => [
                'id' => $rootTask->id,
                'key' => $rootTask->key,
                'title' => $rootTask->title,
                'project_key' => $rootTask->project?->key,
                'project_name' => $rootTask->project?->name,
                'due_date' => $rootTask->due_date,
            ],
            'simulated_delay_days' => $delayDays,
            'affected_tasks_count' => count($affectedTasks),
            'affected_projects_count' => count($affectedProjectIds),
            'affected_tasks' => $affectedTasks,
        ];
    }

    /**
     * Create a cross-project task dependency with anti-circular validation.
     */
    public function createCrossProjectDependency(Project $project, array $data): TaskDependency
    {
        $predecessor = Task::findOrFail($data['predecessor_id']);
        $successor = Task::findOrFail($data['successor_id']);

        if ($predecessor->id === $successor->id) {
            throw new InvalidArgumentException('Tugas tidak dapat bergantung pada dirinya sendiri.');
        }

        // Test if adding this would cause a cycle
        $existingDeps = TaskDependency::all();
        $adjList = [];
        foreach ($existingDeps as $dep) {
            $adjList[$dep->predecessor_id][] = $dep->successor_id;
        }
        $adjList[$predecessor->id][] = $successor->id;

        // Run cycle check on $adjList
        if ($this->hasCycle($adjList)) {
            throw new InvalidArgumentException('Dependensi sirkular terdeteksi! Relasi ini akan menyebabkan deadlock rantai kerja.');
        }

        return TaskDependency::updateOrCreate(
            [
                'predecessor_id' => $predecessor->id,
                'successor_id' => $successor->id,
            ],
            [
                'project_id' => $project->id,
                'type' => $data['type'] ?? 'finish_to_start',
                'lag_days' => (int) ($data['lag_days'] ?? 0),
            ]
        );
    }

    /**
     * Delete a task dependency.
     */
    public function deleteDependency(Project $project, TaskDependency $dependency): bool
    {
        return (bool) $dependency->delete();
    }

    protected function hasCycle(array $adjList): bool
    {
        $visited = [];
        $recStack = [];

        $dfs = function ($node) use (&$dfs, &$adjList, &$visited, &$recStack) {
            $visited[$node] = true;
            $recStack[$node] = true;

            if (isset($adjList[$node])) {
                foreach ($adjList[$node] as $neighbor) {
                    if (! isset($visited[$neighbor]) || ! $visited[$neighbor]) {
                        if ($dfs($neighbor)) {
                            return true;
                        }
                    } elseif (isset($recStack[$neighbor]) && $recStack[$neighbor]) {
                        return true;
                    }
                }
            }

            $recStack[$node] = false;

            return false;
        };

        foreach (array_keys($adjList) as $node) {
            if (! isset($visited[$node]) || ! $visited[$node]) {
                if ($dfs($node)) {
                    return true;
                }
            }
        }

        return false;
    }
}
