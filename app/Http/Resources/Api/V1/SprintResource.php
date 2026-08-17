<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Sprint;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Sprint
 */
class SprintResource extends JsonResource
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
            'project_id' => $this->project_id,
            'name' => $this->name,
            'sequence_number' => $this->sequence_number,
            'goal' => $this->goal,
            'status' => $this->status,
            'capacity_points' => $this->capacity_points,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'started_at' => $this->started_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'tasks_count' => $this->whenCounted('tasks'),
        ];
    }
}
