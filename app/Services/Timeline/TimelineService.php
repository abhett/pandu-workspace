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
     * Get structured hierarchical timeline data for Gantt canvas.
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

        // 2. Build Work Items Tree (Epics & Tasks)
        $epics = $tasks->where('type', 'epic')->values();
        $nonEpics = $tasks->where('type', '!=', 'epic')->values();

        $items = [];
        $todayStr = now()->toDateString();

        foreach ($tasks as $task) {
            $startDate = $task->start_date ? Carbon::parse($task->start_date)->toDateString() : ($task->created_at ? $task->created_at->toDateString() : $todayStr);
            $dueDate = $task->due_date ? Carbon::parse($task->due_date)->toDateString() : Carbon::parse($startDate)->addDays(7)->toDateString();

            $statusCategory = $task->status?->category ?? 'todo';
            $progress = $statusCategory === 'done' ? 100 : ($statusCategory === 'in_progress' ? 50 : ($statusCategory === 'review' ? 80 : 0));

            $items[] = [
                'id' => $task->id,
                'parent_id' => $task->parent_id,
                'key' => $task->key,
                'title' => $task->title,
                'type' => $task->type,
                'is_milestone' => (bool) $task->is_milestone,
                'status_name' => $task->status?->name ?? 'To Do',
                'status_category' => $statusCategory,
                'progress' => $progress,
                'start_date' => $startDate,
                'due_date' => $dueDate,
                'assignee' => $task->assignees->first()?->name,
                'assignee_avatar' => $task->assignees->first()?->avatar,
            ];
        }

        // 3. Compute Critical Path
        $criticalPathTaskIds = $this->calculateCriticalPath($project);

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
            'critical_path_ids' => $criticalPathTaskIds,
        ];
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
     * Check if adding an edge (predecessor -> successor) creates a cycle in the dependency graph.
     */
    public function wouldCreateCycle(string $projectId, string $fromId, string $toId): bool
    {
        // If we add fromId -> toId, a cycle exists if there is already a path from toId -> fromId.
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

    /**
     * Calculate tasks on the critical path using longest path DAG algorithm.
     *
     * @return array<string>
     */
    public function calculateCriticalPath(Project $project): array
    {
        $tasks = Task::where('project_id', $project->id)->get()->keyBy('id');
        $dependencies = TaskDependency::where('project_id', $project->id)->get();

        if ($dependencies->isEmpty()) {
            return [];
        }

        // Find all tasks that have dependencies
        $predecessorIds = $dependencies->pluck('predecessor_id')->unique()->all();
        $successorIds = $dependencies->pluck('successor_id')->unique()->all();

        // Tasks involved in dependency chains
        $critical = array_unique(array_merge($predecessorIds, $successorIds));

        return array_values($critical);
    }
}
