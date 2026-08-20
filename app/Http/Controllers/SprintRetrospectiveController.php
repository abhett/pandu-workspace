<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\RetrospectiveItem;
use App\Models\Sprint;
use App\Models\SprintRetrospective;
use App\Services\Agile\SprintRetrospectiveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SprintRetrospectiveController extends Controller
{
    public function __construct(
        protected SprintRetrospectiveService $retroService
    ) {}

    /**
     * Display list of retrospective sessions for a project.
     */
    public function index(Request $request, Project $project): Response
    {
        $organization = $this->authorizeProjectAccess($request, $project);

        $data = $this->retroService->getProjectRetrospectives($project);
        $sprints = Sprint::where('project_id', $project->id)
            ->select(['id', 'name', 'status'])
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('projects/retrospectives/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
            ],
            'metrics' => $data['metrics'],
            'retrospectives' => $data['retrospectives'],
            'format_definitions' => $data['format_definitions'],
            'sprints' => $sprints,
        ]);
    }

    /**
     * Display the interactive retrospective board.
     */
    public function show(Request $request, Project $project, SprintRetrospective $retrospective): Response
    {
        $organization = $this->authorizeProjectAccess($request, $project);

        if ($retrospective->project_id !== $project->id) {
            abort(404, 'Sesi retrospektif tidak ditemukan dalam proyek ini.');
        }

        $detail = $this->retroService->getRetrospectiveDetail($retrospective, $request->user());
        $members = $organization->members()
            ->select(['users.id', 'users.name', 'users.avatar'])
            ->get();

        return Inertia::render('projects/retrospectives/show', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
            ],
            'retrospective' => $detail['retrospective'],
            'format_metadata' => $detail['format_metadata'],
            'items' => $detail['items'],
            'members' => $members,
        ]);
    }

    /**
     * Create a new retrospective session.
     */
    public function store(Request $request, Project $project): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_retrospectives');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'format' => ['required', 'string', 'in:what_went_well,start_stop_continue,mad_sad_glad,sailor_boat'],
            'sprint_id' => ['nullable', 'string', 'exists:sprints,id'],
            'is_anonymous' => ['nullable', 'boolean'],
        ]);

        $retro = $this->retroService->createRetrospective($project, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Sesi retrospektif berhasil dibuat.',
                'retrospective' => $retro,
            ], 201);
        }

        return redirect("/projects/{$project->id}/retrospectives/{$retro->id}")
            ->with('success', 'Sesi retrospektif berhasil dibuat.');
    }

    /**
     * Update a retrospective session.
     */
    public function update(Request $request, Project $project, SprintRetrospective $retrospective): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_retrospectives');

        if ($retrospective->project_id !== $project->id) {
            abort(404, 'Sesi retrospektif tidak ditemukan.');
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:150'],
            'format' => ['sometimes', 'required', 'string', 'in:what_went_well,start_stop_continue,mad_sad_glad,sailor_boat'],
            'status' => ['sometimes', 'required', 'string', 'in:draft,active,discussing,closed'],
            'sprint_id' => ['nullable', 'string', 'exists:sprints,id'],
            'is_anonymous' => ['nullable', 'boolean'],
            'sentiment_score' => ['nullable', 'numeric', 'min:1', 'max:5'],
            'summary_notes' => ['nullable', 'string'],
        ]);

        $updated = $this->retroService->updateRetrospective($retrospective, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Sesi retrospektif berhasil diperbarui.',
                'retrospective' => $updated,
            ]);
        }

        return back()->with('success', 'Sesi retrospektif berhasil diperbarui.');
    }

    /**
     * Close a retrospective session with sentiment score and summary notes.
     */
    public function close(Request $request, Project $project, SprintRetrospective $retrospective): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_retrospectives');

        if ($retrospective->project_id !== $project->id) {
            abort(404, 'Sesi retrospektif tidak ditemukan.');
        }

        $validated = $request->validate([
            'sentiment_score' => ['required', 'numeric', 'min:1', 'max:5'],
            'summary_notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $closed = $this->retroService->closeRetrospective(
            $retrospective,
            (float) $validated['sentiment_score'],
            $validated['summary_notes'] ?? null
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Sesi retrospektif resmi ditutup.',
                'retrospective' => $closed,
            ]);
        }

        return back()->with('success', 'Sesi retrospektif resmi ditutup.');
    }

    /**
     * Delete a retrospective session.
     */
    public function destroy(Request $request, Project $project, SprintRetrospective $retrospective): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_retrospectives');

        if ($retrospective->project_id !== $project->id) {
            abort(404, 'Sesi retrospektif tidak ditemukan.');
        }

        $retrospective->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Sesi retrospektif berhasil dihapus.',
            ]);
        }

        return redirect("/projects/{$project->id}/retrospectives")
            ->with('success', 'Sesi retrospektif berhasil dihapus.');
    }

    /**
     * Store feedback item into retrospective board.
     */
    public function storeItem(Request $request, Project $project, SprintRetrospective $retrospective): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'participate_retrospective');

        if ($retrospective->project_id !== $project->id) {
            abort(404, 'Sesi retrospektif tidak ditemukan.');
        }

        $validated = $request->validate([
            'category' => ['required', 'string', 'max:50'],
            'content' => ['required', 'string', 'max:2000'],
            'is_action_item' => ['nullable', 'boolean'],
            'action_owner_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $item = $this->retroService->createItem($retrospective, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Catatan berhasil ditambahkan.',
                'item' => $item,
            ], 201);
        }

        return back()->with('success', 'Catatan berhasil ditambahkan.');
    }

    /**
     * Delete feedback item from retrospective board.
     */
    public function destroyItem(Request $request, Project $project, RetrospectiveItem $item): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'participate_retrospective');

        $this->retroService->deleteItem($item);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Catatan berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Catatan berhasil dihapus.');
    }

    /**
     * Toggle a dot vote on a retrospective feedback item.
     */
    public function voteItem(Request $request, Project $project, RetrospectiveItem $item): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project, 'participate_retrospective');

        $result = $this->retroService->toggleVote($item, $request->user());

        return response()->json($result);
    }

    /**
     * Convert an action item to a real project task.
     */
    public function convertToTask(Request $request, Project $project, RetrospectiveItem $item): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_retrospectives');

        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'in:task,bug,story,improvement'],
            'priority' => ['nullable', 'string', 'in:lowest,low,medium,high,highest,urgent'],
            'assignee_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $task = $this->retroService->convertActionItemToTask($item, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Action item berhasil dikonversi ke tiket tugas {$task->key}.",
                'task' => $task,
            ], 201);
        }

        return back()->with('success', "Action item berhasil dikonversi ke tiket tugas {$task->key}.");
    }

    protected function authorizeProjectAccess(Request $request, Project $project, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($project->organization_id !== $organization->id) {
            abort(404);
        }

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke proyek ini.');
        }

        if (in_array($action, ['manage_retrospectives', 'participate_retrospective']) && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin mengelola atau mengisi retrospektif.');
        }

        return $organization;
    }
}
