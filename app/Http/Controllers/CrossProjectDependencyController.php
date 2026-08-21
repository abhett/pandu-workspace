<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\TaskDependency;
use App\Services\Dependency\CrossProjectDependencyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class CrossProjectDependencyController extends Controller
{
    public function __construct(
        protected CrossProjectDependencyService $dependencyService
    ) {}

    protected function authorizeProjectAccess(Request $request, Project $project, string $action = 'view'): void
    {
        $user = $request->user();
        $org = Organization::where('id', (string) $project->organization_id)->firstOrFail();
        $role = $user->roleInOrganization($org);

        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi proyek ini.');
        }

        if (in_array($action, ['manage_dependencies']) && in_array($role, ['guest'])) {
            abort(403, 'Tamu (Guest) tidak memiliki izin mengelola relasi dependensi.');
        }
    }

    /**
     * Display Cross-Project Dependency Blocker Visualizer & Critical Path Impact Matrix.
     */
    public function index(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project, 'view');

        $data = $this->dependencyService->getCrossProjectMatrixData($project);

        return Inertia::render('projects/dependencies/matrix', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
            ],
            'metrics' => $data['metrics'],
            'inbound_dependencies' => $data['inbound_dependencies'],
            'outbound_dependencies' => $data['outbound_dependencies'],
            'internal_dependencies' => $data['internal_dependencies'],
            'cycles' => $data['cycles'],
            'other_projects' => $data['other_projects'],
            'local_tasks' => $data['local_tasks'],
        ]);
    }

    /**
     * Simulate cascade delay impact.
     */
    public function simulate(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project, 'view');

        $validated = $request->validate([
            'task_id' => ['required', 'string', 'exists:tasks,id'],
            'delay_days' => ['required', 'integer', 'min:1', 'max:90'],
        ]);

        try {
            $simulation = $this->dependencyService->simulateDelayImpact(
                $project,
                $validated['task_id'],
                (int) $validated['delay_days']
            );

            return response()->json([
                'success' => true,
                'simulation' => $simulation,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Create cross-project dependency.
     */
    public function store(Request $request, Project $project): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_dependencies');

        $validated = $request->validate([
            'predecessor_id' => ['required', 'string', 'exists:tasks,id'],
            'successor_id' => ['required', 'string', 'exists:tasks,id'],
            'type' => ['required', 'string', 'in:finish_to_start,start_to_start,finish_to_finish,start_to_finish'],
            'lag_days' => ['nullable', 'integer', 'min:0', 'max:90'],
        ]);

        try {
            $dep = $this->dependencyService->createCrossProjectDependency($project, $validated);

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Relasi dependensi berhasil dibuat.',
                    'dependency' => $dep,
                ], 201);
            }

            return back()->with('success', 'Relasi dependensi berhasil dibuat.');
        } catch (InvalidArgumentException $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }

            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Delete dependency link.
     */
    public function destroy(Request $request, Project $project, TaskDependency $dependency): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_dependencies');

        $this->dependencyService->deleteDependency($project, $dependency);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Relasi dependensi berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Relasi dependensi berhasil dihapus.');
    }
}
