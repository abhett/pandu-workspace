<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $organization_id
 * @property string $name
 * @property string $key
 * @property string $slug
 * @property string|null $description
 * @property string $type
 * @property string $icon
 * @property string $color
 * @property int|null $lead_user_id
 * @property int|null $default_assignee_id
 * @property string $status
 * @property array<string, mixed>|null $settings
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
#[Fillable([
    'organization_id',
    'name',
    'key',
    'slug',
    'description',
    'type',
    'icon',
    'color',
    'lead_user_id',
    'default_assignee_id',
    'status',
    'settings',
])]
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory, HasUuidPrimaryKey, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'lead_user_id' => 'integer',
            'default_assignee_id' => 'integer',
        ];
    }

    /**
     * Set the project's key to uppercase.
     */
    public function setKeyAttribute(string $value): void
    {
        $this->attributes['key'] = strtoupper(trim($value));
    }

    /**
     * Get the organization that owns the project.
     *
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the project lead.
     *
     * @return BelongsTo<User, $this>
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lead_user_id');
    }

    /**
     * Get the default assignee.
     *
     * @return BelongsTo<User, $this>
     */
    public function defaultAssignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'default_assignee_id');
    }

    /**
     * Get all project memberships.
     *
     * @return HasMany<ProjectMember, $this>
     */
    public function projectMembers(): HasMany
    {
        return $this->hasMany(ProjectMember::class);
    }

    /**
     * Get all users assigned to the project.
     *
     * @return BelongsToMany<User, $this>
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_members')
            ->withPivot(['id', 'role', 'joined_at'])
            ->withTimestamps();
    }

    /**
     * Get the primary workflow of the project.
     *
     * @return HasOne<Workflow, $this>
     */
    public function workflow(): HasOne
    {
        return $this->hasOne(Workflow::class);
    }

    /**
     * Get all workflow statuses for this project.
     *
     * @return HasMany<WorkflowStatus, $this>
     */
    public function statuses(): HasMany
    {
        return $this->hasMany(WorkflowStatus::class)->orderBy('position');
    }

    /**
     * Get all tasks in this project.
     *
     * @return HasMany<Task, $this>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * Get all labels in this project.
     *
     * @return HasMany<Label, $this>
     */
    public function labels(): HasMany
    {
        return $this->hasMany(Label::class);
    }

    /**
     * Get all sprints for this project.
     *
     * @return HasMany<Sprint, $this>
     */
    public function sprints(): HasMany
    {
        return $this->hasMany(Sprint::class)->orderBy('sequence_number');
    }

    /**
     * Get the active sprint of this project.
     *
     * @return HasOne<Sprint, $this>
     */
    public function activeSprint(): HasOne
    {
        return $this->hasOne(Sprint::class)->where('status', 'active');
    }

    /**
     * Get the financial budget configuration for this project.
     *
     * @return HasOne<ProjectBudget, $this>
     */
    public function budget(): HasOne
    {
        return $this->hasOne(ProjectBudget::class);
    }

    /**
     * Get member hourly billing rates for this project.
     *
     * @return HasMany<ProjectMemberRate, $this>
     */
    public function memberRates(): HasMany
    {
        return $this->hasMany(ProjectMemberRate::class);
    }

    /**
     * Get all task worklogs and labor costs logged in this project.
     *
     * @return HasMany<TaskWorklog, $this>
     */
    public function worklogs(): HasMany
    {
        return $this->hasMany(TaskWorklog::class);
    }

    /**
     * Get all operational and capital expenses in this project.
     *
     * @return HasMany<ProjectExpense, $this>
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(ProjectExpense::class);
    }

    /**
     * Get all whiteboard ideation canvases in this project.
     *
     * @return HasMany<ProjectWhiteboard, $this>
     */
    public function whiteboards(): HasMany
    {
        return $this->hasMany(ProjectWhiteboard::class);
    }

    /**
     * Get all risk register items in this project.
     *
     * @return HasMany<ProjectRisk, $this>
     */
    public function risks(): HasMany
    {
        return $this->hasMany(ProjectRisk::class);
    }

    /**
     * Get all sprint retrospectives in this project.
     *
     * @return HasMany<SprintRetrospective, $this>
     */
    public function retrospectives(): HasMany
    {
        return $this->hasMany(SprintRetrospective::class);
    }

    /**
     * Get all planning poker sessions in this project.
     *
     * @return HasMany<PlanningPokerSession, $this>
     */
    public function planningPokerSessions(): HasMany
    {
        return $this->hasMany(PlanningPokerSession::class);
    }

    /**
     * Get all forecast scenarios in this project.
     *
     * @return HasMany<ProjectForecastScenario, $this>
     */
    public function forecastScenarios(): HasMany
    {
        return $this->hasMany(ProjectForecastScenario::class);
    }
}
