<?php

namespace App\Services\Whiteboard;

use App\Models\ProjectWhiteboard;
use App\Models\User;
use App\Models\WhiteboardEdge;
use App\Models\WhiteboardNode;
use App\Models\WhiteboardPresenceSession;

class WhiteboardLiveSyncService
{
    protected array $colorPalette = [
        '#6366f1', // Indigo
        '#ec4899', // Pink
        '#10b981', // Emerald
        '#f59e0b', // Amber
        '#8b5cf6', // Purple
        '#06b6d4', // Cyan
        '#f43f5e', // Rose
        '#3b82f6', // Blue
    ];

    /**
     * Heartbeat and retrieve active collaborator presence in the room.
     *
     * @param  array<string, mixed>  $presenceData
     * @return array<string, mixed>
     */
    public function heartbeatAndSyncPresence(ProjectWhiteboard $whiteboard, User $user, array $presenceData = []): array
    {
        // 1. Prune stale presence sessions (> 30s)
        WhiteboardPresenceSession::where('whiteboard_id', $whiteboard->id)
            ->where('last_active_at', '<', now()->subSeconds(30))
            ->delete();

        // 2. Determine consistent user color
        $assignedColor = $this->colorPalette[$user->id % count($this->colorPalette)];

        // 3. Upsert current user presence
        $session = WhiteboardPresenceSession::updateOrCreate(
            [
                'whiteboard_id' => $whiteboard->id,
                'user_id' => $user->id,
            ],
            [
                'cursor_x' => isset($presenceData['cursor_x']) ? (float) $presenceData['cursor_x'] : null,
                'cursor_y' => isset($presenceData['cursor_y']) ? (float) $presenceData['cursor_y'] : null,
                'selected_node_id' => $presenceData['selected_node_id'] ?? null,
                'locked_node_id' => $presenceData['locked_node_id'] ?? null,
                'client_color' => $presenceData['client_color'] ?? $assignedColor,
                'last_active_at' => now(),
            ]
        );

        // 4. Fetch all active collaborators
        $activeSessions = WhiteboardPresenceSession::where('whiteboard_id', $whiteboard->id)
            ->with('user:id,name,email')
            ->get()
            ->map(fn (WhiteboardPresenceSession $s) => [
                'id' => $s->id,
                'user_id' => $s->user_id,
                'user_name' => $s->user?->name ?? 'Kolaborator',
                'user_email' => $s->user?->email,
                'cursor_x' => $s->cursor_x,
                'cursor_y' => $s->cursor_y,
                'selected_node_id' => $s->selected_node_id,
                'locked_node_id' => $s->locked_node_id,
                'client_color' => $s->client_color,
                'is_current_user' => $s->user_id === $user->id,
                'last_active_at' => $s->last_active_at->toIso8601String(),
            ]);

        return [
            'collaborators' => $activeSessions,
            'active_count' => $activeSessions->count(),
            'current_user_color' => $session->client_color,
        ];
    }

    /**
     * Lock a node exclusively for editing.
     *
     * @return array<string, mixed>
     */
    public function lockNode(ProjectWhiteboard $whiteboard, User $user, string $nodeId): array
    {
        $existingLock = WhiteboardPresenceSession::where('whiteboard_id', $whiteboard->id)
            ->where('locked_node_id', $nodeId)
            ->where('user_id', '!=', $user->id)
            ->where('last_active_at', '>=', now()->subSeconds(30))
            ->with('user:id,name')
            ->first();

        if ($existingLock) {
            return [
                'success' => false,
                'locked' => true,
                'locked_by' => [
                    'id' => $existingLock->user_id,
                    'name' => $existingLock->user?->name ?? 'Anggota Lain',
                    'color' => $existingLock->client_color,
                ],
            ];
        }

        WhiteboardPresenceSession::updateOrCreate(
            [
                'whiteboard_id' => $whiteboard->id,
                'user_id' => $user->id,
            ],
            [
                'locked_node_id' => $nodeId,
                'client_color' => $this->colorPalette[$user->id % count($this->colorPalette)],
                'last_active_at' => now(),
            ]
        );

        return [
            'success' => true,
            'locked' => false,
        ];
    }

    /**
     * Release node lock.
     */
    public function unlockNode(ProjectWhiteboard $whiteboard, User $user, ?string $nodeId = null): bool
    {
        $query = WhiteboardPresenceSession::where('whiteboard_id', $whiteboard->id)
            ->where('user_id', $user->id);

        if ($nodeId) {
            $query->where('locked_node_id', $nodeId);
        }

        $query->update([
            'locked_node_id' => null,
            'last_active_at' => now(),
        ]);

        return true;
    }

    /**
     * Apply batch mutations (nodes movement, new sticky notes, deletions, connector edges).
     *
     * @param  array<string, mixed>  $changes
     * @return array<string, mixed>
     */
    public function broadcastLiveBatchUpdate(ProjectWhiteboard $whiteboard, User $user, array $changes): array
    {
        // 1. Process updated nodes (positions, dimensions, contents)
        if (! empty($changes['nodes']) && is_array($changes['nodes'])) {
            foreach ($changes['nodes'] as $nodeData) {
                if (empty($nodeData['id'])) {
                    continue;
                }

                $node = WhiteboardNode::where('whiteboard_id', $whiteboard->id)
                    ->where('id', $nodeData['id'])
                    ->first();

                if ($node) {
                    $node->update(array_filter([
                        'pos_x' => isset($nodeData['pos_x']) ? (float) $nodeData['pos_x'] : $node->pos_x,
                        'pos_y' => isset($nodeData['pos_y']) ? (float) $nodeData['pos_y'] : $node->pos_y,
                        'width' => isset($nodeData['width']) ? (float) $nodeData['width'] : $node->width,
                        'height' => isset($nodeData['height']) ? (float) $nodeData['height'] : $node->height,
                        'title' => $nodeData['title'] ?? $node->title,
                        'content' => $nodeData['content'] ?? $node->content,
                        'color' => $nodeData['color'] ?? $node->color,
                    ], fn ($v) => $v !== null));
                }
            }
        }

        // 2. Process new nodes
        if (! empty($changes['new_nodes']) && is_array($changes['new_nodes'])) {
            foreach ($changes['new_nodes'] as $newNode) {
                WhiteboardNode::create([
                    'whiteboard_id' => $whiteboard->id,
                    'type' => $newNode['type'] ?? 'sticky',
                    'title' => $newNode['title'] ?? 'Sticky Note',
                    'content' => $newNode['content'] ?? '',
                    'pos_x' => (float) ($newNode['pos_x'] ?? 100),
                    'pos_y' => (float) ($newNode['pos_y'] ?? 100),
                    'width' => (float) ($newNode['width'] ?? 200),
                    'height' => (float) ($newNode['height'] ?? 160),
                    'color' => $newNode['color'] ?? '#fef08a',
                ]);
            }
        }

        // 3. Process deleted nodes
        if (! empty($changes['deleted_node_ids']) && is_array($changes['deleted_node_ids'])) {
            WhiteboardNode::where('whiteboard_id', $whiteboard->id)
                ->whereIn('id', $changes['deleted_node_ids'])
                ->delete();
        }

        // 4. Process new connector edges
        if (! empty($changes['new_edges']) && is_array($changes['new_edges'])) {
            foreach ($changes['new_edges'] as $newEdge) {
                if (! empty($newEdge['source_node_id']) && ! empty($newEdge['target_node_id'])) {
                    WhiteboardEdge::firstOrCreate([
                        'whiteboard_id' => $whiteboard->id,
                        'source_node_id' => $newEdge['source_node_id'],
                        'target_node_id' => $newEdge['target_node_id'],
                    ], [
                        'label' => $newEdge['label'] ?? null,
                        'style' => $newEdge['style'] ?? 'smoothstep',
                        'color' => $newEdge['color'] ?? '#94a3b8',
                    ]);
                }
            }
        }

        // 5. Process deleted edges
        if (! empty($changes['deleted_edge_ids']) && is_array($changes['deleted_edge_ids'])) {
            WhiteboardEdge::where('whiteboard_id', $whiteboard->id)
                ->whereIn('id', $changes['deleted_edge_ids'])
                ->delete();
        }

        $whiteboard->touch();

        // Return fresh whiteboard nodes and edges
        $service = app(WhiteboardService::class);

        return $service->getWhiteboardData($whiteboard);
    }

    /**
     * Remove presence session upon leaving canvas room.
     */
    public function leaveRoom(ProjectWhiteboard $whiteboard, User $user): bool
    {
        return (bool) WhiteboardPresenceSession::where('whiteboard_id', $whiteboard->id)
            ->where('user_id', $user->id)
            ->delete();
    }
}
