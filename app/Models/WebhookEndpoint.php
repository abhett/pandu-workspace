<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WebhookEndpoint extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'webhook_endpoints';

    protected $fillable = [
        'organization_id',
        'name',
        'target_url',
        'event_subscriptions',
        'secret_hash',
        'is_active',
        'max_retries',
        'backoff_strategy',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'event_subscriptions' => 'array',
            'is_active' => 'boolean',
            'max_retries' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function deliveryAttempts(): HasMany
    {
        return $this->hasMany(WebhookDeliveryAttempt::class, 'endpoint_id');
    }
}
