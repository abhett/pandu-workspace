<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\TaskActivity;
use App\Models\TaskBlocker;
use App\Services\Agile\AgileMetricsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class ScrumMasterController extends Controller
{
    public function __construct(
        protected AgileMetricsService $metricsService
    ) {}

    /**
     * Display the Scrum Master Workspace dashboard.
     */
    public function workspace(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        // 1. Fetch Active Sprint or Latest Future Sprint
        $activeSprint = Sprint::where('project_id', $project->id)
            ->where('status', 'active')
            ->first();

        if (! $activeSprint) {
            $activeSprint = Sprint::where('project_id', $project->id)
                ->where('status', 'future')
                ->orderBy('sequence')
                ->first();
        }

        // 2. Sprint Health Calculations
        $sprintHealth = null;
        if ($activeSprint) {
            $sprintHealth = $this->metricsService->calculateSprintHealth($activeSprint);
        }

        // 3. Active Blockers Center
        $blockers = TaskBlocker::where('project_id', $project->id)
            ->where('is_resolved', false)
            ->with(['task.assignees', 'reporter'])
            ->latest('created_at')
            ->get()
            ->map(fn (TaskBlocker $b) => [
                'id' => $b->id,
                'task_id' => $b->task_id,
                'task_key' => $b->task->key,
                'task_title' => $b->task->title,
                'reason' => $b->reason,
                'severity' => $b->severity,
                'reported_by_name' => $b->reporter?->name ?? 'Team Member',
                'owner_name' => $b->task->assignees->first()?->name ?? 'Unassigned',
                'owner_avatar' => $b->task->assignees->first()?->avatar,
                'blocked_since' => $b->created_at->diffForHumans(),
                'created_at' => $b->created_at->isoFormat('D MMM Y'),
            ]);

        // 4. Daily Standup Board Tasks (Yesterday Done, In Progress, Blocked)
        $standupTasks = [
            'done_recently' => Task::where('project_id', $project->id)
                ->whereHas('workflowStatus', fn ($q) => $q->where('category', 'done'))
                ->where('updated_at', '>=', now()->subDays(2))
                ->with(['assignees', 'workflowStatus'])
                ->take(6)
                ->get()
                ->map(fn ($t) => [
                    'id' => $t->id,
                    'key' => $t->key,
                    'title' => $t->title,
                    'assignee' => $t->assignees->first()?->name,
                ]),
            'in_progress' => Task::where('project_id', $project->id)
                ->whereHas('workflowStatus', fn ($q) => $q->whereIn('category', ['in_progress', 'review']))
                ->with(['assignees', 'workflowStatus'])
                ->take(8)
                ->get()
                ->map(fn ($t) => [
                    'id' => $t->id,
                    'key' => $t->key,
                    'title' => $t->title,
                    'assignee' => $t->assignees->first()?->name,
                ]),
            'blocked' => $blockers,
        ];

        // 5. All available sprints for switching
        $allSprints = Sprint::where('project_id', $project->id)
            ->orderBy('sequence')
            ->select(['id', 'name', 'status', 'start_date', 'end_date'])
            ->get();

        return Inertia::render('projects/scrum-master', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
                'type' => $project->type,
            ],
            'activeSprint' => $activeSprint ? [
                'id' => $activeSprint->id,
                'name' => $activeSprint->name,
                'goal' => $activeSprint->goal,
                'status' => $activeSprint->status,
                'start_date' => $activeSprint->start_date ? Carbon::parse($activeSprint->start_date)->isoFormat('D MMM Y') : null,
                'end_date' => $activeSprint->end_date ? Carbon::parse($activeSprint->end_date)->isoFormat('D MMM Y') : null,
            ] : null,
            'sprintHealth' => $sprintHealth,
            'blockers' => $blockers,
            'standupTasks' => $standupTasks,
            'allSprints' => $allSprints,
        ]);
    }

    /**
     * Record a new blocker on a task.
     */
    public function addBlocker(Request $request, Project $project, Task $task): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project);
        $user = $request->user();

        if ($task->project_id !== $project->id) {
            abort(404, 'Tugas tidak ditemukan pada proyek ini.');
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
            'severity' => ['required', 'string', 'in:low,medium,high,critical'],
        ]);

        $blocker = TaskBlocker::create([
            'task_id' => $task->id,
            'project_id' => $project->id,
            'reported_by' => $user->id,
            'reason' => $validated['reason'],
            'severity' => $validated['severity'],
            'is_resolved' => false,
        ]);

        TaskActivity::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'action' => 'blocker_added',
            'changes' => [
                'blocker_id' => $blocker->id,
                'reason' => $blocker->reason,
                'severity' => $blocker->severity,
            ],
            'created_at' => now(),
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Hambatan tugas berhasil dicatat.',
                'blocker' => $blocker,
            ], 201);
        }

        return back()->with('success', 'Hambatan tugas berhasil dicatat.');
    }

    /**
     * Resolve an existing task blocker.
     */
    public function resolveBlocker(Request $request, Project $project, Task $task, TaskBlocker $blocker): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project);
        $user = $request->user();

        if ($blocker->task_id !== $task->id || $task->project_id !== $project->id) {
            abort(404, 'Data blocker tidak sesuai dengan tugas.');
        }

        $validated = $request->validate([
            'resolution_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $blocker->update([
            'is_resolved' => true,
            'resolved_by' => $user->id,
            'resolved_at' => now(),
            'resolution_note' => $validated['resolution_note'] ?? null,
        ]);

        TaskActivity::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'action' => 'blocker_resolved',
            'changes' => [
                'blocker_id' => $blocker->id,
                'resolved_by' => $user->name,
                'resolution_note' => $blocker->resolution_note,
            ],
            'created_at' => now(),
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Hambatan telah berhasil diselesaikan.',
            ]);
        }

        return back()->with('success', 'Hambatan telah berhasil diselesaikan.');
    }

    protected function authorizeProjectAccess(Request $request, Project $project): void
    {
        $user = $request->user();
        $isMember = $user->organizations()
            ->where('organizations.id', $project->organization_id)
            ->wherePivot('status', 'active')
            ->exists();

        if (! $isMember) {
            abort(403, 'Anda tidak memiliki akses ke proyek ini.');
        }
    }
}
