<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OrganizationComplianceExport;
use App\Services\Compliance\DataRetentionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ComplianceController extends Controller
{
    public function __construct(
        protected DataRetentionService $retentionService
    ) {}

    protected function authorizeRetentionAccess($user, $organization): void
    {
        if (! in_array($user->roleInOrganization($organization), ['owner', 'admin']) && ! $user->hasPermissionInOrganization($organization, 'org:manage')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengelola retensi data dan kepatuhan.');
        }
    }

    /**
     * Display Data Retention & Compliance Management page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeRetentionAccess($user, $organization);

        $policy = $this->retentionService->getOrCreatePolicy($organization);
        $exports = $this->retentionService->getExports($organization);

        return Inertia::render('organization/data-retention', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'policy' => [
                'id' => $policy->id,
                'audit_logs_retention_days' => $policy->audit_logs_retention_days,
                'deleted_tasks_retention_days' => $policy->deleted_tasks_retention_days,
                'orphan_attachments_retention_days' => $policy->orphan_attachments_retention_days,
                'auto_purge_enabled' => $policy->auto_purge_enabled,
                'last_purged_at_formatted' => $policy->last_purged_at?->translatedFormat('d M Y H:i') ?? 'Belum pernah',
            ],
            'exports' => $exports,
        ]);
    }

    /**
     * Update data retention policies.
     */
    public function updatePolicy(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeRetentionAccess($user, $organization);

        $validated = $request->validate([
            'audit_logs_retention_days' => ['required', 'integer', 'in:30,90,365,0'],
            'deleted_tasks_retention_days' => ['required', 'integer', 'in:14,30,60,90'],
            'orphan_attachments_retention_days' => ['required', 'integer', 'in:0,7,30'],
            'auto_purge_enabled' => ['required', 'boolean'],
        ]);

        $this->retentionService->updatePolicy($organization, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Kebijakan retensi data berhasil diperbarui.',
            ]);
        }

        return back()->with('success', 'Kebijakan retensi data berhasil diperbarui.');
    }

    /**
     * Execute on-demand data purge with confirmation.
     */
    public function purgeNow(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeRetentionAccess($user, $organization);

        $request->validate([
            'confirmation' => ['required', 'string', 'in:PURGE-EXPIRED-DATA,HAPUS-DATA-KADALUWARSA'],
        ]);

        $result = $this->retentionService->executePurge($organization, $user);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Pembersihan selesai: {$result['purged_tasks']} task dan {$result['purged_attachments']} berkas dihapus permanen.",
                'summary' => $result,
            ]);
        }

        return back()->with('success', 'Pembersihan data retensi berhasil dieksekusi.');
    }

    /**
     * Request a GDPR compliance data export.
     */
    public function requestExport(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeRetentionAccess($user, $organization);

        $export = $this->retentionService->createDataExport($organization, $user, 'gdpr_full');

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Paket ekspor data kepatuhan GDPR berhasil dibuat.',
                'export_id' => $export->id,
            ]);
        }

        return back()->with('success', 'Paket ekspor data kepatuhan GDPR berhasil dibuat.');
    }

    /**
     * Download compliance export snapshot.
     */
    public function downloadExport(Request $request, OrganizationComplianceExport $export): StreamedResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeRetentionAccess($user, $organization);

        if ($export->organization_id !== $organization->id) {
            abort(404);
        }

        if (! Storage::disk('local')->exists($export->file_path)) {
            // Generate fallback content if file missing
            $json = json_encode(['organization' => $organization->name, 'export_id' => $export->id, 'exported_at' => now()], JSON_PRETTY_PRINT);
            Storage::disk('local')->put($export->file_path, $json);
        }

        return Storage::disk('local')->download($export->file_path, 'pandu-compliance-export-'.$export->id.'.json');
    }
}
