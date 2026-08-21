<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SbomVulnerability;
use App\Services\Security\SbomScannerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SbomScannerController extends Controller
{
    public function __construct(
        protected SbomScannerService $sbomService
    ) {}

    protected function authorizeSecurityAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_security' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk mengelola keamanan dependensi dan SBOM.');
        }

        return $organization;
    }

    /**
     * Display Enterprise License Compliance & SBOM Vulnerability Scanner.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeSecurityAccess($request, 'view');
        $ecosystem = $request->query('ecosystem');
        $riskLevel = $request->query('risk_level');

        $data = $this->sbomService->getSbomDashboard($organization, $ecosystem, $riskLevel);

        return Inertia::render('organization/security/sbom', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'ecosystemStats' => $data['ecosystemStats'],
            'licenseStats' => $data['licenseStats'],
            'packages' => $data['packages'],
            'vulnerabilities' => $data['vulnerabilities'],
            'selectedEcosystem' => $ecosystem,
            'selectedRiskLevel' => $riskLevel,
        ]);
    }

    /**
     * Trigger an on-demand dependency scan.
     */
    public function scan(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSecurityAccess($request, 'manage_security');

        $result = $this->sbomService->triggerScan($organization, $request->user());

        if ($request->wantsJson()) {
            return response()->json($result);
        }

        return back()->with('success', $result['message']);
    }

    /**
     * Triage or update status of a CVE vulnerability.
     */
    public function triage(Request $request, SbomVulnerability $vulnerability): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSecurityAccess($request, 'manage_security');

        if ($vulnerability->package->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:open,mitigated,false_positive,ignored'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $triaged = $this->sbomService->triageVulnerability(
            $vulnerability,
            $request->user(),
            $validated['status'],
            $validated['notes'] ?? null
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Status kerentanan CVE berhasil diperbarui.',
                'vulnerability' => $triaged,
            ]);
        }

        return back()->with('success', 'Status kerentanan CVE berhasil diperbarui.');
    }

    /**
     * Export Software Bill of Materials (SBOM) in CycloneDX standard JSON format.
     */
    public function export(Request $request): JsonResponse
    {
        $organization = $this->authorizeSecurityAccess($request, 'view');
        $format = $request->query('format', 'cyclonedx');

        $sbomData = $this->sbomService->exportSbom($organization, $format);

        return response()->json($sbomData, 200, [
            'Content-Disposition' => 'attachment; filename="sbom-'.$organization->slug.'-cyclonedx.json"',
        ]);
    }
}
