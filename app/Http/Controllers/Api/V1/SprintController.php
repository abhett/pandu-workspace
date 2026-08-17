<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\SprintResource;
use App\Models\Project;
use App\Models\Sprint;
use App\Services\Sprint\SprintService;
use App\Services\Webhook\WebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SprintController extends Controller
{
    public function __construct(
        protected SprintService $sprintService,
        protected WebhookService $webhookService
    ) {}

    /**
     * List sprints for a project.
     */
    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project);

        $sprints = Sprint::withCount('tasks')
            ->where('project_id', $project->id)
            ->orderBy('sequence_number')
            ->get();

        return response()->json([
            'data' => SprintResource::collection($sprints),
        ]);
    }

    /**
     * Create a new sprint.
     */
    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project);

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'goal' => ['nullable', 'string'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'capacity_points' => ['nullable', 'numeric', 'min:0'],
        ]);

        $sprint = $this->sprintService->createSprint($project, $request->user(), $validated);

        return response()->json([
            'data' => new SprintResource($sprint),
        ], 201);
    }

    /**
     * Get a single sprint.
     */
    public function show(Request $request, Sprint $sprint): JsonResponse
    {
        $this->authorizeSprintAccess($request, $sprint);

        $sprint->loadCount('tasks');

        return response()->json([
            'data' => new SprintResource($sprint),
        ]);
    }

    /**
     * Start a sprint.
     */
    public function start(Request $request, Sprint $sprint): JsonResponse
    {
        $this->authorizeSprintAccess($request, $sprint);

        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'goal' => ['nullable', 'string'],
        ]);

        $started = $this->sprintService->startSprint($sprint, $request->user(), $validated);

        $this->webhookService->dispatch(
            'sprint.started',
            (new SprintResource($started))->resolve(),
            $started->organization,
            $started->project
        );

        return response()->json([
            'data' => new SprintResource($started),
        ]);
    }

    /**
     * Complete a sprint.
     */
    public function complete(Request $request, Sprint $sprint): JsonResponse
    {
        $this->authorizeSprintAccess($request, $sprint);

        $validated = $request->validate([
            'incomplete_destination' => ['nullable', 'string', 'in:backlog,new_sprint,sprint'],
            'target_sprint_id' => ['nullable', 'string', 'exists:sprints,id'],
        ]);

        $destinationType = $validated['incomplete_destination'] ?? 'backlog';
        if ($destinationType === 'new_sprint') {
            $destinationType = 'sprint';
        }
        $targetSprintId = $validated['target_sprint_id'] ?? null;

        $completed = $this->sprintService->completeSprint($sprint, $request->user(), $destinationType, $targetSprintId);

        $this->webhookService->dispatch(
            'sprint.completed',
            (new SprintResource($completed))->resolve(),
            $completed->organization,
            $completed->project
        );

        return response()->json([
            'data' => new SprintResource($completed),
        ]);
    }

    /**
     * Delete a sprint.
     */
    public function destroy(Request $request, Sprint $sprint): JsonResponse
    {
        $this->authorizeSprintAccess($request, $sprint);

        $this->sprintService->deleteSprint($sprint);

        return response()->json([
            'message' => 'Sprint deleted successfully.',
        ]);
    }

    protected function authorizeProjectAccess(Request $request, Project $project): void
    {
        $isMember = $request->user()->organizations()
            ->where('organizations.id', $project->organization_id)
            ->wherePivot('status', 'active')
            ->exists();

        if (! $isMember) {
            abort(403, 'You do not have access to this project.');
        }
    }

    protected function authorizeSprintAccess(Request $request, Sprint $sprint): void
    {
        $isMember = $request->user()->organizations()
            ->where('organizations.id', $sprint->organization_id)
            ->wherePivot('status', 'active')
            ->exists();

        if (! $isMember) {
            abort(403, 'You do not have access to this sprint.');
        }
    }
}
