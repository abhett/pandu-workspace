<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskDependency;
use App\Services\Timeline\TimelineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class TimelineController extends Controller
{
    public function __construct(
        protected TimelineService $timelineService
    ) {}

    /**
     * Display the interactive Timeline & Gantt Chart Roadmap.
     */
    public function index(Request $request, ?Project $project = null): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if (! $project) {
            $project = Project::where('organization_id', $organization->id)->first();
        }

        if (! $project) {
            return Inertia::render('projects/timeline', [
                'organization' => [
                    'id' => $organization->id,
                    'name' => $organization->name,
                ],
                'project' => null,
                'availableProjects' => [],
                'timeline' => null,
            ]);
        }

        $this->authorizeProjectAccess($request, $project);

        $zoomLevel = $request->query('zoom', 'month');
        $timelineData = $this->timelineService->getTimelineData($project, $zoomLevel);

        $availableProjects = Project::where('organization_id', $organization->id)
            ->select(['id', 'name', 'key', 'type'])
            ->get();

        return Inertia::render('projects/timeline', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
                'type' => $project->type,
            ],
            'availableProjects' => $availableProjects,
            'timeline' => $timelineData,
        ]);
    }

    /**
     * Create a task dependency link (Predecessor -> Successor).
     */
    public function storeDependency(Request $request, Project $project): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_timeline');

        $validated = $request->validate([
            'predecessor_id' => ['required', 'string', 'exists:tasks,id'],
            'successor_id' => ['required', 'string', 'exists:tasks,id'],
            'type' => ['nullable', 'string', 'in:finish_to_start,start_to_start,finish_to_finish,start_to_finish'],
            'lag_days' => ['nullable', 'integer', 'min:0', 'max:365'],
        ]);

        $predecessor = Task::findOrFail($validated['predecessor_id']);
        $successor = Task::findOrFail($validated['successor_id']);

        try {
            $dependency = $this->timelineService->addDependency(
                $project,
                $predecessor,
                $successor,
                $validated['type'] ?? 'finish_to_start',
                $validated['lag_days'] ?? 0
            );

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Relasi dependensi berhasil ditambahkan.',
                    'dependency' => $dependency,
                ], 201);
            }

            return back()->with('success', 'Relasi dependensi berhasil ditambahkan.');
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
     * Delete a task dependency.
     */
    public function destroyDependency(Request $request, Project $project, TaskDependency $dependency): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_timeline');

        if ($dependency->project_id !== $project->id) {
            abort(404, 'Dependensi tidak ditemukan dalam proyek ini.');
        }

        $dependency->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Relasi dependensi berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Relasi dependensi berhasil dihapus.');
    }

    /**
     * Update task schedule dates from Gantt chart.
     */
    public function updateSchedule(Request $request, Project $project, Task $task): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_timeline');

        if ($task->project_id !== $project->id) {
            abort(404, 'Tugas tidak ditemukan dalam proyek ini.');
        }

        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'is_milestone' => ['nullable', 'boolean'],
        ]);

        $task->update([
            'start_date' => $validated['start_date'] ?? $task->start_date,
            'due_date' => $validated['due_date'] ?? $task->due_date,
            'is_milestone' => $validated['is_milestone'] ?? $task->is_milestone,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Jadwal tugas berhasil diperbarui.',
                'task' => $task->fresh(),
            ]);
        }

        return back()->with('success', 'Jadwal tugas berhasil diperbarui.');
    }

    /**
     * Auto-schedule entire project cascading downstream dependencies.
     */
    public function autoSchedule(Request $request, Project $project): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_timeline');

        $result = $this->timelineService->autoScheduleCascading($project);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Jadwal berhasil diselaraskan otomatis ({$result['updated_tasks']} tugas diperbarui).",
                'result' => $result,
            ]);
        }

        return back()->with('success', "Jadwal berhasil diselaraskan otomatis ({$result['updated_tasks']} tugas diperbarui).");
    }

    /**
     * Toggle milestone flag on a task.
     */
    public function toggleMilestone(Request $request, Project $project, Task $task): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_timeline');

        if ($task->project_id !== $project->id) {
            abort(404, 'Tugas tidak ditemukan dalam proyek ini.');
        }

        $updatedTask = $this->timelineService->toggleMilestone($task);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Status milestone berhasil diperbarui.',
                'task' => $updatedTask,
            ]);
        }

        return back()->with('success', 'Status milestone berhasil diperbarui.');
    }

    protected function authorizeProjectAccess(Request $request, Project $project, string $action = 'view'): void
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

        if ($action === 'manage_timeline' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin mengubah jadwal timeline proyek.');
        }
    }
}
