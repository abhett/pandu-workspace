<?php

namespace App\Http\Controllers;

use App\Models\OncallPagingLog;
use App\Models\OncallSchedule;
use App\Models\Organization;
use App\Services\Sre\OncallScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OncallScheduleController extends Controller
{
    public function __construct(
        protected OncallScheduleService $oncallService
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
            abort(403, 'Role Guest tidak memiliki izin mengelola on-call schedule.');
        }

        return $organization;
    }

    /**
     * Display the On-Call Rotation & Escalation Policy Studio.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeAccess($request, 'view');
        $data = $this->oncallService->getDashboard($organization, $request->user());

        return Inertia::render('organization/sre/oncall', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'current_oncall' => $data['current_oncall'],
            'schedules' => $data['schedules'],
            'paging_logs' => $data['paging_logs'],
            'org_members' => $data['org_members'],
        ]);
    }

    /**
     * Store a new on-call schedule.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:200'],
            'rotation_type' => ['required', 'string', 'in:weekly,biweekly,monthly'],
            'members' => ['nullable', 'array'],
            'members.*.user_id' => ['nullable', 'integer'],
            'members.*.name' => ['nullable', 'string'],
            'members.*.email' => ['nullable', 'string'],
            'members.*.order' => ['nullable', 'integer'],
            'escalation_policy' => ['nullable', 'array'],
            'escalation_policy.*.level' => ['required', 'integer'],
            'escalation_policy.*.target' => ['required', 'string'],
            'escalation_policy.*.timeout_minutes' => ['required', 'integer', 'min:1'],
            'status' => ['nullable', 'string', 'in:active,paused'],
        ]);

        $schedule = $this->oncallService->createSchedule($organization, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Jadwal on-call berhasil dibuat.',
                'schedule' => $schedule,
            ], 201);
        }

        return back()->with('success', 'Jadwal on-call berhasil dibuat.');
    }

    /**
     * Trigger a paging event.
     */
    public function page(Request $request, OncallSchedule $schedule): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        if ($schedule->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'trigger_reason' => ['required', 'string', 'max:300'],
            'escalation_level' => ['nullable', 'integer', 'min:1', 'max:5'],
        ]);

        $log = $this->oncallService->triggerPage($schedule, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Paging alert berhasil dikirim ke on-call engineer.',
                'log' => $log,
            ], 201);
        }

        return back()->with('success', 'Paging alert berhasil dikirim.');
    }

    /**
     * Acknowledge paging log.
     */
    public function acknowledge(Request $request, OncallPagingLog $log): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        if ($log->schedule->organization_id !== $organization->id) {
            abort(404);
        }

        $updated = $this->oncallService->acknowledgePage($log, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Paging berhasil di-acknowledge.',
                'log' => $updated,
            ]);
        }

        return back()->with('success', 'Paging berhasil di-acknowledge.');
    }

    /**
     * Resolve paging log.
     */
    public function resolve(Request $request, OncallPagingLog $log): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        if ($log->schedule->organization_id !== $organization->id) {
            abort(404);
        }

        $updated = $this->oncallService->resolvePage($log, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Paging berhasil di-resolve.',
                'log' => $updated,
            ]);
        }

        return back()->with('success', 'Paging berhasil di-resolve.');
    }

    /**
     * Delete an on-call schedule.
     */
    public function destroy(Request $request, OncallSchedule $schedule): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        if ($schedule->organization_id !== $organization->id) {
            abort(404);
        }

        $this->oncallService->deleteSchedule($schedule);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Jadwal on-call berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Jadwal on-call berhasil dihapus.');
    }
}
