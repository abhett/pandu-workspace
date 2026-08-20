<?php

namespace App\Services\Dependency;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskDependency;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class DependencyGraphService
{
    /**
     * Get complete visual dependency graph data including CPM metrics.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function getGraphData(Project $project, array $filters = []): array
    {
        $tasksQuery = Task::where('project_id', $project->id)
            ->with(['status', 'assignees', 'labels', 'parent']);

        if (! empty($filters['status_id']) && $filters['status_id'] !== 'all') {
            $tasksQuery->where('status_id', $filters['status_id']);
        }

        if (! empty($filters['sprint_id']) && $filters['sprint_id'] !== 'all') {
            $tasksQuery->where('sprint_id', $filters['sprint_id']);
        }

        if (! empty($filters['priority']) && $filters['priority'] !== 'all') {
            $tasksQuery->where('priority', $filters['priority']);
        }

        if (! empty($filters['assignee_id']) && $filters['assignee_id'] !== 'all') {
            $tasksQuery->whereHas('assignees', function ($q) use ($filters) {
                $q->where('users.id', $filters['assignee_id']);
            });
        }

        $tasks = $tasksQuery->orderBy('sequence_number')->get()->keyBy('id');
        $allDependencies = TaskDependency::where('project_id', $project->id)->get();

        // Filter dependencies to only include tasks currently in view if filtering
        $taskIds = $tasks->keys()->all();
        $dependencies = $allDependencies->filter(function (TaskDependency $dep) use ($taskIds) {
            return in_array($dep->predecessor_id, $taskIds) && in_array($dep->successor_id, $taskIds);
        });

        // 1. Calculate Critical Path Method (CPM)
        $cpm = $this->calculateCpm($tasks, $dependencies);

        // 2. Compute Topological Levels and Grid Coordinates
        $levels = $this->computeTopologicalLevels($tasks, $dependencies);

        // 3. Format Nodes
        $nodes = [];
        $levelCounts = [];

        foreach ($tasks as $task) {
            $nodeId = $task->id;
            $level = $levels[$nodeId] ?? 0;
            $rowInLevel = $levelCounts[$level] ?? 0;
            $levelCounts[$level] = $rowInLevel + 1;

            $statusCategory = $task->status?->category ?? 'todo';
            $isCompleted = (bool) ($task->status?->is_completed || $statusCategory === 'done' || $task->completed_at !== null);

            // Predecessors of this task
            $predecessorDeps = $dependencies->where('successor_id', $nodeId);
            $hasIncompleteBlocker = false;

            foreach ($predecessorDeps as $pDep) {
                $pTask = $tasks->get($pDep->predecessor_id);
                if ($pTask) {
                    $pCompleted = (bool) ($pTask->status?->is_completed || ($pTask->status?->category === 'done') || $pTask->completed_at !== null);
                    if (! $pCompleted) {
                        $hasIncompleteBlocker = true;
                        break;
                    }
                }
            }

            $isBlocked = ! $isCompleted && $hasIncompleteBlocker;
            $cpmData = $cpm['tasks'][$nodeId] ?? [
                'duration' => 1,
                'early_start' => 0,
                'early_finish' => 1,
                'late_start' => 0,
                'late_finish' => 1,
                'total_float' => 0,
                'is_critical' => false,
            ];

            // Direct blockers / successors count
            $blockingCount = $dependencies->where('predecessor_id', $nodeId)->count();
            $blockedByCount = $predecessorDeps->count();

            // Compute bottleneck score (0 - 100)
            $bottleneckScore = 0;
            if ($blockingCount > 0) {
                $bottleneckScore += min(50, $blockingCount * 15);
            }
            if ($cpmData['is_critical']) {
                $bottleneckScore += 30;
            }
            if ($task->priority === 'urgent' || $task->priority === 'high') {
                $bottleneckScore += 15;
            }
            if ($task->due_date && Carbon::parse($task->due_date)->isPast() && ! $isCompleted) {
                $bottleneckScore += 20;
            }
            $bottleneckScore = min(100, $bottleneckScore);

            $nodes[] = [
                'id' => $task->id,
                'key' => $task->key,
                'title' => $task->title,
                'type' => $task->type,
                'priority' => $task->priority,
                'estimate_points' => $task->estimate_points,
                'start_date' => $task->start_date?->format('Y-m-d'),
                'due_date' => $task->due_date?->format('Y-m-d'),
                'is_milestone' => (bool) $task->is_milestone,
                'status' => [
                    'id' => $task->status?->id,
                    'name' => $task->status?->name,
                    'color' => $task->status?->color ?? '#6366f1',
                    'category' => $statusCategory,
                    'is_completed' => $isCompleted,
                ],
                'assignees' => $task->assignees->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'avatar' => $u->avatar,
                ]),
                'is_blocked' => $isBlocked,
                'blocking_count' => $blockingCount,
                'blocked_by_count' => $blockedByCount,
                'bottleneck_score' => $bottleneckScore,
                'cpm' => $cpmData,
                'layout' => [
                    'level' => $level,
                    'row' => $rowInLevel,
                    'x' => $level * 320 + 40,
                    'y' => $rowInLevel * 160 + 60,
                ],
            ];
        }

        // 4. Format Edges
        $edges = [];
        foreach ($dependencies as $dep) {
            $isCriticalEdge = false;
            if (
                isset($cpm['critical_edges']) &&
                in_array($dep->id, $cpm['critical_edges'], true)
            ) {
                $isCriticalEdge = true;
            }

            $sourceTask = $tasks->get($dep->predecessor_id);
            $targetTask = $tasks->get($dep->successor_id);

            $edges[] = [
                'id' => $dep->id,
                'source' => $dep->predecessor_id,
                'target' => $dep->successor_id,
                'source_key' => $sourceTask?->key,
                'target_key' => $targetTask?->key,
                'type' => $dep->type ?? 'finish_to_start',
                'lag_days' => $dep->lag_days,
                'is_critical' => $isCriticalEdge,
            ];
        }

        // 5. Aggregate Summary Metrics
        $criticalTasksCount = count($cpm['critical_task_ids'] ?? []);
        $blockedTasksCount = count(array_filter($nodes, fn ($n) => $n['is_blocked']));

        // Top bottlenecks
        $bottleneckList = collect($nodes)
            ->filter(fn ($n) => $n['bottleneck_score'] > 20)
            ->sortByDesc('bottleneck_score')
            ->take(5)
            ->values()
            ->all();

        return [
            'nodes' => $nodes,
            'edges' => $edges,
            'metrics' => [
                'total_tasks' => count($nodes),
                'total_dependencies' => count($edges),
                'critical_path_length_days' => $cpm['makespan'] ?? 0,
                'critical_tasks_count' => $criticalTasksCount,
                'blocked_tasks_count' => $blockedTasksCount,
                'project_makespan_days' => $cpm['makespan'] ?? 0,
                'has_cycles' => false,
            ],
            'bottlenecks' => $bottleneckList,
        ];
    }

    /**
     * Add a dependency relationship between two tasks with cycle detection.
     */
    public function addDependency(
        Project $project,
        string $predecessorId,
        string $successorId,
        string $type = 'finish_to_start',
        int $lagDays = 0
    ): TaskDependency {
        if ($predecessorId === $successorId) {
            throw new InvalidArgumentException('Tugas tidak dapat bergantung pada dirinya sendiri.');
        }

        $predecessor = Task::where('project_id', $project->id)->where('id', $predecessorId)->firstOrFail();
        $successor = Task::where('project_id', $project->id)->where('id', $successorId)->firstOrFail();

        // Cycle Detection Guard
        if ($this->wouldCreateCycle($project->id, $predecessor->id, $successor->id)) {
            throw new InvalidArgumentException(
                "Dependensi sirkular terdeteksi! Menghubungkan {$predecessor->key} ke {$successor->key} akan menciptakan loop deadlock tak berujung."
            );
        }

        return TaskDependency::updateOrCreate(
            [
                'predecessor_id' => $predecessor->id,
                'successor_id' => $successor->id,
            ],
            [
                'project_id' => $project->id,
                'type' => $type,
                'lag_days' => max(0, $lagDays),
            ]
        );
    }

    /**
     * Remove a dependency relationship.
     */
    public function removeDependency(Project $project, string $dependencyId): bool
    {
        $dependency = TaskDependency::where('project_id', $project->id)
            ->where('id', $dependencyId)
            ->firstOrFail();

        return (bool) $dependency->delete();
    }

    /**
     * Check if adding an edge (predecessor -> successor) creates a cycle in the dependency graph.
     */
    public function wouldCreateCycle(string $projectId, string $fromId, string $toId): bool
    {
        $visited = [];
        $queue = [$toId];

        while (! empty($queue)) {
            $current = array_shift($queue);

            if ($current === $fromId) {
                return true; // Cycle found!
            }

            if (isset($visited[$current])) {
                continue;
            }
            $visited[$current] = true;

            $nextSuccessors = TaskDependency::where('project_id', $projectId)
                ->where('predecessor_id', $current)
                ->pluck('successor_id')
                ->all();

            foreach ($nextSuccessors as $next) {
                if (! isset($visited[$next])) {
                    $queue[] = $next;
                }
            }
        }

        return false;
    }

    /**
     * Calculate Critical Path Method (CPM) on the given tasks & dependencies.
     *
     * @param  Collection<string, Task>  $tasks
     * @param  Collection<int, TaskDependency>  $dependencies
     * @return array<string, mixed>
     */
    public function calculateCpm($tasks, $dependencies): array
    {
        if ($tasks->isEmpty()) {
            return [
                'makespan' => 0,
                'critical_task_ids' => [],
                'critical_edges' => [],
                'tasks' => [],
            ];
        }

        // 1. Compute duration in days for each task
        $durations = [];
        foreach ($tasks as $taskId => $task) {
            $duration = 1;
            if ($task->start_date && $task->due_date) {
                $start = Carbon::parse($task->start_date);
                $due = Carbon::parse($task->due_date);
                if ($due->gte($start)) {
                    $duration = max(1, (int) $start->diffInDays($due) + 1);
                }
            } elseif ($task->estimate_points && $task->estimate_points > 0) {
                $duration = max(1, (int) round($task->estimate_points));
            }
            $durations[$taskId] = $duration;
        }

        // 2. Build adjacency lists
        $predecessorsMap = []; // taskId => array of [predecessor_id, lag_days, dep_id]
        $successorsMap = [];   // taskId => array of [successor_id, lag_days, dep_id]

        foreach ($tasks as $taskId => $task) {
            $predecessorsMap[$taskId] = [];
            $successorsMap[$taskId] = [];
        }

        foreach ($dependencies as $dep) {
            if (isset($tasks[$dep->predecessor_id]) && isset($tasks[$dep->successor_id])) {
                $predecessorsMap[$dep->successor_id][] = [
                    'id' => $dep->predecessor_id,
                    'lag' => $dep->lag_days ?? 0,
                    'dep_id' => $dep->id,
                ];
                $successorsMap[$dep->predecessor_id][] = [
                    'id' => $dep->successor_id,
                    'lag' => $dep->lag_days ?? 0,
                    'dep_id' => $dep->id,
                ];
            }
        }

        // 3. Topological sort for Forward Pass (Kahn's algorithm)
        $inDegree = [];
        foreach ($tasks as $taskId => $task) {
            $inDegree[$taskId] = count($predecessorsMap[$taskId]);
        }

        $queue = [];
        foreach ($inDegree as $taskId => $deg) {
            if ($deg === 0) {
                $queue[] = $taskId;
            }
        }

        $topoOrder = [];
        while (! empty($queue)) {
            $curr = array_shift($queue);
            $topoOrder[] = $curr;

            foreach ($successorsMap[$curr] as $succ) {
                $succId = $succ['id'];
                $inDegree[$succId]--;
                if ($inDegree[$succId] === 0) {
                    $queue[] = $succId;
                }
            }
        }

        // If not all tasks visited (cycle or isolated subgraph), append rest
        foreach ($tasks as $taskId => $task) {
            if (! in_array($taskId, $topoOrder, true)) {
                $topoOrder[] = $taskId;
            }
        }

        // 4. Forward Pass: Early Start (ES) and Early Finish (EF)
        $earlyStart = [];
        $earlyFinish = [];

        foreach ($topoOrder as $taskId) {
            $duration = $durations[$taskId] ?? 1;
            $maxPredecessorFinish = 0;

            foreach ($predecessorsMap[$taskId] as $pred) {
                $predFinish = ($earlyFinish[$pred['id']] ?? 0) + $pred['lag'];
                if ($predFinish > $maxPredecessorFinish) {
                    $maxPredecessorFinish = $predFinish;
                }
            }

            $earlyStart[$taskId] = $maxPredecessorFinish;
            $earlyFinish[$taskId] = $earlyStart[$taskId] + $duration;
        }

        // Project makespan / duration
        $projectMakespan = 0;
        foreach ($earlyFinish as $ef) {
            if ($ef > $projectMakespan) {
                $projectMakespan = $ef;
            }
        }

        // 5. Backward Pass: Late Finish (LF) and Late Start (LS)
        $lateStart = [];
        $lateFinish = [];

        // Reverse topological order
        $reverseTopo = array_reverse($topoOrder);
        foreach ($reverseTopo as $taskId) {
            $duration = $durations[$taskId] ?? 1;

            if (empty($successorsMap[$taskId])) {
                $minSuccessorStart = $projectMakespan;
            } else {
                $minSuccessorStart = PHP_INT_MAX;
                foreach ($successorsMap[$taskId] as $succ) {
                    $succStart = ($lateStart[$succ['id']] ?? $projectMakespan) - $succ['lag'];
                    if ($succStart < $minSuccessorStart) {
                        $minSuccessorStart = $succStart;
                    }
                }
                if ($minSuccessorStart === PHP_INT_MAX) {
                    $minSuccessorStart = $projectMakespan;
                }
            }

            $lateFinish[$taskId] = $minSuccessorStart;
            $lateStart[$taskId] = $lateFinish[$taskId] - $duration;
        }

        // 6. Total Float & Critical Path Identification
        $taskCpm = [];
        $criticalTaskIds = [];

        foreach ($tasks as $taskId => $task) {
            $es = $earlyStart[$taskId] ?? 0;
            $ef = $earlyFinish[$taskId] ?? 1;
            $ls = $lateStart[$taskId] ?? 0;
            $lf = $lateFinish[$taskId] ?? 1;

            $totalFloat = max(0, $ls - $es);
            $isCritical = ($totalFloat === 0) && ($dependencies->isNotEmpty());

            if ($isCritical) {
                $criticalTaskIds[] = $taskId;
            }

            $taskCpm[$taskId] = [
                'duration' => $durations[$taskId] ?? 1,
                'early_start' => $es,
                'early_finish' => $ef,
                'late_start' => $ls,
                'late_finish' => $lf,
                'total_float' => $totalFloat,
                'is_critical' => $isCritical,
            ];
        }

        // 7. Critical Edges
        $criticalEdges = [];
        foreach ($dependencies as $dep) {
            $u = $dep->predecessor_id;
            $v = $dep->successor_id;

            if (
                in_array($u, $criticalTaskIds, true) &&
                in_array($v, $criticalTaskIds, true)
            ) {
                $lag = $dep->lag_days ?? 0;
                if (($earlyFinish[$u] ?? 0) + $lag === ($earlyStart[$v] ?? 0)) {
                    $criticalEdges[] = $dep->id;
                }
            }
        }

        return [
            'makespan' => $projectMakespan,
            'critical_task_ids' => $criticalTaskIds,
            'critical_edges' => $criticalEdges,
            'tasks' => $taskCpm,
        ];
    }

    /**
     * Compute topological levels (depths) for DAG visual layering.
     *
     * @param  Collection<string, Task>  $tasks
     * @param  Collection<int, TaskDependency>  $dependencies
     * @return array<string, int>
     */
    protected function computeTopologicalLevels($tasks, $dependencies): array
    {
        $levels = [];
        foreach ($tasks as $taskId => $task) {
            $levels[$taskId] = 0;
        }

        $predecessorsMap = [];
        foreach ($dependencies as $dep) {
            $predecessorsMap[$dep->successor_id][] = $dep->predecessor_id;
        }

        // Multi-pass level propagation
        $changed = true;
        $maxPasses = count($tasks) + 1;
        $pass = 0;

        while ($changed && $pass < $maxPasses) {
            $changed = false;
            $pass++;

            foreach ($tasks as $taskId => $task) {
                if (isset($predecessorsMap[$taskId])) {
                    $maxPredLevel = -1;
                    foreach ($predecessorsMap[$taskId] as $predId) {
                        if (isset($levels[$predId])) {
                            $maxPredLevel = max($maxPredLevel, $levels[$predId]);
                        }
                    }
                    if ($maxPredLevel >= 0 && $levels[$taskId] <= $maxPredLevel) {
                        $levels[$taskId] = $maxPredLevel + 1;
                        $changed = true;
                    }
                }
            }
        }

        return $levels;
    }

    /**
     * Simulate cascading schedule impact if a task is delayed by N days.
     *
     * @return array<string, mixed>
     */
    public function simulateCascade(Project $project, string $taskId, int $delayDays): array
    {
        $targetTask = Task::where('project_id', $project->id)->where('id', $taskId)->firstOrFail();
        $allTasks = Task::where('project_id', $project->id)->with('status')->get()->keyBy('id');
        $allDeps = TaskDependency::where('project_id', $project->id)->get();

        // Find all reachable downstream successors using BFS
        $impactedTaskIds = [];
        $queue = [$taskId];
        $visited = [];

        while (! empty($queue)) {
            $currId = array_shift($queue);
            if (isset($visited[$currId])) {
                continue;
            }
            $visited[$currId] = true;

            $nextSuccessors = $allDeps->where('predecessor_id', $currId)->pluck('successor_id')->all();
            foreach ($nextSuccessors as $nextId) {
                if (! isset($visited[$nextId])) {
                    $impactedTaskIds[$nextId] = true;
                    $queue[] = $nextId;
                }
            }
        }

        $impactedList = [];
        $originalEndDate = $targetTask->due_date ? Carbon::parse($targetTask->due_date) : now();
        $newEndDate = (clone $originalEndDate)->addDays($delayDays);

        $impactedList[] = [
            'id' => $targetTask->id,
            'key' => $targetTask->key,
            'title' => $targetTask->title,
            'is_root_cause' => true,
            'delay_days' => $delayDays,
            'original_due_date' => $targetTask->due_date?->format('Y-m-d') ?? $originalEndDate->format('Y-m-d'),
            'projected_due_date' => $newEndDate->format('Y-m-d'),
        ];

        foreach (array_keys($impactedTaskIds) as $impId) {
            $t = $allTasks->get($impId);
            if ($t) {
                $origDue = $t->due_date ? Carbon::parse($t->due_date) : now()->addDays(7);
                $projDue = (clone $origDue)->addDays($delayDays);

                $impactedList[] = [
                    'id' => $t->id,
                    'key' => $t->key,
                    'title' => $t->title,
                    'is_root_cause' => false,
                    'delay_days' => $delayDays,
                    'original_due_date' => $t->due_date?->format('Y-m-d') ?? $origDue->format('Y-m-d'),
                    'projected_due_date' => $projDue->format('Y-m-d'),
                ];
            }
        }

        return [
            'root_task' => [
                'id' => $targetTask->id,
                'key' => $targetTask->key,
                'title' => $targetTask->title,
            ],
            'delay_days' => $delayDays,
            'total_affected_tasks' => count($impactedList),
            'affected_tasks' => $impactedList,
            'message' => "Penundaan {$targetTask->key} sebanyak {$delayDays} hari berdampak pada ".(count($impactedList) - 1).' tugas hilir.',
        ];
    }
}
