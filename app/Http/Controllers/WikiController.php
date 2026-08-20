<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\WikiPage;
use App\Models\WikiSpace;
use App\Services\Wiki\WikiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class WikiController extends Controller
{
    public function __construct(
        protected WikiService $wikiService
    ) {}

    /**
     * Display the Wiki & Documentation Hub.
     */
    public function index(Request $request, ?Project $project = null): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($project && $project->organization_id !== $organization->id) {
            abort(404);
        }

        $treeData = $this->wikiService->getWikiTree($organization, $project, $user);

        // Find active page (either requested, or first favorite, or first page in first space)
        $activePageId = $request->input('page_id');
        $activePage = null;

        if ($activePageId) {
            $activePage = WikiPage::where('id', $activePageId)->with(['space', 'creator:id,name,avatar', 'lastEditor:id,name,avatar', 'revisions.author:id,name,avatar'])->first();
        }

        if (! $activePage && $treeData['favorites']->isNotEmpty()) {
            $activePage = $treeData['favorites']->first();
        }

        if (! $activePage && ! empty($treeData['spaces'])) {
            $firstSpace = $treeData['spaces']->first();
            if ($firstSpace && $firstSpace->pages->isNotEmpty()) {
                $activePage = $firstSpace->pages->first();
            }
        }

        if ($activePage && ! $activePage->relationLoaded('revisions')) {
            $activePage->load(['space', 'creator:id,name,avatar', 'lastEditor:id,name,avatar', 'revisions.author:id,name,avatar']);
        }

        return Inertia::render('wiki/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'project' => $project ? [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
            ] : null,
            'spaces' => $treeData['spaces'],
            'favorites' => $treeData['favorites'],
            'active_page' => $activePage,
        ]);
    }

    /**
     * Show a specific wiki page.
     */
    public function show(Request $request, WikiPage $page): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($page->space->organization_id !== $organization->id) {
            abort(404);
        }

        $treeData = $this->wikiService->getWikiTree($organization, null, $user);
        $page->load(['space', 'creator:id,name,avatar', 'lastEditor:id,name,avatar', 'revisions.author:id,name,avatar']);

        return Inertia::render('wiki/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'project' => null,
            'spaces' => $treeData['spaces'],
            'favorites' => $treeData['favorites'],
            'active_page' => $page,
        ]);
    }

    /**
     * Store a new wiki space.
     */
    public function storeSpace(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $validated = $request->validate([
            'project_id' => ['nullable', 'string', 'exists:projects,id'],
            'name' => ['required', 'string', 'max:100'],
            'icon' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
        ]);

        $space = WikiSpace::create([
            'organization_id' => $organization->id,
            'project_id' => $validated['project_id'] ?? null,
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']),
            'icon' => $validated['icon'] ?? 'folder',
            'description' => $validated['description'] ?? null,
            'created_by' => $user->id,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Spasi dokumentasi berhasil dibuat.',
                'space' => $space,
            ]);
        }

        return back()->with('success', 'Spasi dokumentasi berhasil dibuat.');
    }

    /**
     * Store a new wiki page.
     */
    public function storePage(Request $request, WikiSpace $space): JsonResponse|RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'parent_id' => ['nullable', 'string', 'exists:wiki_pages,id'],
            'title' => ['required', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:50'],
            'content' => ['nullable', 'string'],
            'is_favorite' => ['boolean'],
        ]);

        $page = $this->wikiService->createPage($space, $user, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Dokumen berhasil dibuat.',
                'page' => $page,
            ]);
        }

        return redirect()->route('wiki.pages.show', $page->id)->with('success', 'Dokumen berhasil dibuat.');
    }

    /**
     * Update an existing wiki page.
     */
    public function updatePage(Request $request, WikiPage $page): JsonResponse|RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:50'],
            'content' => ['nullable', 'string'],
        ]);

        $updated = $this->wikiService->updatePage($page, $user, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Dokumen berhasil diperbarui.',
                'page' => $updated,
            ]);
        }

        return back()->with('success', 'Dokumen berhasil diperbarui.');
    }

    /**
     * Delete a wiki page.
     */
    public function destroyPage(Request $request, WikiPage $page): JsonResponse|RedirectResponse
    {
        $this->wikiService->deletePage($page);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Dokumen berhasil dihapus.',
            ]);
        }

        return redirect()->route('wiki.index')->with('success', 'Dokumen berhasil dihapus.');
    }

    /**
     * Toggle favorite flag on a wiki page.
     */
    public function toggleFavorite(Request $request, WikiPage $page): JsonResponse|RedirectResponse
    {
        $updated = $this->wikiService->toggleFavorite($page);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'is_favorite' => $updated->is_favorite,
            ]);
        }

        return back()->with('success', $updated->is_favorite ? 'Dokumen ditambahkan ke favorit.' : 'Dokumen dihapus dari favorit.');
    }
}
