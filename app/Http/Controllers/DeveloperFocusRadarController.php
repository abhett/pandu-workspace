<?php

namespace App\Http\Controllers;

use App\Models\FocusTimeRecommendation;
use App\Models\Organization;
use App\Services\Productivity\DeveloperFocusRadarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DeveloperFocusRadarController extends Controller
{
    public function __construct(
        protected DeveloperFocusRadarService $focusService
    ) {}

    protected function authorizeProductivityAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_focus' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk mengelola rekomendasi jam fokus.');
        }

        return $organization;
    }

    /**
     * Display Real-Time Developer Focus & Context Switching Radar.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeProductivityAccess($request, 'view');
        $userId = $request->query('user_id') ? (int) $request->query('user_id') : null;

        $data = $this->focusService->getFocusDashboard($organization, $userId);

        return Inertia::render('organization/productivity/focus', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'dailyTrend' => $data['dailyTrend'],
            'developerRadar' => $data['developerRadar'],
            'recommendations' => $data['recommendations'],
            'members' => $data['members'],
            'selectedUserId' => $userId,
        ]);
    }

    /**
     * Apply a focus time optimization recommendation.
     */
    public function applyRecommendation(Request $request, FocusTimeRecommendation $recommendation): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeProductivityAccess($request, 'manage_focus');

        if ($recommendation->organization_id !== $organization->id) {
            abort(404);
        }

        $this->focusService->applyRecommendation($recommendation, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Rekomendasi blok jam fokus berhasil diterapkan.',
            ]);
        }

        return back()->with('success', 'Rekomendasi blok jam fokus berhasil diterapkan.');
    }

    /**
     * Acknowledge a focus recommendation.
     */
    public function acknowledgeRecommendation(Request $request, FocusTimeRecommendation $recommendation): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeProductivityAccess($request, 'manage_focus');

        if ($recommendation->organization_id !== $organization->id) {
            abort(404);
        }

        $this->focusService->acknowledgeRecommendation($recommendation, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Rekomendasi telah dikonfirmasi.',
            ]);
        }

        return back()->with('success', 'Rekomendasi telah dikonfirmasi.');
    }
}
