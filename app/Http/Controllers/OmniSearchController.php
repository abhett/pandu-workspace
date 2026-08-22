<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Services\Search\OmniSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OmniSearchController extends Controller
{
    public function __construct(
        protected OmniSearchService $searchService
    ) {}

    protected function authorizeSearchAccess(Request $request): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        return $organization;
    }

    /**
     * Display Unified Search Explorer & Spotlight Omnibar.
     */
    public function index(Request $request): Response|JsonResponse
    {
        $organization = $this->authorizeSearchAccess($request);
        $query = $request->query('q');
        $category = $request->query('category');

        $data = $this->searchService->getSearchExplorer($organization, $request->user(), $query, $category);

        if ($request->wantsJson()) {
            return response()->json($data);
        }

        return Inertia::render('search/omnibar', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'query' => $data['query'],
            'selectedCategory' => $data['selectedCategory'],
            'results' => $data['results'],
            'counts' => $data['counts'],
            'recentSearches' => $data['recentSearches'],
            'trendingQueries' => $data['trendingQueries'],
        ]);
    }

    /**
     * Fast JSON query for Command Palette / ⌘K Spotlight.
     */
    public function query(Request $request): JsonResponse
    {
        $organization = $this->authorizeSearchAccess($request);
        $query = $request->input('q', '');
        $category = $request->input('category');

        $result = $this->searchService->search($organization, $query, $category, 15);

        return response()->json([
            'success' => true,
            'query' => $query,
            'results' => $result['results'],
            'counts' => $result['counts'],
        ]);
    }

    /**
     * Record search result click.
     */
    public function recordClick(Request $request): JsonResponse
    {
        $organization = $this->authorizeSearchAccess($request);

        $validated = $request->validate([
            'query' => ['required', 'string', 'max:255'],
            'clicked_entity_type' => ['required', 'string', 'max:50'],
            'clicked_entity_id' => ['required', 'string', 'max:100'],
        ]);

        $this->searchService->recordSearch(
            $organization,
            $request->user(),
            $validated['query'],
            1,
            $validated['clicked_entity_type'],
            $validated['clicked_entity_id']
        );

        return response()->json(['success' => true]);
    }

    /**
     * Clear search history for user.
     */
    public function clearHistory(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSearchAccess($request);

        $this->searchService->clearSearchHistory($organization, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Riwayat pencarian berhasil dibersihkan.',
            ]);
        }

        return back()->with('success', 'Riwayat pencarian berhasil dibersihkan.');
    }
}
