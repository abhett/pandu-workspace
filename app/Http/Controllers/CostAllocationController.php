<?php

namespace App\Http\Controllers;

use App\Models\CostCenter;
use App\Models\Organization;
use App\Models\Project;
use App\Services\Financial\CostAllocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CostAllocationController extends Controller
{
    public function __construct(
        protected CostAllocationService $costAllocationService
    ) {}

    protected function authorizeOrgAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_financials' && in_array($role, ['member', 'guest'])) {
            abort(403, 'Role Anda tidak memiliki izin untuk mengelola pusat biaya dan alokasi keuangan.');
        }

        return $organization;
    }

    /**
     * Display the Enterprise Cost Allocation & Profitability Analytics Hub.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeOrgAccess($request, 'view');
        $timeframe = $request->query('timeframe');

        $data = $this->costAllocationService->getCostAllocationOverview($organization, $timeframe);

        return Inertia::render('organization/financials/cost-allocation', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'projects' => $data['projects'],
            'cost_centers' => $data['cost_centers'],
            'category_breakdown' => $data['category_breakdown'],
            'members' => $data['members'],
            'raw_projects' => $data['raw_projects'],
        ]);
    }

    /**
     * Store a new cost center.
     */
    public function storeCostCenter(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_financials');

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:255'],
            'department' => ['required', 'string', 'max:100'],
            'allocated_budget' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'max:10'],
            'manager_id' => ['nullable', 'integer', 'exists:users,id'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $costCenter = $this->costAllocationService->createCostCenter($organization, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Pusat Biaya (Cost Center) berhasil dibuat.',
                'cost_center' => $costCenter,
            ], 201);
        }

        return back()->with('success', 'Pusat Biaya (Cost Center) berhasil dibuat.');
    }

    /**
     * Update an existing cost center.
     */
    public function updateCostCenter(Request $request, CostCenter $costCenter): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_financials');

        if ($costCenter->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:255'],
            'department' => ['required', 'string', 'max:100'],
            'allocated_budget' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'max:10'],
            'manager_id' => ['nullable', 'integer', 'exists:users,id'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $updated = $this->costAllocationService->updateCostCenter($costCenter, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Pusat Biaya berhasil diperbarui.',
                'cost_center' => $updated,
            ]);
        }

        return back()->with('success', 'Pusat Biaya berhasil diperbarui.');
    }

    /**
     * Delete a cost center.
     */
    public function destroyCostCenter(Request $request, CostCenter $costCenter): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_financials');

        if ($costCenter->organization_id !== $organization->id) {
            abort(404);
        }

        $this->costAllocationService->deleteCostCenter($costCenter);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Pusat Biaya berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Pusat Biaya berhasil dihapus.');
    }

    /**
     * Allocate a project to a cost center.
     */
    public function allocateProject(Request $request, CostCenter $costCenter): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_financials');

        if ($costCenter->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'project_id' => ['required', 'string', 'exists:projects,id'],
            'allocation_percentage' => ['required', 'numeric', 'min:1', 'max:100'],
        ]);

        $project = Project::where('organization_id', $organization->id)->where('id', $validated['project_id'])->firstOrFail();
        $allocation = $this->costAllocationService->allocateProject($costCenter, $project, (float) $validated['allocation_percentage']);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Proyek berhasil dialokasikan ke Pusat Biaya.',
                'allocation' => $allocation,
            ], 201);
        }

        return back()->with('success', 'Proyek berhasil dialokasikan ke Pusat Biaya.');
    }

    /**
     * Remove project allocation from cost center.
     */
    public function destroyAllocation(Request $request, string $allocationId): JsonResponse|RedirectResponse
    {
        $this->authorizeOrgAccess($request, 'manage_financials');

        $this->costAllocationService->removeProjectAllocation($allocationId);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Alokasi proyek berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Alokasi proyek berhasil dihapus.');
    }
}
