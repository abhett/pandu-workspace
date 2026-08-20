<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\Sprint;
use App\Services\Agile\AgileMetricsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function __construct(
        protected AgileMetricsService $metricsService
    ) {}

    /**
     * Display Agile Reports & Flow Metrics Center.
     */
    public function index(Request $request, ?Project $project = null): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if (! $project) {
            $project = Project::where('organization_id', $organization->id)->first();
        }

        if (! $project) {
            return Inertia::render('projects/reports', [
                'organization' => [
                    'id' => $organization->id,
                    'name' => $organization->name,
                ],
                'project' => null,
                'availableProjects' => [],
                'burndown' => null,
                'velocity' => null,
                'cumulativeFlow' => null,
                'cycleTime' => null,
                'activeSprint' => null,
                'availableSprints' => [],
            ]);
        }

        $this->authorizeProjectAccess($request, $project);

        // Fetch selected sprint or active sprint
        $sprintId = $request->query('sprint_id');
        $selectedSprint = null;

        if ($sprintId) {
            $selectedSprint = Sprint::where('project_id', $project->id)->where('id', $sprintId)->first();
        }

        if (! $selectedSprint) {
            $selectedSprint = Sprint::where('project_id', $project->id)
                ->where('status', 'active')
                ->first();
        }

        if (! $selectedSprint) {
            $selectedSprint = Sprint::where('project_id', $project->id)
                ->orderByDesc('sequence')
                ->first();
        }

        $burndown = $selectedSprint ? $this->metricsService->getBurndownData($selectedSprint) : null;
        $velocity = $this->metricsService->getVelocityHistory($project, 5);
        $cumulativeFlow = $this->metricsService->getCumulativeFlow($project, 14);
        $cycleTime = $this->metricsService->getCycleAndLeadTime($project);

        $availableProjects = Project::where('organization_id', $organization->id)
            ->select(['id', 'name', 'key', 'type'])
            ->get();

        $availableSprints = Sprint::where('project_id', $project->id)
            ->orderBy('sequence')
            ->select(['id', 'name', 'status', 'start_date', 'end_date'])
            ->get();

        return Inertia::render('projects/reports', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
                'type' => $project->type,
            ],
            'availableProjects' => $availableProjects,
            'activeSprint' => $selectedSprint ? [
                'id' => $selectedSprint->id,
                'name' => $selectedSprint->name,
                'status' => $selectedSprint->status,
            ] : null,
            'availableSprints' => $availableSprints,
            'burndown' => $burndown,
            'velocity' => $velocity,
            'cumulativeFlow' => $cumulativeFlow,
            'cycleTime' => $cycleTime,
        ]);
    }

    /**
     * Display Team Workload and Capacity Planning.
     */
    public function workload(Request $request, ?Project $project = null): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if (! $project) {
            $project = Project::where('organization_id', $organization->id)->first();
        }

        if (! $project) {
            return Inertia::render('projects/workload', [
                'organization' => [
                    'id' => $organization->id,
                    'name' => $organization->name,
                ],
                'project' => null,
                'workload' => null,
                'availableProjects' => [],
                'availableSprints' => [],
                'activeSprint' => null,
            ]);
        }

        $this->authorizeProjectAccess($request, $project);

        $sprintId = $request->query('sprint_id');
        $selectedSprint = null;

        if ($sprintId) {
            $selectedSprint = Sprint::where('project_id', $project->id)->where('id', $sprintId)->first();
        } else {
            $selectedSprint = Sprint::where('project_id', $project->id)->where('status', 'active')->first();
        }

        $workload = $this->metricsService->getWorkloadCapacity($project, $selectedSprint);

        $availableProjects = Project::where('organization_id', $organization->id)
            ->select(['id', 'name', 'key', 'type'])
            ->get();

        $availableSprints = Sprint::where('project_id', $project->id)
            ->orderBy('sequence')
            ->select(['id', 'name', 'status', 'start_date', 'end_date'])
            ->get();

        return Inertia::render('projects/workload', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
                'type' => $project->type,
            ],
            'workload' => $workload,
            'availableProjects' => $availableProjects,
            'activeSprint' => $selectedSprint ? [
                'id' => $selectedSprint->id,
                'name' => $selectedSprint->name,
                'status' => $selectedSprint->status,
            ] : null,
            'availableSprints' => $availableSprints,
        ]);
    }

    protected function authorizeProjectAccess(Request $request, Project $project): void
    {
        $user = $request->user();
        $isMember = $user->organizations()
            ->where('organizations.id', $project->organization_id)
            ->wherePivot('status', 'active')
            ->exists();

        if (! $isMember) {
            abort(403, 'Anda tidak memiliki akses ke proyek ini.');
        }
    }
}
