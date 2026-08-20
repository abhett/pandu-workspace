<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\PlanningPokerSession;
use App\Models\Project;
use App\Models\Task;
use App\Services\Agile\PlanningPokerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlanningPokerController extends Controller
{
    public function __construct(
        protected PlanningPokerService $pokerService
    ) {}

    /**
     * Display listing of planning poker sessions in a project.
     */
    public function index(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        $data = $this->pokerService->getProjectSessions($project);

        return Inertia::render('projects/planning-poker/index', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
            ],
            'sprints' => $project->sprints()->select('id', 'name', 'status')->get(),
            'sessions' => $data['sessions'],
            'metrics' => $data['metrics'],
            'deck_definitions' => $data['deck_definitions'],
        ]);
    }

    /**
     * Show live interactive planning poker estimation room.
     */
    public function show(Request $request, Project $project, PlanningPokerSession $session): Response
    {
        $this->authorizeProjectAccess($request, $project);

        if ($session->project_id !== $project->id) {
            abort(404, 'Sesi Planning Poker tidak ditemukan dalam proyek ini.');
        }

        $data = $this->pokerService->getSessionDetail($session, $request->user());

        return Inertia::render('projects/planning-poker/show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
            ],
            'session' => $data['session'],
            'active_task' => $data['active_task'],
            'my_vote' => $data['my_vote'],
            'votes' => $data['votes'],
            'statistics' => $data['statistics'],
            'queue_tasks' => $data['queue_tasks'],
            'estimated_tasks' => $data['estimated_tasks'],
        ]);
    }

    /**
     * Create a new planning poker session.
     */
    public function store(Request $request, Project $project): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'create_session');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'sprint_id' => ['nullable', 'uuid', 'exists:sprints,id'],
            'card_deck_type' => ['required', 'string', 'in:fibonacci,modified_fibonacci,t_shirt,powers_of_two'],
            'active_task_id' => ['nullable', 'uuid', 'exists:tasks,id'],
        ]);

        $session = $this->pokerService->createSession($project, $request->user(), $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Sesi Planning Poker berhasil dibuat.',
                'session' => $session,
            ], 201);
        }

        return redirect()->route('projects.planning-poker.show', [$project->id, $session->id])
            ->with('success', 'Sesi Planning Poker berhasil dibuat.');
    }

    /**
     * Cast or update a vote on the active task.
     */
    public function vote(Request $request, Project $project, PlanningPokerSession $session): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'vote');

        if ($session->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'vote_value' => ['required', 'string', 'max:20'],
        ]);

        if (! $session->active_task_id) {
            abort(422, 'Tidak ada tiket aktif yang sedang diestimasi.');
        }

        $task = Task::where('project_id', $project->id)->where('id', $session->active_task_id)->firstOrFail();

        $vote = $this->pokerService->castVote($session, $task, $request->user(), $validated['vote_value']);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Kartu estimasi Anda telah disimpan.',
                'vote' => $vote,
            ]);
        }

        return back()->with('success', 'Kartu estimasi Anda telah disimpan.');
    }

    /**
     * Reveal all votes.
     */
    public function reveal(Request $request, Project $project, PlanningPokerSession $session): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'moderate');

        if ($session->project_id !== $project->id) {
            abort(404);
        }

        $this->pokerService->revealVotes($session);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Semua kartu peserta telah dibuka.',
            ]);
        }

        return back()->with('success', 'Semua kartu peserta telah dibuka.');
    }

    /**
     * Reset voting on the active task.
     */
    public function reset(Request $request, Project $project, PlanningPokerSession $session): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'moderate');

        if ($session->project_id !== $project->id) {
            abort(404);
        }

        $this->pokerService->resetVoting($session);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Voting telah direset untuk putaran ulang.',
            ]);
        }

        return back()->with('success', 'Voting telah direset untuk putaran ulang.');
    }

    /**
     * Apply consensus story points to the task and advance.
     */
    public function applyPoints(Request $request, Project $project, PlanningPokerSession $session): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'moderate');

        if ($session->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'estimate_points' => ['required', 'numeric', 'min:0', 'max:999'],
            'next_task_id' => ['nullable', 'uuid', 'exists:tasks,id'],
        ]);

        if (! $session->active_task_id) {
            abort(422, 'Tidak ada tiket aktif yang sedang diestimasi.');
        }

        $task = Task::where('project_id', $project->id)->where('id', $session->active_task_id)->firstOrFail();

        $this->pokerService->applyConsensusAndNext(
            $session,
            $task,
            (float) $validated['estimate_points'],
            $validated['next_task_id'] ?? null
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Story points {$validated['estimate_points']} berhasil diterapkan pada tiket {$task->title}.",
            ]);
        }

        return back()->with('success', "Story points {$validated['estimate_points']} berhasil diterapkan pada tiket {$task->title}.");
    }

    /**
     * Select a specific active task for estimation.
     */
    public function selectTask(Request $request, Project $project, PlanningPokerSession $session): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'moderate');

        if ($session->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'task_id' => ['required', 'uuid', 'exists:tasks,id'],
        ]);

        $task = Task::where('project_id', $project->id)->where('id', $validated['task_id'])->firstOrFail();

        $this->pokerService->setActiveTask($session, $task);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Tiket aktif diubah ke {$task->title}.",
            ]);
        }

        return back()->with('success', "Tiket aktif diubah ke {$task->title}.");
    }

    /**
     * Delete a planning poker session.
     */
    public function destroy(Request $request, Project $project, PlanningPokerSession $session): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'destroy');

        if ($session->project_id !== $project->id) {
            abort(404);
        }

        $this->pokerService->destroySession($session);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Sesi Planning Poker berhasil dihapus.',
            ]);
        }

        return redirect()->route('projects.planning-poker.index', $project->id)
            ->with('success', 'Sesi Planning Poker berhasil dihapus.');
    }

    protected function authorizeProjectAccess(Request $request, Project $project, string $action = 'view'): void
    {
        $user = $request->user();
        $org = Organization::where('id', (string) $project->organization_id)->firstOrFail();
        $role = $user->roleInOrganization($org);

        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi proyek ini.');
        }

        if (in_array($action, ['moderate', 'create_session', 'destroy']) && in_array($role, ['guest'])) {
            abort(403, 'Tamu (Guest) tidak memiliki izin untuk memoderasi atau membuat sesi Planning Poker.');
        }
    }
}
