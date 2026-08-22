<?php

namespace App\Http\Controllers;

use App\Models\ChaosExperiment;
use App\Models\Organization;
use App\Services\Sre\ChaosGameDayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChaosGameDayController extends Controller
{
    public function __construct(
        protected ChaosGameDayService $gameDayService
    ) {}

    protected function authorizeSreAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if (in_array($action, ['manage', 'run']) && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk mengelola atau menjalankan eksperimen Chaos GameDay.');
        }

        return $organization;
    }

    /**
     * Display Chaos Engineering GameDay Studio.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeSreAccess($request, 'view');
        $data = $this->gameDayService->getGameDayDashboard($organization, $request->user());

        return Inertia::render('organization/sre/chaos-gameday', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'scenariosCatalog' => $data['scenariosCatalog'],
            'experiments' => $data['experiments'],
        ]);
    }

    /**
     * Create new chaos experiment.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSreAccess($request, 'manage');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'target_service' => ['required', 'string', 'max:100'],
            'fault_type' => ['required', 'string', 'in:pool_exhaustion,latency_injection,service_blackhole,packet_loss,cpu_spike'],
            'environment' => ['required', 'string', 'in:staging,preprod,canary'],
            'hypothesis' => ['required', 'string'],
            'safety_tripwire' => ['nullable', 'array'],
        ]);

        $experiment = $this->gameDayService->createExperiment($organization, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Eksperimen Chaos GameDay berhasil dibuat.',
                'experiment' => $experiment,
            ], 201);
        }

        return back()->with('success', 'Eksperimen Chaos GameDay berhasil dibuat.');
    }

    /**
     * Run chaos experiment drill simulation.
     */
    public function run(Request $request, ChaosExperiment $experiment): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSreAccess($request, 'run');

        if ($experiment->organization_id !== $organization->id) {
            abort(404);
        }

        $executed = $this->gameDayService->runExperiment($experiment, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Simulasi Chaos GameDay drill sukses dieksekusi.',
                'experiment' => $executed,
            ]);
        }

        return back()->with('success', 'Simulasi Chaos GameDay drill sukses dieksekusi.');
    }

    /**
     * Abort running chaos experiment.
     */
    public function abort(Request $request, ChaosExperiment $experiment): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSreAccess($request, 'run');

        if ($experiment->organization_id !== $organization->id) {
            abort(404);
        }

        $aborted = $this->gameDayService->abortExperiment($experiment, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Drill Chaos berhasil dibatalkan.',
                'experiment' => $aborted,
            ]);
        }

        return back()->with('success', 'Drill Chaos berhasil dibatalkan.');
    }

    /**
     * Delete chaos experiment.
     */
    public function destroy(Request $request, ChaosExperiment $experiment): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSreAccess($request, 'manage');

        if ($experiment->organization_id !== $organization->id) {
            abort(404);
        }

        $this->gameDayService->deleteExperiment($experiment);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Eksperimen Chaos berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Eksperimen Chaos berhasil dihapus.');
    }
}
