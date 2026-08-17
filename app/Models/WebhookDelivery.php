<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Database\Factories\WebhookDeliveryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $webhook_subscription_id
 * @property string $event_id
 * @property string $event_type
 * @property array<string, mixed> $payload
 * @property int $attempt
 * @property string $status
 * @property int|null $response_code
 * @property string|null $response_body
 * @property string|null $error_message
 * @property int|null $duration_ms
 * @property Carbon|null $next_attempt_at
 * @property Carbon|null $delivered_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'webhook_subscription_id',
    'event_id',
    'event_type',
    'payload',
    'attempt',
    'status',
    'response_code',
    'response_body',
    'error_message',
    'duration_ms',
    'next_attempt_at',
    'delivered_at',
])]
class WebhookDelivery extends Model
{
    /** @use HasFactory<WebhookDeliveryFactory> */
    use HasFactory, HasUuidPrimaryKey;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'attempt' => 'integer',
            'response_code' => 'integer',
            'duration_ms' => 'integer',
            'next_attempt_at' => 'datetime',
            'delivered_at' => 'datetime',
        ];
    }

    /**
     * Get the subscription that owns the delivery.
     *
     * @return BelongsTo<WebhookSubscription, $this>
     */
    public function subscription(): BelongsTo
    {
        return $this->belongsTo(WebhookSubscription::class, 'webhook_subscription_id');
    }
}
