<?php

namespace App\Http\Controllers;

use App\Models\IncidentRunbook;
use App\Models\Organization;
use App\Services\Sre\IncidentRunbookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IncidentRunbookController extends Controller
{
    public function __construct(
        protected IncidentRunbookService $runbookService
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
            abort(403, 'Role Guest tidak memiliki izin mengelola incident runbook.');
        }

        return $organization;
    }

    /**
     * Display the Automated Incident Remediation Runbooks & Operational Playbook Studio.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeAccess($request, 'view');
        $data = $this->runbookService->getDashboard($organization);

        return Inertia::render('organization/sre/runbooks', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'runbooks' => $data['runbooks'],
            'executions' => $data['executions'],
            'categories' => $data['categories'],
        ]);
    }

    /**
     * Store a new incident remediation runbook.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:1000'],
            'category' => ['required', 'string', 'in:database,networking,cache,deployment,scaling'],
            'severity' => ['required', 'string', 'in:critical,high,medium,low'],
            'estimated_duration_minutes' => ['nullable', 'integer', 'min:1', 'max:120'],
            'is_automated' => ['nullable', 'boolean'],
            'steps' => ['nullable', 'array'],
            'steps.*.id' => ['nullable', 'string'],
            'steps.*.title' => ['required', 'string', 'max:200'],
            'steps.*.type' => ['required', 'string', 'in:automated_script,api_webhook,approval_gate,manual_check'],
            'steps.*.action_command' => ['nullable', 'string', 'max:500'],
            'steps.*.timeout_seconds' => ['nullable', 'integer', 'min:5', 'max:600'],
            'parameters' => ['nullable', 'array'],
        ]);

        $runbook = $this->runbookService->createRunbook($organization, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Incident runbook playbook berhasil dibuat.',
                'runbook' => $runbook,
            ], 201);
        }

        return back()->with('success', 'Incident runbook playbook berhasil dibuat.');
    }

    /**
     * Execute the incident remediation runbook.
     */
    public function execute(Request $request, IncidentRunbook $runbook): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        if ($runbook->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'execution_params' => ['nullable', 'array'],
            'trigger_type' => ['nullable', 'string', 'in:manual,alert_webhook,oncall_escalation'],
        ]);

        $params = $validated['execution_params'] ?? [];
        $triggerType = $validated['trigger_type'] ?? 'manual';

        $execution = $this->runbookService->executeRunbook($runbook, $request->user(), $params, $triggerType);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Runbook {$runbook->title} berhasil dieksekusi.",
                'execution' => $execution,
            ]);
        }

        return back()->with('success', "Runbook {$runbook->title} berhasil dieksekusi.");
    }

    /**
     * Delete an incident remediation runbook.
     */
    public function destroy(Request $request, IncidentRunbook $runbook): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        if ($runbook->organization_id !== $organization->id) {
            abort(404);
        }

        $this->runbookService->deleteRunbook($runbook);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Incident runbook playbook berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Incident runbook playbook berhasil dihapus.');
    }
}
