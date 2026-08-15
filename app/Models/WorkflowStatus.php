<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $workflow_id
 * @property string|null $project_id
 * @property string $name
 * @property string $slug
 * @property string $category
 * @property string $color
 * @property int $position
 * @property bool $is_initial
 * @property bool $is_completed
 * @property int|null $wip_limit
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'workflow_id',
    'project_id',
    'name',
    'slug',
    'category',
    'color',
    'position',
    'is_initial',
    'is_completed',
    'wip_limit',
])]
class WorkflowStatus extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'is_initial' => 'boolean',
            'is_completed' => 'boolean',
            'wip_limit' => 'integer',
        ];
    }

    /**
     * Get the workflow that owns this status.
     *
     * @return BelongsTo<Workflow, $this>
     */
    public function workflow(): BelongsTo
    {
        return $this->belongsTo(Workflow::class);
    }

    /**
     * Get the project that owns this status.
     *
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get all tasks with this status.
     *
     * @return HasMany<Task, $this>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'status_id')->orderBy('rank');
    }
}
