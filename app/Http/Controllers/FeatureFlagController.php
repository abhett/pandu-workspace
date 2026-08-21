<?php

namespace App\Http\Controllers;

use App\Models\FeatureFlag;
use App\Models\Organization;
use App\Services\DevOps\FeatureFlagOrchestratorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FeatureFlagController extends Controller
{
    public function __construct(
        protected FeatureFlagOrchestratorService $flagService
    ) {}

    protected function authorizeFlagAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_flags' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk mengelola feature flags.');
        }

        return $organization;
    }

    /**
     * Display Feature Flag & Progressive Rollout Dashboard.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeFlagAccess($request, 'view');
        $projectId = $request->query('project_id');
        $strategy = $request->query('strategy');
        $status = $request->query('status');

        $data = $this->flagService->getFeatureFlagsDashboard($organization, $projectId, $strategy, $status);

        return Inertia::render('organization/devops/feature-flags', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'strategyStats' => $data['strategyStats'],
            'flags' => $data['flags'],
            'projects' => $data['projects'],
            'selectedStrategy' => $strategy,
            'selectedStatus' => $status,
            'selectedProjectId' => $projectId,
        ]);
    }

    /**
     * Store a new feature flag.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeFlagAccess($request, 'manage_flags');

        $validated = $request->validate([
            'project_id' => ['nullable', 'uuid', 'exists:projects,id'],
            'key' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z0-9_\-]+$/'],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:1000'],
            'strategy' => ['required', 'string', 'in:boolean,percentage_rollout,user_targeting,kill_switch'],
            'is_enabled' => ['nullable', 'boolean'],
            'rollout_percentage' => ['nullable', 'integer', 'min:0', 'max:100'],
            'target_rules' => ['nullable'],
        ]);

        $flag = $this->flagService->createFlag($organization, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Feature flag berhasil dibuat.',
                'flag' => $flag,
            ], 201);
        }

        return back()->with('success', 'Feature flag berhasil dibuat.');
    }

    /**
     * Update an existing feature flag.
     */
    public function update(Request $request, FeatureFlag $featureFlag): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeFlagAccess($request, 'manage_flags');

        if ($featureFlag->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'project_id' => ['nullable'],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:1000'],
            'strategy' => ['required', 'string', 'in:boolean,percentage_rollout,user_targeting,kill_switch'],
            'is_enabled' => ['required', 'boolean'],
            'rollout_percentage' => ['nullable', 'integer', 'min:0', 'max:100'],
            'target_rules' => ['nullable'],
            'status' => ['required', 'string', 'in:active,paused,archived,killed'],
        ]);

        $updated = $this->flagService->updateFlag($featureFlag, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Feature flag berhasil diperbarui.',
                'flag' => $updated,
            ]);
        }

        return back()->with('success', 'Feature flag berhasil diperbarui.');
    }

    /**
     * Toggle flag enabled state.
     */
    public function toggle(Request $request, FeatureFlag $featureFlag): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeFlagAccess($request, 'manage_flags');

        if ($featureFlag->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'is_enabled' => ['required', 'boolean'],
        ]);

        $updated = $this->flagService->toggleFlag($featureFlag, (bool) $validated['is_enabled'], $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Status aktif feature flag berhasil diubah.',
                'flag' => $updated,
            ]);
        }

        return back()->with('success', 'Status aktif feature flag berhasil diubah.');
    }

    /**
     * Update canary rollout percentage.
     */
    public function rollout(Request $request, FeatureFlag $featureFlag): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeFlagAccess($request, 'manage_flags');

        if ($featureFlag->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'rollout_percentage' => ['required', 'integer', 'min:0', 'max:100'],
        ]);

        $updated = $this->flagService->updateRolloutPercentage($featureFlag, (int) $validated['rollout_percentage'], $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Persentase rollout berhasil diperbarui.',
                'flag' => $updated,
            ]);
        }

        return back()->with('success', 'Persentase rollout berhasil diperbarui.');
    }

    /**
     * Emergency Kill Switch.
     */
    public function kill(Request $request, FeatureFlag $featureFlag): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeFlagAccess($request, 'manage_flags');

        if ($featureFlag->organization_id !== $organization->id) {
            abort(404);
        }

        $updated = $this->flagService->triggerKillSwitch($featureFlag, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Tombol darurat Kill Switch berhasil diaktifkan.',
                'flag' => $updated,
            ]);
        }

        return back()->with('success', 'Tombol darurat Kill Switch berhasil diaktifkan.');
    }

    /**
     * Delete a feature flag.
     */
    public function destroy(Request $request, FeatureFlag $featureFlag): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeFlagAccess($request, 'manage_flags');

        if ($featureFlag->organization_id !== $organization->id) {
            abort(404);
        }

        $this->flagService->deleteFlag($featureFlag);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Feature flag berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Feature flag berhasil dihapus.');
    }
}
