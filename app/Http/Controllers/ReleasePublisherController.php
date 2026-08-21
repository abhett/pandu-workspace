<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\ReleasePublication;
use App\Services\Release\ReleasePublisherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReleasePublisherController extends Controller
{
    public function __construct(
        protected ReleasePublisherService $publisherService
    ) {}

    protected function authorizeReleaseAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_releases' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk mengelola atau mempublikasikan catatan rilis.');
        }

        return $organization;
    }

    /**
     * Display Release Publisher Studio.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeReleaseAccess($request, 'view');
        $status = $request->query('status');
        $projectId = $request->query('project_id');

        $data = $this->publisherService->getPublisherDashboard($organization, $status, $projectId);

        return Inertia::render('organization/releases/publisher', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'publications' => $data['publications'],
            'projects' => $data['projects'],
            'sprints' => $data['sprints'],
            'selectedStatus' => $status,
            'selectedProjectId' => $projectId,
        ]);
    }

    /**
     * Generate release notes draft from sprint items.
     */
    public function generate(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeReleaseAccess($request, 'manage_releases');

        $validated = $request->validate([
            'project_id' => ['nullable', 'uuid', 'exists:projects,id'],
            'version_tag' => ['required', 'string', 'max:50'],
            'version_type' => ['required', 'string', 'in:major,minor,patch'],
            'release_title' => ['required', 'string', 'max:200'],
            'executive_summary' => ['required', 'string'],
            'features' => ['nullable'],
            'fixes' => ['nullable'],
            'breaking' => ['nullable'],
            'target_channels' => ['nullable', 'array'],
        ]);

        $publication = $this->publisherService->generateReleaseNotesFromSprint($organization, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Draf catatan rilis {$publication->version_tag} berhasil dibuat.",
                'publication' => $publication,
            ], 201);
        }

        return back()->with('success', "Draf catatan rilis {$publication->version_tag} berhasil dibuat.");
    }

    /**
     * Publish release notes to channels.
     */
    public function publish(Request $request, ReleasePublication $publication): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeReleaseAccess($request, 'manage_releases');

        if ($publication->organization_id !== $organization->id) {
            abort(404);
        }

        $published = $this->publisherService->publishRelease($publication, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Rilis {$published->version_tag} berhasil dipublikasikan ke semua kanal.",
                'publication' => $published,
            ]);
        }

        return back()->with('success', "Rilis {$published->version_tag} berhasil dipublikasikan.");
    }

    /**
     * Update release draft.
     */
    public function update(Request $request, ReleasePublication $publication): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeReleaseAccess($request, 'manage_releases');

        if ($publication->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'version_tag' => ['required', 'string', 'max:50'],
            'version_type' => ['required', 'string', 'in:major,minor,patch'],
            'release_title' => ['required', 'string', 'max:200'],
            'executive_summary' => ['required', 'string'],
            'markdown_content' => ['required', 'string'],
            'target_channels' => ['nullable', 'array'],
        ]);

        $updated = $this->publisherService->updatePublication($publication, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Catatan rilis berhasil diperbarui.',
                'publication' => $updated,
            ]);
        }

        return back()->with('success', 'Catatan rilis berhasil diperbarui.');
    }

    /**
     * Delete a publication.
     */
    public function destroy(Request $request, ReleasePublication $publication): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeReleaseAccess($request, 'manage_releases');

        if ($publication->organization_id !== $organization->id) {
            abort(404);
        }

        $this->publisherService->deletePublication($publication);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Catatan rilis berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Catatan rilis berhasil dihapus.');
    }
}
