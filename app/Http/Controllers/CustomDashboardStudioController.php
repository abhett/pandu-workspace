<?php

namespace App\Http\Controllers;

use App\Models\CustomDashboard;
use App\Models\Organization;
use App\Services\Analytics\CustomDashboardStudioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomDashboardStudioController extends Controller
{
    public function __construct(
        protected CustomDashboardStudioService $studioService
    ) {}

    protected function authorizeStudioAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_dashboards' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk mengelola custom dashboard.');
        }

        return $organization;
    }

    /**
     * Display Dynamic Enterprise Custom Dashboard Studio.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeStudioAccess($request, 'view');
        $activeDashboardId = $request->query('dashboard_id');
        $projectId = $request->query('project_id');

        $data = $this->studioService->getStudioData($organization, $request->user(), $activeDashboardId, $projectId);

        return Inertia::render('organization/analytics/custom-dashboards', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'dashboards' => $data['dashboards'],
            'activeDashboard' => $data['active_dashboard'],
            'templates' => $data['templates'],
            'widgetCatalog' => $data['widget_catalog'],
            'projects' => $data['projects'],
            'selectedProjectId' => $projectId,
            'metrics' => $data['metrics'],
        ]);
    }

    /**
     * Create a new custom dashboard.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeStudioAccess($request, 'manage_dashboards');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'category' => ['required', 'string', 'in:executive,engineering,financial,security,product'],
            'icon' => ['nullable', 'string', 'max:50'],
            'template_id' => ['nullable', 'string'],
            'is_shared' => ['nullable', 'boolean'],
            'layout' => ['nullable', 'array'],
        ]);

        $dashboard = $this->studioService->createDashboard($organization, $request->user(), $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Custom Dashboard berhasil dibuat.',
                'dashboard' => $dashboard,
            ], 201);
        }

        return redirect()->route('organization.analytics.custom-dashboards.index', ['dashboard_id' => $dashboard->id])
            ->with('success', 'Custom Dashboard berhasil dibuat.');
    }

    /**
     * Update dashboard layout and settings.
     */
    public function update(Request $request, CustomDashboard $dashboard): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeStudioAccess($request, 'manage_dashboards');

        if ($dashboard->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'category' => ['sometimes', 'required', 'string', 'in:executive,engineering,financial,security,product'],
            'icon' => ['nullable', 'string', 'max:50'],
            'is_starred' => ['nullable', 'boolean'],
            'is_shared' => ['nullable', 'boolean'],
            'layout' => ['sometimes', 'required', 'array'],
            'refresh_interval_seconds' => ['nullable', 'integer', 'min:0', 'max:300'],
        ]);

        $updated = $this->studioService->updateDashboard($dashboard, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Tata letak dashboard berhasil disimpan.',
                'dashboard' => $updated,
            ]);
        }

        return back()->with('success', 'Tata letak dashboard berhasil disimpan.');
    }

    /**
     * Duplicate a dashboard.
     */
    public function duplicate(Request $request, CustomDashboard $dashboard): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeStudioAccess($request, 'manage_dashboards');

        if ($dashboard->organization_id !== $organization->id) {
            abort(404);
        }

        $cloned = $this->studioService->duplicateDashboard($dashboard, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Dashboard berhasil disalin.',
                'dashboard' => $cloned,
            ], 201);
        }

        return redirect()->route('organization.analytics.custom-dashboards.index', ['dashboard_id' => $cloned->id])
            ->with('success', 'Dashboard berhasil disalin.');
    }

    /**
     * Toggle starred favorite status.
     */
    public function toggleStar(Request $request, CustomDashboard $dashboard): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeStudioAccess($request, 'view');

        if ($dashboard->organization_id !== $organization->id) {
            abort(404);
        }

        $updated = $this->studioService->toggleStar($dashboard);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'is_starred' => $updated->is_starred,
            ]);
        }

        return back();
    }

    /**
     * Delete a custom dashboard.
     */
    public function destroy(Request $request, CustomDashboard $dashboard): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeStudioAccess($request, 'manage_dashboards');

        if ($dashboard->organization_id !== $organization->id) {
            abort(404);
        }

        $this->studioService->deleteDashboard($dashboard);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Dashboard berhasil dihapus.',
            ]);
        }

        return redirect()->route('organization.analytics.custom-dashboards.index')
            ->with('success', 'Dashboard berhasil dihapus.');
    }
}
