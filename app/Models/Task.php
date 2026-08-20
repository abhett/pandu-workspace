<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $organization_id
 * @property string $project_id
 * @property string $status_id
 * @property string|null $sprint_id
 * @property string|null $parent_id
 * @property int $sequence_number
 * @property string $key
 * @property string $title
 * @property string|null $description
 * @property string $type
 * @property string $priority
 * @property float|null $estimate_points
 * @property Carbon|null $due_date
 * @property Carbon|null $completed_at
 * @property string $rank
 * @property int $version
 * @property int|null $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
#[Fillable([
    'organization_id',
    'project_id',
    'status_id',
    'sprint_id',
    'parent_id',
    'sequence_number',
    'key',
    'title',
    'description',
    'type',
    'priority',
    'estimate_points',
    'due_date',
    'start_date',
    'is_milestone',
    'completed_at',
    'rank',
    'version',
    'created_by',
])]
class Task extends Model
{
    use HasFactory, HasUuidPrimaryKey, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sequence_number' => 'integer',
            'estimate_points' => 'float',
            'due_date' => 'date',
            'start_date' => 'date',
            'is_milestone' => 'boolean',
            'completed_at' => 'datetime',
            'version' => 'integer',
            'created_by' => 'integer',
        ];
    }

    /**
     * Accessor for story_points (alias of estimate_points).
     */
    public function getStoryPointsAttribute(): ?float
    {
        return $this->estimate_points;
    }

    /**
     * Mutator for story_points.
     */
    public function setStoryPointsAttribute($value): void
    {
        $this->attributes['estimate_points'] = $value !== null ? (float) $value : null;
    }

    /**
     * Get the project that owns the task.
     *
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the organization that owns the task.
     *
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the status of the task.
     *
     * @return BelongsTo<WorkflowStatus, $this>
     */
    public function status(): BelongsTo
    {
        return $this->belongsTo(WorkflowStatus::class, 'status_id');
    }

    /**
     * Alias for status relation.
     *
     * @return BelongsTo<WorkflowStatus, $this>
     */
    public function workflowStatus(): BelongsTo
    {
        return $this->belongsTo(WorkflowStatus::class, 'status_id');
    }

    /**
     * Get the sprint assigned to this task.
     *
     * @return BelongsTo<Sprint, $this>
     */
    public function sprint(): BelongsTo
    {
        return $this->belongsTo(Sprint::class);
    }

    /**
     * Get the parent task (for subtasks).
     *
     * @return BelongsTo<Task, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_id');
    }

    /**
     * Get all child subtasks.
     *
     * @return HasMany<Task, $this>
     */
    public function subtasks(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_id')->orderBy('created_at');
    }

    /**
     * Get the user who created the task.
     *
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get all assignees of the task.
     *
     * @return BelongsToMany<User, $this>
     */
    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_assignees')
            ->withPivot(['assigned_at', 'assigned_by'])
            ->orderByPivot('assigned_at');
    }

    /**
     * Get all activities recorded for this task.
     *
     * @return HasMany<TaskActivity, $this>
     */
    public function activities(): HasMany
    {
        return $this->hasMany(TaskActivity::class)->latest('created_at');
    }

    /**
     * Get all labels assigned to this task.
     *
     * @return BelongsToMany<Label, $this>
     */
    public function labels(): BelongsToMany
    {
        return $this->belongsToMany(Label::class, 'task_labels');
    }

    /**
     * Get all attachments associated with this task.
     *
     * @return MorphMany<Attachment, $this>
     */
    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    /**
     * Get all comments on this task.
     *
     * @return HasMany<Comment, $this>
     */
    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->whereNull('parent_id')->with(['user', 'replies.user'])->latest('created_at');
    }

    /**
     * Get all checklists for this task.
     *
     * @return HasMany<TaskChecklist, $this>
     */
    public function checklists(): HasMany
    {
        return $this->hasMany(TaskChecklist::class)->orderBy('position');
    }

    /**
     * Get all blockers for this task.
     *
     * @return HasMany<TaskBlocker, $this>
     */
    public function blockers(): HasMany
    {
        return $this->hasMany(TaskBlocker::class)->latest('created_at');
    }

    /**
     * Get the active blocker for this task.
     *
     * @return HasOne<TaskBlocker, $this>
     */
    public function activeBlocker(): HasOne
    {
        return $this->hasOne(TaskBlocker::class)->where('is_resolved', false)->latestOfMany();
    }

    /**
     * Get all dependencies where this task is the successor (it depends on predecessor).
     *
     * @return HasMany<TaskDependency, $this>
     */
    public function predecessorDependencies(): HasMany
    {
        return $this->hasMany(TaskDependency::class, 'successor_id');
    }

    /**
     * Get all dependencies where this task is the predecessor (other tasks depend on it).
     *
     * @return HasMany<TaskDependency, $this>
     */
    public function successorDependencies(): HasMany
    {
        return $this->hasMany(TaskDependency::class, 'predecessor_id');
    }

    /**
     * Get all predecessor tasks that must be done before this task.
     *
     * @return BelongsToMany<Task, $this>
     */
    public function predecessors(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_dependencies', 'successor_id', 'predecessor_id')
            ->withPivot(['id', 'type', 'lag_days'])
            ->withTimestamps();
    }

    /**
     * Get all successor tasks that depend on this task.
     *
     * @return BelongsToMany<Task, $this>
     */
    public function successors(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_dependencies', 'predecessor_id', 'successor_id')
            ->withPivot(['id', 'type', 'lag_days'])
            ->withTimestamps();
    }

    /**
     * Get the SLA tracker associated with this task.
     *
     * @return HasOne<TaskSlaTracker, $this>
     */
    public function slaTracker(): HasOne
    {
        return $this->hasOne(TaskSlaTracker::class);
    }

    /**
     * Get the skills required to complete this task.
     *
     * @return HasMany<TaskRequiredSkill, $this>
     */
    public function requiredSkills(): HasMany
    {
        return $this->hasMany(TaskRequiredSkill::class);
    }
}
