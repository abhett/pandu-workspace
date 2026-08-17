<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkflowStatus;
use App\Services\Sprint\SprintService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class SprintController extends Controller
{
    public function __construct(
        protected SprintService $sprintService
    ) {}

    /**
     * Display the Project Backlog and Sprint Planning workspace.
     */
    public function index(Request $request, Project $project): Response|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');

        if ($project->organization_id !== $orgId) {
            abort(403, 'Akses tidak sah.');
        }

        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        // Project Statuses
        $statuses = WorkflowStatus::where('project_id', $project->id)
            ->orderBy('position')
            ->get();

        $statusMap = $statuses->keyBy('id');

        // Helper to format task array
        $formatTask = function (Task $t) use ($statusMap) {
            $status = $statusMap->get($t->status_id);

            return [
                'id' => $t->id,
                'key' => $t->key,
                'title' => $t->title,
                'type' => $t->type,
                'priority' => $t->priority,
                'estimate_points' => $t->estimate_points ? (float) $t->estimate_points : null,
                'due_date' => $t->due_date?->toDateString(),
                'status_id' => $t->status_id,
                'status_name' => $status?->name ?? 'Unknown',
                'status_color' => $status?->color ?? '#64748b',
                'status_category' => $status?->category ?? 'unstarted',
                'is_completed' => (bool) ($status?->is_completed || $status?->category === 'completed'),
                'rank' => $t->rank,
                'assignees' => $t->assignees->map(fn (User $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                ])->all(),
            ];
        };

        // Active Sprint
        $activeSprintModel = Sprint::where('project_id', $project->id)
            ->where('status', 'active')
            ->with(['tasks.assignees'])
            ->first();

        $activeSprint = null;
        if ($activeSprintModel) {
            $tasks = $activeSprintModel->tasks->map($formatTask)->all();
            $totalPoints = array_sum(array_column($tasks, 'estimate_points'));
            $completedTasks = array_filter($tasks, fn ($t) => $t['is_completed']);
            $completedPoints = array_sum(array_column($completedTasks, 'estimate_points'));

            $activeSprint = [
                'id' => $activeSprintModel->id,
                'name' => $activeSprintModel->name,
                'goal' => $activeSprintModel->goal,
                'status' => $activeSprintModel->status,
                'start_date' => $activeSprintModel->start_date?->isoFormat('D MMM Y'),
                'end_date' => $activeSprintModel->end_date?->isoFormat('D MMM Y'),
                'started_at' => $activeSprintModel->started_at?->isoFormat('D MMM Y HH:mm'),
                'days_remaining' => $activeSprintModel->end_date ? max(0, now()->diffInDays($activeSprintModel->end_date, false)) : null,
                'committed_points' => $activeSprintModel->committed_points ?? $totalPoints,
                'total_points' => $totalPoints,
                'completed_points' => $completedPoints,
                'tasks_count' => count($tasks),
                'completed_tasks_count' => count($completedTasks),
                'tasks' => $tasks,
            ];
        }

        // Future / Planned Sprints
        $futureSprints = Sprint::where('project_id', $project->id)
            ->where('status', 'future')
            ->orderBy('sequence_number')
            ->with(['tasks.assignees'])
            ->get()
            ->map(function (Sprint $s) use ($formatTask) {
                $tasks = $s->tasks->map($formatTask)->all();
                $totalPoints = array_sum(array_column($tasks, 'estimate_points'));

                return [
                    'id' => $s->id,
                    'name' => $s->name,
                    'goal' => $s->goal,
                    'status' => $s->status,
                    'start_date' => $s->start_date?->toDateString(),
                    'end_date' => $s->end_date?->toDateString(),
                    'total_points' => $totalPoints,
                    'tasks_count' => count($tasks),
                    'tasks' => $tasks,
                ];
            })->all();

        // Completed Sprints (last 5)
        $completedSprints = Sprint::where('project_id', $project->id)
            ->where('status', 'completed')
            ->orderByDesc('completed_at')
            ->take(5)
            ->get()
            ->map(fn (Sprint $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'goal' => $s->goal,
                'status' => $s->status,
                'started_at' => $s->started_at?->isoFormat('D MMM Y'),
                'completed_at' => $s->completed_at?->isoFormat('D MMM Y'),
                'committed_points' => $s->committed_points,
                'completed_points' => $s->completed_points,
            ])->all();

        // Backlog Tasks (sprint_id is null)
        $backlogTasks = Task::where('project_id', $project->id)
            ->whereNull('sprint_id')
            ->orderBy('rank')
            ->with('assignees')
            ->get()
            ->map($formatTask)
            ->all();

        $backlogTotalPoints = array_sum(array_column($backlogTasks, 'estimate_points'));

        // Project Members for task filters/modals
        $members = $project->members->map(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
        ])->all();

        return Inertia::render('projects/backlog', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
            ],
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
                'slug' => $project->slug,
                'type' => $project->type,
                'color' => $project->color,
                'icon' => $project->icon,
            ],
            'statuses' => $statuses->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'slug' => $s->slug,
                'category' => $s->category,
                'color' => $s->color,
                'position' => $s->position,
                'is_completed' => $s->is_completed,
            ])->all(),
            'activeSprint' => $activeSprint,
            'futureSprints' => $futureSprints,
            'completedSprints' => $completedSprints,
            'backlog' => [
                'tasks' => $backlogTasks,
                'total_points' => $backlogTotalPoints,
                'tasks_count' => count($backlogTasks),
            ],
            'members' => $members,
        ]);
    }

    /**
     * Store a newly created future sprint.
     */
    public function store(Request $request, Project $project): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($project->organization_id !== $orgId) {
            abort(403, 'Akses tidak sah.');
        }

        if (! $user->hasPermissionInOrganization($organization, 'projects:edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk membuat sprint.');
        }

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:100'],
            'goal' => ['nullable', 'string', 'max:500'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
        ]);

        $sprint = $this->sprintService->createSprint($project, $user, $validated);

        return back()->with('success', "Sprint '{$sprint->name}' berhasil dibuat.");
    }

    /**
     * Update an existing sprint.
     */
    public function update(Request $request, Project $project, Sprint $sprint): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($project->organization_id !== $orgId || $sprint->project_id !== $project->id) {
            abort(403, 'Akses tidak sah.');
        }

        if (! $user->hasPermissionInOrganization($organization, 'projects:edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengedit sprint.');
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'goal' => ['nullable', 'string', 'max:500'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
        ]);

        $this->sprintService->updateSprint($sprint, $validated);

        return back()->with('success', 'Informasi sprint berhasil diperbarui.');
    }

    /**
     * Delete a sprint.
     */
    public function destroy(Request $request, Project $project, Sprint $sprint): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($project->organization_id !== $orgId || $sprint->project_id !== $project->id) {
            abort(403, 'Akses tidak sah.');
        }

        if (! $user->hasPermissionInOrganization($organization, 'projects:edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus sprint.');
        }

        try {
            $this->sprintService->deleteSprint($sprint);

            return back()->with('success', "Sprint '{$sprint->name}' berhasil dihapus.");
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['sprint' => $e->getMessage()]);
        }
    }

    /**
     * Start an active sprint.
     */
    public function start(Request $request, Project $project, Sprint $sprint): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($project->organization_id !== $orgId || $sprint->project_id !== $project->id) {
            abort(403, 'Akses tidak sah.');
        }

        if (! $user->hasPermissionInOrganization($organization, 'projects:edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk memulai sprint.');
        }

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:100'],
            'goal' => ['nullable', 'string', 'max:500'],
            'duration_weeks' => ['nullable', 'integer', 'in:1,2,3,4'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
        ]);

        try {
            $started = $this->sprintService->startSprint($sprint, $user, $validated);

            return back()->with('success', "Sprint '{$started->name}' telah resmi dimulai!");
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['sprint' => $e->getMessage()]);
        }
    }

    /**
     * Complete an active sprint.
     */
    public function complete(Request $request, Project $project, Sprint $sprint): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($project->organization_id !== $orgId || $sprint->project_id !== $project->id) {
            abort(403, 'Akses tidak sah.');
        }

        if (! $user->hasPermissionInOrganization($organization, 'projects:edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menyelesaikan sprint.');
        }

        $validated = $request->validate([
            'destination_type' => ['required', 'string', 'in:backlog,sprint'],
            'target_sprint_id' => ['nullable', 'string', 'exists:sprints,id'],
        ]);

        try {
            $this->sprintService->completeSprint(
                $sprint,
                $user,
                $validated['destination_type'],
                $validated['target_sprint_id'] ?? null
            );

            return back()->with('success', "Sprint '{$sprint->name}' berhasil diselesaikan!");
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['sprint' => $e->getMessage()]);
        }
    }

    /**
     * Move a task between sprint and backlog.
     */
    public function moveTask(Request $request, Project $project, Task $task): RedirectResponse|JsonResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');

        if ($project->organization_id !== $orgId || $task->project_id !== $project->id) {
            abort(403, 'Akses tidak sah.');
        }

        $validated = $request->validate([
            'sprint_id' => ['nullable', 'string', 'exists:sprints,id'],
        ]);

        $targetSprint = ! empty($validated['sprint_id'])
            ? Sprint::where('project_id', $project->id)->findOrFail($validated['sprint_id'])
            : null;

        $updatedTask = $this->sprintService->moveTaskToSprint($task, $targetSprint, $user);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'task' => [
                    'id' => $updatedTask->id,
                    'sprint_id' => $updatedTask->sprint_id,
                ],
            ]);
        }

        return back()->with('success', 'Task berhasil dipindahkan.');
    }

    /**
     * Get burndown chart data for a sprint.
     */
    public function burndown(Request $request, Project $project, Sprint $sprint): JsonResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');

        if ($project->organization_id !== $orgId || $sprint->project_id !== $project->id) {
            abort(403, 'Akses tidak sah.');
        }

        $data = $this->sprintService->getBurndownData($sprint);

        return response()->json($data);
    }
}
