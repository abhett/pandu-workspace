<?php

namespace App\Services\Security;

use App\Models\MfaGraceExemption;
use App\Models\Organization;
use App\Models\OrganizationAuditLog;
use App\Models\OrganizationMembership;
use App\Models\OrganizationMfaSetting;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MfaEnforcementService
{
    /**
     * Get or create organization MFA settings.
     */
    public function getOrCreateSetting(Organization $organization): OrganizationMfaSetting
    {
        return OrganizationMfaSetting::firstOrCreate(
            ['organization_id' => $organization->id],
            [
                'enforcement_mode' => 'privileged_roles_only',
                'grace_period_days' => 7,
                'remember_device_days' => 30,
                'allowed_methods' => ['totp_authenticator', 'backup_recovery_codes'],
            ]
        );
    }

    /**
     * Get complete MFA enforcement overview, compliance matrix, and member adoption status.
     *
     * @return array<string, mixed>
     */
    public function getMfaEnforcementOverview(Organization $organization): array
    {
        $setting = $this->getOrCreateSetting($organization);

        $memberships = OrganizationMembership::where('organization_id', $organization->id)
            ->with(['user', 'roleModel'])
            ->get();

        $activeExemptions = MfaGraceExemption::where('organization_id', $organization->id)
            ->where('expires_at', '>', now())
            ->get()
            ->keyBy('user_id');

        // Check active sessions count if sessions table exists
        $userSessionCounts = [];
        if (Schema::hasTable('sessions')) {
            $userSessionCounts = DB::table('sessions')
                ->whereIn('user_id', $memberships->pluck('user_id'))
                ->groupBy('user_id')
                ->select('user_id', DB::raw('count(*) as count'))
                ->pluck('count', 'user_id')
                ->all();
        }

        $auditMembers = $memberships->map(function (OrganizationMembership $m) use ($setting, $activeExemptions, $userSessionCounts) {
            $user = $m->user;
            if (! $user) {
                return null;
            }

            $has2fa = ! empty($user->two_factor_confirmed_at);
            $exemption = $activeExemptions->get($user->id);

            $joinedAt = $m->joined_at ?? $m->created_at ?? now();
            $graceDeadline = $joinedAt->copy()->addDays($setting->grace_period_days);
            $isUnderGracePeriod = now()->lt($graceDeadline);
            $daysLeftInGrace = max(0, (int) now()->diffInDays($graceDeadline, false));

            $roleSlug = $m->roleModel?->slug ?? $m->role;
            $isPrivileged = in_array($roleSlug, ['owner', 'admin', 'manager']);

            $status = 'non_compliant';
            if ($has2fa) {
                $status = 'enrolled';
            } elseif ($exemption) {
                $status = 'exempt';
            } elseif ($isUnderGracePeriod) {
                $status = 'grace_period';
            }

            // Check whether MFA is strictly required for this user under current enforcement policy
            $isRequired = false;
            if ($setting->enforcement_mode === 'all_members') {
                $isRequired = true;
            } elseif ($setting->enforcement_mode === 'privileged_roles_only' && $isPrivileged) {
                $isRequired = true;
            }

            return [
                'user_id' => $user->id,
                'membership_id' => $m->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $roleSlug,
                'is_privileged' => $isPrivileged,
                'is_required' => $isRequired,
                'has_2fa' => $has2fa,
                'mfa_status' => $status,
                'days_left_in_grace' => $daysLeftInGrace,
                'grace_deadline_formatted' => $graceDeadline->translatedFormat('d M Y'),
                'two_factor_confirmed_at_formatted' => $user->two_factor_confirmed_at?->translatedFormat('d M Y H:i'),
                'active_sessions_count' => $userSessionCounts[$user->id] ?? 1,
                'exemption' => $exemption ? [
                    'id' => $exemption->id,
                    'reason' => $exemption->reason,
                    'expires_at_formatted' => $exemption->expires_at->translatedFormat('d M Y H:i'),
                ] : null,
            ];
        })->filter()->values();

        // Calculate KPI metrics
        $totalMembers = $auditMembers->count();
        $enrolledCount = $auditMembers->where('has_2fa', true)->count();
        $graceCount = $auditMembers->where('mfa_status', 'grace_period')->count();
        $nonCompliantCount = $auditMembers->where('mfa_status', 'non_compliant')->where('is_required', true)->count();

        $adoptionRate = $totalMembers > 0 ? round(($enrolledCount / $totalMembers) * 100, 1) : 0.0;

        $privilegedMembers = $auditMembers->where('is_privileged', true);
        $privilegedTotal = $privilegedMembers->count();
        $privilegedEnrolled = $privilegedMembers->where('has_2fa', true)->count();
        $privilegedAdoptionRate = $privilegedTotal > 0 ? round(($privilegedEnrolled / $privilegedTotal) * 100, 1) : 100.0;

        return [
            'settings' => [
                'id' => $setting->id,
                'enforcement_mode' => $setting->enforcement_mode,
                'grace_period_days' => $setting->grace_period_days,
                'remember_device_days' => $setting->remember_device_days,
                'allowed_methods' => $setting->allowed_methods ?? ['totp_authenticator', 'backup_recovery_codes'],
                'kill_switch_last_triggered_at_formatted' => $setting->kill_switch_last_triggered_at?->translatedFormat('d M Y H:i:s'),
                'kill_switch_triggered_by_name' => $setting->killSwitchTriggerer?->name,
            ],
            'metrics' => [
                'total_members' => $totalMembers,
                'enrolled_members' => $enrolledCount,
                'adoption_rate_pct' => $adoptionRate,
                'grace_period_members' => $graceCount,
                'non_compliant_members' => $nonCompliantCount,
                'privileged_adoption_rate_pct' => $privilegedAdoptionRate,
            ],
            'members' => $auditMembers->all(),
        ];
    }

    /**
     * Update organization MFA settings.
     */
    public function updateMfaSettings(Organization $organization, array $data): OrganizationMfaSetting
    {
        $setting = $this->getOrCreateSetting($organization);

        $setting->update([
            'enforcement_mode' => $data['enforcement_mode'] ?? $setting->enforcement_mode,
            'grace_period_days' => isset($data['grace_period_days']) ? (int) $data['grace_period_days'] : $setting->grace_period_days,
            'remember_device_days' => isset($data['remember_device_days']) ? (int) $data['remember_device_days'] : $setting->remember_device_days,
            'allowed_methods' => $data['allowed_methods'] ?? $setting->allowed_methods,
        ]);

        return $setting;
    }

    /**
     * Grant temporary grace exemption to a member.
     */
    public function grantGraceExemption(Organization $organization, User $user, User $granter, int $extraDays, string $reason): MfaGraceExemption
    {
        return MfaGraceExemption::updateOrCreate(
            [
                'organization_id' => $organization->id,
                'user_id' => $user->id,
            ],
            [
                'granted_by' => $granter->id,
                'reason' => $reason,
                'expires_at' => now()->addDays($extraDays),
            ]
        );
    }

    /**
     * Revoke grace exemption.
     */
    public function revokeGraceExemption(string $exemptionId): bool
    {
        return (bool) MfaGraceExemption::where('id', $exemptionId)->delete();
    }

    /**
     * Send MFA setup reminder email/notification log.
     */
    public function sendMfaSetupReminder(Organization $organization, User $user): void
    {
        OrganizationAuditLog::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'event_category' => 'security',
            'action' => 'mfa_setup_reminder_sent',
            'resource_type' => 'User',
            'resource_id' => (string) $user->id,
            'status' => 'success',
            'changes' => ['recipient_email' => $user->email],
        ]);
    }

    /**
     * Emergency Kill-Switch: Revoke all active member sessions in organization.
     */
    public function triggerEmergencyKillSwitch(Organization $organization, User $admin): int
    {
        $setting = $this->getOrCreateSetting($organization);
        $setting->update([
            'kill_switch_last_triggered_at' => now(),
            'kill_switch_triggered_by' => $admin->id,
        ]);

        $memberUserIds = OrganizationMembership::where('organization_id', $organization->id)->pluck('user_id')->all();

        $revokedCount = 0;
        if (Schema::hasTable('sessions')) {
            $revokedCount = DB::table('sessions')
                ->whereIn('user_id', $memberUserIds)
                ->delete();
        }

        OrganizationAuditLog::create([
            'organization_id' => $organization->id,
            'user_id' => $admin->id,
            'event_category' => 'security',
            'action' => 'emergency_session_kill_switch_triggered',
            'resource_type' => 'OrganizationMfaSetting',
            'resource_id' => $setting->id,
            'status' => 'success',
            'changes' => [
                'revoked_sessions_count' => $revokedCount,
                'affected_members_count' => count($memberUserIds),
            ],
        ]);

        return $revokedCount;
    }
}
