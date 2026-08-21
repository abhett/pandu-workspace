<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Database\Factories\OrganizationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $name
 * @property string $slug
 * @property string $status
 * @property string $timezone
 * @property string $locale
 * @property array<string, mixed> $settings
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
#[Fillable(['name', 'slug', 'status', 'timezone', 'locale', 'settings'])]
class Organization extends Model
{
    /** @use HasFactory<OrganizationFactory> */
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
        ];
    }

    /**
     * Get all memberships for the organization.
     *
     * @return HasMany<OrganizationMembership, $this>
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(OrganizationMembership::class);
    }

    /**
     * Get all users in the organization.
     *
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'organization_memberships')
            ->withPivot(['id', 'role', 'title', 'status', 'joined_at'])
            ->withTimestamps();
    }

    /**
     * Get the owner membership of the organization.
     *
     * @return HasOneThrough<User, OrganizationMembership, $this>
     */
    public function owner(): HasOneThrough
    {
        return $this->hasOneThrough(
            User::class,
            OrganizationMembership::class,
            'organization_id',
            'id',
            'id',
            'user_id'
        )->where('organization_memberships.role', 'owner');
    }

    /**
     * Get all teams for the organization.
     *
     * @return HasMany<Team, $this>
     */
    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }

    /**
     * Get all custom and organization roles.
     *
     * @return HasMany<Role, $this>
     */
    public function roles(): HasMany
    {
        return $this->hasMany(Role::class);
    }

    /**
     * Get all invitations for the organization.
     *
     * @return HasMany<OrganizationInvitation, $this>
     */
    public function invitations(): HasMany
    {
        return $this->hasMany(OrganizationInvitation::class);
    }

    /**
     * Get all projects for the organization.
     *
     * @return HasMany<Project, $this>
     */
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    /**
     * Get all attachments for the organization.
     *
     * @return HasMany<Attachment, $this>
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }

    /**
     * Get all webhook subscriptions for the organization.
     *
     * @return HasMany<WebhookSubscription, $this>
     */
    public function webhookSubscriptions(): HasMany
    {
        return $this->hasMany(WebhookSubscription::class);
    }

    /**
     * Get the AI configuration for the organization.
     *
     * @return HasOne<OrganizationAiSetting, $this>
     */
    public function aiSetting(): HasOne
    {
        return $this->hasOne(OrganizationAiSetting::class);
    }

    /**
     * Get all AI usage logs for the organization.
     *
     * @return HasMany<AiUsageLog, $this>
     */
    public function aiUsageLogs(): HasMany
    {
        return $this->hasMany(AiUsageLog::class)->latest('created_at');
    }

    /**
     * Get all skills catalog for the organization.
     *
     * @return HasMany<Skill, $this>
     */
    public function skills(): HasMany
    {
        return $this->hasMany(Skill::class);
    }

    /**
     * Get all team mood pulses for the organization.
     *
     * @return HasMany<TeamMoodPulse, $this>
     */
    public function moodPulses(): HasMany
    {
        return $this->hasMany(TeamMoodPulse::class);
    }

    /**
     * Get all wellness initiatives for the organization.
     *
     * @return HasMany<WellnessInitiative, $this>
     */
    public function wellnessInitiatives(): HasMany
    {
        return $this->hasMany(WellnessInitiative::class);
    }

    /**
     * Get all workload rebalance audit logs for the organization.
     *
     * @return HasMany<WorkloadRebalanceLog, $this>
     */
    public function workloadRebalanceLogs(): HasMany
    {
        return $this->hasMany(WorkloadRebalanceLog::class)->latest('created_at');
    }

    /**
     * Get all strategic OKR objectives for the organization.
     *
     * @return HasMany<OkrObjective, $this>
     */
    public function okrObjectives(): HasMany
    {
        return $this->hasMany(OkrObjective::class);
    }

    /**
     * Get all cost centers for the organization.
     *
     * @return HasMany<CostCenter, $this>
     */
    public function costCenters(): HasMany
    {
        return $this->hasMany(CostCenter::class);
    }

    /**
     * Get all compliance security incidents for the organization.
     *
     * @return HasMany<ComplianceIncident, $this>
     */
    public function complianceIncidents(): HasMany
    {
        return $this->hasMany(ComplianceIncident::class);
    }

    /**
     * Get the enterprise MFA enforcement settings for this organization.
     *
     * @return HasOne<OrganizationMfaSetting, $this>
     */
    public function mfaSetting(): HasOne
    {
        return $this->hasOne(OrganizationMfaSetting::class);
    }

    /**
     * Get all MFA grace period exemptions for this organization.
     *
     * @return HasMany<MfaGraceExemption, $this>
     */
    public function mfaGraceExemptions(): HasMany
    {
        return $this->hasMany(MfaGraceExemption::class);
    }

    /**
     * Get all custom enterprise dashboards for this organization.
     *
     * @return HasMany<CustomDashboard, $this>
     */
    public function customDashboards(): HasMany
    {
        return $this->hasMany(CustomDashboard::class);
    }
}
