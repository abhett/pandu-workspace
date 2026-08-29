<?php

namespace App\Services\Wiki;

use App\Models\Organization;
use App\Models\Project;
use App\Models\User;
use App\Models\WikiPage;
use App\Models\WikiPageRevision;
use App\Models\WikiSpace;
use Database\Seeders\WikiDocumentationSeeder;
use Illuminate\Support\Str;

class WikiService
{
    /**
     * Get wiki hierarchy tree with spaces, nested pages, and favorites.
     *
     * @return array<string, mixed>
     */
    public function getWikiTree(Organization $organization, ?Project $project = null, ?User $actor = null): array
    {
        $spacesQuery = WikiSpace::where('organization_id', $organization->id);

        if ($project) {
            $spacesQuery->where(function ($q) use ($project) {
                $q->whereNull('project_id')->orWhere('project_id', $project->id);
            });
        }

        $spaces = $spacesQuery->with([
            'pages' => function ($q) {
                $q->whereNull('parent_id')->with(['children.children', 'lastEditor:id,name,email'])->orderBy('title');
            },
        ])->orderBy('name')->get();

        // If org has 0 spaces, initialize default space
        if ($spaces->isEmpty() && $actor) {
            $this->createDefaultSpaces($organization, $project, $actor);
            $spaces = $spacesQuery->with([
                'pages' => function ($q) {
                    $q->whereNull('parent_id')->with(['children.children', 'lastEditor:id,name,email'])->orderBy('title');
                },
            ])->orderBy('name')->get();
        }

        // Pinned Favorites
        $favorites = WikiPage::whereHas('space', function ($q) use ($organization, $project) {
            $q->where('organization_id', $organization->id);
            if ($project) {
                $q->where(function ($sub) use ($project) {
                    $sub->whereNull('project_id')->orWhere('project_id', $project->id);
                });
            }
        })
            ->where('is_favorite', true)
            ->with(['space:id,name,slug', 'lastEditor:id,name,email'])
            ->orderBy('title')
            ->get();

        return [
            'spaces' => $spaces,
            'favorites' => $favorites,
        ];
    }

    /**
     * Create default spaces and welcoming documentation pages for a workspace.
     */
    public function createDefaultSpaces(Organization $organization, ?Project $project, User $actor): WikiSpace
    {
        $seeder = app(WikiDocumentationSeeder::class);
        $seeder->seedSpacesForOrganization($organization, $actor);

        $space = WikiSpace::where('organization_id', $organization->id)->first();

        return $space ? $space->fresh(['pages.children']) : WikiSpace::create([
            'organization_id' => $organization->id,
            'project_id' => $project?->id,
            'name' => 'Dokumentasi Utama',
            'slug' => 'dokumentasi-utama',
            'icon' => 'folder',
            'description' => 'Pusat pengetahuan dan panduan kerja tim.',
            'created_by' => $actor->id,
        ]);
    }

    /**
     * Create a new wiki page.
     *
     * @param  array<string, mixed>  $data
     */
    public function createPage(WikiSpace $space, User $user, array $data): WikiPage
    {
        $title = trim($data['title']);
        $slug = Str::slug($title);

        $page = WikiPage::create([
            'wiki_space_id' => $space->id,
            'parent_id' => $data['parent_id'] ?? null,
            'title' => $title,
            'slug' => $slug !== '' ? $slug : 'untitled-doc',
            'icon' => $data['icon'] ?? 'description',
            'content' => $data['content'] ?? '',
            'is_favorite' => (bool) ($data['is_favorite'] ?? false),
            'version' => 1,
            'created_by' => $user->id,
            'last_edited_by' => $user->id,
        ]);

        // Record initial revision
        WikiPageRevision::create([
            'wiki_page_id' => $page->id,
            'user_id' => $user->id,
            'version' => 1,
            'title' => $title,
            'content' => $data['content'] ?? '',
        ]);

        return $page;
    }

    /**
     * Update an existing wiki page and record a new revision snapshot.
     *
     * @param  array<string, mixed>  $data
     */
    public function updatePage(WikiPage $page, User $user, array $data): WikiPage
    {
        $newVersion = $page->version + 1;
        $title = isset($data['title']) ? trim($data['title']) : $page->title;

        $page->update([
            'title' => $title,
            'slug' => Str::slug($title),
            'icon' => $data['icon'] ?? $page->icon,
            'content' => $data['content'] ?? $page->content,
            'version' => $newVersion,
            'last_edited_by' => $user->id,
        ]);

        WikiPageRevision::create([
            'wiki_page_id' => $page->id,
            'user_id' => $user->id,
            'version' => $newVersion,
            'title' => $title,
            'content' => $page->content,
        ]);

        return $page->fresh(['space', 'creator', 'lastEditor', 'revisions.author']);
    }

    /**
     * Toggle favorite status of a page.
     */
    public function toggleFavorite(WikiPage $page): WikiPage
    {
        $page->update([
            'is_favorite' => ! $page->is_favorite,
        ]);

        return $page->fresh();
    }

    /**
     * Delete a wiki page.
     */
    public function deletePage(WikiPage $page): void
    {
        $page->delete();
    }
}
