<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use App\Services\Capacity\CrossProjectWorkloadBalancerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorkloadBalancerController extends Controller
{
    public function __construct(
        protected CrossProjectWorkloadBalancerService $balancerService
    ) {}

    /**
     * Authorize user access to organization workload balancer.
     */
    protected function authorizeOrgAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_rebalance' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin mengubah penugasan beban kerja tim.');
        }

        return $organization;
    }

    /**
     * Display Multi-Project Resource Workload & Capacity Balancing Matrix.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeOrgAccess($request, 'view');

        $data = $this->balancerService->getWorkloadBalancingMatrix($organization);

        return Inertia::render('organization/capacity/balancer', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'projects' => $data['projects'],
            'matrix_rows' => $data['matrix_rows'],
            'runway_weeks' => $data['runway_weeks'],
            'audit_logs' => $data['audit_logs'],
        ]);
    }

    /**
     * Get smart rebalance candidate suggestions for an overloaded team member.
     */
    public function suggestions(Request $request, int $user): JsonResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'view');

        $data = $this->balancerService->getRebalanceSuggestions($organization, $user);

        return response()->json([
            'success' => true,
            'suggestions' => $data,
        ]);
    }

    /**
     * Reassign a single task and record audit log.
     */
    public function reassign(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_rebalance');

        if ($request->input('new_assignee_id') === 'none' || $request->input('new_assignee_id') === '') {
            $request->merge(['new_assignee_id' => null]);
        }

        $validated = $request->validate([
            'task_id' => ['required', 'string', 'exists:tasks,id'],
            'new_assignee_id' => ['nullable', 'integer', 'exists:users,id'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $newAssigneeId = isset($validated['new_assignee_id']) ? (int) $validated['new_assignee_id'] : null;

        $log = $this->balancerService->executeRebalance(
            $organization,
            $request->user(),
            $validated['task_id'],
            $newAssigneeId,
            $validated['reason'] ?? null
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Penugasan tugas berhasil dialihkan.',
                'log' => $log,
            ]);
        }

        return back()->with('success', 'Penugasan tugas berhasil dialihkan.');
    }

    /**
     * Batch rebalance multiple tasks.
     */
    public function batch(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_rebalance');

        $rawItems = $request->input('items', []);
        if (is_array($rawItems)) {
            foreach ($rawItems as &$item) {
                if (isset($item['new_assignee_id']) && ($item['new_assignee_id'] === 'none' || $item['new_assignee_id'] === '')) {
                    $item['new_assignee_id'] = null;
                }
            }
            unset($item);
            $request->merge(['items' => $rawItems]);
        }

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.task_id' => ['required', 'string', 'exists:tasks,id'],
            'items.*.new_assignee_id' => ['nullable', 'integer', 'exists:users,id'],
            'items.*.reason' => ['nullable', 'string', 'max:255'],
        ]);

        $logs = $this->balancerService->batchRebalance(
            $organization,
            $request->user(),
            $validated['items']
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => count($logs).' penugasan tugas berhasil diseimbangkan.',
                'logs' => $logs,
            ]);
        }

        return back()->with('success', count($logs).' penugasan tugas berhasil diseimbangkan.');
    }
}
