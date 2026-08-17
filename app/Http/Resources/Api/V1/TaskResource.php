<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Task
 */
class TaskResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'key' => $this->key,
            'sequence_number' => $this->sequence_number,
            'title' => $this->title,
            'description' => $this->description,
            'type' => $this->type,
            'priority' => $this->priority,
            'estimate_points' => $this->estimate_points,
            'rank' => $this->rank,
            'version' => $this->version,
            'organization_id' => $this->organization_id,
            'project_id' => $this->project_id,
            'status_id' => $this->status_id,
            'sprint_id' => $this->sprint_id,
            'parent_id' => $this->parent_id,
            'due_date' => $this->due_date?->toDateString(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'created_by' => $this->created_by,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'assignees' => $this->whenLoaded('assignees', fn () => $this->assignees->map(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'assigned_at' => $user->pivot->assigned_at ?? null,
            ])),
            'labels' => $this->whenLoaded('labels', fn () => $this->labels->map(fn ($label) => [
                'id' => $label->id,
                'name' => $label->name,
                'color' => $label->color,
            ])),
            'attachments' => $this->whenLoaded('attachments', fn () => AttachmentResource::collection($this->attachments)),
        ];
    }
}
