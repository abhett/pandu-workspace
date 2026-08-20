<?php

namespace App\Services\Security;

use App\Models\Organization;
use App\Models\OrganizationSecurityPolicy;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SessionSecurityService
{
    /**
     * Get or create organization security policy.
     */
    public function getOrCreatePolicy(Organization $organization): OrganizationSecurityPolicy
    {
        return OrganizationSecurityPolicy::firstOrCreate(
            ['organization_id' => $organization->id],
            [
                'mfa_enforced' => false,
                'min_password_length' => 12,
                'password_rotation_days' => 90,
                'require_uppercase' => true,
                'require_lowercase' => true,
                'require_numeric' => true,
                'require_symbols' => true,
                'lockout_enabled' => true,
                'lockout_max_attempts' => 5,
                'lockout_duration_minutes' => 30,
                'session_timeout_minutes' => 120,
                'ip_allowlist' => ['192.168.1.0/24'],
            ]
        );
    }

    /**
     * Update security policy.
     *
     * @param  array<string, mixed>  $data
     */
    public function updatePolicy(Organization $organization, array $data): OrganizationSecurityPolicy
    {
        $policy = $this->getOrCreatePolicy($organization);

        $policy->update([
            'mfa_enforced' => $data['mfa_enforced'] ?? $policy->mfa_enforced,
            'min_password_length' => (int) ($data['min_password_length'] ?? $policy->min_password_length),
            'password_rotation_days' => (int) ($data['password_rotation_days'] ?? $policy->password_rotation_days),
            'require_uppercase' => $data['require_uppercase'] ?? $policy->require_uppercase,
            'require_lowercase' => $data['require_lowercase'] ?? $policy->require_lowercase,
            'require_numeric' => $data['require_numeric'] ?? $policy->require_numeric,
            'require_symbols' => $data['require_symbols'] ?? $policy->require_symbols,
            'lockout_enabled' => $data['lockout_enabled'] ?? $policy->lockout_enabled,
            'lockout_max_attempts' => (int) ($data['lockout_max_attempts'] ?? $policy->lockout_max_attempts),
            'lockout_duration_minutes' => (int) ($data['lockout_duration_minutes'] ?? $policy->lockout_duration_minutes),
            'session_timeout_minutes' => (int) ($data['session_timeout_minutes'] ?? $policy->session_timeout_minutes),
        ]);

        return $policy->fresh();
    }

    /**
     * Add allowed IP or CIDR to whitelist.
     */
    public function addAllowedIp(Organization $organization, string $ipCidr): OrganizationSecurityPolicy
    {
        $policy = $this->getOrCreatePolicy($organization);
        $ipCidr = trim($ipCidr);

        $list = $policy->ip_allowlist ?? [];
        if (! in_array($ipCidr, $list, true)) {
            $list[] = $ipCidr;
            $policy->update(['ip_allowlist' => array_values($list)]);
        }

        return $policy->fresh();
    }

    /**
     * Remove allowed IP or CIDR from whitelist.
     */
    public function removeAllowedIp(Organization $organization, string $ipCidr): OrganizationSecurityPolicy
    {
        $policy = $this->getOrCreatePolicy($organization);
        $list = $policy->ip_allowlist ?? [];
        $list = array_filter($list, fn ($ip) => $ip !== $ipCidr);

        $policy->update(['ip_allowlist' => array_values($list)]);

        return $policy->fresh();
    }

    /**
     * Get active device sessions for user.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getActiveSessions(User $user, Request $request): array
    {
        $currentSessionId = $request->session()->getId();
        $sessions = [];

        if (Schema::hasTable('sessions')) {
            $dbSessions = DB::table('sessions')
                ->where('user_id', $user->id)
                ->orderByDesc('last_activity')
                ->get();

            foreach ($dbSessions as $s) {
                $isCurrent = $s->id === $currentSessionId;
                $agent = $s->user_agent ?? $request->userAgent() ?? 'Chrome / Windows';
                $sessions[] = [
                    'id' => $s->id,
                    'is_current' => $isCurrent,
                    'ip_address' => $s->ip_address ?? $request->ip() ?? '127.0.0.1',
                    'user_agent' => $agent,
                    'device_name' => $this->parseDeviceName($agent),
                    'browser_name' => $this->parseBrowserName($agent),
                    'location' => 'Jakarta, Indonesia',
                    'last_active' => Carbon::createFromTimestamp($s->last_activity)->diffForHumans(),
                ];
            }
        }

        // If no DB sessions found (e.g. array/file driver), present the current request session
        if (empty($sessions)) {
            $agent = $request->userAgent() ?? 'Chrome / Windows';
            $sessions[] = [
                'id' => $currentSessionId ?: 'current-session',
                'is_current' => true,
                'ip_address' => $request->ip() ?? '127.0.0.1',
                'user_agent' => $agent,
                'device_name' => $this->parseDeviceName($agent),
                'browser_name' => $this->parseBrowserName($agent),
                'location' => 'Jakarta, Indonesia',
                'last_active' => 'Aktif saat ini',
            ];
        }

        return $sessions;
    }

    /**
     * Revoke a specific active session.
     */
    public function revokeSession(User $user, string $sessionId): void
    {
        if (Schema::hasTable('sessions')) {
            DB::table('sessions')->where('user_id', $user->id)->where('id', $sessionId)->delete();
        }
    }

    /**
     * Revoke all other active sessions except the current one.
     */
    public function revokeOtherSessions(User $user, string $currentSessionId): void
    {
        if (Schema::hasTable('sessions')) {
            DB::table('sessions')->where('user_id', $user->id)->where('id', '!=', $currentSessionId)->delete();
        }
    }

    protected function parseDeviceName(string $agent): string
    {
        if (str_contains($agent, 'Macintosh') || str_contains($agent, 'Mac OS')) {
            return 'MacBook Pro / macOS';
        }
        if (str_contains($agent, 'Windows')) {
            return 'Windows Workstation';
        }
        if (str_contains($agent, 'iPhone')) {
            return 'Apple iPhone';
        }
        if (str_contains($agent, 'Android')) {
            return 'Android Mobile';
        }

        return 'Linux Desktop';
    }

    protected function parseBrowserName(string $agent): string
    {
        if (str_contains($agent, 'Edg/')) {
            return 'Microsoft Edge';
        }
        if (str_contains($agent, 'Chrome/')) {
            return 'Google Chrome';
        }
        if (str_contains($agent, 'Safari/') && ! str_contains($agent, 'Chrome/')) {
            return 'Apple Safari';
        }
        if (str_contains($agent, 'Firefox/')) {
            return 'Mozilla Firefox';
        }

        return 'Web Browser';
    }
}
