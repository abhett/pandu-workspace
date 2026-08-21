<?php

namespace App\Http\Controllers;

use App\Models\BoardroomBriefing;
use App\Models\Organization;
use App\Services\Reports\ExecutiveBoardroomService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExecutiveBoardroomController extends Controller
{
    public function __construct(
        protected ExecutiveBoardroomService $boardroomService
    ) {}

    protected function authorizeBoardroomAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_boardroom' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk mengelola briefing dewan direksi.');
        }

        return $organization;
    }

    /**
     * Display Executive KPI Boardroom & Investor Pitch Studio.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeBoardroomAccess($request, 'view');
        $period = $request->query('period');

        $data = $this->boardroomService->getBoardroomDashboard($organization, $period);

        return Inertia::render('organization/reports/boardroom', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'pillars' => $data['pillars'],
            'briefings' => $data['briefings'],
            'selectedPeriod' => $period,
        ]);
    }

    /**
     * Store a new executive briefing.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeBoardroomAccess($request, 'manage_boardroom');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'period' => ['required', 'string', 'max:50'],
            'executive_summary' => ['required', 'string'],
            'strategic_pillars' => ['nullable', 'array'],
            'quarterly_okrs' => ['nullable', 'array'],
        ]);

        $briefing = $this->boardroomService->createBriefing($organization, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Briefing dewan direksi berhasil dibuat.',
                'briefing' => $briefing,
            ], 201);
        }

        return back()->with('success', 'Briefing dewan direksi berhasil dibuat.');
    }

    /**
     * Update an executive briefing.
     */
    public function update(Request $request, BoardroomBriefing $briefing): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeBoardroomAccess($request, 'manage_boardroom');

        if ($briefing->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'period' => ['required', 'string', 'max:50'],
            'executive_summary' => ['required', 'string'],
            'strategic_pillars' => ['nullable', 'array'],
            'quarterly_okrs' => ['nullable', 'array'],
        ]);

        $updated = $this->boardroomService->updateBriefing($briefing, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Briefing dewan direksi berhasil diperbarui.',
                'briefing' => $updated,
            ]);
        }

        return back()->with('success', 'Briefing dewan direksi berhasil diperbarui.');
    }

    /**
     * Finalize an executive briefing.
     */
    public function finalize(Request $request, BoardroomBriefing $briefing): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeBoardroomAccess($request, 'manage_boardroom');

        if ($briefing->organization_id !== $organization->id) {
            abort(404);
        }

        $finalized = $this->boardroomService->finalizeBriefing($briefing, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Briefing dewan direksi berhasil difinalisasi.',
                'briefing' => $finalized,
            ]);
        }

        return back()->with('success', 'Briefing dewan direksi berhasil difinalisasi.');
    }

    /**
     * Delete an executive briefing.
     */
    public function destroy(Request $request, BoardroomBriefing $briefing): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeBoardroomAccess($request, 'manage_boardroom');

        if ($briefing->organization_id !== $organization->id) {
            abort(404);
        }

        $this->boardroomService->deleteBriefing($briefing);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Briefing dewan direksi berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Briefing dewan direksi berhasil dihapus.');
    }
}
