<?php

namespace App\Http\Controllers;

use App\Models\KaizenInitiative;
use App\Models\Organization;
use App\Models\Project;
use App\Services\Agile\KaizenImprovementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KaizenImprovementController extends Controller
{
    public function __construct(
        protected KaizenImprovementService $kaizenService
    ) {}

    protected function authorizeAgileAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_kaizen' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk memodifikasi inisiatif Kaizen.');
        }

        return $organization;
    }

    /**
     * Display AI-Driven Sprint Retrospective Action Tracker & Kaizen Improvement Engine.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeAgileAccess($request, 'view');
        $projectId = $request->query('project_id');

        $data = $this->kaizenService->getKaizenDashboard($organization, $projectId);

        return Inertia::render('organization/agile/kaizen', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'pillarStats' => $data['pillar_stats'],
            'initiatives' => $data['initiatives'],
            'projects' => $data['projects'],
            'sprints' => $data['sprints'],
            'members' => $data['members'],
            'selectedProjectId' => $projectId,
        ]);
    }

    /**
     * Store a new Kaizen initiative.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAgileAccess($request, 'manage_kaizen');

        $validated = $request->validate([
            'project_id' => ['required', 'uuid', 'exists:projects,id'],
            'title' => ['required', 'string', 'max:200'],
            'pillar' => ['required', 'string', 'in:engineering_quality,process_agility,team_collaboration,developer_experience'],
            'problem_statement' => ['required', 'string', 'max:2000'],
            'action_plan' => ['required', 'string', 'max:2000'],
            'expected_impact' => ['nullable', 'string', 'max:1000'],
            'owner_id' => ['nullable', 'integer', 'exists:users,id'],
            'source_sprint_id' => ['nullable', 'uuid', 'exists:sprints,id'],
            'target_sprint_id' => ['nullable', 'uuid', 'exists:sprints,id'],
            'due_date' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'in:proposed,in_progress,implemented,verified_effective,abandoned'],
        ]);

        $project = Project::where('id', $validated['project_id'])
            ->where('organization_id', $organization->id)
            ->firstOrFail();

        $initiative = $this->kaizenService->createInitiative($organization, $project, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Inisiatif Kaizen berhasil dibuat.',
                'initiative' => $initiative,
            ], 201);
        }

        return back()->with('success', 'Inisiatif Kaizen berhasil dibuat.');
    }

    /**
     * Update an existing Kaizen initiative.
     */
    public function update(Request $request, KaizenInitiative $initiative): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAgileAccess($request, 'manage_kaizen');

        if ($initiative->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'pillar' => ['required', 'string', 'in:engineering_quality,process_agility,team_collaboration,developer_experience'],
            'problem_statement' => ['required', 'string', 'max:2000'],
            'action_plan' => ['required', 'string', 'max:2000'],
            'expected_impact' => ['nullable', 'string', 'max:1000'],
            'measured_outcome' => ['nullable', 'string', 'max:1000'],
            'owner_id' => ['nullable'],
            'target_sprint_id' => ['nullable'],
            'due_date' => ['nullable', 'date'],
            'status' => ['required', 'string', 'in:proposed,in_progress,implemented,verified_effective,abandoned'],
            'impact_score' => ['nullable', 'integer', 'min:0', 'max:100'],
        ]);

        $updated = $this->kaizenService->updateInitiative($initiative, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Inisiatif Kaizen berhasil diperbarui.',
                'initiative' => $updated,
            ]);
        }

        return back()->with('success', 'Inisiatif Kaizen berhasil diperbarui.');
    }

    /**
     * Verify Kaizen impact and measured outcome.
     */
    public function verify(Request $request, KaizenInitiative $initiative): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAgileAccess($request, 'manage_kaizen');

        if ($initiative->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'impact_score' => ['required', 'integer', 'min:1', 'max:100'],
            'measured_outcome' => ['required', 'string', 'max:2000'],
        ]);

        $verified = $this->kaizenService->verifyImpact(
            $initiative,
            $request->user(),
            $validated['impact_score'],
            $validated['measured_outcome']
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Dampak efektivitas Kaizen berhasil diverifikasi.',
                'initiative' => $verified,
            ]);
        }

        return back()->with('success', 'Dampak efektivitas Kaizen berhasil diverifikasi.');
    }

    /**
     * Delete a Kaizen initiative.
     */
    public function destroy(Request $request, KaizenInitiative $initiative): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAgileAccess($request, 'manage_kaizen');

        if ($initiative->organization_id !== $organization->id) {
            abort(404);
        }

        $this->kaizenService->deleteInitiative($initiative);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Inisiatif Kaizen berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Inisiatif Kaizen berhasil dihapus.');
    }
}
