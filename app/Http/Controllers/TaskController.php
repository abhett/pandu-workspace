<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\Task\TaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TaskController extends Controller
{
    public function __construct(
        public TaskService $taskService
    ) {}

    /**
     * Display a listing of tasks in table/list view.
     */
    public function index(Request $request, Project $project): Response
    {
        $user = $request->user();
        $this->authorizeProjectAccess($user, $project);

        $search = $request->query('search');
        $type = $request->query('type');
        $priority = $request->query('priority');
        $statusId = $request->query('status_id');
        $assigneeId = $request->query('assignee_id');
        $sortBy = $request->query('sort', 'created_at');
        $sortDir = $request->query('dir', 'desc');

        $query = $project->tasks()
            ->with(['assignees', 'status', 'labels', 'creator'])
            ->withCount('subtasks')
            ->whereNull('parent_id'); // Only show top-level tasks in main table

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('key', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($type) {
            $query->where('type', $type);
        }

        if ($priority) {
            $query->where('priority', $priority);
        }

        if ($statusId) {
            $query->where('status_id', $statusId);
        }

        if ($assigneeId) {
            $query->whereHas('assignees', fn ($q) => $q->where('users.id', $assigneeId));
        }

        $allowedSorts = ['key', 'title', 'type', 'priority', 'status_id', 'due_date', 'estimate_points', 'created_at', 'rank'];
        if (in_array($sortBy, $allowedSorts, true)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->latest('created_at');
        }

        $tasks = $query->paginate(25)->through(fn (Task $t) => [
            'id' => $t->id,
            'key' => $t->key,
            'title' => $t->title,
            'description' => $t->description,
            'type' => $t->type,
            'priority' => $t->priority,
            'estimate_points' => $t->estimate_points,
            'due_date' => $t->due_date?->format('Y-m-d'),
            'due_date_formatted' => $t->due_date?->format('d M Y'),
            'completed_at' => $t->completed_at?->format('Y-m-d H:i'),
            'rank' => $t->rank,
            'version' => $t->version,
            'subtasks_count' => $t->subtasks_count,
            'created_at' => $t->created_at?->format('d M Y'),
            'status' => [
                'id' => $t->status->id,
                'name' => $t->status->name,
                'slug' => $t->status->slug,
                'category' => $t->status->category,
                'color' => $t->status->color,
                'is_completed' => $t->status->is_completed,
            ],
            'assignees' => $t->assignees->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ])->all(),
            'labels' => $t->labels->map(fn ($l) => [
                'id' => $l->id,
                'name' => $l->name,
                'color' => $l->color,
            ])->all(),
            'creator' => $t->creator ? [
                'id' => $t->creator->id,
                'name' => $t->creator->name,
            ] : null,
        ]);

        $statuses = $project->statuses()->orderBy('position')->get()->map(fn ($s) => [
            'id' => $s->id,
            'name' => $s->name,
            'slug' => $s->slug,
            'category' => $s->category,
            'color' => $s->color,
            'is_initial' => $s->is_initial,
            'is_completed' => $s->is_completed,
            'wip_limit' => $s->wip_limit,
        ]);

        $projectMembers = $project->members()->select(['users.id', 'users.name', 'users.email'])->get();
        $labels = $project->labels()->get(['id', 'name', 'color']);

        // Summary KPI statistics
        $stats = [
            'total' => $project->tasks()->whereNull('parent_id')->count(),
            'in_progress' => $project->tasks()->whereNull('parent_id')->whereHas('status', fn ($q) => $q->where('category', 'started'))->count(),
            'completed' => $project->tasks()->whereNull('parent_id')->whereHas('status', fn ($q) => $q->where('category', 'completed'))->count(),
            'high_priority' => $project->tasks()->whereNull('parent_id')->whereIn('priority', ['high', 'highest'])->count(),
        ];

        return Inertia::render('projects/tasks/index', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
                'slug' => $project->slug,
                'type' => $project->type,
                'color' => $project->color,
                'icon' => $project->icon,
            ],
            'tasks' => $tasks,
            'statuses' => $statuses,
            'members' => $projectMembers,
            'labels' => $labels,
            'filters' => [
                'search' => $search,
                'type' => $type,
                'priority' => $priority,
                'status_id' => $statusId,
                'assignee_id' => $assigneeId ? (int) $assigneeId : null,
                'sort' => $sortBy,
                'dir' => $sortDir,
            ],
            'stats' => $stats,
        ]);
    }

    /**
     * Display the interactive Kanban board.
     */
    public function board(Request $request, Project $project): Response
    {
        $user = $request->user();
        $this->authorizeProjectAccess($user, $project);

        $statuses = $project->statuses()
            ->orderBy('position')
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'slug' => $s->slug,
                'category' => $s->category,
                'color' => $s->color,
                'position' => $s->position,
                'is_initial' => $s->is_initial,
                'is_completed' => $s->is_completed,
                'wip_limit' => $s->wip_limit,
            ]);

        $tasks = $project->tasks()
            ->with(['assignees', 'status', 'labels', 'creator'])
            ->withCount('subtasks')
            ->whereNull('parent_id')
            ->orderBy('rank')
            ->get()
            ->map(fn (Task $t) => [
                'id' => $t->id,
                'key' => $t->key,
                'title' => $t->title,
                'description' => $t->description,
                'type' => $t->type,
                'priority' => $t->priority,
                'status_id' => $t->status_id,
                'estimate_points' => $t->estimate_points,
                'due_date' => $t->due_date?->format('Y-m-d'),
                'due_date_formatted' => $t->due_date?->format('d M'),
                'completed_at' => $t->completed_at?->format('Y-m-d H:i'),
                'rank' => $t->rank,
                'version' => $t->version,
                'subtasks_count' => $t->subtasks_count,
                'assignees' => $t->assignees->map(fn (User $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                ])->all(),
                'labels' => $t->labels->map(fn ($l) => [
                    'id' => $l->id,
                    'name' => $l->name,
                    'color' => $l->color,
                ])->all(),
            ]);

        $projectMembers = $project->members()->select(['users.id', 'users.name', 'users.email'])->get();
        $labels = $project->labels()->get(['id', 'name', 'color']);

        return Inertia::render('projects/board', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
                'slug' => $project->slug,
                'type' => $project->type,
                'color' => $project->color,
                'icon' => $project->icon,
            ],
            'statuses' => $statuses,
            'tasks' => $tasks,
            'members' => $projectMembers,
            'labels' => $labels,
        ]);
    }

    /**
     * Store a newly created task.
     */
    public function store(Request $request, Project $project): RedirectResponse|JsonResponse
    {
        $user = $request->user();
        $this->authorizeProjectAccess($user, $project);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'type' => ['nullable', 'string', 'in:task,bug,story,epic,subtask'],
            'priority' => ['nullable', 'string', 'in:lowest,low,medium,high,highest'],
            'status_id' => ['nullable', 'string', 'exists:workflow_statuses,id'],
            'parent_id' => ['nullable', 'string', 'exists:tasks,id'],
            'estimate_points' => ['nullable', 'numeric', 'min:0', 'max:999'],
            'due_date' => ['nullable', 'date'],
            'assignee_ids' => ['nullable', 'array'],
            'assignee_ids.*' => ['integer', 'exists:users,id'],
            'label_ids' => ['nullable', 'array'],
            'label_ids.*' => ['string', 'exists:labels,id'],
        ]);

        $task = $this->taskService->create($project, $user, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'Tugas "'.$task->key.'" berhasil dibuat!',
                'task' => $task,
            ], 201);
        }

        return back()->with('success', 'Tugas "'.$task->key.'" berhasil dibuat!');
    }

    /**
     * Display the specified task details.
     */
    public function show(Request $request, Project $project, Task $task): JsonResponse|Response
    {
        $user = $request->user();
        $this->authorizeProjectAccess($user, $project);

        if ($task->project_id !== $project->id) {
            abort(404);
        }

        $task->load([
            'assignees',
            'status',
            'labels',
            'creator',
            'subtasks.assignees',
            'subtasks.status',
            'activities.user',
            'comments.user',
            'comments.replies.user',
            'checklists.completedByUser',
            'attachments.uploader',
        ]);

        $taskData = [
            'id' => $task->id,
            'key' => $task->key,
            'title' => $task->title,
            'description' => $task->description,
            'type' => $task->type,
            'priority' => $task->priority,
            'status_id' => $task->status_id,
            'estimate_points' => $task->estimate_points,
            'due_date' => $task->due_date?->format('Y-m-d'),
            'due_date_formatted' => $task->due_date?->format('d M Y'),
            'completed_at' => $task->completed_at?->format('Y-m-d H:i'),
            'rank' => $task->rank,
            'version' => $task->version,
            'created_at' => $task->created_at?->format('d M Y H:i'),
            'updated_at' => $task->updated_at?->format('d M Y H:i'),
            'status' => [
                'id' => $task->status->id,
                'name' => $task->status->name,
                'slug' => $task->status->slug,
                'category' => $task->status->category,
                'color' => $task->status->color,
                'is_completed' => $task->status->is_completed,
            ],
            'assignees' => $task->assignees->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ])->all(),
            'labels' => $task->labels->map(fn ($l) => [
                'id' => $l->id,
                'name' => $l->name,
                'color' => $l->color,
            ])->all(),
            'creator' => $task->creator ? [
                'id' => $task->creator->id,
                'name' => $task->creator->name,
            ] : null,
            'subtasks' => $task->subtasks->map(fn (Task $st) => [
                'id' => $st->id,
                'key' => $st->key,
                'title' => $st->title,
                'priority' => $st->priority,
                'status_id' => $st->status_id,
                'status_name' => $st->status->name,
                'status_color' => $st->status->color,
                'is_completed' => $st->status->is_completed,
                'assignees' => $st->assignees->map(fn ($u) => ['id' => $u->id, 'name' => $u->name]),
            ])->all(),
            'activities' => $task->activities->map(fn ($a) => [
                'id' => $a->id,
                'action' => $a->action,
                'changes' => $a->changes,
                'created_at' => $a->created_at?->diffForHumans(),
                'user' => $a->user ? [
                    'id' => $a->user->id,
                    'name' => $a->user->name,
                ] : null,
            ])->all(),
            'comments' => $task->comments->map(fn ($c) => [
                'id' => $c->id,
                'content' => $c->content,
                'created_at' => $c->created_at?->diffForHumans(),
                'user' => [
                    'id' => $c->user->id,
                    'name' => $c->user->name,
                ],
                'replies' => $c->replies->map(fn ($r) => [
                    'id' => $r->id,
                    'content' => $r->content,
                    'created_at' => $r->created_at?->diffForHumans(),
                    'user' => [
                        'id' => $r->user->id,
                        'name' => $r->user->name,
                    ],
                ])->all(),
            ])->all(),
            'checklists' => $task->checklists->map(fn ($ck) => [
                'id' => $ck->id,
                'title' => $ck->title,
                'is_completed' => $ck->is_completed,
                'position' => $ck->position,
                'completed_at' => $ck->completed_at?->diffForHumans(),
                'completed_by' => $ck->completedByUser ? [
                    'id' => $ck->completedByUser->id,
                    'name' => $ck->completedByUser->name,
                ] : null,
            ])->all(),
            'attachments' => $task->attachments->map(fn ($att) => [
                'id' => $att->id,
                'filename' => $att->filename,
                'size_bytes' => $att->size_bytes,
                'size_human' => $att->size_bytes > 1048576
                    ? round($att->size_bytes / 1048576, 1).' MB'
                    : round($att->size_bytes / 1024, 1).' KB',
                'mime_type' => $att->mime_type,
                'created_at' => $att->created_at?->diffForHumans(),
                'uploader' => $att->uploader ? [
                    'id' => $att->uploader->id,
                    'name' => $att->uploader->name,
                ] : null,
            ])->all(),
        ];

        if ($request->wantsJson()) {
            return response()->json(['task' => $taskData]);
        }

        return Inertia::render('projects/tasks/show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
                'slug' => $project->slug,
            ],
            'task' => $taskData,
        ]);
    }

    /**
     * Update the specified task.
     */
    public function update(Request $request, Project $project, Task $task): RedirectResponse|JsonResponse
    {
        $user = $request->user();
        $this->authorizeProjectAccess($user, $project);

        if ($task->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'type' => ['nullable', 'string', 'in:task,bug,story,epic,subtask'],
            'priority' => ['nullable', 'string', 'in:lowest,low,medium,high,highest'],
            'status_id' => ['nullable', 'string', 'exists:workflow_statuses,id'],
            'estimate_points' => ['nullable', 'numeric', 'min:0', 'max:999'],
            'due_date' => ['nullable', 'date'],
            'assignee_ids' => ['nullable', 'array'],
            'assignee_ids.*' => ['integer', 'exists:users,id'],
            'label_ids' => ['nullable', 'array'],
            'label_ids.*' => ['string', 'exists:labels,id'],
            'expected_version' => ['nullable', 'integer'],
        ]);

        $updatedTask = $this->taskService->update($task, $user, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'Tugas berhasil diperbarui!',
                'task' => $updatedTask,
            ]);
        }

        return back()->with('success', 'Tugas berhasil diperbarui!');
    }

    /**
     * Move task across status / rank in Kanban with optimistic concurrency control.
     */
    public function move(Request $request, Project $project, Task $task): JsonResponse
    {
        $user = $request->user();
        $this->authorizeProjectAccess($user, $project);

        if ($task->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'target_status_id' => ['required', 'string', 'exists:workflow_statuses,id'],
            'prev_rank' => ['nullable', 'string'],
            'next_rank' => ['nullable', 'string'],
            'expected_version' => ['nullable', 'integer'],
        ]);

        $updatedTask = $this->taskService->move(
            $task,
            $user,
            $validated['target_status_id'],
            $validated['prev_rank'] ?? null,
            $validated['next_rank'] ?? null,
            $validated['expected_version'] ?? null
        );

        return response()->json([
            'message' => 'Posisi tugas berhasil diperbarui.',
            'task' => [
                'id' => $updatedTask->id,
                'key' => $updatedTask->key,
                'status_id' => $updatedTask->status_id,
                'rank' => $updatedTask->rank,
                'version' => $updatedTask->version,
                'completed_at' => $updatedTask->completed_at?->format('Y-m-d H:i'),
            ],
        ]);
    }

    /**
     * Remove the specified task (soft delete).
     */
    public function destroy(Request $request, Project $project, Task $task): RedirectResponse|JsonResponse
    {
        $user = $request->user();
        $this->authorizeProjectAccess($user, $project);

        if ($task->project_id !== $project->id) {
            abort(404);
        }

        $this->taskService->delete($task, $user);

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Tugas berhasil dihapus.']);
        }

        return back()->with('success', 'Tugas berhasil dihapus.');
    }

    /**
     * Authorize user access to the project and its organization.
     */
    private function authorizeProjectAccess(User $user, Project $project): void
    {
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');

        if ($project->organization_id !== $orgId) {
            abort(403, 'Akses tidak sah ke proyek organisasi lain.');
        }

        // Verify membership in organization
        $organization = Organization::find($orgId);
        if (! $organization || ! $user->belongsToOrganization($organization)) {
            abort(403, 'Anda bukan anggota organisasi ini.');
        }
    }
}
