<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Database\Factories\WebhookSubscriptionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $organization_id
 * @property string|null $project_id
 * @property string $name
 * @property string $url
 * @property string $secret
 * @property array<int, string> $events
 * @property bool $active
 * @property array<string, string>|null $headers
 * @property int|null $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
#[Fillable([
    'organization_id',
    'project_id',
    'name',
    'url',
    'secret',
    'events',
    'active',
    'headers',
    'created_by',
])]
class WebhookSubscription extends Model
{
    /** @use HasFactory<WebhookSubscriptionFactory> */
    use HasFactory, HasUuidPrimaryKey, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'secret' => 'encrypted',
            'events' => 'array',
            'active' => 'boolean',
            'headers' => 'array',
            'created_by' => 'integer',
        ];
    }

    /**
     * Get the organization that owns the webhook subscription.
     *
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the project associated with the webhook subscription.
     *
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the user who created the subscription.
     *
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get all delivery logs for this webhook subscription.
     *
     * @return HasMany<WebhookDelivery, $this>
     */
    public function deliveries(): HasMany
    {
        return $this->hasMany(WebhookDelivery::class, 'webhook_subscription_id')->latest('created_at');
    }

    /**
     * Check if this subscription matches a given event type.
     */
    public function matchesEvent(string $eventType): bool
    {
        if (! $this->active) {
            return false;
        }

        $events = $this->events ?? [];

        return in_array('*', $events, true) || in_array($eventType, $events, true);
    }
}
