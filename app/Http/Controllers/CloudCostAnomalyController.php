<?php

namespace App\Http\Controllers;

use App\Models\CloudCostAnomaly;
use App\Models\CloudCostRecommendation;
use App\Models\Organization;
use App\Services\Cloud\CloudCostAnomalyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CloudCostAnomalyController extends Controller
{
    public function __construct(
        protected CloudCostAnomalyService $costService
    ) {}

    protected function authorizeCloudAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_costs' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk mengelola biaya dan optimasi cloud.');
        }

        return $organization;
    }

    /**
     * Display Enterprise Resource Utilization & Cloud Cost Anomaly Detector.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeCloudAccess($request, 'view');
        $provider = $request->query('provider');

        $data = $this->costService->getCostDashboard($organization, $provider);

        return Inertia::render('organization/cloud/costs', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'providerDistribution' => $data['provider_distribution'],
            'categoryDistribution' => $data['category_distribution'],
            'dailyTrend' => $data['daily_trend'],
            'anomalies' => $data['anomalies'],
            'recommendations' => $data['recommendations'],
            'selectedProvider' => $provider,
        ]);
    }

    /**
     * Resolve or triage a cloud cost anomaly.
     */
    public function resolveAnomaly(Request $request, CloudCostAnomaly $anomaly): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeCloudAccess($request, 'manage_costs');

        if ($anomaly->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:investigating,resolved,dismissed'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->costService->resolveAnomaly($anomaly, $request->user(), $validated['status'], $validated['notes'] ?? null);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Status anomali biaya cloud berhasil diperbarui.',
            ]);
        }

        return back()->with('success', 'Status anomali biaya cloud berhasil diperbarui.');
    }

    /**
     * Apply a right-sizing optimization recommendation.
     */
    public function applyRecommendation(Request $request, CloudCostRecommendation $recommendation): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeCloudAccess($request, 'manage_costs');

        if ($recommendation->organization_id !== $organization->id) {
            abort(404);
        }

        $this->costService->applyRecommendation($recommendation, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Rekomendasi optimasi biaya berhasil diterapkan.',
            ]);
        }

        return back()->with('success', 'Rekomendasi optimasi biaya berhasil diterapkan.');
    }

    /**
     * Dismiss a right-sizing recommendation.
     */
    public function dismissRecommendation(Request $request, CloudCostRecommendation $recommendation): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeCloudAccess($request, 'manage_costs');

        if ($recommendation->organization_id !== $organization->id) {
            abort(404);
        }

        $this->costService->dismissRecommendation($recommendation, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Rekomendasi optimasi biaya diabaikan.',
            ]);
        }

        return back()->with('success', 'Rekomendasi optimasi biaya diabaikan.');
    }
}
