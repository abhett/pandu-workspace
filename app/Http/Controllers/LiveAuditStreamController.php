<?php

namespace App\Http\Controllers;

use App\Models\ComplianceIncident;
use App\Models\Organization;
use App\Services\Compliance\LiveAuditStreamService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LiveAuditStreamController extends Controller
{
    public function __construct(
        protected LiveAuditStreamService $streamService
    ) {}

    protected function authorizeAuditAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_incidents' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk mengelola insiden kepatuhan keamanan.');
        }

        return $organization;
    }

    /**
     * Display the Real-Time Live Event Log & Compliance Audit Streamer.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeAuditAccess($request, 'view');
        $filters = [
            'category' => $request->input('category', 'all'),
            'status' => $request->input('status', 'all'),
        ];

        $data = $this->streamService->getLiveStreamData($organization, $filters);

        return Inertia::render('organization/compliance/live-stream', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'logs' => $data['logs'],
            'incidents' => $data['incidents'],
            'frameworks' => $data['frameworks'],
            'members' => $data['members'],
            'filters' => $filters,
        ]);
    }

    /**
     * Fetch incremental feed updates for live stream ticker.
     */
    public function feed(Request $request): JsonResponse
    {
        $organization = $this->authorizeAuditAccess($request, 'view');
        $afterId = $request->query('after_id');
        $category = $request->query('category');
        $status = $request->query('status');

        $newLogs = $this->streamService->getFeedUpdates($organization, $afterId, $category, $status);

        return response()->json([
            'success' => true,
            'count' => count($newLogs),
            'logs' => $newLogs,
        ]);
    }

    /**
     * Store a new compliance security incident.
     */
    public function storeIncident(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAuditAccess($request, 'manage_incidents');

        $validated = $request->validate([
            'audit_log_id' => ['nullable', 'string', 'exists:organization_audit_logs,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'severity' => ['required', 'string', 'in:critical,high,medium,low,info'],
            'framework' => ['required', 'string', 'in:SOC2_TYPE_II,ISO_27001,GDPR_PRIVACY,HIPAA,INTERNAL_SECURITY'],
            'status' => ['required', 'string', 'in:open,investigating,mitigated,resolved,false_positive'],
            'summary' => ['required', 'string', 'max:2000'],
            'mitigation_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $incident = $this->streamService->createIncident($organization, $request->user(), $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Tiket insiden kepatuhan berhasil dicatat.',
                'incident' => $incident,
            ], 201);
        }

        return back()->with('success', 'Tiket insiden kepatuhan berhasil dicatat.');
    }

    /**
     * Update incident status and mitigation notes.
     */
    public function updateIncident(Request $request, ComplianceIncident $incident): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAuditAccess($request, 'manage_incidents');

        if ($incident->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'severity' => ['sometimes', 'required', 'string', 'in:critical,high,medium,low,info'],
            'framework' => ['sometimes', 'required', 'string', 'in:SOC2_TYPE_II,ISO_27001,GDPR_PRIVACY,HIPAA,INTERNAL_SECURITY'],
            'status' => ['sometimes', 'required', 'string', 'in:open,investigating,mitigated,resolved,false_positive'],
            'summary' => ['sometimes', 'required', 'string', 'max:2000'],
            'mitigation_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $updated = $this->streamService->updateIncident($incident, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Status insiden kepatuhan berhasil diperbarui.',
                'incident' => $updated,
            ]);
        }

        return back()->with('success', 'Status insiden kepatuhan berhasil diperbarui.');
    }

    /**
     * Delete an incident.
     */
    public function destroyIncident(Request $request, ComplianceIncident $incident): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAuditAccess($request, 'manage_incidents');

        if ($incident->organization_id !== $organization->id) {
            abort(404);
        }

        $this->streamService->deleteIncident($incident);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Insiden kepatuhan berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Insiden kepatuhan berhasil dihapus.');
    }

    /**
     * Generate and download certified compliance audit report.
     */
    public function exportCertification(Request $request): JsonResponse
    {
        $organization = $this->authorizeAuditAccess($request, 'view');
        $framework = $request->query('framework', 'SOC2_TYPE_II');

        $cert = $this->streamService->generateCertificationReport($organization, $framework);

        return response()->json([
            'success' => true,
            'certificate' => $cert,
        ]);
    }
}
