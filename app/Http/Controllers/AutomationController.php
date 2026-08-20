<?php

namespace App\Http\Controllers;

use App\Models\AutomationLog;
use App\Models\AutomationRule;
use App\Models\Organization;
use App\Models\Project;
use App\Models\User;
use App\Services\Automation\AutomationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AutomationController extends Controller
{
    public function __construct(
        protected AutomationService $automationService
    ) {}

    protected function authorizeAutomationAccess($user, $organization): void
    {
        if (! in_array($user->roleInOrganization($organization), ['owner', 'admin', 'manager']) && ! $user->hasPermissionInOrganization($organization, 'automations:manage')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengelola otomasi workflow.');
        }
    }

    /**
     * Display list of automation rules & recent execution history.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeAutomationAccess($user, $organization);

        $rules = AutomationRule::where('organization_id', $organization->id)
            ->with(['project:id,name,key', 'creator:id,name,avatar'])
            ->orderByDesc('created_at')
            ->get();

        $recentLogs = AutomationLog::whereHas('rule', function ($q) use ($organization) {
            $q->where('organization_id', $organization->id);
        })
            ->with('rule:id,name')
            ->orderByDesc('executed_at')
            ->limit(10)
            ->get();

        $projects = Project::where('organization_id', $organization->id)
            ->select(['id', 'name', 'key'])
            ->get();

        return Inertia::render('automation/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'rules' => $rules,
            'recent_logs' => $recentLogs,
            'projects' => $projects,
        ]);
    }

    /**
     * Show visual automation builder to create a new rule.
     */
    public function create(Request $request): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeAutomationAccess($user, $organization);

        $projects = Project::where('organization_id', $organization->id)
            ->select(['id', 'name', 'key'])
            ->get();

        $members = User::whereHas('memberships', function ($q) use ($organization) {
            $q->where('organization_id', $organization->id);
        })->select(['id', 'name', 'email'])->get();

        return Inertia::render('automation/builder', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'projects' => $projects,
            'members' => $members,
            'rule' => null,
        ]);
    }

    /**
     * Store newly created automation rule.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeAutomationAccess($user, $organization);

        $validated = $request->validate([
            'project_id' => ['nullable', 'string', 'exists:projects,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'trigger_event' => ['required', 'string', 'in:task.created,task.status_changed,task.priority_changed,sprint.started'],
            'trigger_config' => ['nullable', 'array'],
            'conditions' => ['nullable', 'array'],
            'actions' => ['required', 'array', 'min:1'],
            'is_active' => ['boolean'],
        ]);

        $rule = AutomationRule::create([
            'organization_id' => $organization->id,
            'project_id' => $validated['project_id'] ?? null,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'trigger_event' => $validated['trigger_event'],
            'trigger_config' => $validated['trigger_config'] ?? [],
            'conditions' => $validated['conditions'] ?? [],
            'actions' => $validated['actions'],
            'is_active' => $validated['is_active'] ?? true,
            'created_by' => $user->id,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Aturan otomasi berhasil disimpan.',
                'rule' => $rule,
            ]);
        }

        return redirect()->route('automation.index')->with('success', 'Aturan otomasi berhasil disimpan.');
    }

    /**
     * Show visual automation builder to edit an existing rule.
     */
    public function edit(Request $request, AutomationRule $rule): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeAutomationAccess($user, $organization);

        if ($rule->organization_id !== $organization->id) {
            abort(404);
        }

        $projects = Project::where('organization_id', $organization->id)
            ->select(['id', 'name', 'key'])
            ->get();

        $members = User::whereHas('memberships', function ($q) use ($organization) {
            $q->where('organization_id', $organization->id);
        })->select(['id', 'name', 'email'])->get();

        return Inertia::render('automation/builder', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'projects' => $projects,
            'members' => $members,
            'rule' => $rule,
        ]);
    }

    /**
     * Update an existing automation rule.
     */
    public function update(Request $request, AutomationRule $rule): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeAutomationAccess($user, $organization);

        if ($rule->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'project_id' => ['nullable', 'string', 'exists:projects,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'trigger_event' => ['required', 'string', 'in:task.created,task.status_changed,task.priority_changed,sprint.started'],
            'trigger_config' => ['nullable', 'array'],
            'conditions' => ['nullable', 'array'],
            'actions' => ['required', 'array', 'min:1'],
            'is_active' => ['boolean'],
        ]);

        $rule->update([
            'project_id' => $validated['project_id'] ?? null,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'trigger_event' => $validated['trigger_event'],
            'trigger_config' => $validated['trigger_config'] ?? [],
            'conditions' => $validated['conditions'] ?? [],
            'actions' => $validated['actions'],
            'is_active' => $validated['is_active'] ?? $rule->is_active,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Aturan otomasi berhasil diperbarui.',
                'rule' => $rule,
            ]);
        }

        return redirect()->route('automation.index')->with('success', 'Aturan otomasi berhasil diperbarui.');
    }

    /**
     * Delete an automation rule.
     */
    public function destroy(Request $request, AutomationRule $rule): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($rule->organization_id !== $organization->id) {
            abort(404);
        }

        $rule->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Aturan otomasi berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Aturan otomasi berhasil dihapus.');
    }

    /**
     * Toggle active state of an automation rule.
     */
    public function toggle(Request $request, AutomationRule $rule): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($rule->organization_id !== $organization->id) {
            abort(404);
        }

        $rule->update([
            'is_active' => ! $rule->is_active,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'is_active' => $rule->is_active,
                'message' => $rule->is_active ? 'Otomasi diaktifkan.' : 'Otomasi dinonaktifkan.',
            ]);
        }

        return back()->with('success', $rule->is_active ? 'Otomasi diaktifkan.' : 'Otomasi dinonaktifkan.');
    }

    /**
     * Perform dry-run test execution for a rule.
     */
    public function testRun(Request $request, AutomationRule $rule): JsonResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($rule->organization_id !== $organization->id) {
            abort(404);
        }

        $samplePayload = $request->input('payload', [
            'title' => 'Test Task Sample',
            'priority' => 'high',
            'is_milestone' => true,
            'estimate_points' => 5,
            'actor_id' => $user->id,
        ]);

        $result = $this->automationService->testRun($rule, $samplePayload);

        return response()->json([
            'success' => true,
            'result' => $result,
        ]);
    }
}
