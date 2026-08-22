<?php

namespace App\Http\Controllers;

use App\Models\DeploymentPipeline;
use App\Models\Organization;
use App\Services\Devops\DeploymentPipelineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DeploymentPipelineController extends Controller
{
    public function __construct(
        protected DeploymentPipelineService $pipelineService
    ) {}

    protected function authorizeAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin mengelola deployment pipeline.');
        }

        return $organization;
    }

    /**
     * Display the Deployment Pipeline Tracker Studio.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeAccess($request, 'view');
        $data = $this->pipelineService->getDashboard($organization, $request->user());

        return Inertia::render('organization/devops/deployments', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'pipelines' => $data['pipelines'],
        ]);
    }

    /**
     * Create a new deployment pipeline.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'version_tag' => ['required', 'string', 'max:50'],
            'commit_sha' => ['nullable', 'string', 'max:40'],
            'repository_url' => ['nullable', 'string', 'max:300', 'url'],
            'auto_rollback_enabled' => ['boolean'],
            'rollback_threshold_pct' => ['numeric', 'min:0.1', 'max:10'],
        ]);

        $pipeline = $this->pipelineService->createPipeline($organization, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Deployment pipeline berhasil didaftarkan.',
                'pipeline' => $pipeline,
            ], 201);
        }

        return back()->with('success', 'Deployment pipeline berhasil didaftarkan.');
    }

    /**
     * Promote deployment to the next environment.
     */
    public function promote(Request $request, DeploymentPipeline $pipeline): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        if ($pipeline->organization_id !== $organization->id) {
            abort(404);
        }

        $promoted = $this->pipelineService->promotePipeline($pipeline, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Deployment dipromosikan ke {$promoted->current_environment}.",
                'pipeline' => $promoted,
            ]);
        }

        return back()->with('success', "Deployment dipromosikan ke {$promoted->current_environment}.");
    }

    /**
     * Rollback deployment.
     */
    public function rollback(Request $request, DeploymentPipeline $pipeline): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        if ($pipeline->organization_id !== $organization->id) {
            abort(404);
        }

        $rolled = $this->pipelineService->rollbackPipeline($pipeline, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Deployment berhasil di-rollback.',
                'pipeline' => $rolled,
            ]);
        }

        return back()->with('success', 'Deployment berhasil di-rollback.');
    }

    /**
     * Delete a deployment pipeline.
     */
    public function destroy(Request $request, DeploymentPipeline $pipeline): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        if ($pipeline->organization_id !== $organization->id) {
            abort(404);
        }

        $this->pipelineService->deletePipeline($pipeline);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Deployment pipeline berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Deployment pipeline berhasil dihapus.');
    }
}
