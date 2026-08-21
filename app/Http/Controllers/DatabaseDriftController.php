<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SchemaDriftReport;
use App\Services\Database\DatabaseDriftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DatabaseDriftController extends Controller
{
    public function __construct(
        protected DatabaseDriftService $driftService
    ) {}

    protected function authorizeDriftAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_drift' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk mengelola skema database.');
        }

        return $organization;
    }

    /**
     * Display Database Migration Drift & Zero-Downtime Safe DDL Studio.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeDriftAccess($request, 'view');
        $severity = $request->query('severity');
        $environment = $request->query('environment');

        $data = $this->driftService->getDriftDashboard($organization, $severity, $environment);

        return Inertia::render('organization/database/drift', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'environments' => $data['environments'],
            'driftReports' => $data['driftReports'],
            'selectedSeverity' => $severity,
            'selectedEnvironment' => $environment,
        ]);
    }

    /**
     * Trigger real-time schema drift scan.
     */
    public function scan(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeDriftAccess($request, 'manage_drift');

        $result = $this->driftService->scanEnvironmentDrift($organization, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Pemindaian skema antar-environment selesai.',
                'result' => $result,
            ]);
        }

        return back()->with('success', 'Pemindaian skema selesai.');
    }

    /**
     * Resolve a drift report.
     */
    public function resolve(Request $request, SchemaDriftReport $report): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeDriftAccess($request, 'manage_drift');

        if ($report->organization_id !== $organization->id) {
            abort(404);
        }

        $resolved = $this->driftService->resolveDriftReport($report, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Laporan drift pada tabel `{$resolved->table_name}` ditandai selesai.",
                'report' => $resolved,
            ]);
        }

        return back()->with('success', 'Laporan drift ditandai selesai.');
    }

    /**
     * Generate Zero-Downtime Safe DDL Recipe.
     */
    public function generateDdl(Request $request): JsonResponse
    {
        $organization = $this->authorizeDriftAccess($request, 'view');

        $validated = $request->validate([
            'action' => ['required', 'string', 'in:create_index_concurrently,add_not_null_column_safely,change_column_type'],
            'table_name' => ['required', 'string', 'max:100'],
            'column_name' => ['required', 'string', 'max:100'],
        ]);

        $result = $this->driftService->generateSafeDdl($organization, $validated, $request->user());

        return response()->json([
            'success' => true,
            'result' => $result,
        ]);
    }

    /**
     * Delete a drift report.
     */
    public function destroy(Request $request, SchemaDriftReport $report): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeDriftAccess($request, 'manage_drift');

        if ($report->organization_id !== $organization->id) {
            abort(404);
        }

        $this->driftService->deleteDriftReport($report);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Laporan drift berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Laporan drift berhasil dihapus.');
    }
}
