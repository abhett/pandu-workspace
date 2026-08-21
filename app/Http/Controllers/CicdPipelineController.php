<?php

namespace App\Http\Controllers;

use App\Models\CicdPipelineConfig;
use App\Models\CicdPipelineRun;
use App\Models\Organization;
use App\Models\Project;
use App\Services\DevOps\PipelineOrchestratorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CicdPipelineController extends Controller
{
    public function __construct(
        protected PipelineOrchestratorService $pipelineService
    ) {}

    protected function authorizeDevOpsAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_devops' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk mengoperasikan pipeline CI/CD.');
        }

        return $organization;
    }

    /**
     * Display CI/CD DevOps Pipeline and Deployment Gate Dashboard.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeDevOpsAccess($request, 'view');
        $projectId = $request->query('project_id');

        $data = $this->pipelineService->getPipelineDashboard($organization, $projectId);

        return Inertia::render('organization/devops/pipelines', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'configs' => $data['configs'],
            'runs' => $data['runs'],
            'pendingGates' => $data['pending_gates'],
            'projects' => $data['projects'],
            'selectedProjectId' => $projectId,
        ]);
    }

    /**
     * Store or update a CI/CD pipeline configuration.
     */
    public function storeConfig(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeDevOpsAccess($request, 'manage_devops');

        $validated = $request->validate([
            'project_id' => ['required', 'uuid', 'exists:projects,id'],
            'name' => ['required', 'string', 'max:100'],
            'repository_url' => ['nullable', 'url', 'max:255'],
            'provider' => ['required', 'string', 'in:github_actions,gitlab_ci,jenkins,custom_webhook'],
            'default_branch' => ['required', 'string', 'max:50'],
            'require_prod_approval' => ['boolean'],
            'is_active' => ['boolean'],
        ]);

        $project = Project::where('id', $validated['project_id'])
            ->where('organization_id', $organization->id)
            ->firstOrFail();

        $config = $this->pipelineService->createOrUpdatePipelineConfig($organization, $project, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Konfigurasi pipeline CI/CD berhasil disimpan.',
                'config' => $config,
            ], 201);
        }

        return back()->with('success', 'Konfigurasi pipeline CI/CD berhasil disimpan.');
    }

    /**
     * Trigger manual pipeline execution.
     */
    public function trigger(Request $request, CicdPipelineConfig $config): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeDevOpsAccess($request, 'manage_devops');

        if ($config->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'environment' => ['required', 'string', 'in:development,staging,production'],
            'branch' => ['nullable', 'string', 'max:100'],
        ]);

        $run = $this->pipelineService->triggerPipelineRun(
            $config,
            $request->user(),
            $validated['environment'],
            $validated['branch'] ?? null
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Pipeline Run #{$run->run_number} berhasil dipicu.",
                'run' => $run,
            ], 201);
        }

        return back()->with('success', "Pipeline Run #{$run->run_number} berhasil dipicu.");
    }

    /**
     * Approve production deployment gate.
     */
    public function approveGate(Request $request, CicdPipelineRun $run): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeDevOpsAccess($request, 'manage_devops');

        if ($run->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $this->pipelineService->approveProductionGate($run, $request->user(), $validated['notes'] ?? null);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Gerbang rilis produksi Run #{$run->run_number} berhasil disetujui.",
            ]);
        }

        return back()->with('success', "Gerbang rilis produksi Run #{$run->run_number} berhasil disetujui.");
    }

    /**
     * Reject production deployment gate.
     */
    public function rejectGate(Request $request, CicdPipelineRun $run): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeDevOpsAccess($request, 'manage_devops');

        if ($run->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $this->pipelineService->rejectProductionGate($run, $request->user(), $validated['reason']);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Gerbang rilis produksi Run #{$run->run_number} telah ditolak.",
            ]);
        }

        return back()->with('success', "Gerbang rilis produksi Run #{$run->run_number} telah ditolak.");
    }

    /**
     * Trigger 1-Click Rollback to last stable build.
     */
    public function rollback(Request $request, CicdPipelineRun $run): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeDevOpsAccess($request, 'manage_devops');

        if ($run->organization_id !== $organization->id) {
            abort(404);
        }

        $rollbackRun = $this->pipelineService->triggerRollback($run, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Rollback deployment Run #{$rollbackRun->run_number} berhasil dipicu.",
                'run' => $rollbackRun,
            ], 201);
        }

        return back()->with('success', "Rollback deployment Run #{$rollbackRun->run_number} berhasil dipicu.");
    }
}
