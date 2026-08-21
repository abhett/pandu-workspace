<?php

namespace App\Http\Controllers;

use App\Models\Incident;
use App\Models\Organization;
use App\Services\Ops\IncidentManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IncidentManagementController extends Controller
{
    public function __construct(
        protected IncidentManagementService $incidentService
    ) {}

    protected function authorizeIncidentAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_incidents' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk mengelola insiden atau jadwal On-Call.');
        }

        return $organization;
    }

    /**
     * Display Incident War Room, On-Call Rota & Post-Mortem Dashboard.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeIncidentAccess($request, 'view');
        $severity = $request->query('severity');
        $status = $request->query('status');

        $data = $this->incidentService->getIncidentsDashboard($organization, $severity, $status);

        return Inertia::render('organization/ops/incidents', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'onCallRota' => $data['onCallRota'],
            'incidents' => $data['incidents'],
            'projects' => $data['projects'],
            'members' => $data['members'],
            'selectedSeverity' => $severity,
            'selectedStatus' => $status,
        ]);
    }

    /**
     * Declare a new incident.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeIncidentAccess($request, 'manage_incidents');

        $validated = $request->validate([
            'project_id' => ['nullable', 'uuid', 'exists:projects,id'],
            'title' => ['required', 'string', 'max:200'],
            'severity' => ['required', 'string', 'in:P1,P2,P3,P4'],
            'impact_summary' => ['required', 'string'],
            'commander_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $incident = $this->incidentService->createIncident($organization, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Insiden berhasil dideklarasikan.',
                'incident' => $incident,
            ], 201);
        }

        return back()->with('success', 'Insiden berhasil dideklarasikan.');
    }

    /**
     * Post a war room update.
     */
    public function postUpdate(Request $request, Incident $incident): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeIncidentAccess($request, 'manage_incidents');

        if ($incident->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'status_update' => ['required', 'string', 'in:investigating,identified,monitoring,resolved'],
            'message' => ['required', 'string'],
        ]);

        $update = $this->incidentService->postIncidentUpdate($incident, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Lini masa War Room berhasil diperbarui.',
                'update' => $update,
            ]);
        }

        return back()->with('success', 'Lini masa War Room berhasil diperbarui.');
    }

    /**
     * Mark an incident as resolved.
     */
    public function resolve(Request $request, Incident $incident): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeIncidentAccess($request, 'manage_incidents');

        if ($incident->organization_id !== $organization->id) {
            abort(404);
        }

        $resolved = $this->incidentService->resolveIncident($incident, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Insiden telah dinyatakan selesai (Resolved).',
                'incident' => $resolved,
            ]);
        }

        return back()->with('success', 'Insiden telah dinyatakan selesai (Resolved).');
    }

    /**
     * Save or publish a Post-Mortem Root Cause Analysis.
     */
    public function savePostMortem(Request $request, Incident $incident): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeIncidentAccess($request, 'manage_incidents');

        if ($incident->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'root_cause' => ['required', 'string'],
            'trigger_event' => ['required', 'string'],
            'lessons_learned' => ['nullable', 'string'],
            'action_items' => ['nullable'],
            'status' => ['nullable', 'string', 'in:draft,published,reviewed'],
        ]);

        $postMortem = $this->incidentService->savePostMortem($incident, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Post-Mortem Root Cause Analysis berhasil disimpan.',
                'post_mortem' => $postMortem,
            ]);
        }

        return back()->with('success', 'Post-Mortem Root Cause Analysis berhasil disimpan.');
    }

    /**
     * Update On-Call Schedule Rota.
     */
    public function updateRota(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeIncidentAccess($request, 'manage_incidents');

        $validated = $request->validate([
            'shift_name' => ['required', 'string', 'max:100'],
            'primary_user_id' => ['required', 'integer', 'exists:users,id'],
            'secondary_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $rota = $this->incidentService->updateOnCallRota($organization, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Jadwal On-Call Rota berhasil diperbarui.',
                'rota' => $rota,
            ]);
        }

        return back()->with('success', 'Jadwal On-Call Rota berhasil diperbarui.');
    }

    /**
     * Delete an incident record.
     */
    public function destroy(Request $request, Incident $incident): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeIncidentAccess($request, 'manage_incidents');

        if ($incident->organization_id !== $organization->id) {
            abort(404);
        }

        $this->incidentService->deleteIncident($incident);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Rekaman insiden berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Rekaman insiden berhasil dihapus.');
    }
}
