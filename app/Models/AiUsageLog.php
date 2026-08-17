<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $organization_id
 * @property string|null $project_id
 * @property int $user_id
 * @property string $provider
 * @property string $model
 * @property string $capability
 * @property int $prompt_tokens
 * @property int $completion_tokens
 * @property int $total_tokens
 * @property float $cost_estimate
 * @property int $latency_ms
 * @property string $status
 * @property string|null $error_message
 * @property Carbon $created_at
 */
#[Fillable([
    'organization_id',
    'project_id',
    'user_id',
    'provider',
    'model',
    'capability',
    'prompt_tokens',
    'completion_tokens',
    'total_tokens',
    'cost_estimate',
    'latency_ms',
    'status',
    'error_message',
    'created_at',
])]
class AiUsageLog extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'prompt_tokens' => 'integer',
            'completion_tokens' => 'integer',
            'total_tokens' => 'integer',
            'cost_estimate' => 'float',
            'latency_ms' => 'integer',
            'user_id' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Get the organization associated with the log.
     *
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the project associated with the log.
     *
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the user who triggered the AI request.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
