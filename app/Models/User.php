<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $uuid
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string $status
 * @property string $locale
 * @property string $timezone
 * @property Carbon|null $last_login_at
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property mixed $pivot
 */
#[Fillable(['name', 'email', 'password', 'status', 'locale', 'timezone', 'last_login_at'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::creating(function (User $user) {
            if (empty($user->uuid)) {
                $user->uuid = (string) Str::uuid7();
            }
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Get the current active organization.
     *
     * @return BelongsTo<Organization, $this>
     */
    public function currentOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'current_organization_id');
    }

    /**
     * Get all memberships for the user.
     *
     * @return HasMany<OrganizationMembership, $this>
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(OrganizationMembership::class);
    }

    /**
     * Get all organizations the user belongs to.
     *
     * @return BelongsToMany<Organization, $this>
     */
    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'organization_memberships')
            ->withPivot(['id', 'role', 'title', 'status', 'joined_at'])
            ->withTimestamps();
    }

    /**
     * Check if the user belongs to a specific organization.
     */
    public function belongsToOrganization(Organization|string $organization): bool
    {
        $orgId = $organization instanceof Organization ? $organization->id : $organization;

        return $this->memberships()->where('organization_id', $orgId)->exists();
    }

    /**
     * Get all teams the user belongs to.
     *
     * @return BelongsToMany<Team, $this>
     */
    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'team_members', 'user_id', 'team_id')
            ->withPivot(['id', 'role', 'joined_at'])
            ->withTimestamps();
    }

    /**
     * Check if user has a specific permission in an organization.
     */
    public function hasPermissionInOrganization(Organization|string $organization, string $permissionId): bool
    {
        $orgId = $organization instanceof Organization ? $organization->id : $organization;
        $membership = $this->memberships()->where('organization_id', $orgId)->first();

        if (! $membership) {
            return false;
        }

        if ($membership->role === 'owner') {
            return true;
        }

        // Check if attached to custom role
        if ($membership->role_id) {
            $role = Role::with('permissions')->find($membership->role_id);
            if ($role && $role->hasPermission($permissionId)) {
                return true;
            }
        }

        // Check system role defaults
        $systemRole = Role::with('permissions')
            ->whereNull('organization_id')
            ->where('slug', $membership->role)
            ->first();

        return $systemRole?->hasPermission($permissionId) ?? false;
    }

    /**
     * Get all project memberships for the user.
     *
     * @return HasMany<ProjectMember, $this>
     */
    public function projectMemberships(): HasMany
    {
        return $this->hasMany(ProjectMember::class);
    }

    /**
     * Get all projects the user belongs to.
     *
     * @return BelongsToMany<Project, $this>
     */
    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_members')
            ->withPivot(['id', 'role', 'joined_at'])
            ->withTimestamps();
    }

    /**
     * Get the user's role in a specific organization.
     */
    public function roleInOrganization(Organization|string $organization): ?string
    {
        $orgId = $organization instanceof Organization ? $organization->id : $organization;

        return $this->memberships()->where('organization_id', $orgId)->value('role');
    }

    /**
     * Get all tasks assigned to the user.
     *
     * @return BelongsToMany<Task, $this>
     */
    public function assignedTasks(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_assignees')
            ->withPivot(['assigned_at', 'assigned_by']);
    }

    /**
     * Get all attachments uploaded by the user.
     *
     * @return HasMany<Attachment, $this>
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class, 'uploader_id');
    }

    /**
     * Get all notification preferences for the user.
     *
     * @return HasMany<UserNotificationPreference, $this>
     */
    public function notificationPreferences(): HasMany
    {
        return $this->hasMany(UserNotificationPreference::class);
    }

    /**
     * Check whether the user wants to receive a specific event type on a channel.
     */
    public function wantsNotification(string $eventType, string $channel = 'in_app'): bool
    {
        $pref = $this->notificationPreferences()->where('event_type', $eventType)->first();
        if (! $pref) {
            return true; // Default enabled
        }

        return $channel === 'email' ? $pref->email_enabled : $pref->in_app_enabled;
    }

    /**
     * Get all connected third-party OAuth accounts for the user.
     *
     * @return HasMany<UserConnectedAccount, $this>
     */
    public function connectedAccounts(): HasMany
    {
        return $this->hasMany(UserConnectedAccount::class);
    }

    /**
     * Get the AI preferences for the user.
     *
     * @return HasOne<UserAiPreference, $this>
     */
    public function aiPreference(): HasOne
    {
        return $this->hasOne(UserAiPreference::class);
    }

    /**
     * Get the regional & timezone preferences for the user.
     *
     * @return HasOne<UserRegionalPreference, $this>
     */
    public function regionalPreference(): HasOne
    {
        return $this->hasOne(UserRegionalPreference::class);
    }

    /**
     * Get accessibility and shortcut preferences for the user.
     *
     * @return HasOne<UserAccessibilityPreference, $this>
     */
    public function accessibilityPreference(): HasOne
    {
        return $this->hasOne(UserAccessibilityPreference::class);
    }
}
