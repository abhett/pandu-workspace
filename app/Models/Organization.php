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

    /**
     * Get all SLA escalation logs for this organization.
     *
     * @return HasMany<SlaEscalationLog, $this>
     */
    public function slaEscalationLogs(): HasMany
    {
        return $this->hasMany(SlaEscalationLog::class);
    }

    /**
     * Get all CI/CD pipeline configurations for this organization.
     *
     * @return HasMany<CicdPipelineConfig, $this>
     */
    public function cicdPipelineConfigs(): HasMany
    {
        return $this->hasMany(CicdPipelineConfig::class);
    }

    /**
     * Get all CI/CD pipeline runs for this organization.
     *
     * @return HasMany<CicdPipelineRun, $this>
     */
    public function cicdPipelineRuns(): HasMany
    {
        return $this->hasMany(CicdPipelineRun::class);
    }

    /**
     * Get all cloud cost snapshots for this organization.
     *
     * @return HasMany<CloudCostSnapshot, $this>
     */
    public function cloudCostSnapshots(): HasMany
    {
        return $this->hasMany(CloudCostSnapshot::class);
    }

    /**
     * Get all cloud cost anomalies for this organization.
     *
     * @return HasMany<CloudCostAnomaly, $this>
     */
    public function cloudCostAnomalies(): HasMany
    {
        return $this->hasMany(CloudCostAnomaly::class);
    }

    /**
     * Get all cloud cost recommendations for this organization.
     *
     * @return HasMany<CloudCostRecommendation, $this>
     */
    public function cloudCostRecommendations(): HasMany
    {
        return $this->hasMany(CloudCostRecommendation::class);
    }

    /**
     * Get all Kaizen continuous improvement initiatives for this organization.
     *
     * @return HasMany<KaizenInitiative, $this>
     */
    public function kaizenInitiatives(): HasMany
    {
        return $this->hasMany(KaizenInitiative::class);
    }

    /**
     * Get all SBOM dependency packages for this organization.
     *
     * @return HasMany<SbomPackage, $this>
     */
    public function sbomPackages(): HasMany
    {
        return $this->hasMany(SbomPackage::class);
    }

    /**
     * Get all Architecture Decision Records (ADRs) for this organization.
     *
     * @return HasMany<ArchitectureDecisionRecord, $this>
     */
    public function architectureDecisionRecords(): HasMany
    {
        return $this->hasMany(ArchitectureDecisionRecord::class);
    }

    /**
     * Get all developer focus snapshots for this organization.
     *
     * @return HasMany<DeveloperFocusSnapshot, $this>
     */
    public function developerFocusSnapshots(): HasMany
    {
        return $this->hasMany(DeveloperFocusSnapshot::class);
    }

    /**
     * Get all focus time recommendations for this organization.
     *
     * @return HasMany<FocusTimeRecommendation, $this>
     */
    public function focusTimeRecommendations(): HasMany
    {
        return $this->hasMany(FocusTimeRecommendation::class);
    }

    /**
     * Get all feature flags for this organization.
     *
     * @return HasMany<FeatureFlag, $this>
     */
    public function featureFlags(): HasMany
    {
        return $this->hasMany(FeatureFlag::class);
    }

    /**
     * Get all API rate limit policies for this organization.
     *
     * @return HasMany<ApiRateLimitPolicy, $this>
     */
    public function apiRateLimitPolicies(): HasMany
    {
        return $this->hasMany(ApiRateLimitPolicy::class);
    }

    /**
     * Get all API traffic snapshots for this organization.
     *
     * @return HasMany<ApiTrafficSnapshot, $this>
     */
    public function apiTrafficSnapshots(): HasMany
    {
        return $this->hasMany(ApiTrafficSnapshot::class);
    }

    /**
     * Get all webhook endpoints for this organization.
     *
     * @return HasMany<WebhookEndpoint, $this>
     */
    public function webhookEndpoints(): HasMany
    {
        return $this->hasMany(WebhookEndpoint::class);
    }

    /**
     * Get all webhook delivery attempts for this organization.
     *
     * @return HasMany<WebhookDeliveryAttempt, $this>
     */
    public function webhookDeliveryAttempts(): HasMany
    {
        return $this->hasMany(WebhookDeliveryAttempt::class);
    }

    /**
     * Get all incidents for this organization.
     *
     * @return HasMany<Incident, $this>
     */
    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }

    /**
     * Get all on-call rotas for this organization.
     *
     * @return HasMany<OnCallRota, $this>
     */
    public function onCallRotas(): HasMany
    {
        return $this->hasMany(OnCallRota::class);
    }

    /**
     * Get all pull request reviews for this organization.
     *
     * @return HasMany<PullRequestReview, $this>
     */
    public function pullRequestReviews(): HasMany
    {
        return $this->hasMany(PullRequestReview::class);
    }

    /**
     * Get all codeowner rules for this organization.
     *
     * @return HasMany<CodeownerRule, $this>
     */
    public function codeownerRules(): HasMany
    {
        return $this->hasMany(CodeownerRule::class);
    }

    /**
     * Get all release publications for this organization.
     *
     * @return HasMany<ReleasePublication, $this>
     */
    public function releasePublications(): HasMany
    {
        return $this->hasMany(ReleasePublication::class);
    }

    /**
     * Get all database environments for this organization.
     *
     * @return HasMany<DatabaseEnvironment, $this>
     */
    public function databaseEnvironments(): HasMany
    {
        return $this->hasMany(DatabaseEnvironment::class);
    }

    /**
     * Get all schema drift reports for this organization.
     *
     * @return HasMany<SchemaDriftReport, $this>
     */
    public function schemaDriftReports(): HasMany
    {
        return $this->hasMany(SchemaDriftReport::class);
    }

    /**
     * Get data residency configuration for this organization.
     *
     * @return HasOne<DataResidencyConfig, $this>
     */
    public function dataResidencyConfig(): HasOne
    {
        return $this->hasOne(DataResidencyConfig::class);
    }

    /**
     * Get all PII masking rules for this organization.
     *
     * @return HasMany<PiiMaskingRule, $this>
     */
    public function piiMaskingRules(): HasMany
    {
        return $this->hasMany(PiiMaskingRule::class);
    }

    /**
     * Get all DSAR requests for this organization.
     *
     * @return HasMany<DataSubjectAccessRequest, $this>
     */
    public function dataSubjectAccessRequests(): HasMany
    {
        return $this->hasMany(DataSubjectAccessRequest::class);
    }

    /**
     * Get all executive boardroom briefings for this organization.
     *
     * @return HasMany<BoardroomBriefing, $this>
     */
    public function boardroomBriefings(): HasMany
    {
        return $this->hasMany(BoardroomBriefing::class);
    }
}
