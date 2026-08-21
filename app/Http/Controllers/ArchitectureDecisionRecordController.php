<?php

namespace App\Http\Controllers;

use App\Models\ArchitectureDecisionRecord;
use App\Models\Organization;
use App\Services\Architecture\AdrGovernanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ArchitectureDecisionRecordController extends Controller
{
    public function __construct(
        protected AdrGovernanceService $adrService
    ) {}

    protected function authorizeArchitectureAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_adr' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk mengelola rekaman arsitektur ADR.');
        }

        return $organization;
    }

    /**
     * Display Architecture Decision Record (ADR) Governance Studio.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeArchitectureAccess($request, 'view');
        $projectId = $request->query('project_id');
        $domain = $request->query('domain');
        $status = $request->query('status');

        $data = $this->adrService->getAdrDashboard($organization, $projectId, $domain, $status);

        return Inertia::render('organization/architecture/adr', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'domainStats' => $data['domainStats'],
            'adrs' => $data['adrs'],
            'projects' => $data['projects'],
            'members' => $data['members'],
            'selectedDomain' => $domain,
            'selectedStatus' => $status,
            'selectedProjectId' => $projectId,
        ]);
    }

    /**
     * Store a new Architecture Decision Record.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeArchitectureAccess($request, 'manage_adr');

        $validated = $request->validate([
            'project_id' => ['nullable', 'uuid', 'exists:projects,id'],
            'author_id' => ['nullable', 'integer', 'exists:users,id'],
            'domain' => ['required', 'string', 'in:data_architecture,api_design,infrastructure,security_compliance,frontend_architecture'],
            'title' => ['required', 'string', 'max:200'],
            'status' => ['required', 'string', 'in:proposed,accepted,superseded,deprecated,rejected'],
            'context_and_problem' => ['required', 'string', 'max:5000'],
            'decision_outcome' => ['required', 'string', 'max:5000'],
            'positive_consequences' => ['nullable'],
            'negative_consequences' => ['nullable'],
            'alternatives_considered' => ['nullable'],
            'superseded_by_id' => ['nullable', 'uuid', 'exists:architecture_decision_records,id'],
            'decided_at' => ['nullable', 'date'],
        ]);

        $adr = $this->adrService->createAdr($organization, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Rekaman Keputusan Arsitektur (ADR) berhasil dibuat.',
                'adr' => $adr,
            ], 201);
        }

        return back()->with('success', 'Rekaman Keputusan Arsitektur (ADR) berhasil dibuat.');
    }

    /**
     * Update an existing ADR.
     */
    public function update(Request $request, ArchitectureDecisionRecord $adr): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeArchitectureAccess($request, 'manage_adr');

        if ($adr->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'project_id' => ['nullable'],
            'domain' => ['required', 'string', 'in:data_architecture,api_design,infrastructure,security_compliance,frontend_architecture'],
            'title' => ['required', 'string', 'max:200'],
            'status' => ['required', 'string', 'in:proposed,accepted,superseded,deprecated,rejected'],
            'context_and_problem' => ['required', 'string', 'max:5000'],
            'decision_outcome' => ['required', 'string', 'max:5000'],
            'positive_consequences' => ['nullable'],
            'negative_consequences' => ['nullable'],
            'alternatives_considered' => ['nullable'],
            'superseded_by_id' => ['nullable'],
            'decided_at' => ['nullable', 'date'],
        ]);

        $updated = $this->adrService->updateAdr($adr, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Rekaman Keputusan Arsitektur (ADR) berhasil diperbarui.',
                'adr' => $updated,
            ]);
        }

        return back()->with('success', 'Rekaman Keputusan Arsitektur (ADR) berhasil diperbarui.');
    }

    /**
     * Delete an ADR.
     */
    public function destroy(Request $request, ArchitectureDecisionRecord $adr): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeArchitectureAccess($request, 'manage_adr');

        if ($adr->organization_id !== $organization->id) {
            abort(404);
        }

        $this->adrService->deleteAdr($adr);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Rekaman ADR berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Rekaman ADR berhasil dihapus.');
    }
}
