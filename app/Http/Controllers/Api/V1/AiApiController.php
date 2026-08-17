<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Sprint;
use App\Services\Ai\Capabilities\AcceptanceCriteriaCapability;
use App\Services\Ai\Capabilities\SprintSummaryCapability;
use App\Services\Ai\Capabilities\TaskBreakdownCapability;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiApiController extends Controller
{
    public function __construct(
        protected SprintSummaryCapability $sprintSummaryCapability,
        protected TaskBreakdownCapability $taskBreakdownCapability,
        protected AcceptanceCriteriaCapability $acceptanceCriteriaCapability
    ) {}

    /**
     * Generate AI Sprint Summary.
     */
    public function sprintSummary(Request $request, Project $project, Sprint $sprint): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project);

        if ($sprint->project_id !== $project->id) {
            return response()->json([
                'error' => [
                    'code' => 'SPRINT_NOT_FOUND',
                    'message' => 'Sprint does not belong to this project.',
                ],
            ], 404);
        }

        $response = $this->sprintSummaryCapability->generate($sprint, $request->user());

        if (! $response->success) {
            return response()->json([
                'error' => [
                    'code' => strtoupper($response->status),
                    'message' => $response->errorMessage,
                ],
            ], $response->status === 'budget_exceeded' ? 429 : 500);
        }

        return response()->json([
            'data' => $response->structuredData,
            'meta' => [
                'provider' => $response->provider,
                'model' => $response->model,
                'total_tokens' => $response->totalTokens,
                'latency_ms' => $response->latencyMs,
            ],
        ]);
    }

    /**
     * Generate AI Task Breakdown.
     */
    public function taskBreakdown(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'type' => ['nullable', 'string'],
            'priority' => ['nullable', 'string'],
        ]);

        $response = $this->taskBreakdownCapability->generate($project, $request->user(), $validated);

        if (! $response->success) {
            return response()->json([
                'error' => [
                    'code' => strtoupper($response->status),
                    'message' => $response->errorMessage,
                ],
            ], $response->status === 'budget_exceeded' ? 429 : 500);
        }

        return response()->json([
            'data' => $response->structuredData,
            'meta' => [
                'provider' => $response->provider,
                'model' => $response->model,
                'total_tokens' => $response->totalTokens,
                'latency_ms' => $response->latencyMs,
            ],
        ]);
    }

    /**
     * Generate AI Acceptance Criteria.
     */
    public function acceptanceCriteria(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'type' => ['nullable', 'string'],
        ]);

        $response = $this->acceptanceCriteriaCapability->generate($project, $request->user(), $validated);

        if (! $response->success) {
            return response()->json([
                'error' => [
                    'code' => strtoupper($response->status),
                    'message' => $response->errorMessage,
                ],
            ], $response->status === 'budget_exceeded' ? 429 : 500);
        }

        return response()->json([
            'data' => $response->structuredData,
            'meta' => [
                'provider' => $response->provider,
                'model' => $response->model,
                'total_tokens' => $response->totalTokens,
                'latency_ms' => $response->latencyMs,
            ],
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
}
