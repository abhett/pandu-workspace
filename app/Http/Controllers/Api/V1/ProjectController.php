<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\ProjectResource;
use App\Models\Organization;
use App\Models\Project;
use App\Services\Project\ProjectCreationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function __construct(
        protected ProjectCreationService $projectCreationService
    ) {}

    /**
     * List projects in an organization.
     */
    public function index(Request $request, ?Organization $organization = null): JsonResponse
    {
        $org = $organization ?: $request->attributes->get('current_organization');

        if (! $org) {
            return response()->json([
                'error' => [
                    'code' => 'ORGANIZATION_REQUIRED',
                    'message' => 'No active organization context found.',
                ],
            ], 400);
        }

        // Verify membership
        $isMember = $request->user()->organizations()
            ->where('organizations.id', $org->id)
            ->wherePivot('status', 'active')
            ->exists();

        if (! $isMember) {
            return response()->json([
                'error' => [
                    'code' => 'FORBIDDEN_ORGANIZATION_ACCESS',
                    'message' => 'You do not have access to this organization.',
                ],
            ], 403);
        }

        $projects = Project::where('organization_id', $org->id)
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => ProjectResource::collection($projects),
        ]);
    }

    /**
     * Create a new project.
     */
    public function store(Request $request, ?Organization $organization = null): JsonResponse
    {
        $org = $organization ?: $request->attributes->get('current_organization');

        if (! $org) {
            return response()->json([
                'error' => [
                    'code' => 'ORGANIZATION_REQUIRED',
                    'message' => 'No active organization context found.',
                ],
            ], 400);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'key' => ['required', 'string', 'max:10', 'uppercase'],
            'description' => ['nullable', 'string'],
            'type' => ['nullable', 'string', 'in:scrum,kanban,basic'],
            'template_id' => ['nullable', 'string'],
        ]);

        $project = $this->projectCreationService->create(
            $org,
            $request->user(),
            [
                'name' => $validated['name'],
                'key' => $validated['key'],
                'description' => $validated['description'] ?? null,
                'type' => $validated['type'] ?? 'kanban',
                'template_id' => $validated['template_id'] ?? null,
            ]
        );

        return response()->json([
            'data' => new ProjectResource($project),
        ], 201);
    }

    /**
     * Get a single project by ID.
     */
    public function show(Request $request, Project $project): JsonResponse
    {
        $isMember = $request->user()->organizations()
            ->where('organizations.id', $project->organization_id)
            ->wherePivot('status', 'active')
            ->exists();

        if (! $isMember) {
            return response()->json([
                'error' => [
                    'code' => 'FORBIDDEN_PROJECT_ACCESS',
                    'message' => 'You do not have access to this project.',
                ],
            ], 403);
        }

        return response()->json([
            'data' => new ProjectResource($project),
        ]);
    }

    /**
     * Update project details.
     */
    public function update(Request $request, Project $project): JsonResponse
    {
        $isMember = $request->user()->organizations()
            ->where('organizations.id', $project->organization_id)
            ->wherePivot('status', 'active')
            ->exists();

        if (! $isMember) {
            return response()->json([
                'error' => [
                    'code' => 'FORBIDDEN_PROJECT_ACCESS',
                    'message' => 'You do not have access to this project.',
                ],
            ], 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', 'string', 'in:active,archived,on_hold'],
        ]);

        $project->update($validated);

        return response()->json([
            'data' => new ProjectResource($project),
        ]);
    }

    /**
     * Delete a project.
     */
    public function destroy(Request $request, Project $project): JsonResponse
    {
        $isMember = $request->user()->organizations()
            ->where('organizations.id', $project->organization_id)
            ->wherePivot('status', 'active')
            ->exists();

        if (! $isMember) {
            return response()->json([
                'error' => [
                    'code' => 'FORBIDDEN_PROJECT_ACCESS',
                    'message' => 'You do not have access to this project.',
                ],
            ], 403);
        }

        $project->delete();

        return response()->json([
            'message' => 'Project deleted successfully.',
        ]);
    }
}
