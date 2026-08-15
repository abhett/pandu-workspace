<?php

namespace App\Services\Task;

use App\Exceptions\TaskConcurrencyException;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskActivity;
use App\Models\User;
use App\Models\WorkflowStatus;
use Illuminate\Support\Facades\DB;

final class TaskService
{
    public function __construct(
        public RankService $rankService
    ) {}

    /**
     * Create a new task in a project.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(Project $project, User $actor, array $data): Task
    {
        return DB::transaction(function () use ($project, $actor, $data) {
            // Determine status
            $statusId = $data['status_id'] ?? null;
            if (! $statusId) {
                $statusId = $project->statuses()->where('is_initial', true)->value('id')
                    ?? $project->statuses()->orderBy('position')->value('id');
            }

            // Determine sequence number and key
            $maxSeq = Task::withTrashed()->where('project_id', $project->id)->max('sequence_number') ?? 0;
            $sequenceNumber = $maxSeq + 1;
            $key = $project->key.'-'.$sequenceNumber;

            // Determine rank (append to the end of the column)
            $lastRank = Task::where('project_id', $project->id)
                ->where('status_id', $statusId)
                ->max('rank');

            $rank = $lastRank
                ? $this->rankService->generateAfter($lastRank)
                : $this->rankService->initial();

            $status = WorkflowStatus::find($statusId);
            $isCompleted = $status?->is_completed ?? false;

            $task = Task::create([
                'organization_id' => $project->organization_id,
                'project_id' => $project->id,
                'status_id' => $statusId,
                'parent_id' => $data['parent_id'] ?? null,
                'sequence_number' => $sequenceNumber,
                'key' => $key,
                'title' => trim($data['title']),
                'description' => $data['description'] ?? null,
                'type' => $data['type'] ?? 'task',
                'priority' => $data['priority'] ?? 'medium',
                'estimate_points' => isset($data['estimate_points']) && $data['estimate_points'] !== '' ? (float) $data['estimate_points'] : null,
                'due_date' => $data['due_date'] ?? null,
                'completed_at' => $isCompleted ? now() : null,
                'rank' => $rank,
                'version' => 1,
                'created_by' => $actor->id,
            ]);

            // Attach assignees
            if (! empty($data['assignee_ids']) && is_array($data['assignee_ids'])) {
                $pivotData = [];
                foreach ($data['assignee_ids'] as $userId) {
                    $pivotData[$userId] = [
                        'assigned_at' => now(),
                        'assigned_by' => $actor->id,
                    ];
                }
                $task->assignees()->attach($pivotData);
            }

            // Attach labels
            if (! empty($data['label_ids']) && is_array($data['label_ids'])) {
                $task->labels()->attach($data['label_ids']);
            }

            // Record initial activity
            TaskActivity::create([
                'task_id' => $task->id,
                'user_id' => $actor->id,
                'action' => 'created',
                'changes' => [
                    'title' => $task->title,
                    'key' => $task->key,
                    'type' => $task->type,
                    'priority' => $task->priority,
                    'status_name' => $status?->name,
                ],
            ]);

            return $task->load(['assignees', 'status', 'labels', 'creator']);
        });
    }

    /**
     * Update an existing task.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Task $task, User $actor, array $data): Task
    {
        return DB::transaction(function () use ($task, $actor, $data) {
            // Optimistic concurrency check if version provided
            if (isset($data['expected_version']) && (int) $data['expected_version'] !== $task->version) {
                throw new TaskConcurrencyException((int) $data['expected_version'], $task->version);
            }

            $changes = [];

            // Track standard field changes
            $trackableFields = ['title', 'description', 'type', 'priority', 'estimate_points', 'due_date'];
            foreach ($trackableFields as $field) {
                if (array_key_exists($field, $data)) {
                    $oldVal = $task->getAttribute($field);
                    $newVal = $data[$field];
                    if ($field === 'title') {
                        $newVal = trim($newVal);
                    }
                    if ($field === 'estimate_points' && $newVal !== null && $newVal !== '') {
                        $newVal = (float) $newVal;
                    }

                    if ($oldVal != $newVal) {
                        $changes[$field] = [
                            'before' => $oldVal,
                            'after' => $newVal,
                        ];
                        $task->setAttribute($field, $newVal);
                    }
                }
            }

            // Handle status change if provided
            if (isset($data['status_id']) && $data['status_id'] !== $task->status_id) {
                $oldStatus = $task->status;
                $newStatus = WorkflowStatus::where('project_id', $task->project_id)->findOrFail($data['status_id']);

                $changes['status'] = [
                    'before' => $oldStatus?->name,
                    'after' => $newStatus->name,
                ];

                $task->status_id = $newStatus->id;
                $task->completed_at = $newStatus->is_completed ? ($task->completed_at ?? now()) : null;
            }

            // Handle assignees sync if provided
            if (array_key_exists('assignee_ids', $data) && is_array($data['assignee_ids'])) {
                $currentAssigneeIds = $task->assignees()->pluck('users.id')->all();
                $newAssigneeIds = array_map('intval', $data['assignee_ids']);

                sort($currentAssigneeIds);
                sort($newAssigneeIds);

                if ($currentAssigneeIds !== $newAssigneeIds) {
                    $pivotData = [];
                    foreach ($newAssigneeIds as $uId) {
                        $pivotData[$uId] = [
                            'assigned_at' => now(),
                            'assigned_by' => $actor->id,
                        ];
                    }
                    $task->assignees()->sync($pivotData);

                    $changes['assignees'] = [
                        'before_count' => count($currentAssigneeIds),
                        'after_count' => count($newAssigneeIds),
                    ];
                }
            }

            // Handle labels sync if provided
            if (array_key_exists('label_ids', $data) && is_array($data['label_ids'])) {
                $task->labels()->sync($data['label_ids']);
            }

            // Increment version and save
            $task->version += 1;
            $task->save();

            // Record activity if changes happened
            if (! empty($changes)) {
                TaskActivity::create([
                    'task_id' => $task->id,
                    'user_id' => $actor->id,
                    'action' => isset($changes['status']) ? 'status_changed' : 'updated',
                    'changes' => $changes,
                ]);
            }

            return $task->load(['assignees', 'status', 'labels', 'creator', 'subtasks']);
        });
    }

    /**
     * Move task to a new status / rank with optimistic concurrency control.
     */
    public function move(
        Task $task,
        User $actor,
        string $targetStatusId,
        ?string $prevRank,
        ?string $nextRank,
        ?int $expectedVersion = null
    ): Task {
        return DB::transaction(function () use ($task, $actor, $targetStatusId, $prevRank, $nextRank, $expectedVersion) {
            // Optimistic concurrency check
            if ($expectedVersion !== null && $expectedVersion !== $task->version) {
                throw new TaskConcurrencyException($expectedVersion, $task->version);
            }

            $targetStatus = WorkflowStatus::where('project_id', $task->project_id)->findOrFail($targetStatusId);
            $newRank = $this->rankService->between($prevRank, $nextRank);

            $oldStatusId = $task->status_id;
            $oldStatusName = $task->status?->name;
            $statusChanged = $oldStatusId !== $targetStatusId;

            $task->status_id = $targetStatusId;
            $task->rank = $newRank;
            $task->version += 1;

            if ($statusChanged) {
                $task->completed_at = $targetStatus->is_completed ? ($task->completed_at ?? now()) : null;
            }

            $task->save();

            // Record activity for status change or card move
            TaskActivity::create([
                'task_id' => $task->id,
                'user_id' => $actor->id,
                'action' => $statusChanged ? 'status_changed' : 'reordered',
                'changes' => [
                    'status_changed' => $statusChanged,
                    'from_status_id' => $oldStatusId,
                    'to_status_id' => $targetStatusId,
                    'from_status_name' => $oldStatusName,
                    'to_status_name' => $targetStatus->name,
                    'rank' => $newRank,
                ],
            ]);

            return $task->load(['assignees', 'status', 'labels']);
        });
    }

    /**
     * Soft delete a task.
     */
    public function delete(Task $task, User $actor): void
    {
        DB::transaction(function () use ($task, $actor) {
            TaskActivity::create([
                'task_id' => $task->id,
                'user_id' => $actor->id,
                'action' => 'deleted',
                'changes' => [
                    'title' => $task->title,
                    'key' => $task->key,
                ],
            ]);

            $task->delete();
        });
    }
}
