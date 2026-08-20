<?php

namespace App\Http\Controllers;

use App\Models\MemberTimeOffSchedule;
use App\Models\Organization;
use App\Models\Task;
use App\Models\User;
use App\Services\Capacity\ResourceCapacityPlannerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ResourceCapacityController extends Controller
{
    public function __construct(
        protected ResourceCapacityPlannerService $capacityService
    ) {}

    /**
     * Authorize user access to organization capacity planner.
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

        if ($action === 'manage_capacity' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin mengubah konfigurasi kapasitas tim.');
        }

        return $organization;
    }

    /**
     * Display Organization Resource Capacity & Workload Balancing Dashboard.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeOrgAccess($request, 'view');

        $capacityData = $this->capacityService->getOrganizationCapacityOverview($organization);

        $organizationMembers = User::whereIn('id', $organization->memberships()->pluck('user_id'))
            ->select(['id', 'name', 'email'])
            ->orderBy('name')
            ->get();

        return Inertia::render('organization/capacity/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $capacityData['metrics'],
            'memberProfiles' => $capacityData['member_profiles'],
            'timeOffSchedules' => $capacityData['time_off_schedules'],
            'members' => $organizationMembers,
        ]);
    }

    /**
     * Store or update member capacity setting.
     */
    public function storeMemberSetting(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_capacity');

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'weekly_capacity_hours' => ['required', 'numeric', 'min:1', 'max:80'],
            'max_story_points_per_sprint' => ['required', 'numeric', 'min:1', 'max:100'],
            'fte_ratio' => ['required', 'numeric', 'min:0.1', 'max:2.0'],
        ]);

        $setting = $this->capacityService->updateMemberCapacity(
            $organization,
            (int) $validated['user_id'],
            $validated
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Pengaturan kapasitas anggota berhasil diperbarui.',
                'setting' => $setting,
            ]);
        }

        return back()->with('success', 'Pengaturan kapasitas anggota berhasil diperbarui.');
    }

    /**
     * Schedule member time off.
     */
    public function storeTimeOff(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_capacity');

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'type' => ['required', 'string', 'in:vacation,sick_leave,training,public_holiday,other'],
            'title' => ['required', 'string', 'max:100'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'hours_deducted' => ['required', 'numeric', 'min:0', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $schedule = $this->capacityService->scheduleTimeOff(
            $organization,
            (int) $validated['user_id'],
            $validated
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Jadwal cuti berhasil didaftarkan.',
                'schedule' => $schedule,
            ], 201);
        }

        return back()->with('success', 'Jadwal cuti berhasil didaftarkan.');
    }

    /**
     * Delete scheduled time off.
     */
    public function destroyTimeOff(Request $request, MemberTimeOffSchedule $timeOff): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_capacity');

        if ($timeOff->organization_id !== $organization->id) {
            abort(404);
        }

        $this->capacityService->deleteTimeOff($timeOff->id);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Jadwal cuti berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Jadwal cuti berhasil dihapus.');
    }

    /**
     * Rebalance task by reassigning to another team member.
     */
    public function rebalanceTask(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_capacity');

        $validated = $request->validate([
            'task_id' => ['required', 'string', 'exists:tasks,id'],
            'new_assignee_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $task = Task::where('id', $validated['task_id'])->firstOrFail();
        if ($task->organization_id !== $organization->id) {
            abort(404);
        }

        $newAssigneeId = $validated['new_assignee_id'] ? (int) $validated['new_assignee_id'] : null;
        $this->capacityService->rebalanceTask($task, $newAssigneeId);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Penugasan tugas berhasil diseimbangkan.',
                'task' => $task->fresh(),
            ]);
        }

        return back()->with('success', 'Penugasan tugas berhasil diseimbangkan.');
    }
}
