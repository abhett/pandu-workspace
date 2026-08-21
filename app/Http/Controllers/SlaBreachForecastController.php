<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Task;
use App\Services\Sla\SlaBreachForecastService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SlaBreachForecastController extends Controller
{
    public function __construct(
        protected SlaBreachForecastService $forecastService
    ) {}

    protected function authorizeSlaAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_escalations' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk melakukan eskalasi SLA.');
        }

        return $organization;
    }

    /**
     * Display Automated Enterprise SLA Breach Forecasting & Customer Support Escalation Engine.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeSlaAccess($request, 'view');
        $projectId = $request->query('project_id');

        $data = $this->forecastService->getForecastDashboard($organization, $projectId);

        return Inertia::render('organization/sla/forecast', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'tickets' => $data['tickets'],
            'escalationLogs' => $data['escalation_logs'],
            'leads' => $data['leads'],
            'projects' => $data['projects'],
            'selectedProjectId' => $projectId,
        ]);
    }

    /**
     * Execute manual or tiered escalation on an SLA task.
     */
    public function escalate(Request $request, Task $task): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSlaAccess($request, 'manage_escalations');

        if ($task->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'tier' => ['required', 'integer', 'in:1,2,3'],
            'new_assignee_id' => ['nullable', 'integer', 'exists:users,id'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $log = $this->forecastService->executeManualEscalation(
            $organization,
            $task,
            $request->user(),
            $validated['tier'],
            $validated['new_assignee_id'] ?? null,
            $validated['reason']
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Eskalasi Tier {$validated['tier']} berhasil dieksekusi.",
                'escalation_log' => $log,
            ], 201);
        }

        return back()->with('success', "Eskalasi Tier {$validated['tier']} berhasil dieksekusi.");
    }

    /**
     * Dismiss or record risk mitigation note on an SLA task.
     */
    public function mitigate(Request $request, Task $task): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSlaAccess($request, 'manage_escalations');

        if ($task->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'note' => ['required', 'string', 'max:1000'],
        ]);

        $this->forecastService->dismissOrMitigateRisk($task, $request->user(), $validated['note']);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Catatan mitigasi risiko SLA berhasil disimpan.',
            ]);
        }

        return back()->with('success', 'Catatan mitigasi risiko SLA berhasil disimpan.');
    }
}
