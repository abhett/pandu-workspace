<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\TaskConcurrencyException;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TaskResource;
use App\Models\Project;
use App\Models\Task;
use App\Services\Task\TaskService;
use App\Services\Webhook\WebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function __construct(
        protected TaskService $taskService,
        protected WebhookService $webhookService
    ) {}

    /**
     * List tasks in a project.
     */
    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project);

        $query = Task::with(['assignees', 'labels', 'status', 'sprint', 'attachments'])
            ->where('project_id', $project->id);

        if ($request->has('status_id')) {
            $query->where('status_id', $request->input('status_id'));
        }

        if ($request->has('sprint_id')) {
            $query->where('sprint_id', $request->input('sprint_id'));
        }

        if ($request->has('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->has('priority')) {
            $query->where('priority', $request->input('priority'));
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                    ->orWhere('key', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        $tasks = $query->orderBy('rank')->get();

        return response()->json([
            'data' => TaskResource::collection($tasks),
        ]);
    }

    /**
     * Create a new task.
     */
    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['nullable', 'string', 'in:task,story,bug,epic,subtask'],
            'priority' => ['nullable', 'string', 'in:lowest,low,medium,high,highest,urgent'],
            'estimate_points' => ['nullable', 'numeric', 'min:0'],
            'status_id' => ['nullable', 'string', 'exists:workflow_statuses,id'],
            'sprint_id' => ['nullable', 'string', 'exists:sprints,id'],
            'parent_id' => ['nullable', 'string', 'exists:tasks,id'],
            'due_date' => ['nullable', 'date'],
            'assignee_ids' => ['nullable', 'array'],
            'assignee_ids.*' => ['integer', 'exists:users,id'],
            'label_ids' => ['nullable', 'array'],
            'label_ids.*' => ['string', 'exists:labels,id'],
        ]);

        $task = $this->taskService->create($project, $request->user(), $validated);
        $task->load(['assignees', 'labels', 'status', 'sprint', 'attachments']);

        // Dispatch Webhook
        $this->webhookService->dispatch(
            'task.created',
            (new TaskResource($task))->resolve(),
            $project->organization,
            $project
        );

        return response()->json([
            'data' => new TaskResource($task),
        ], 201);
    }

    /**
     * Get details of a single task.
     */
    public function show(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTaskAccess($request, $task);

        $task->load(['assignees', 'labels', 'status', 'sprint', 'attachments', 'activities.user']);

        return response()->json([
            'data' => new TaskResource($task),
        ]);
    }

    /**
     * Update a task.
     */
    public function update(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTaskAccess($request, $task);

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['sometimes', 'string', 'in:task,story,bug,epic,subtask'],
            'priority' => ['sometimes', 'string', 'in:lowest,low,medium,high,highest,urgent'],
            'estimate_points' => ['nullable', 'numeric', 'min:0'],
            'status_id' => ['sometimes', 'string', 'exists:workflow_statuses,id'],
            'sprint_id' => ['nullable', 'string', 'exists:sprints,id'],
            'due_date' => ['nullable', 'date'],
            'assignee_ids' => ['nullable', 'array'],
            'assignee_ids.*' => ['integer', 'exists:users,id'],
            'label_ids' => ['nullable', 'array'],
            'label_ids.*' => ['string', 'exists:labels,id'],
            'expected_version' => ['nullable', 'integer'],
        ]);

        // Support If-Match header for optimistic concurrency
        $ifMatch = $request->header('If-Match');
        if ($ifMatch && ! isset($validated['expected_version'])) {
            $validated['expected_version'] = (int) trim($ifMatch, '"');
        }

        try {
            $updatedTask = $this->taskService->update($task, $request->user(), $validated);
            $updatedTask->load(['assignees', 'labels', 'status', 'sprint', 'attachments']);

            // Dispatch Webhook
            $this->webhookService->dispatch(
                'task.updated',
                (new TaskResource($updatedTask))->resolve(),
                $task->organization,
                $task->project
            );

            return response()->json([
                'data' => new TaskResource($updatedTask),
                'meta' => [
                    'version' => $updatedTask->version,
                ],
            ]);
        } catch (TaskConcurrencyException $e) {
            return response()->json([
                'error' => [
                    'code' => 'TASK_VERSION_CONFLICT',
                    'message' => $e->getMessage(),
                    'current_version' => $task->fresh()->version,
                ],
            ], 409);
        }
    }

    /**
     * Move task to a new status / rank (Kanban / Board move).
     */
    public function move(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTaskAccess($request, $task);

        $validated = $request->validate([
            'status_id' => ['required', 'string', 'exists:workflow_statuses,id'],
            'before_task_id' => ['nullable', 'string', 'exists:tasks,id'],
            'after_task_id' => ['nullable', 'string', 'exists:tasks,id'],
            'expected_version' => ['nullable', 'integer'],
        ]);

        $ifMatch = $request->header('If-Match');
        if ($ifMatch && ! isset($validated['expected_version'])) {
            $validated['expected_version'] = (int) trim($ifMatch, '"');
        }

        try {
            $movedTask = $this->taskService->move(
                $task,
                $request->user(),
                $validated['status_id'],
                $validated['before_task_id'] ?? null,
                $validated['after_task_id'] ?? null,
                $validated['expected_version'] ?? null
            );

            $movedTask->load(['assignees', 'labels', 'status', 'sprint', 'attachments']);

            // Dispatch Webhook
            $this->webhookService->dispatch(
                'task.moved',
                [
                    'task_id' => $movedTask->id,
                    'project_id' => $movedTask->project_id,
                    'status_id' => $movedTask->status_id,
                    'rank' => $movedTask->rank,
                    'version' => $movedTask->version,
                ],
                $task->organization,
                $task->project
            );

            return response()->json([
                'data' => new TaskResource($movedTask),
                'meta' => [
                    'version' => $movedTask->version,
                    'rank' => $movedTask->rank,
                ],
            ]);
        } catch (TaskConcurrencyException $e) {
            return response()->json([
                'error' => [
                    'code' => 'TASK_VERSION_CONFLICT',
                    'message' => $e->getMessage(),
                    'current_version' => $task->fresh()->version,
                ],
            ], 409);
        }
    }

    /**
     * Delete a task.
     */
    public function destroy(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTaskAccess($request, $task);

        $this->taskService->delete($task, $request->user());

        $this->webhookService->dispatch(
            'task.deleted',
            ['task_id' => $task->id, 'key' => $task->key],
            $task->organization,
            $task->project
        );

        return response()->json([
            'message' => 'Task deleted successfully.',
        ]);
    }

    /**
     * Ensure user has access to the project.
     */
    protected function authorizeProjectAccess(Request $request, Project $project): void
    {
        $isMember = $request->user()->organizations()
            ->where('organizations.id', $project->organization_id)
            ->wherePivot('status', 'active')
            ->exists();

        if (! $isMember) {
            abort(403, 'You do not have access to this project.');
        }
    }

    /**
     * Ensure user has access to the task's organization.
     */
    protected function authorizeTaskAccess(Request $request, Task $task): void
    {
        $isMember = $request->user()->organizations()
            ->where('organizations.id', $task->organization_id)
            ->wherePivot('status', 'active')
            ->exists();

        if (! $isMember) {
            abort(403, 'You do not have access to this task.');
        }
    }
}
