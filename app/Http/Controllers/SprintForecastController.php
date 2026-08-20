<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\ProjectForecastScenario;
use App\Services\Agile\SprintForecastService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SprintForecastController extends Controller
{
    public function __construct(
        protected SprintForecastService $forecastService
    ) {}

    /**
     * Display Sprint Velocity Forecast, Monte Carlo Simulation & Release Readiness dashboard.
     */
    public function index(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        $scenarioId = $request->query('scenario');
        $data = $this->forecastService->getForecastDashboard($project, $scenarioId);

        return Inertia::render('projects/forecast/index', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
            ],
            'historical_sprints' => $data['historical_sprints'],
            'velocity_metrics' => $data['velocity_metrics'],
            'backlog_stats' => $data['backlog_stats'],
            'simulation' => $data['simulation'],
            'scenarios' => $data['scenarios'],
        ]);
    }

    /**
     * Run an on-the-fly Monte Carlo simulation with dynamic parameters.
     */
    public function simulate(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project);

        $validated = $request->validate([
            'target_points' => ['required', 'numeric', 'min:1', 'max:50000'],
            'simulation_runs' => ['nullable', 'integer', 'min:100', 'max:5000'],
            'historical_sprints_count' => ['nullable', 'integer', 'min:1', 'max:20'],
            'sprint_duration_days' => ['nullable', 'integer', 'min:1', 'max:60'],
            'start_date' => ['nullable', 'date'],
        ]);

        $result = $this->forecastService->runMonteCarloSimulation($project, $validated);

        return response()->json([
            'success' => true,
            'simulation' => $result,
        ]);
    }

    /**
     * Store a saved forecast scenario.
     */
    public function storeScenario(Request $request, Project $project): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'save_scenario');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'target_scope_type' => ['nullable', 'string', 'in:remaining_backlog,sprint_scope,custom_points'],
            'target_points' => ['required', 'numeric', 'min:1', 'max:50000'],
            'simulation_runs' => ['nullable', 'integer', 'min:100', 'max:5000'],
            'historical_sprints_count' => ['nullable', 'integer', 'min:1', 'max:20'],
            'sprint_duration_days' => ['nullable', 'integer', 'min:1', 'max:60'],
            'start_date' => ['nullable', 'date'],
        ]);

        $scenario = $this->forecastService->saveScenario($project, $request->user(), $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Skenario prakiraan Monte Carlo berhasil disimpan.',
                'scenario' => $scenario,
            ], 201);
        }

        return back()->with('success', 'Skenario prakiraan Monte Carlo berhasil disimpan.');
    }

    /**
     * Delete a saved forecast scenario.
     */
    public function destroyScenario(Request $request, Project $project, ProjectForecastScenario $scenario): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'save_scenario');

        if ($scenario->project_id !== $project->id) {
            abort(404, 'Skenario tidak ditemukan dalam proyek ini.');
        }

        $this->forecastService->destroyScenario($scenario);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Skenario berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Skenario berhasil dihapus.');
    }

    protected function authorizeProjectAccess(Request $request, Project $project, string $action = 'view'): void
    {
        $user = $request->user();
        $org = Organization::where('id', (string) $project->organization_id)->firstOrFail();
        $role = $user->roleInOrganization($org);

        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi proyek ini.');
        }

        if (in_array($action, ['save_scenario']) && in_array($role, ['guest'])) {
            abort(403, 'Tamu (Guest) tidak memiliki izin untuk menyimpan skenario prakiraan.');
        }
    }
}
