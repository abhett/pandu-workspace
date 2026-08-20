<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\WellnessInitiative;
use App\Services\Wellness\TeamMoodPulseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TeamMoodPulseController extends Controller
{
    public function __construct(
        protected TeamMoodPulseService $pulseService
    ) {}

    /**
     * Display team mood, daily pulse and agile wellness radar dashboard.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeOrgAccess($request);
        $range = $request->query('range', '14d');

        $data = $this->pulseService->getDashboard($organization, $request->user(), $range);

        return Inertia::render('organization/pulse/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'range' => $data['range'],
            'my_today_pulse' => $data['my_today_pulse'],
            'metrics' => $data['metrics'],
            'distributions' => $data['distributions'],
            'tag_frequency' => $data['tag_frequency'],
            'tag_catalog' => $data['tag_catalog'],
            'daily_trends' => $data['daily_trends'],
            'recent_feed' => $data['recent_feed'],
            'initiatives' => $data['initiatives'],
        ]);
    }

    /**
     * Submit or update current user's daily mood check-in.
     */
    public function checkIn(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'participate_pulse');

        $validated = $request->validate([
            'mood_score' => ['required', 'integer', 'min:1', 'max:5'],
            'energy_level' => ['nullable', 'integer', 'min:1', 'max:5'],
            'workload_feeling' => ['nullable', 'string', 'in:underworked,manageable,heavy,overwhelmed'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'is_anonymous' => ['nullable', 'boolean'],
        ]);

        $pulse = $this->pulseService->submitDailyPulse($organization, $request->user(), $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Check-in mood harian berhasil disimpan. Terima kasih atas refleksi Anda!',
                'pulse' => $pulse,
            ], 200);
        }

        return back()->with('success', 'Check-in mood harian berhasil disimpan. Terima kasih atas refleksi Anda!');
    }

    /**
     * Store a new wellness initiative.
     */
    public function storeInitiative(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_initiatives');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'category' => ['required', 'string', 'in:workload_adjustment,no_meeting_day,team_building,training_wellness,process_simplification'],
            'status' => ['nullable', 'string', 'in:active,in_progress,completed'],
            'impact_summary' => ['nullable', 'string', 'max:2000'],
            'target_date' => ['nullable', 'date'],
        ]);

        $initiative = $this->pulseService->createInitiative($organization, $request->user(), $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Inisiatif kesejahteraan tim berhasil dibuat.',
                'initiative' => $initiative,
            ], 201);
        }

        return back()->with('success', 'Inisiatif kesejahteraan tim berhasil dibuat.');
    }

    /**
     * Update an existing wellness initiative.
     */
    public function updateInitiative(Request $request, WellnessInitiative $initiative): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_initiatives');

        if ($initiative->organization_id !== $organization->id) {
            abort(404, 'Inisiatif tidak ditemukan.');
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:150'],
            'category' => ['sometimes', 'required', 'string', 'in:workload_adjustment,no_meeting_day,team_building,training_wellness,process_simplification'],
            'status' => ['sometimes', 'required', 'string', 'in:active,in_progress,completed'],
            'impact_summary' => ['nullable', 'string', 'max:2000'],
            'target_date' => ['nullable', 'date'],
        ]);

        $updated = $this->pulseService->updateInitiative($initiative, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Inisiatif berhasil diperbarui.',
                'initiative' => $updated,
            ]);
        }

        return back()->with('success', 'Inisiatif berhasil diperbarui.');
    }

    /**
     * Delete an existing wellness initiative.
     */
    public function destroyInitiative(Request $request, WellnessInitiative $initiative): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_initiatives');

        if ($initiative->organization_id !== $organization->id) {
            abort(404, 'Inisiatif tidak ditemukan.');
        }

        $this->pulseService->destroyInitiative($initiative);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Inisiatif berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Inisiatif berhasil dihapus.');
    }

    protected function authorizeOrgAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if (in_array($action, ['manage_initiatives']) && in_array($role, ['guest', 'member'])) {
            // Only admin/owner/manager can manage company wellness initiatives
            abort(403, 'Hanya Admin atau Manajer yang dapat mengelola inisiatif kesejahteraan tim.');
        }

        return $organization;
    }
}
