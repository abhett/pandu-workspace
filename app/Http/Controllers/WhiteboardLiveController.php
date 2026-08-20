<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\ProjectWhiteboard;
use App\Services\Whiteboard\WhiteboardLiveSyncService;
use App\Services\Whiteboard\WhiteboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WhiteboardLiveController extends Controller
{
    public function __construct(
        protected WhiteboardService $whiteboardService,
        protected WhiteboardLiveSyncService $liveSyncService
    ) {}

    /**
     * Display the Real-Time Collaborative Whiteboard room.
     */
    public function live(Request $request, Project $project, ?ProjectWhiteboard $whiteboard = null): Response
    {
        $this->authorizeProjectAccess($request, $project);

        if (! $whiteboard || ! $whiteboard->exists) {
            $whiteboard = ProjectWhiteboard::where('project_id', $project->id)->first();

            if (! $whiteboard) {
                $whiteboard = ProjectWhiteboard::create([
                    'project_id' => $project->id,
                    'title' => 'Live System Architecture & Journey Ideation',
                    'description' => 'Ruang kanvas kolaboratif real-time tim',
                    'created_by' => $request->user()->id,
                ]);
            }
        }

        $data = $this->whiteboardService->getWhiteboardData($whiteboard);
        $presence = $this->liveSyncService->heartbeatAndSyncPresence($whiteboard, $request->user());

        return Inertia::render('projects/whiteboard/live', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
            ],
            'whiteboard' => $data['whiteboard'],
            'nodes' => $data['nodes'],
            'edges' => $data['edges'],
            'initial_presence' => $presence,
        ]);
    }

    /**
     * Heartbeat polling for multi-cursor presence and active collaborator sync.
     */
    public function presence(Request $request, Project $project, ProjectWhiteboard $whiteboard): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project);

        if ($whiteboard->project_id !== $project->id) {
            abort(404, 'Whiteboard tidak ditemukan dalam proyek ini.');
        }

        $validated = $request->validate([
            'cursor_x' => ['nullable', 'numeric'],
            'cursor_y' => ['nullable', 'numeric'],
            'selected_node_id' => ['nullable', 'string'],
            'locked_node_id' => ['nullable', 'string'],
            'client_color' => ['nullable', 'string', 'max:20'],
        ]);

        $presence = $this->liveSyncService->heartbeatAndSyncPresence($whiteboard, $request->user(), $validated);

        return response()->json([
            'success' => true,
            'presence' => $presence,
        ]);
    }

    /**
     * Lock or unlock a node to prevent simultaneous overwrite conflicts.
     */
    public function lock(Request $request, Project $project, ProjectWhiteboard $whiteboard): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project, 'edit');

        if ($whiteboard->project_id !== $project->id) {
            abort(404, 'Whiteboard tidak ditemukan dalam proyek ini.');
        }

        $validated = $request->validate([
            'node_id' => ['required', 'string'],
            'action' => ['required', 'string', 'in:lock,unlock'],
        ]);

        if ($validated['action'] === 'lock') {
            $result = $this->liveSyncService->lockNode($whiteboard, $request->user(), $validated['node_id']);

            return response()->json($result, $result['success'] ? 200 : 423); // 423 Locked
        }

        $this->liveSyncService->unlockNode($whiteboard, $request->user(), $validated['node_id']);

        return response()->json([
            'success' => true,
            'unlocked' => true,
        ]);
    }

    /**
     * Broadcast live batch mutations (nodes movement, new sticky notes, connections).
     */
    public function sync(Request $request, Project $project, ProjectWhiteboard $whiteboard): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project, 'edit');

        if ($whiteboard->project_id !== $project->id) {
            abort(404, 'Whiteboard tidak ditemukan dalam proyek ini.');
        }

        $validated = $request->validate([
            'nodes' => ['nullable', 'array'],
            'new_nodes' => ['nullable', 'array'],
            'deleted_node_ids' => ['nullable', 'array'],
            'new_edges' => ['nullable', 'array'],
            'deleted_edge_ids' => ['nullable', 'array'],
        ]);

        $data = $this->liveSyncService->broadcastLiveBatchUpdate($whiteboard, $request->user(), $validated);

        return response()->json([
            'success' => true,
            'whiteboard' => $data['whiteboard'],
            'nodes' => $data['nodes'],
            'edges' => $data['edges'],
        ]);
    }

    /**
     * Leave collaborative room and clean up presence session.
     */
    public function leave(Request $request, Project $project, ProjectWhiteboard $whiteboard): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project);

        $this->liveSyncService->leaveRoom($whiteboard, $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Telah keluar dari ruang kolaboratif.',
        ]);
    }

    protected function authorizeProjectAccess(Request $request, Project $project, string $action = 'view'): void
    {
        $user = $request->user();
        $org = Organization::where('id', (string) $project->organization_id)->firstOrFail();
        $role = $user->roleInOrganization($org);

        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi proyek ini.');
        }

        if (in_array($action, ['edit']) && in_array($role, ['guest'])) {
            abort(403, 'Tamu (Guest) tidak memiliki izin untuk mengedit kanvas.');
        }
    }
}
