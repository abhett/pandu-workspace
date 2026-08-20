<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\Release;
use App\Models\Sprint;
use App\Services\Releases\ReleaseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReleaseController extends Controller
{
    public function __construct(
        protected ReleaseService $releaseService
    ) {}

    protected function getActiveOrganization($user): ?Organization
    {
        $orgId = session('current_organization_id') ?? $user->current_organization_id ?? $user->memberships()->value('organization_id');

        return $orgId ? Organization::find($orgId) : null;
    }

    /**
     * Display the internal release management hub.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->getActiveOrganization($user);

        $projectId = $request->query('project_id');

        $releases = collect();
        $projects = collect();
        $sprints = collect();

        if ($organization) {
            $releases = $this->releaseService->getOrganizationReleases($organization, $projectId);

            $projects = Project::where('organization_id', $organization->id)
                ->select(['id', 'name', 'key'])
                ->get();

            $sprints = Sprint::whereHas('project', fn ($q) => $q->where('organization_id', $organization->id))
                ->select(['id', 'name', 'project_id', 'status'])
                ->orderByDesc('created_at')
                ->get();
        }

        return Inertia::render('releases/index', [
            'releases' => $releases,
            'projects' => $projects,
            'sprints' => $sprints,
            'selectedProjectId' => $projectId,
        ]);
    }

    /**
     * Store a new release draft.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->getActiveOrganization($user);

        if (! $organization) {
            return redirect()->back()->with('error', 'Organisasi aktif tidak ditemukan.');
        }

        $validated = $request->validate([
            'version' => ['required', 'string', 'max:32'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'type' => ['required', 'string', 'in:major,minor,patch,hotfix'],
            'project_id' => ['nullable', 'uuid', 'exists:projects,id'],
            'is_public' => ['boolean'],
            'content' => ['nullable', 'array'],
        ]);

        Release::create([
            'organization_id' => $organization->id,
            'project_id' => $validated['project_id'] ?? null,
            'created_by' => $user->id,
            'version' => $validated['version'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'type' => $validated['type'],
            'status' => 'draft',
            'is_public' => $validated['is_public'] ?? true,
            'content' => $validated['content'] ?? [
                'new_features' => [],
                'improvements' => [],
                'bug_fixes' => [],
                'breaking_changes' => [],
            ],
        ]);

        return redirect()->back()->with('success', 'Draft catatan rilis berhasil dibuat!');
    }

    /**
     * Update an existing release.
     */
    public function update(Request $request, Release $release): RedirectResponse
    {
        $validated = $request->validate([
            'version' => ['required', 'string', 'max:32'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'type' => ['required', 'string', 'in:major,minor,patch,hotfix'],
            'status' => ['required', 'string', 'in:draft,published,archived'],
            'is_public' => ['boolean'],
            'content' => ['nullable', 'array'],
        ]);

        $release->update([
            'version' => $validated['version'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'type' => $validated['type'],
            'status' => $validated['status'],
            'is_public' => $validated['is_public'] ?? true,
            'content' => $validated['content'] ?? $release->content,
            'published_at' => $validated['status'] === 'published' && ! $release->published_at ? now() : $release->published_at,
        ]);

        return redirect()->back()->with('success', 'Catatan rilis berhasil diperbarui!');
    }

    /**
     * Publish a release.
     */
    public function publish(Request $request, Release $release): RedirectResponse
    {
        $release->update([
            'status' => 'published',
            'published_at' => now(),
            'is_public' => $request->boolean('is_public', true),
        ]);

        return redirect()->back()->with('success', "Rilis {$release->version} berhasil dipublikasikan!");
    }

    /**
     * Delete a release.
     */
    public function destroy(Release $release): RedirectResponse
    {
        $release->delete();

        return redirect()->back()->with('success', 'Catatan rilis berhasil dihapus.');
    }

    /**
     * Auto-generate release notes from a sprint using AI categorization.
     */
    public function generate(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'sprint_id' => ['required', 'uuid', 'exists:sprints,id'],
            'version' => ['required', 'string', 'max:32'],
            'type' => ['required', 'string', 'in:major,minor,patch,hotfix'],
        ]);

        $sprint = Sprint::with('project')->findOrFail($validated['sprint_id']);

        $this->releaseService->generateFromSprint(
            $sprint,
            $validated['version'],
            $validated['type'],
            $user
        );

        return redirect()->back()->with('success', "Draft catatan rilis untuk {$validated['version']} berhasil diekstrak dari sprint!");
    }
}
