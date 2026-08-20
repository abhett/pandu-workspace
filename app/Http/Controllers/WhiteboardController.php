<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\ProjectWhiteboard;
use App\Models\WhiteboardEdge;
use App\Models\WhiteboardNode;
use App\Models\WorkflowStatus;
use App\Services\Whiteboard\WhiteboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WhiteboardController extends Controller
{
    public function __construct(
        protected WhiteboardService $whiteboardService
    ) {}

    /**
     * Authorize user access to project whiteboard.
     */
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

        if ($action === 'manage_whiteboard' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest hanya memiliki akses lihat pada papan kanvas.');
        }

        return $organization;
    }

    /**
     * Display the Whiteboard & Mind Map Canvas.
     */
    public function index(Request $request, Project $project): Response|RedirectResponse
    {
        $organization = $this->authorizeProjectAccess($request, $project, 'view');

        // Fetch or create default whiteboard for this project
        $whiteboard = ProjectWhiteboard::where('project_id', $project->id)->first();
        if (! $whiteboard) {
            $whiteboard = ProjectWhiteboard::create([
                'project_id' => $project->id,
                'title' => "Brainstorming & Arsitektur {$project->name}",
                'description' => 'Papan tulis digital untuk ideasi, mind mapping, dan diagram alur sistem.',
                'viewport_x' => 0,
                'viewport_y' => 0,
                'viewport_zoom' => 1.0,
                'grid_type' => 'dots',
                'created_by' => $request->user()?->id,
            ]);
        }

        $allWhiteboards = ProjectWhiteboard::where('project_id', $project->id)
            ->select(['id', 'title', 'is_favorite', 'updated_at'])
            ->orderByDesc('is_favorite')
            ->orderBy('created_at')
            ->get();

        $canvasData = $this->whiteboardService->getWhiteboardData($whiteboard);

        $statuses = WorkflowStatus::where('project_id', $project->id)
            ->select(['id', 'name', 'color', 'category'])
            ->orderBy('position')
            ->get();

        $members = $project->members()
            ->select(['users.id', 'users.name', 'users.email'])
            ->get();

        return Inertia::render('projects/whiteboard', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
                'slug' => $project->slug,
                'color' => $project->color,
                'icon' => $project->icon,
            ],
            'whiteboards' => $allWhiteboards,
            'currentWhiteboard' => $canvasData['whiteboard'],
            'nodes' => $canvasData['nodes'],
            'edges' => $canvasData['edges'],
            'statuses' => $statuses,
            'members' => $members,
        ]);
    }

    /**
     * Create a new whiteboard board in the project.
     */
    public function store(Request $request, Project $project): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_whiteboard');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:500'],
            'grid_type' => ['nullable', 'string', 'in:dots,grid,blank'],
        ]);

        $whiteboard = ProjectWhiteboard::create([
            'project_id' => $project->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'grid_type' => $validated['grid_type'] ?? 'dots',
            'created_by' => $request->user()->id,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Papan kanvas baru berhasil dibuat.',
                'whiteboard' => $whiteboard,
            ], 201);
        }

        return back()->with('success', 'Papan kanvas baru berhasil dibuat.');
    }

    /**
     * Create a node on the whiteboard.
     */
    public function storeNode(Request $request, Project $project, ProjectWhiteboard $whiteboard): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_whiteboard');

        if ($whiteboard->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:sticky_note,idea_card,shape,text_block'],
            'title' => ['nullable', 'string', 'max:255'],
            'content' => ['nullable', 'string', 'max:2000'],
            'pos_x' => ['required', 'numeric'],
            'pos_y' => ['required', 'numeric'],
            'width' => ['nullable', 'numeric', 'min:50', 'max:1000'],
            'height' => ['nullable', 'numeric', 'min:50', 'max:1000'],
            'color' => ['nullable', 'string', 'max:30'],
            'meta' => ['nullable', 'array'],
        ]);

        $node = $this->whiteboardService->createOrUpdateNode($whiteboard, $validated);

        return response()->json([
            'success' => true,
            'message' => 'Simpul kanvas berhasil ditambahkan.',
            'node' => $node,
        ], 201);
    }

    /**
     * Update an existing node on the whiteboard.
     */
    public function updateNode(Request $request, Project $project, ProjectWhiteboard $whiteboard, WhiteboardNode $node): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_whiteboard');

        if ($whiteboard->project_id !== $project->id || $node->whiteboard_id !== $whiteboard->id) {
            abort(404);
        }

        $validated = $request->validate([
            'type' => ['nullable', 'string', 'in:sticky_note,idea_card,shape,text_block'],
            'title' => ['nullable', 'string', 'max:255'],
            'content' => ['nullable', 'string', 'max:2000'],
            'pos_x' => ['nullable', 'numeric'],
            'pos_y' => ['nullable', 'numeric'],
            'width' => ['nullable', 'numeric', 'min:50', 'max:1000'],
            'height' => ['nullable', 'numeric', 'min:50', 'max:1000'],
            'color' => ['nullable', 'string', 'max:30'],
            'meta' => ['nullable', 'array'],
        ]);

        $updatedNode = $this->whiteboardService->createOrUpdateNode($whiteboard, $validated, $node->id);

        return response()->json([
            'success' => true,
            'message' => 'Simpul kanvas berhasil diperbarui.',
            'node' => $updatedNode,
        ]);
    }

    /**
     * Delete a node from the whiteboard.
     */
    public function destroyNode(Request $request, Project $project, ProjectWhiteboard $whiteboard, WhiteboardNode $node): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_whiteboard');

        if ($whiteboard->project_id !== $project->id || $node->whiteboard_id !== $whiteboard->id) {
            abort(404);
        }

        $this->whiteboardService->deleteNode($whiteboard, $node->id);

        return response()->json([
            'success' => true,
            'message' => 'Simpul kanvas dan relasi terkait berhasil dihapus.',
        ]);
    }

    /**
     * Connect two nodes with an edge.
     */
    public function storeEdge(Request $request, Project $project, ProjectWhiteboard $whiteboard): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_whiteboard');

        if ($whiteboard->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'source_node_id' => ['required', 'string', 'exists:whiteboard_nodes,id'],
            'target_node_id' => ['required', 'string', 'exists:whiteboard_nodes,id'],
            'label' => ['nullable', 'string', 'max:100'],
            'style' => ['nullable', 'string', 'in:curved,straight,step'],
            'color' => ['nullable', 'string', 'max:30'],
        ]);

        $edge = $this->whiteboardService->connectNodes(
            $whiteboard,
            $validated['source_node_id'],
            $validated['target_node_id'],
            $validated['label'] ?? null,
            $validated['style'] ?? 'curved',
            $validated['color'] ?? '#94a3b8'
        );

        return response()->json([
            'success' => true,
            'message' => 'Garis relasi berhasil dibuat.',
            'edge' => $edge,
        ], 201);
    }

    /**
     * Delete an edge connector.
     */
    public function destroyEdge(Request $request, Project $project, ProjectWhiteboard $whiteboard, WhiteboardEdge $edge): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_whiteboard');

        if ($whiteboard->project_id !== $project->id || $edge->whiteboard_id !== $whiteboard->id) {
            abort(404);
        }

        $this->whiteboardService->deleteEdge($whiteboard, $edge->id);

        return response()->json([
            'success' => true,
            'message' => 'Garis relasi berhasil dihapus.',
        ]);
    }

    /**
     * Convert an ideation node into a real project task.
     */
    public function convertToTask(Request $request, Project $project, ProjectWhiteboard $whiteboard, WhiteboardNode $node): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_whiteboard');

        if ($whiteboard->project_id !== $project->id || $node->whiteboard_id !== $whiteboard->id) {
            abort(404);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'type' => ['required', 'string', 'in:task,bug,story,epic'],
            'priority' => ['required', 'string', 'in:urgent,high,medium,low'],
            'status_id' => ['nullable', 'string', 'exists:workflow_statuses,id'],
            'story_points' => ['nullable', 'integer', 'min:0', 'max:100'],
            'assignee_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $task = $this->whiteboardService->convertNodeToTask($node, $request->user(), $validated);

        return response()->json([
            'success' => true,
            'message' => "Ide berhasil dikonversi menjadi tiket tugas {$task->key}!",
            'task' => [
                'id' => $task->id,
                'key' => $task->key,
                'title' => $task->title,
                'priority' => $task->priority,
                'type' => $task->type,
                'status_name' => $task->status?->name,
                'status_color' => $task->status?->color,
            ],
            'node_id' => $node->id,
        ]);
    }

    /**
     * Save the canvas viewport state.
     */
    public function updateViewport(Request $request, Project $project, ProjectWhiteboard $whiteboard): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project, 'view');

        if ($whiteboard->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'viewport_x' => ['required', 'numeric'],
            'viewport_y' => ['required', 'numeric'],
            'viewport_zoom' => ['required', 'numeric', 'min:0.1', 'max:5.0'],
        ]);

        $this->whiteboardService->saveViewport(
            $whiteboard,
            (float) $validated['viewport_x'],
            (float) $validated['viewport_y'],
            (float) $validated['viewport_zoom']
        );

        return response()->json([
            'success' => true,
            'message' => 'Status viewport kanvas berhasil disimpan.',
        ]);
    }
}
