<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\TaskDependency;
use App\Models\WorkflowStatus;
use App\Services\Dependency\DependencyGraphService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class TaskDependencyController extends Controller
{
    public function __construct(
        protected DependencyGraphService $dependencyService
    ) {}

    /**
     * Authorize user access to project.
     */
    protected function authorizeProjectAccess(Request $request, Project $project, string $permission = 'tasks:view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($project->organization_id !== $organization->id) {
            abort(404);
        }

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke proyek ini.');
        }

        if ($permission !== 'tasks:view' && $role === 'guest') {
            abort(403, 'Role Tamu (Guest) hanya memiliki izin baca pada dependensi.');
        }

        return $organization;
    }

    /**
     * Display the Visual Task Dependency Graph & CPM Network Hub.
     */
    public function index(Request $request, Project $project): Response
    {
        $organization = $this->authorizeProjectAccess($request, $project, 'tasks:view');

        $filters = [
            'status_id' => $request->input('status_id', 'all'),
            'sprint_id' => $request->input('sprint_id', 'all'),
            'priority' => $request->input('priority', 'all'),
            'assignee_id' => $request->input('assignee_id', 'all'),
        ];

        $graphData = $this->dependencyService->getGraphData($project, $filters);

        $statuses = WorkflowStatus::where('project_id', $project->id)
            ->orderBy('position')
            ->get(['id', 'name', 'color', 'category', 'is_completed']);

        $sprints = Sprint::where('project_id', $project->id)
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'status']);

        $members = $project->members()
            ->select(['users.id', 'users.name', 'users.email'])
            ->get();

        $allTasksList = Task::where('project_id', $project->id)
            ->select(['id', 'key', 'title', 'type', 'status_id'])
            ->orderBy('sequence_number')
            ->get();

        return Inertia::render('projects/dependencies', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
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
            'graph' => $graphData,
            'filters' => $filters,
            'statuses' => $statuses,
            'sprints' => $sprints,
            'members' => $members,
            'all_tasks' => $allTasksList,
        ]);
    }

    /**
     * Create a new task dependency link.
     */
    public function store(Request $request, Project $project): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'tasks:edit');

        $validated = $request->validate([
            'predecessor_id' => ['required', 'string', 'exists:tasks,id'],
            'successor_id' => ['required', 'string', 'exists:tasks,id'],
            'type' => ['nullable', 'string', 'in:finish_to_start,start_to_start,finish_to_finish,start_to_finish,relates_to'],
            'lag_days' => ['nullable', 'integer', 'min:0', 'max:365'],
        ]);

        try {
            $dependency = $this->dependencyService->addDependency(
                $project,
                $validated['predecessor_id'],
                $validated['successor_id'],
                $validated['type'] ?? 'finish_to_start',
                $validated['lag_days'] ?? 0
            );

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Hubungan dependensi tugas berhasil dibuat.',
                    'dependency' => $dependency,
                ], 201);
            }

            return back()->with('success', 'Hubungan dependensi tugas berhasil dibuat.');
        } catch (InvalidArgumentException $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }

            return back()->withErrors(['dependency' => $e->getMessage()]);
        }
    }

    /**
     * Delete an existing task dependency link.
     */
    public function destroy(Request $request, Project $project, TaskDependency $dependency): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'tasks:edit');

        if ($dependency->project_id !== $project->id) {
            abort(404);
        }

        $this->dependencyService->removeDependency($project, $dependency->id);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Hubungan dependensi berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Hubungan dependensi berhasil dihapus.');
    }

    /**
     * Simulate cascading timeline delay for a given task.
     */
    public function simulateCascade(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project, 'tasks:view');

        $validated = $request->validate([
            'task_id' => ['required', 'string', 'exists:tasks,id'],
            'delay_days' => ['required', 'integer', 'min:1', 'max:90'],
        ]);

        $result = $this->dependencyService->simulateCascade(
            $project,
            $validated['task_id'],
            $validated['delay_days']
        );

        return response()->json($result);
    }
}
