<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SyntheticMonitor;
use App\Services\Sre\SyntheticMonitorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SyntheticMonitorController extends Controller
{
    public function __construct(
        protected SyntheticMonitorService $syntheticService
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
            abort(403, 'Role Guest tidak memiliki izin mengelola synthetic monitoring.');
        }

        return $organization;
    }

    /**
     * Display the Synthetic Monitoring & Global Uptime Probe Studio.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeAccess($request, 'view');
        $data = $this->syntheticService->getDashboard($organization);

        return Inertia::render('organization/sre/synthetics', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'monitors' => $data['monitors'],
            'probe_logs' => $data['probe_logs'],
            'available_locations' => $data['available_locations'],
        ]);
    }

    /**
     * Store a new synthetic monitor.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:200'],
            'target_url' => ['required', 'url', 'max:500'],
            'probe_type' => ['required', 'string', 'in:http,api,ssl,tcp'],
            'interval_seconds' => ['nullable', 'integer', 'in:30,60,300,900'],
            'timeout_seconds' => ['nullable', 'integer', 'min:1', 'max:60'],
            'expected_status_code' => ['nullable', 'integer', 'min:100', 'max:599'],
            'response_regex_match' => ['nullable', 'string', 'max:300'],
            'locations' => ['nullable', 'array'],
            'locations.*' => ['string'],
        ]);

        $monitor = $this->syntheticService->createMonitor($organization, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Monitor sintetik berhasil didaftarkan.',
                'monitor' => $monitor,
            ], 201);
        }

        return back()->with('success', 'Monitor sintetik berhasil didaftarkan.');
    }

    /**
     * Run an instant probe check on the monitor.
     */
    public function probe(Request $request, SyntheticMonitor $monitor): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        if ($monitor->organization_id !== $organization->id) {
            abort(404);
        }

        $updated = $this->syntheticService->runInstantProbe($monitor);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Probe check multi-region berhasil dieksekusi.',
                'monitor' => $updated,
            ]);
        }

        return back()->with('success', 'Probe check multi-region berhasil dieksekusi.');
    }

    /**
     * Toggle active/paused status of monitor.
     */
    public function toggleStatus(Request $request, SyntheticMonitor $monitor): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        if ($monitor->organization_id !== $organization->id) {
            abort(404);
        }

        $updated = $this->syntheticService->toggleStatus($monitor);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Status monitor diubah menjadi {$updated->status}.",
                'monitor' => $updated,
            ]);
        }

        return back()->with('success', "Status monitor diubah menjadi {$updated->status}.");
    }

    /**
     * Delete a synthetic monitor.
     */
    public function destroy(Request $request, SyntheticMonitor $monitor): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        if ($monitor->organization_id !== $organization->id) {
            abort(404);
        }

        $this->syntheticService->deleteMonitor($monitor);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Monitor sintetik berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Monitor sintetik berhasil dihapus.');
    }
}
