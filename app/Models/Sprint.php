<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Database\Factories\SprintFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $organization_id
 * @property string $project_id
 * @property string $name
 * @property string|null $goal
 * @property string $status
 * @property Carbon|null $start_date
 * @property Carbon|null $end_date
 * @property Carbon|null $started_at
 * @property Carbon|null $completed_at
 * @property int $sequence_number
 * @property float|null $committed_points
 * @property float|null $completed_points
 * @property array<string, mixed>|null $settings
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
#[Fillable([
    'organization_id',
    'project_id',
    'name',
    'goal',
    'status',
    'start_date',
    'end_date',
    'started_at',
    'completed_at',
    'sequence_number',
    'committed_points',
    'completed_points',
    'settings',
])]
class Sprint extends Model
{
    /** @use HasFactory<SprintFactory> */
    use HasFactory, HasUuidPrimaryKey, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'sequence_number' => 'integer',
            'committed_points' => 'float',
            'completed_points' => 'float',
            'settings' => 'array',
        ];
    }

    /**
     * Get the project that owns the sprint.
     *
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the organization that owns the sprint.
     *
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get all tasks assigned to the sprint.
     *
     * @return HasMany<Task, $this>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class)->orderBy('rank');
    }

    /**
     * Scope a query to only include active sprints.
     *
     * @param  Builder<Sprint>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('status', 'active');
    }

    /**
     * Scope a query to only include future / planned sprints.
     *
     * @param  Builder<Sprint>  $query
     */
    public function scopeFuture(Builder $query): void
    {
        $query->where('status', 'future');
    }

    /**
     * Scope a query to only include completed sprints.
     *
     * @param  Builder<Sprint>  $query
     */
    public function scopeCompleted(Builder $query): void
    {
        $query->where('status', 'completed');
    }

    /**
     * Check if the sprint is currently active.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Check if the sprint is in future/planning state.
     */
    public function isFuture(): bool
    {
        return $this->status === 'future';
    }

    /**
     * Check if the sprint is completed.
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }
}
