<?php

namespace App\Http\Controllers;

use App\Models\ApiRateLimitPolicy;
use App\Models\Organization;
use App\Services\Developer\ApiRateLimiterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApiRateLimiterController extends Controller
{
    public function __construct(
        protected ApiRateLimiterService $limiterService
    ) {}

    protected function authorizeLimiterAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_policies' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk mengelola kebijakan rate limit.');
        }

        return $organization;
    }

    /**
     * Display API Rate Limiter & Traffic Throttling Console.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeLimiterAccess($request, 'view');
        $tier = $request->query('tier');

        $data = $this->limiterService->getRateLimiterDashboard($organization, $tier);

        return Inertia::render('organization/developer/rate-limits', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'trafficTrend' => $data['trafficTrend'],
            'policies' => $data['policies'],
            'topEndpoints' => $data['topEndpoints'],
            'selectedTier' => $tier,
        ]);
    }

    /**
     * Store a new rate limit policy.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeLimiterAccess($request, 'manage_policies');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'tier' => ['required', 'string', 'in:free,pro,enterprise,custom'],
            'requests_per_minute' => ['required', 'integer', 'min:1', 'max:10000'],
            'burst_allowance' => ['nullable', 'integer', 'min:0', 'max:5000'],
            'daily_quota' => ['required', 'integer', 'min:100', 'max:100000000'],
            'is_throttling_enabled' => ['nullable', 'boolean'],
        ]);

        $policy = $this->limiterService->createPolicy($organization, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Kebijakan rate limit berhasil dibuat.',
                'policy' => $policy,
            ], 201);
        }

        return back()->with('success', 'Kebijakan rate limit berhasil dibuat.');
    }

    /**
     * Update an existing rate limit policy.
     */
    public function update(Request $request, ApiRateLimitPolicy $policy): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeLimiterAccess($request, 'manage_policies');

        if ($policy->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'tier' => ['required', 'string', 'in:free,pro,enterprise,custom'],
            'requests_per_minute' => ['required', 'integer', 'min:1', 'max:10000'],
            'burst_allowance' => ['nullable', 'integer', 'min:0', 'max:5000'],
            'daily_quota' => ['required', 'integer', 'min:100', 'max:100000000'],
            'is_throttling_enabled' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $updated = $this->limiterService->updatePolicy($policy, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Kebijakan rate limit berhasil diperbarui.',
                'policy' => $updated,
            ]);
        }

        return back()->with('success', 'Kebijakan rate limit berhasil diperbarui.');
    }

    /**
     * Toggle throttling enforcement.
     */
    public function toggleThrottling(Request $request, ApiRateLimitPolicy $policy): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeLimiterAccess($request, 'manage_policies');

        if ($policy->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'is_throttling_enabled' => ['required', 'boolean'],
        ]);

        $updated = $this->limiterService->toggleThrottling($policy, (bool) $validated['is_throttling_enabled'], $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Status throttling kebijakan berhasil diubah.',
                'policy' => $updated,
            ]);
        }

        return back()->with('success', 'Status throttling kebijakan berhasil diubah.');
    }

    /**
     * Simulate a traffic load spike.
     */
    public function simulate(Request $request): JsonResponse
    {
        $organization = $this->authorizeLimiterAccess($request, 'view');

        $validated = $request->validate([
            'simulated_requests' => ['required', 'integer', 'min:10', 'max:50000'],
        ]);

        $result = $this->limiterService->simulateTrafficSpike($organization, (int) $validated['simulated_requests'], $request->user());

        return response()->json([
            'success' => true,
            'simulation' => $result,
        ]);
    }

    /**
     * Delete a rate limit policy.
     */
    public function destroy(Request $request, ApiRateLimitPolicy $policy): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeLimiterAccess($request, 'manage_policies');

        if ($policy->organization_id !== $organization->id) {
            abort(404);
        }

        $this->limiterService->deletePolicy($policy);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Kebijakan rate limit berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Kebijakan rate limit berhasil dihapus.');
    }
}
