<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Services\Dashboard\WidgetBuilderService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardBuilderController extends Controller
{
    public function __construct(
        protected WidgetBuilderService $builderService
    ) {}

    protected function getActiveOrganization($user): ?Organization
    {
        $orgId = session('current_organization_id') ?? $user->current_organization_id ?? $user->memberships()->value('organization_id');

        return $orgId ? Organization::find($orgId) : null;
    }

    /**
     * Display the Executive BI & Custom Dashboard Builder.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->getActiveOrganization($user);

        $projectId = $request->query('project_id');

        $config = null;
        $metrics = [];
        $projects = collect();

        if ($organization) {
            $config = $this->builderService->getUserConfig($user, $organization);
            $metrics = $this->builderService->computeLiveMetrics($organization, $projectId);

            $projects = Project::where('organization_id', $organization->id)
                ->select(['id', 'name', 'key'])
                ->get();
        }

        return Inertia::render('dashboard/builder', [
            'config' => $config,
            'metrics' => $metrics,
            'projects' => $projects,
            'selectedProjectId' => $projectId,
            'defaultWidgets' => $this->builderService->getDefaultLayout(),
        ]);
    }

    /**
     * Save custom widget layout.
     */
    public function save(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->getActiveOrganization($user);

        if (! $organization) {
            return redirect()->back()->with('error', 'Organisasi aktif tidak ditemukan.');
        }

        $validated = $request->validate([
            'layout' => ['required', 'array'],
            'layout.*.id' => ['required', 'string'],
            'layout.*.type' => ['required', 'string'],
            'layout.*.title' => ['required', 'string'],
            'layout.*.size' => ['required', 'string', 'in:full,half'],
            'layout.*.enabled' => ['required', 'boolean'],
        ]);

        $this->builderService->saveConfig($user, $organization, $validated['layout']);

        return redirect()->back()->with('success', 'Tata letak dashboard BI berhasil disimpan!');
    }

    /**
     * Reset widget layout to default executive template.
     */
    public function reset(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->getActiveOrganization($user);

        if (! $organization) {
            return redirect()->back()->with('error', 'Organisasi aktif tidak ditemukan.');
        }

        $this->builderService->resetConfig($user, $organization);

        return redirect()->back()->with('success', 'Tata letak dashboard BI dikembalikan ke template default!');
    }
}
