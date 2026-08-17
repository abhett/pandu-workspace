<?php

namespace App\Http\Resources\Api\V1;

use App\Models\WebhookDelivery;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin WebhookDelivery
 */
class WebhookDeliveryResource extends JsonResource
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
            'webhook_subscription_id' => $this->webhook_subscription_id,
            'event_id' => $this->event_id,
            'event_type' => $this->event_type,
            'payload' => $this->payload,
            'attempt' => $this->attempt,
            'status' => $this->status,
            'response_code' => $this->response_code,
            'response_body' => $this->response_body,
            'error_message' => $this->error_message,
            'duration_ms' => $this->duration_ms,
            'delivered_at' => $this->delivered_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
