<?php

namespace App\Http\Resources\Api\V1;

use App\Models\WebhookSubscription;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin WebhookSubscription
 */
class WebhookSubscriptionResource extends JsonResource
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
            'organization_id' => $this->organization_id,
            'project_id' => $this->project_id,
            'name' => $this->name,
            'url' => $this->url,
            'events' => $this->events,
            'active' => $this->active,
            'headers' => $this->headers,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
