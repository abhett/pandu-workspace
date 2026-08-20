<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\Sprint;
use App\Models\SprintImpediment;
use App\Services\Agile\SprintHealthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SprintHealthController extends Controller
{
    public function __construct(
        protected SprintHealthService $healthService
    ) {}

    /**
     * Display Sprint Health Radar, Blockers Heatmap & Impediment Escalator.
     */
    public function index(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        $sprintId = $request->query('sprint');
        $data = $this->healthService->getSprintHealthReport($project, $sprintId);

        return Inertia::render('projects/sprints/health', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
            ],
            'current_sprint' => $data['current_sprint'],
            'all_sprints' => $data['all_sprints'],
            'health_score' => $data['health_score'],
            'health_category' => $data['health_category'],
            'pillars' => $data['pillars'],
            'scope_metrics' => $data['scope_metrics'],
            'heatmap' => $data['heatmap'],
            'impediments' => $data['impediments'],
            'project_tasks' => $data['project_tasks'] ?? [],
            'project_members' => $data['project_members'] ?? [],
        ]);
    }

    /**
     * Display Sprint Health Radar for a specific sprint.
     */
    public function show(Request $request, Project $project, Sprint $sprint): Response
    {
        $this->authorizeProjectAccess($request, $project);

        if ($sprint->project_id !== $project->id) {
            abort(404, 'Sprint tidak ditemukan dalam proyek ini.');
        }

        $data = $this->healthService->getSprintHealthReport($project, $sprint->id);

        return Inertia::render('projects/sprints/health', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
            ],
            'current_sprint' => $data['current_sprint'],
            'all_sprints' => $data['all_sprints'],
            'health_score' => $data['health_score'],
            'health_category' => $data['health_category'],
            'pillars' => $data['pillars'],
            'scope_metrics' => $data['scope_metrics'],
            'heatmap' => $data['heatmap'],
            'impediments' => $data['impediments'],
            'project_tasks' => $data['project_tasks'] ?? [],
            'project_members' => $data['project_members'] ?? [],
        ]);
    }

    /**
     * Create a new impediment / blocker.
     */
    public function storeImpediment(Request $request, Project $project, Sprint $sprint): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'create_impediment');

        if ($sprint->project_id !== $project->id) {
            abort(404, 'Sprint tidak ditemukan dalam proyek ini.');
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:2000'],
            'category' => ['required', 'string', 'in:technical,external_dependency,resource_bottleneck,unclear_requirements,third_party_outage'],
            'severity' => ['required', 'string', 'in:critical,high,medium,low'],
            'task_id' => ['nullable', 'uuid', 'exists:tasks,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $impediment = $this->healthService->createImpediment($project, $sprint, $request->user(), $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Hambatan sprint berhasil dilaporkan.',
                'impediment' => $impediment,
            ], 201);
        }

        return back()->with('success', 'Hambatan sprint berhasil dilaporkan.');
    }

    /**
     * Escalate an impediment to higher level.
     */
    public function escalateImpediment(Request $request, Project $project, SprintImpediment $impediment): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'escalate_impediment');

        if ($impediment->project_id !== $project->id) {
            abort(404, 'Hambatan tidak ditemukan dalam proyek ini.');
        }

        $validated = $request->validate([
            'escalation_notes' => ['nullable', 'string', 'max:2000'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $updated = $this->healthService->escalateImpediment($impediment, $request->user(), $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Hambatan berhasil dieskalasi.',
                'impediment' => $updated,
            ]);
        }

        return back()->with('success', 'Hambatan berhasil dieskalasi.');
    }

    /**
     * Resolve an impediment.
     */
    public function resolveImpediment(Request $request, Project $project, SprintImpediment $impediment): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'resolve_impediment');

        if ($impediment->project_id !== $project->id) {
            abort(404, 'Hambatan tidak ditemukan dalam proyek ini.');
        }

        $validated = $request->validate([
            'resolution_summary' => ['nullable', 'string', 'max:2000'],
        ]);

        $updated = $this->healthService->resolveImpediment($impediment, $request->user(), $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Hambatan telah ditandai terselesaikan.',
                'impediment' => $updated,
            ]);
        }

        return back()->with('success', 'Hambatan telah ditandai terselesaikan.');
    }

    /**
     * Delete an impediment.
     */
    public function destroyImpediment(Request $request, Project $project, SprintImpediment $impediment): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'delete_impediment');

        if ($impediment->project_id !== $project->id) {
            abort(404, 'Hambatan tidak ditemukan dalam proyek ini.');
        }

        $this->healthService->deleteImpediment($impediment);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Hambatan berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Hambatan berhasil dihapus.');
    }

    protected function authorizeProjectAccess(Request $request, Project $project, string $action = 'view'): void
    {
        $user = $request->user();
        $org = Organization::where('id', (string) $project->organization_id)->firstOrFail();
        $role = $user->roleInOrganization($org);

        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi proyek ini.');
        }

        if (in_array($action, ['create_impediment', 'escalate_impediment', 'resolve_impediment', 'delete_impediment']) && in_array($role, ['guest'])) {
            abort(403, 'Tamu (Guest) tidak memiliki izin untuk mengelola hambatan sprint.');
        }
    }
}
