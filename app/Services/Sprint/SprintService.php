<?php

namespace App\Services\Sprint;

use App\Models\Project;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\TaskActivity;
use App\Models\User;
use App\Models\WorkflowStatus;
use App\Services\Task\RankService;
use Carbon\CarbonPeriod;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class SprintService
{
    public function __construct(
        protected RankService $rankService
    ) {}

    /**
     * Create a new sprint in planning state.
     *
     * @param  array{
     *     name?: string|null,
     *     goal?: string|null,
     *     start_date?: string|null,
     *     end_date?: string|null
     * }  $data
     */
    public function createSprint(Project $project, User $actor, array $data = []): Sprint
    {
        return DB::transaction(function () use ($project, $data) {
            $lastSequence = Sprint::where('project_id', $project->id)->max('sequence_number') ?? 0;
            $sequenceNumber = $lastSequence + 1;

            $name = ! empty($data['name'])
                ? trim($data['name'])
                : "{$project->key} Sprint {$sequenceNumber}";

            $startDate = ! empty($data['start_date']) ? Carbon::parse($data['start_date']) : null;
            $endDate = ! empty($data['end_date']) ? Carbon::parse($data['end_date']) : null;

            return Sprint::create([
                'organization_id' => $project->organization_id,
                'project_id' => $project->id,
                'name' => $name,
                'goal' => $data['goal'] ?? null,
                'status' => 'future',
                'start_date' => $startDate,
                'end_date' => $endDate,
                'sequence_number' => $sequenceNumber,
                'settings' => [],
            ]);
        });
    }

    /**
     * Update sprint details (name, goal, dates).
     *
     * @param  array{
     *     name?: string,
     *     goal?: string|null,
     *     start_date?: string|null,
     *     end_date?: string|null
     * }  $data
     */
    public function updateSprint(Sprint $sprint, array $data): Sprint
    {
        $payload = [];

        if (isset($data['name'])) {
            $payload['name'] = trim($data['name']);
        }

        if (array_key_exists('goal', $data)) {
            $payload['goal'] = $data['goal'];
        }

        if (isset($data['start_date'])) {
            $payload['start_date'] = $data['start_date'] ? Carbon::parse($data['start_date']) : null;
        }

        if (isset($data['end_date'])) {
            $payload['end_date'] = $data['end_date'] ? Carbon::parse($data['end_date']) : null;
        }

        $sprint->update($payload);

        return $sprint->fresh();
    }

    /**
     * Delete a future sprint and return all its tasks to the Backlog.
     */
    public function deleteSprint(Sprint $sprint): void
    {
        DB::transaction(function () use ($sprint) {
            if ($sprint->isActive()) {
                throw new InvalidArgumentException('Tidak dapat menghapus Sprint yang sedang aktif. Selesaikan atau batalkan sprint terlebih dahulu.');
            }

            // Move tasks in sprint back to Backlog
            Task::where('sprint_id', $sprint->id)->update(['sprint_id' => null]);

            $sprint->delete();
        });
    }

    /**
     * Start a sprint (Transition future -> active).
     *
     * @param  array{
     *     name?: string|null,
     *     goal?: string|null,
     *     start_date?: string|null,
     *     end_date?: string|null,
     *     duration_weeks?: int|null
     * }  $data
     */
    public function startSprint(Sprint $sprint, User $actor, array $data = []): Sprint
    {
        return DB::transaction(function () use ($sprint, $data) {
            // Guard 1: Must be in future status
            if ($sprint->status !== 'future') {
                throw new InvalidArgumentException("Hanya sprint berstatus 'future' yang dapat dimulai.");
            }

            // Guard 2: Active Sprint Policy (Only 1 active sprint per project)
            $hasActiveSprint = Sprint::where('project_id', $sprint->project_id)
                ->where('status', 'active')
                ->where('id', '!=', $sprint->id)
                ->exists();

            if ($hasActiveSprint) {
                throw new InvalidArgumentException('Proyek ini sudah memiliki sprint aktif. Selesaikan sprint aktif sebelum memulai sprint baru.');
            }

            // Determine start & end dates
            $startDate = ! empty($data['start_date'])
                ? Carbon::parse($data['start_date'])
                : now();

            $durationWeeks = ! empty($data['duration_weeks']) ? (int) $data['duration_weeks'] : 2;

            $endDate = ! empty($data['end_date'])
                ? Carbon::parse($data['end_date'])
                : (clone $startDate)->addWeeks($durationWeeks);

            if ($endDate->lessThanOrEqualTo($startDate)) {
                throw new InvalidArgumentException('Tanggal selesai sprint harus setelah tanggal mulai.');
            }

            // Calculate committed points baseline snapshot
            $committedPoints = (float) Task::where('sprint_id', $sprint->id)->sum('estimate_points');

            $sprint->update([
                'name' => ! empty($data['name']) ? trim($data['name']) : $sprint->name,
                'goal' => array_key_exists('goal', $data) ? $data['goal'] : $sprint->goal,
                'status' => 'active',
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
                'started_at' => now(),
                'committed_points' => $committedPoints,
            ]);

            return $sprint->fresh();
        });
    }

    /**
     * Complete an active sprint and route unfinished tasks.
     *
     * @param  'backlog'|'sprint'  $destinationType
     */
    public function completeSprint(
        Sprint $sprint,
        User $actor,
        string $destinationType = 'backlog',
        ?string $targetSprintId = null
    ): Sprint {
        return DB::transaction(function () use ($sprint, $destinationType, $targetSprintId) {
            if ($sprint->status !== 'active') {
                throw new InvalidArgumentException("Hanya sprint berstatus 'active' yang dapat diselesaikan.");
            }

            // Get completed status IDs for this project
            $completedStatusIds = WorkflowStatus::where('project_id', $sprint->project_id)
                ->where(function ($query) {
                    $query->where('is_completed', true)
                        ->orWhere('category', 'completed');
                })
                ->pluck('id')
                ->all();

            // Calculate completed points
            $completedTasks = Task::where('sprint_id', $sprint->id)
                ->whereIn('status_id', $completedStatusIds)
                ->get();

            $completedPoints = (float) $completedTasks->sum('estimate_points');

            // Find incomplete tasks
            $incompleteTasks = Task::where('sprint_id', $sprint->id)
                ->whereNotIn('status_id', $completedStatusIds)
                ->get();

            // Route incomplete tasks
            if ($destinationType === 'sprint' && ! empty($targetSprintId)) {
                $targetSprint = Sprint::where('project_id', $sprint->project_id)
                    ->where('id', $targetSprintId)
                    ->firstOrFail();

                Task::whereIn('id', $incompleteTasks->pluck('id'))->update([
                    'sprint_id' => $targetSprint->id,
                ]);
            } else {
                // Return to backlog
                Task::whereIn('id', $incompleteTasks->pluck('id'))->update([
                    'sprint_id' => null,
                ]);
            }

            // Mark sprint as completed
            $sprint->update([
                'status' => 'completed',
                'completed_at' => now(),
                'completed_points' => $completedPoints,
            ]);

            return $sprint->fresh();
        });
    }

    /**
     * Move a task into a sprint or back to the backlog.
     */
    public function moveTaskToSprint(Task $task, ?Sprint $sprint, User $actor): Task
    {
        return DB::transaction(function () use ($task, $sprint, $actor) {
            $oldSprintId = $task->sprint_id;
            $newSprintId = $sprint?->id;

            if ($oldSprintId === $newSprintId) {
                return $task;
            }

            $task->update([
                'sprint_id' => $newSprintId,
            ]);

            // Record task activity
            TaskActivity::create([
                'task_id' => $task->id,
                'user_id' => $actor->id,
                'action' => 'sprint_changed',
                'changes' => [
                    'field' => 'sprint',
                    'old_value' => $oldSprintId ? (Sprint::find($oldSprintId)?->name ?? 'Sprint') : 'Backlog',
                    'new_value' => $sprint ? $sprint->name : 'Backlog',
                ],
                'created_at' => now(),
            ]);

            return $task->fresh();
        });
    }

    /**
     * Calculate Burndown Chart metrics for a sprint.
     *
     * @return array{
     *     sprint: array{id: string, name: string, start_date: string|null, end_date: string|null, committed_points: float, status: string},
     *     days: array<int, array{date: string, day_label: string, ideal_remaining: float, actual_remaining: float|null}>
     * }
     */
    public function getBurndownData(Sprint $sprint): array
    {
        $startDate = $sprint->start_date ? Carbon::parse($sprint->start_date) : ($sprint->started_at ?? now());
        $endDate = $sprint->end_date ? Carbon::parse($sprint->end_date) : (clone $startDate)->addWeeks(2);

        $period = CarbonPeriod::create($startDate->startOfDay(), '1 day', $endDate->endOfDay());
        $totalDays = max(1, count($period) - 1);

        $committedPoints = $sprint->committed_points ?? (float) Task::where('sprint_id', $sprint->id)->sum('estimate_points');
        if ($committedPoints <= 0) {
            $committedPoints = 1.0; // Avoid divide by zero
        }

        $completedStatusIds = WorkflowStatus::where('project_id', $sprint->project_id)
            ->where(function ($query) {
                $query->where('is_completed', true)
                    ->orWhere('category', 'completed');
            })
            ->pluck('id')
            ->all();

        $tasks = Task::where('sprint_id', $sprint->id)->get();
        $totalPoints = (float) $tasks->sum('estimate_points') ?: $committedPoints;

        $daysData = [];
        $dayIndex = 0;
        $today = now()->startOfDay();

        foreach ($period as $date) {
            $currentDate = $date->startOfDay();
            $idealRemaining = round(max(0, $committedPoints - (($committedPoints / $totalDays) * $dayIndex)), 1);

            $actualRemaining = null;
            if ($currentDate->lessThanOrEqualTo($today)) {
                // Calculate tasks completed on or before this date
                $completedSoFar = $tasks->filter(function (Task $t) use ($currentDate, $completedStatusIds) {
                    if (! in_array($t->status_id, $completedStatusIds)) {
                        return false;
                    }
                    if (! $t->completed_at) {
                        return true; // Already marked completed
                    }

                    return Carbon::parse($t->completed_at)->startOfDay()->lessThanOrEqualTo($currentDate);
                })->sum('estimate_points');

                $actualRemaining = round(max(0, $totalPoints - $completedSoFar), 1);
            }

            $daysData[] = [
                'date' => $currentDate->toDateString(),
                'day_label' => $currentDate->isoFormat('D MMM'),
                'ideal_remaining' => $idealRemaining,
                'actual_remaining' => $actualRemaining,
            ];

            $dayIndex++;
        }

        return [
            'sprint' => [
                'id' => $sprint->id,
                'name' => $sprint->name,
                'start_date' => $sprint->start_date?->toDateString(),
                'end_date' => $sprint->end_date?->toDateString(),
                'committed_points' => $committedPoints,
                'status' => $sprint->status,
            ],
            'days' => $daysData,
        ];
    }
}
