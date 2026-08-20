<?php

namespace App\Services\Whiteboard;

use App\Models\Project;
use App\Models\ProjectWhiteboard;
use App\Models\Task;
use App\Models\User;
use App\Models\WhiteboardEdge;
use App\Models\WhiteboardNode;
use App\Models\WorkflowStatus;

class WhiteboardService
{
    /**
     * Get aggregate whiteboard data including nodes, edges, and linked task data.
     *
     * @return array<string, mixed>
     */
    public function getWhiteboardData(ProjectWhiteboard $whiteboard): array
    {
        $nodes = WhiteboardNode::where('whiteboard_id', $whiteboard->id)
            ->with(['task:id,key,title,priority,type,status_id', 'task.status:id,name,color'])
            ->get()
            ->map(fn (WhiteboardNode $n) => [
                'id' => $n->id,
                'type' => $n->type,
                'title' => $n->title,
                'content' => $n->content,
                'pos_x' => (float) $n->pos_x,
                'pos_y' => (float) $n->pos_y,
                'width' => (float) $n->width,
                'height' => (float) $n->height,
                'color' => $n->color,
                'task_id' => $n->task_id,
                'task' => $n->task ? [
                    'id' => $n->task->id,
                    'key' => $n->task->key,
                    'title' => $n->task->title,
                    'priority' => $n->task->priority,
                    'type' => $n->task->type,
                    'status_name' => $n->task->status?->name,
                    'status_color' => $n->task->status?->color,
                ] : null,
                'meta' => $n->meta,
            ]);

        $edges = WhiteboardEdge::where('whiteboard_id', $whiteboard->id)
            ->get()
            ->map(fn (WhiteboardEdge $e) => [
                'id' => $e->id,
                'source_node_id' => $e->source_node_id,
                'target_node_id' => $e->target_node_id,
                'label' => $e->label,
                'style' => $e->style,
                'color' => $e->color,
            ]);

        return [
            'whiteboard' => [
                'id' => $whiteboard->id,
                'title' => $whiteboard->title,
                'description' => $whiteboard->description,
                'viewport_x' => (float) $whiteboard->viewport_x,
                'viewport_y' => (float) $whiteboard->viewport_y,
                'viewport_zoom' => (float) $whiteboard->viewport_zoom,
                'grid_type' => $whiteboard->grid_type ?? 'dots',
                'is_favorite' => (bool) $whiteboard->is_favorite,
            ],
            'nodes' => $nodes,
            'edges' => $edges,
        ];
    }

    /**
     * Create or update a node on the whiteboard.
     *
     * @param  array<string, mixed>  $data
     */
    public function createOrUpdateNode(ProjectWhiteboard $whiteboard, array $data, ?string $nodeId = null): WhiteboardNode
    {
        if ($nodeId) {
            $node = WhiteboardNode::where('whiteboard_id', $whiteboard->id)->where('id', $nodeId)->firstOrFail();
            $node->update(array_filter([
                'type' => $data['type'] ?? $node->type,
                'title' => $data['title'] ?? $node->title,
                'content' => $data['content'] ?? $node->content,
                'pos_x' => isset($data['pos_x']) ? (float) $data['pos_x'] : $node->pos_x,
                'pos_y' => isset($data['pos_y']) ? (float) $data['pos_y'] : $node->pos_y,
                'width' => isset($data['width']) ? (float) $data['width'] : $node->width,
                'height' => isset($data['height']) ? (float) $data['height'] : $node->height,
                'color' => $data['color'] ?? $node->color,
                'meta' => $data['meta'] ?? $node->meta,
            ], fn ($v) => $v !== null));

            return $node->fresh(['task', 'task.status']);
        }

        return WhiteboardNode::create([
            'whiteboard_id' => $whiteboard->id,
            'type' => $data['type'] ?? 'sticky_note',
            'title' => $data['title'] ?? null,
            'content' => $data['content'] ?? null,
            'pos_x' => isset($data['pos_x']) ? (float) $data['pos_x'] : 100.0,
            'pos_y' => isset($data['pos_y']) ? (float) $data['pos_y'] : 100.0,
            'width' => isset($data['width']) ? (float) $data['width'] : 200.0,
            'height' => isset($data['height']) ? (float) $data['height'] : 160.0,
            'color' => $data['color'] ?? '#fef08a',
            'meta' => $data['meta'] ?? null,
        ]);
    }

    /**
     * Delete a node from the whiteboard and cascade its edges.
     */
    public function deleteNode(ProjectWhiteboard $whiteboard, string $nodeId): bool
    {
        $node = WhiteboardNode::where('whiteboard_id', $whiteboard->id)->where('id', $nodeId)->firstOrFail();

        // Cascade delete connected edges
        WhiteboardEdge::where('whiteboard_id', $whiteboard->id)
            ->where(function ($q) use ($nodeId) {
                $q->where('source_node_id', $nodeId)->orWhere('target_node_id', $nodeId);
            })
            ->delete();

        return (bool) $node->delete();
    }

    /**
     * Connect two nodes with an edge.
     */
    public function connectNodes(
        ProjectWhiteboard $whiteboard,
        string $sourceId,
        string $targetId,
        ?string $label = null,
        string $style = 'curved',
        string $color = '#94a3b8'
    ): WhiteboardEdge {
        return WhiteboardEdge::firstOrCreate(
            [
                'whiteboard_id' => $whiteboard->id,
                'source_node_id' => $sourceId,
                'target_node_id' => $targetId,
            ],
            [
                'label' => $label,
                'style' => $style,
                'color' => $color,
            ]
        );
    }

    /**
     * Delete an edge connector between nodes.
     */
    public function deleteEdge(ProjectWhiteboard $whiteboard, string $edgeId): bool
    {
        return (bool) WhiteboardEdge::where('whiteboard_id', $whiteboard->id)
            ->where('id', $edgeId)
            ->delete();
    }

    /**
     * Convert an ideation node directly into a real project task.
     *
     * @param  array<string, mixed>  $taskData
     */
    public function convertNodeToTask(
        WhiteboardNode $node,
        User $creator,
        array $taskData
    ): Task {
        $whiteboard = $node->whiteboard;
        $project = $whiteboard->project;

        $nextSeq = (int) Task::where('project_id', $project->id)->max('sequence_number') + 1;
        $key = "{$project->key}-{$nextSeq}";

        $statusId = $taskData['status_id'] ?? WorkflowStatus::where('project_id', $project->id)->where('category', 'todo')->value('id');
        if (! $statusId) {
            $statusId = WorkflowStatus::where('project_id', $project->id)->orderBy('position')->value('id');
        }

        $task = Task::create([
            'organization_id' => $project->organization_id,
            'project_id' => $project->id,
            'status_id' => $statusId,
            'sequence_number' => $nextSeq,
            'key' => $key,
            'title' => $taskData['title'] ?? $node->title ?? 'New Task from Ideation Canvas',
            'description' => $taskData['description'] ?? $node->content,
            'type' => $taskData['type'] ?? 'task',
            'priority' => $taskData['priority'] ?? 'medium',
            'estimate_points' => isset($taskData['story_points']) ? (float) $taskData['story_points'] : (isset($taskData['estimate_points']) ? (float) $taskData['estimate_points'] : null),
            'created_by' => $creator->id,
            'rank' => '0|hzzzzz:',
        ]);

        $node->update([
            'task_id' => $task->id,
        ]);

        return $task;
    }

    /**
     * Save the canvas viewport pan and zoom state.
     */
    public function saveViewport(
        ProjectWhiteboard $whiteboard,
        float $x,
        float $y,
        float $zoom
    ): ProjectWhiteboard {
        $whiteboard->update([
            'viewport_x' => $x,
            'viewport_y' => $y,
            'viewport_zoom' => $zoom,
        ]);

        return $whiteboard->fresh();
    }
}
