<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebhookDeliveryAttempt extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'webhook_delivery_attempts';

    protected $fillable = [
        'organization_id',
        'endpoint_id',
        'event_type',
        'payload',
        'request_headers',
        'response_status',
        'response_body',
        'response_latency_ms',
        'attempt_number',
        'status',
        'error_reason',
        'next_retry_at',
        'delivered_at',
        'replayed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'request_headers' => 'array',
            'response_status' => 'integer',
            'response_latency_ms' => 'float',
            'attempt_number' => 'integer',
            'next_retry_at' => 'datetime',
            'delivered_at' => 'datetime',
            'replayed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function endpoint(): BelongsTo
    {
        return $this->belongsTo(WebhookEndpoint::class, 'endpoint_id');
    }
}
