<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\Task;
use App\Services\Risk\ProjectRiskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectRiskController extends Controller
{
    public function __construct(
        protected ProjectRiskService $riskService
    ) {}

    /**
     * Authorize user access to project risk register.
     */
    protected function authorizeProjectAccess(Request $request, Project $project, string $action = 'view'): Organization
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

        if ($action === 'manage_risks' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin mengubah register risiko proyek.');
        }

        return $organization;
    }

    /**
     * Display Project Risk Register & 5x5 Heatmap Matrix.
     */
    public function index(Request $request, Project $project): Response
    {
        $organization = $this->authorizeProjectAccess($request, $project, 'view');

        $summary = $this->riskService->getProjectRiskSummary($project);

        $members = $project->members()
            ->select(['users.id', 'users.name', 'users.email'])
            ->get();

        $tasks = Task::where('project_id', $project->id)
            ->select(['id', 'key', 'title'])
            ->orderBy('sequence_number')
            ->get();

        return Inertia::render('projects/risks', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
                'slug' => $project->slug,
                'color' => $project->color,
                'icon' => $project->icon,
            ],
            'summary' => $summary,
            'members' => $members,
            'tasks' => $tasks,
        ]);
    }

    /**
     * Store a new project risk.
     */
    public function store(Request $request, Project $project): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_risks');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:1000'],
            'category' => ['required', 'string', 'in:technical,schedule,budget,resource,security,external,compliance,other'],
            'probability' => ['required', 'integer', 'min:1', 'max:5'],
            'impact' => ['required', 'integer', 'min:1', 'max:5'],
            'status' => ['required', 'string', 'in:open,mitigating,accepted,transferred,avoided,closed'],
            'mitigation_strategy' => ['nullable', 'string', 'max:1000'],
            'contingency_plan' => ['nullable', 'string', 'max:1000'],
            'owner_id' => ['nullable', 'integer', 'exists:users,id'],
            'task_id' => ['nullable', 'string', 'exists:tasks,id'],
            'identified_date' => ['required', 'date'],
            'target_resolution_date' => ['nullable', 'date'],
        ]);

        $risk = $this->riskService->createRisk($project, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Risiko baru berhasil didaftarkan.',
                'risk' => $risk,
            ], 201);
        }

        return back()->with('success', 'Risiko baru berhasil didaftarkan.');
    }

    /**
     * Update an existing project risk.
     */
    public function update(Request $request, Project $project, ProjectRisk $risk): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_risks');

        if ($risk->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:1000'],
            'category' => ['required', 'string', 'in:technical,schedule,budget,resource,security,external,compliance,other'],
            'probability' => ['required', 'integer', 'min:1', 'max:5'],
            'impact' => ['required', 'integer', 'min:1', 'max:5'],
            'status' => ['required', 'string', 'in:open,mitigating,accepted,transferred,avoided,closed'],
            'mitigation_strategy' => ['nullable', 'string', 'max:1000'],
            'contingency_plan' => ['nullable', 'string', 'max:1000'],
            'owner_id' => ['nullable', 'integer', 'exists:users,id'],
            'task_id' => ['nullable', 'string', 'exists:tasks,id'],
            'target_resolution_date' => ['nullable', 'date'],
        ]);

        $updatedRisk = $this->riskService->updateRisk($risk, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Risiko berhasil diperbarui.',
                'risk' => $updatedRisk,
            ]);
        }

        return back()->with('success', 'Risiko berhasil diperbarui.');
    }

    /**
     * Delete a risk.
     */
    public function destroy(Request $request, Project $project, ProjectRisk $risk): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_risks');

        if ($risk->project_id !== $project->id) {
            abort(404);
        }

        $this->riskService->deleteRisk($risk);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Risiko berhasil dihapus dari register.',
            ]);
        }

        return back()->with('success', 'Risiko berhasil dihapus dari register.');
    }

    /**
     * Log a mitigation action on a risk.
     */
    public function storeActionLog(Request $request, Project $project, ProjectRisk $risk): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_risks');

        if ($risk->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'action_taken' => ['required', 'string', 'max:1000'],
            'status_after' => ['required', 'string', 'in:open,mitigating,accepted,transferred,avoided,closed'],
            'residual_probability' => ['nullable', 'integer', 'min:1', 'max:5'],
            'residual_impact' => ['nullable', 'integer', 'min:1', 'max:5'],
        ]);

        $log = $this->riskService->logMitigationAction($risk, $request->user(), $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Aksi mitigasi berhasil dicatat.',
                'log' => $log,
            ], 201);
        }

        return back()->with('success', 'Aksi mitigasi berhasil dicatat.');
    }
}
