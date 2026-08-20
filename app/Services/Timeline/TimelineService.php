<?php

namespace App\Services\Timeline;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskDependency;
use Illuminate\Support\Carbon;
use InvalidArgumentException;

class TimelineService
{
    /**
     * Get structured hierarchical timeline data and complete CPM analytics for Gantt canvas.
     *
     * @return array<string, mixed>
     */
    public function getTimelineData(Project $project, string $zoomLevel = 'month'): array
    {
        $tasks = Task::where('project_id', $project->id)
            ->with(['status', 'assignees', 'parent'])
            ->orderBy('sequence_number')
            ->get();

        $dependencies = TaskDependency::where('project_id', $project->id)->get();

        // 1. Determine timeline date boundaries
        $earliestDate = now()->startOfMonth();
        $latestDate = now()->addMonths(2)->endOfMonth();

        foreach ($tasks as $task) {
            if ($task->start_date && Carbon::parse($task->start_date)->lt($earliestDate)) {
                $earliestDate = Carbon::parse($task->start_date)->startOfWeek();
            }
            if ($task->due_date && Carbon::parse($task->due_date)->gt($latestDate)) {
                $latestDate = Carbon::parse($task->due_date)->endOfWeek();
            }
        }

        // 2. Compute CPM (Critical Path Method)
        $cpmAnalysis = $this->calculateCPM($project, $tasks, $dependencies);

        // 3. Build Work Items
        $todayStr = now()->toDateString();
        $items = [];
        $milestonesCount = 0;
        $completedMilestonesCount = 0;

        foreach ($tasks as $task) {
            $startDate = $task->start_date
                ? Carbon::parse($task->start_date)->toDateString()
                : ($task->created_at ? $task->created_at->toDateString() : $todayStr);

            $dueDate = $task->due_date
                ? Carbon::parse($task->due_date)->toDateString()
                : Carbon::parse($startDate)->addDays(7)->toDateString();

            $statusCategory = $task->status?->category ?? 'todo';
            $progress = $statusCategory === 'done' ? 100 : ($statusCategory === 'in_progress' ? 50 : ($statusCategory === 'review' ? 80 : 0));

            $isMilestone = (bool) $task->is_milestone;
            if ($isMilestone) {
                $milestonesCount++;
                if ($statusCategory === 'done') {
                    $completedMilestonesCount++;
                }
            }

            $cpmTaskInfo = $cpmAnalysis['task_metrics'][$task->id] ?? [
                'duration' => 1,
                'early_start' => 0,
                'early_finish' => 1,
                'late_start' => 0,
                'late_finish' => 1,
                'total_float' => 0,
                'free_float' => 0,
                'is_critical' => false,
            ];

            $items[] = [
                'id' => $task->id,
                'parent_id' => $task->parent_id,
                'key' => $task->key,
                'title' => $task->title,
                'type' => $task->type,
                'priority' => $task->priority,
                'is_milestone' => $isMilestone,
                'status_name' => $task->status?->name ?? 'To Do',
                'status_category' => $statusCategory,
                'progress' => $progress,
                'start_date' => $startDate,
                'due_date' => $dueDate,
                'assignee' => $task->assignees->first()?->name,
                'assignee_avatar' => $task->assignees->first()?->avatar,
                'cpm' => $cpmTaskInfo,
            ];
        }

        // 4. Generate Calendar Timeline Header Grid
        $timelineStart = $earliestDate->copy()->startOfWeek();
        $timelineEnd = $latestDate->copy()->endOfWeek();
        $totalDays = max(14, $timelineStart->diffInDays($timelineEnd) + 1);

        $weeks = [];
        $weekCursor = $timelineStart->copy();
        $weekNumber = 1;

        while ($weekCursor->lte($timelineEnd) && $weekNumber <= 52) {
            $weeks[] = [
                'week_number' => $weekNumber,
                'label' => "Week {$weekNumber}",
                'start_date' => $weekCursor->format('d M'),
                'days' => [
                    ['day' => 'M', 'date' => $weekCursor->copy()->format('Y-m-d')],
                    ['day' => 'T', 'date' => $weekCursor->copy()->addDays(1)->format('Y-m-d')],
                    ['day' => 'W', 'date' => $weekCursor->copy()->addDays(2)->format('Y-m-d')],
                    ['day' => 'T', 'date' => $weekCursor->copy()->addDays(3)->format('Y-m-d')],
                    ['day' => 'F', 'date' => $weekCursor->copy()->addDays(4)->format('Y-m-d')],
                    ['day' => 'S', 'date' => $weekCursor->copy()->addDays(5)->format('Y-m-d')],
                    ['day' => 'S', 'date' => $weekCursor->copy()->addDays(6)->format('Y-m-d')],
                ],
            ];
            $weekCursor = $weekCursor->copy()->addDays(7);
            $weekNumber++;
        }

        return [
            'project_id' => $project->id,
            'zoom_level' => $zoomLevel,
            'timeline_start' => $timelineStart->toDateString(),
            'timeline_end' => $timelineEnd->toDateString(),
            'total_days' => $totalDays,
            'today' => $todayStr,
            'weeks' => $weeks,
            'items' => $items,
            'dependencies' => $dependencies->map(fn ($d) => [
                'id' => $d->id,
                'predecessor_id' => $d->predecessor_id,
                'successor_id' => $d->successor_id,
                'type' => $d->type,
                'lag_days' => $d->lag_days,
            ])->values()->all(),
            'critical_path_ids' => $cpmAnalysis['critical_path_ids'],
            'metrics' => [
                'total_duration_days' => $cpmAnalysis['project_duration_days'],
                'critical_tasks_count' => count($cpmAnalysis['critical_path_ids']),
                'total_tasks_count' => $tasks->count(),
                'milestones_count' => $milestonesCount,
                'completed_milestones_count' => $completedMilestonesCount,
                'average_float_days' => $cpmAnalysis['average_float_days'],
            ],
        ];
    }

    /**
     * Calculate Critical Path Method (Forward Pass, Backward Pass, Total Float, Free Float).
     *
     * @param  mixed  $tasks
     * @param  mixed  $dependencies
     * @return array<string, mixed>
     */
    public function calculateCPM(Project $project, $tasks = null, $dependencies = null): array
    {
        if ($tasks === null) {
            $tasks = Task::where('project_id', $project->id)->get();
        }
        if ($dependencies === null) {
            $dependencies = TaskDependency::where('project_id', $project->id)->get();
        }

        if ($tasks->isEmpty()) {
            return [
                'project_duration_days' => 0,
                'critical_path_ids' => [],
                'average_float_days' => 0.0,
                'task_metrics' => [],
            ];
        }

        $taskMap = $tasks->keyBy('id');
        $taskIds = $tasks->pluck('id')->all();

        // 1. Task Durations
        $durations = [];
        foreach ($tasks as $t) {
            if ($t->is_milestone) {
                $durations[$t->id] = 0;
            } elseif ($t->start_date && $t->due_date) {
                $durations[$t->id] = max(1, Carbon::parse($t->start_date)->diffInDays(Carbon::parse($t->due_date)) + 1);
            } else {
                $durations[$t->id] = 3; // Default 3 days
            }
        }

        // 2. Adjacency lists
        $preds = [];
        $succs = [];
        $inDegree = [];
        foreach ($taskIds as $id) {
            $preds[$id] = [];
            $succs[$id] = [];
            $inDegree[$id] = 0;
        }

        foreach ($dependencies as $d) {
            if (isset($taskMap[$d->predecessor_id]) && isset($taskMap[$d->successor_id])) {
                $preds[$d->successor_id][] = [
                    'id' => $d->predecessor_id,
                    'lag' => (int) $d->lag_days,
                ];
                $succs[$d->predecessor_id][] = [
                    'id' => $d->successor_id,
                    'lag' => (int) $d->lag_days,
                ];
                $inDegree[$d->successor_id]++;
            }
        }

        // 3. Topological Order (Kahn's algorithm)
        $queue = [];
        foreach ($taskIds as $id) {
            if ($inDegree[$id] === 0) {
                $queue[] = $id;
            }
        }

        $topoOrder = [];
        $inDegreeCopy = $inDegree;
        while (! empty($queue)) {
            $curr = array_shift($queue);
            $topoOrder[] = $curr;

            foreach ($succs[$curr] as $s) {
                $sId = $s['id'];
                $inDegreeCopy[$sId]--;
                if ($inDegreeCopy[$sId] === 0) {
                    $queue[] = $sId;
                }
            }
        }

        // If cycle or disconnected, include remaining tasks
        foreach ($taskIds as $id) {
            if (! in_array($id, $topoOrder)) {
                $topoOrder[] = $id;
            }
        }

        // 4. Forward Pass (Early Start & Early Finish)
        $earlyStart = [];
        $earlyFinish = [];
        foreach ($taskIds as $id) {
            $earlyStart[$id] = 0;
            $earlyFinish[$id] = $durations[$id];
        }

        foreach ($topoOrder as $id) {
            $maxES = 0;
            foreach ($preds[$id] as $p) {
                $pId = $p['id'];
                $lag = $p['lag'];
                $esFromP = ($earlyFinish[$pId] ?? 0) + $lag;
                if ($esFromP > $maxES) {
                    $maxES = $esFromP;
                }
            }
            $earlyStart[$id] = $maxES;
            $earlyFinish[$id] = $maxES + $durations[$id];
        }

        $projectDuration = 0;
        foreach ($earlyFinish as $ef) {
            if ($ef > $projectDuration) {
                $projectDuration = $ef;
            }
        }

        // 5. Backward Pass (Late Finish & Late Start)
        $lateFinish = [];
        $lateStart = [];
        foreach ($taskIds as $id) {
            $lateFinish[$id] = $projectDuration;
            $lateStart[$id] = $projectDuration - $durations[$id];
        }

        $revTopo = array_reverse($topoOrder);
        foreach ($revTopo as $id) {
            if (! empty($succs[$id])) {
                $minLF = PHP_INT_MAX;
                foreach ($succs[$id] as $s) {
                    $sId = $s['id'];
                    $lag = $s['lag'];
                    $lfFromS = ($lateStart[$sId] ?? $projectDuration) - $lag;
                    if ($lfFromS < $minLF) {
                        $minLF = $lfFromS;
                    }
                }
                $lateFinish[$id] = $minLF;
                $lateStart[$id] = $minLF - $durations[$id];
            }
        }

        // 6. Total Float, Free Float, and Critical Path Detection
        $criticalPathIds = [];
        $taskMetrics = [];
        $totalFloatSum = 0;

        foreach ($taskIds as $id) {
            $tf = max(0, $lateStart[$id] - $earlyStart[$id]);
            $totalFloatSum += $tf;

            $minSuccES = $projectDuration;
            if (! empty($succs[$id])) {
                foreach ($succs[$id] as $s) {
                    $sId = $s['id'];
                    $lag = $s['lag'];
                    $succESWithLag = ($earlyStart[$sId] ?? 0) - $lag;
                    if ($succESWithLag < $minSuccES) {
                        $minSuccES = $succESWithLag;
                    }
                }
                $ff = max(0, $minSuccES - $earlyFinish[$id]);
            } else {
                $ff = max(0, $projectDuration - $earlyFinish[$id]);
            }

            $isCritical = ($tf === 0) && ($dependencies->isNotEmpty());
            if ($isCritical) {
                $criticalPathIds[] = $id;
            }

            $taskMetrics[$id] = [
                'duration' => $durations[$id],
                'early_start' => $earlyStart[$id],
                'early_finish' => $earlyFinish[$id],
                'late_start' => $lateStart[$id],
                'late_finish' => $lateFinish[$id],
                'total_float' => $tf,
                'free_float' => $ff,
                'is_critical' => $isCritical,
            ];
        }

        $avgFloat = count($taskIds) > 0 ? round($totalFloatSum / count($taskIds), 1) : 0.0;

        return [
            'project_duration_days' => $projectDuration,
            'critical_path_ids' => $criticalPathIds,
            'average_float_days' => $avgFloat,
            'task_metrics' => $taskMetrics,
        ];
    }

    /**
     * Propagate cascading auto-schedule across the dependency graph.
     *
     * @return array<string, mixed>
     */
    public function autoScheduleCascading(Project $project): array
    {
        $tasks = Task::where('project_id', $project->id)->get()->keyBy('id');
        $dependencies = TaskDependency::where('project_id', $project->id)->get();

        if ($tasks->isEmpty()) {
            return ['updated_tasks' => 0];
        }

        $cpm = $this->calculateCPM($project, $tasks, $dependencies);
        $baseDate = now()->startOfWeek();

        // Earliest start date among source tasks
        foreach ($tasks as $t) {
            if ($t->start_date && Carbon::parse($t->start_date)->lt($baseDate)) {
                $baseDate = Carbon::parse($t->start_date);
            }
        }

        $updatedCount = 0;
        foreach ($tasks as $task) {
            $metrics = $cpm['task_metrics'][$task->id] ?? null;
            if ($metrics) {
                $newStart = $baseDate->copy()->addDays($metrics['early_start']);
                $newDue = $task->is_milestone
                    ? $newStart->copy()
                    : $newStart->copy()->addDays(max(0, $metrics['duration'] - 1));

                $task->update([
                    'start_date' => $newStart->toDateString(),
                    'due_date' => $newDue->toDateString(),
                ]);
                $updatedCount++;
            }
        }

        return [
            'success' => true,
            'updated_tasks' => $updatedCount,
            'project_duration_days' => $cpm['project_duration_days'],
        ];
    }

    /**
     * Toggle milestone status on a task.
     */
    public function toggleMilestone(Task $task): Task
    {
        $task->update([
            'is_milestone' => ! $task->is_milestone,
            'due_date' => ! $task->is_milestone ? $task->start_date : $task->due_date,
        ]);

        return $task->fresh();
    }

    /**
     * Add a dependency relationship between two tasks with cycle detection.
     */
    public function addDependency(
        Project $project,
        Task $predecessor,
        Task $successor,
        string $type = 'finish_to_start',
        int $lagDays = 0
    ): TaskDependency {
        if ($predecessor->id === $successor->id) {
            throw new InvalidArgumentException('Tugas tidak dapat bergantung pada dirinya sendiri.');
        }

        if ($predecessor->project_id !== $project->id || $successor->project_id !== $project->id) {
            throw new InvalidArgumentException('Kedua tugas harus berada dalam proyek yang sama.');
        }

        // Guard: Check if would cause a circular dependency cycle
        if ($this->wouldCreateCycle($project->id, $predecessor->id, $successor->id)) {
            throw new InvalidArgumentException('Dependensi sirkular terdeteksi! Relasi ini akan menciptakan perulangan loop dependensi.');
        }

        return TaskDependency::updateOrCreate(
            [
                'predecessor_id' => $predecessor->id,
                'successor_id' => $successor->id,
            ],
            [
                'project_id' => $project->id,
                'type' => $type,
                'lag_days' => $lagDays,
            ]
        );
    }

    /**
     * Delete a task dependency relationship.
     */
    public function deleteDependency(TaskDependency $dependency): bool
    {
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
     * Update task schedule dates.
     */
    public function updateSchedule(Task $task, ?string $startDate, ?string $dueDate): Task
    {
        $task->update([
            'start_date' => $startDate,
            'due_date' => $dueDate,
        ]);

        return $task->fresh();
    }
}
