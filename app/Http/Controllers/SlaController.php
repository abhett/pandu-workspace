<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\SlaEscalationRule;
use App\Models\SlaPolicy;
use App\Services\Sla\SlaEngineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SlaController extends Controller
{
    public function __construct(
        protected SlaEngineService $slaService
    ) {}

    /**
     * Authorize user access to SLA management.
     */
    protected function authorizeSlaAccess(Request $request, string $permission = 'sla:manage'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($permission === 'sla:manage' && in_array($role, ['member', 'guest'])) {
            abort(403, 'Role Anda tidak memiliki izin untuk mengonfigurasi SLA.');
        }

        return $organization;
    }

    /**
     * Display the Organization SLA & Escalation Matrix page.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeSlaAccess($request, 'sla:view');

        $policies = SlaPolicy::where('organization_id', $organization->id)
            ->with([
                'project:id,name,key',
                'escalationRules',
            ])
            ->withCount('taskTrackers')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (SlaPolicy $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'description' => $p->description,
                'priority' => $p->priority,
                'issue_type' => $p->issue_type,
                'response_time_hours' => $p->response_time_hours,
                'resolution_time_hours' => $p->resolution_time_hours,
                'operational_hours' => $p->operational_hours,
                'active' => (bool) $p->active,
                'project' => $p->project ? [
                    'id' => $p->project->id,
                    'name' => $p->project->name,
                    'key' => $p->project->key,
                ] : null,
                'task_trackers_count' => $p->task_trackers_count,
                'escalation_rules' => $p->escalationRules->map(fn (SlaEscalationRule $r) => [
                    'id' => $r->id,
                    'trigger_type' => $r->trigger_type,
                    'trigger_offset_minutes' => $r->trigger_offset_minutes,
                    'action_type' => $r->action_type,
                    'action_payload' => $r->action_payload,
                    'position' => $r->position,
                    'active' => (bool) $r->active,
                ]),
                'created_at_formatted' => $p->created_at?->translatedFormat('d M Y'),
            ]);

        $metrics = $this->slaService->getOrganizationMetrics($organization);
        $projects = Project::where('organization_id', $organization->id)->select(['id', 'name', 'key'])->get();

        return Inertia::render('organization/sla/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'policies' => $policies,
            'metrics' => $metrics,
            'projects' => $projects,
        ]);
    }

    /**
     * Store a newly created SLA policy.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSlaAccess($request, 'sla:manage');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:500'],
            'project_id' => ['nullable', 'string', 'exists:projects,id'],
            'priority' => ['required', 'string', 'in:all,urgent,high,medium,low'],
            'issue_type' => ['required', 'string', 'in:all,bug,task,story,epic'],
            'response_time_hours' => ['required', 'integer', 'min:1', 'max:720'],
            'resolution_time_hours' => ['required', 'integer', 'min:1', 'max:720'],
            'operational_hours' => ['required', 'string', 'in:24x7,business_hours'],
            'active' => ['boolean'],
        ]);

        $policy = SlaPolicy::create([
            'organization_id' => $organization->id,
            'project_id' => $validated['project_id'] ?? null,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'priority' => $validated['priority'],
            'issue_type' => $validated['issue_type'],
            'response_time_hours' => $validated['response_time_hours'],
            'resolution_time_hours' => $validated['resolution_time_hours'],
            'operational_hours' => $validated['operational_hours'],
            'active' => $validated['active'] ?? true,
            'created_by' => $request->user()->id,
        ]);

        // Default auto-escalation rule
        SlaEscalationRule::create([
            'sla_policy_id' => $policy->id,
            'trigger_type' => 'resolution_breached',
            'trigger_offset_minutes' => 0,
            'action_type' => 'escalate_priority',
            'action_payload' => ['new_priority' => 'urgent'],
            'position' => 0,
            'active' => true,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Kebijakan SLA berhasil dibuat.',
                'policy' => $policy->load('escalationRules'),
            ], 201);
        }

        return redirect()->route('organization.sla.index')->with('success', 'Kebijakan SLA berhasil dibuat.');
    }

    /**
     * Update an existing SLA policy.
     */
    public function update(Request $request, SlaPolicy $policy): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSlaAccess($request, 'sla:manage');

        if ($policy->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:500'],
            'project_id' => ['nullable', 'string', 'exists:projects,id'],
            'priority' => ['required', 'string', 'in:all,urgent,high,medium,low'],
            'issue_type' => ['required', 'string', 'in:all,bug,task,story,epic'],
            'response_time_hours' => ['required', 'integer', 'min:1', 'max:720'],
            'resolution_time_hours' => ['required', 'integer', 'min:1', 'max:720'],
            'operational_hours' => ['required', 'string', 'in:24x7,business_hours'],
            'active' => ['boolean'],
        ]);

        $policy->update($validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Kebijakan SLA berhasil diperbarui.',
                'policy' => $policy->fresh(['escalationRules']),
            ]);
        }

        return redirect()->route('organization.sla.index')->with('success', 'Kebijakan SLA berhasil diperbarui.');
    }

    /**
     * Delete an SLA policy.
     */
    public function destroy(Request $request, SlaPolicy $policy): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSlaAccess($request, 'sla:manage');

        if ($policy->organization_id !== $organization->id) {
            abort(404);
        }

        $policy->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Kebijakan SLA berhasil dihapus.',
            ]);
        }

        return redirect()->route('organization.sla.index')->with('success', 'Kebijakan SLA berhasil dihapus.');
    }

    /**
     * Store a new escalation rule for a policy.
     */
    public function storeRule(Request $request, SlaPolicy $policy): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSlaAccess($request, 'sla:manage');

        if ($policy->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'trigger_type' => ['required', 'string', 'in:approaching_breach,response_breached,resolution_breached'],
            'trigger_offset_minutes' => ['nullable', 'integer'],
            'action_type' => ['required', 'string', 'in:escalate_priority,add_tag,notify_lead,reassign_role'],
            'action_payload' => ['nullable', 'array'],
        ]);

        $rule = SlaEscalationRule::create([
            'sla_policy_id' => $policy->id,
            'trigger_type' => $validated['trigger_type'],
            'trigger_offset_minutes' => $validated['trigger_offset_minutes'] ?? 0,
            'action_type' => $validated['action_type'],
            'action_payload' => $validated['action_payload'] ?? ['new_priority' => 'urgent'],
            'position' => $policy->escalationRules()->count(),
            'active' => true,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Aturan eskalasi berhasil ditambahkan.',
                'rule' => $rule,
            ], 201);
        }

        return back()->with('success', 'Aturan eskalasi berhasil ditambahkan.');
    }

    /**
     * Delete an escalation rule.
     */
    public function destroyRule(Request $request, SlaEscalationRule $rule): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSlaAccess($request, 'sla:manage');

        if ($rule->policy?->organization_id !== $organization->id) {
            abort(404);
        }

        $rule->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Aturan eskalasi berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Aturan eskalasi berhasil dihapus.');
    }

    /**
     * Run scan and auto-escalation evaluation on demand.
     */
    public function runScan(Request $request): JsonResponse
    {
        $organization = $this->authorizeSlaAccess($request, 'sla:manage');

        $result = $this->slaService->scanAndEscalate($organization);

        return response()->json([
            'success' => true,
            'message' => "Pemindaian SLA selesai: {$result['scanned_tasks_count']} tugas diperiksa, {$result['escalated_tasks_count']} dieksekusi eskalasi.",
            'result' => $result,
        ]);
    }
}
