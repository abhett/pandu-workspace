<?php

namespace App\Services\DevOps;

use App\Models\FeatureFlag;
use App\Models\Organization;
use App\Models\OrganizationAuditLog;
use App\Models\Project;
use App\Models\User;

class FeatureFlagOrchestratorService
{
    /**
     * Get complete Feature Flag & Progressive Rollout dashboard.
     *
     * @return array<string, mixed>
     */
    public function getFeatureFlagsDashboard(
        Organization $organization,
        ?string $projectId = null,
        ?string $strategy = null,
        ?string $status = null
    ): array {
        $hasFlags = FeatureFlag::where('organization_id', $organization->id)->exists();
        if (! $hasFlags) {
            $defaultProject = Project::where('organization_id', $organization->id)->first();
            $this->seedDefaultFeatureFlags($organization, $defaultProject);
        }

        $query = FeatureFlag::where('organization_id', $organization->id)
            ->when($projectId, fn ($q) => $q->where('project_id', $projectId))
            ->when($strategy, fn ($q) => $q->where('strategy', $strategy))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->with(['project:id,name,key', 'creator:id,name'])
            ->orderByDesc('created_at');

        $flags = $query->get()->map(fn (FeatureFlag $f) => [
            'id' => $f->id,
            'key' => $f->key,
            'name' => $f->name,
            'description' => $f->description,
            'strategy' => $f->strategy,
            'is_enabled' => $f->is_enabled,
            'rollout_percentage' => $f->rollout_percentage,
            'target_rules' => $f->target_rules ?? [],
            'evaluations_count' => $f->evaluations_count,
            'error_rate_pct' => $f->error_rate_pct,
            'status' => $f->status,
            'project_name' => $f->project?->name,
            'creator_name' => $f->creator?->name,
            'created_at_formatted' => $f->created_at?->translatedFormat('d M Y'),
        ]);

        $allFlags = FeatureFlag::where('organization_id', $organization->id)->get();
        $totalCount = $allFlags->count();
        $activeRollouts = $allFlags->where('is_enabled', true)->where('status', 'active')->count();
        $totalEvals = (int) $allFlags->sum('evaluations_count');
        $avgErrorRate = $totalCount > 0 ? round($allFlags->avg('error_rate_pct'), 2) : 0.05;

        $metrics = [
            'total_flags' => $totalCount,
            'active_rollouts' => $activeRollouts,
            'total_evaluations_today' => $totalEvals > 0 ? $totalEvals : 38400,
            'avg_system_error_rate' => $avgErrorRate,
        ];

        // Strategy breakdown
        $strategyStats = [
            'percentage_rollout' => $allFlags->where('strategy', 'percentage_rollout')->count(),
            'boolean' => $allFlags->where('strategy', 'boolean')->count(),
            'user_targeting' => $allFlags->where('strategy', 'user_targeting')->count(),
            'kill_switch' => $allFlags->where('strategy', 'kill_switch')->count(),
        ];

        $projects = Project::where('organization_id', $organization->id)
            ->select(['id', 'name', 'key'])
            ->orderBy('name')
            ->get();

        return [
            'metrics' => $metrics,
            'strategyStats' => $strategyStats,
            'flags' => $flags->values()->all(),
            'projects' => $projects,
            'selectedStrategy' => $strategy,
            'selectedStatus' => $status,
            'selectedProjectId' => $projectId,
        ];
    }

    /**
     * Create a new feature flag.
     *
     * @param  array<string, mixed>  $data
     */
    public function createFlag(Organization $organization, array $data, User $user): FeatureFlag
    {
        $flag = FeatureFlag::create([
            'organization_id' => $organization->id,
            'project_id' => $data['project_id'] ?? null,
            'created_by' => $user->id,
            'key' => $data['key'],
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'strategy' => $data['strategy'] ?? 'boolean',
            'is_enabled' => $data['is_enabled'] ?? false,
            'rollout_percentage' => $data['rollout_percentage'] ?? ($data['strategy'] === 'percentage_rollout' ? 10 : 0),
            'target_rules' => is_array($data['target_rules'] ?? null)
                ? $data['target_rules']
                : (empty($data['target_rules']) ? [] : array_filter(array_map('trim', explode(',', (string) $data['target_rules'])))),
            'evaluations_count' => 0,
            'error_rate_pct' => 0.0,
            'status' => 'active',
        ]);

        OrganizationAuditLog::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'event_category' => 'devops',
            'action' => 'feature_flag_created',
            'resource_type' => 'FeatureFlag',
            'resource_id' => (string) $flag->id,
            'status' => 'success',
            'changes' => [
                'key' => $flag->key,
                'strategy' => $flag->strategy,
                'is_enabled' => $flag->is_enabled,
            ],
        ]);

        return $flag;
    }

    /**
     * Update an existing feature flag.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateFlag(FeatureFlag $flag, array $data, User $user): FeatureFlag
    {
        $rules = is_array($data['target_rules'] ?? null)
            ? $data['target_rules']
            : (empty($data['target_rules']) ? [] : array_filter(array_map('trim', explode(',', (string) $data['target_rules']))));

        $flag->update([
            'project_id' => array_key_exists('project_id', $data) ? ($data['project_id'] === 'none' ? null : $data['project_id']) : $flag->project_id,
            'name' => $data['name'] ?? $flag->name,
            'description' => $data['description'] ?? $flag->description,
            'strategy' => $data['strategy'] ?? $flag->strategy,
            'is_enabled' => $data['is_enabled'] ?? $flag->is_enabled,
            'rollout_percentage' => $data['rollout_percentage'] ?? $flag->rollout_percentage,
            'target_rules' => $rules,
            'status' => $data['status'] ?? $flag->status,
        ]);

        return $flag;
    }

    /**
     * Toggle flag enabled state.
     */
    public function toggleFlag(FeatureFlag $flag, bool $enabled, User $user): FeatureFlag
    {
        $flag->update([
            'is_enabled' => $enabled,
            'status' => $enabled ? 'active' : 'paused',
        ]);

        OrganizationAuditLog::create([
            'organization_id' => $flag->organization_id,
            'user_id' => $user->id,
            'event_category' => 'devops',
            'action' => 'feature_flag_toggled',
            'resource_type' => 'FeatureFlag',
            'resource_id' => (string) $flag->id,
            'status' => 'success',
            'changes' => [
                'key' => $flag->key,
                'is_enabled' => $enabled,
            ],
        ]);

        return $flag;
    }

    /**
     * Update canary rollout percentage.
     */
    public function updateRolloutPercentage(FeatureFlag $flag, int $percentage, User $user): FeatureFlag
    {
        $flag->update([
            'rollout_percentage' => max(0, min(100, $percentage)),
            'is_enabled' => $percentage > 0,
            'status' => 'active',
        ]);

        OrganizationAuditLog::create([
            'organization_id' => $flag->organization_id,
            'user_id' => $user->id,
            'event_category' => 'devops',
            'action' => 'feature_flag_rollout_updated',
            'resource_type' => 'FeatureFlag',
            'resource_id' => (string) $flag->id,
            'status' => 'success',
            'changes' => [
                'key' => $flag->key,
                'rollout_percentage' => $percentage,
            ],
        ]);

        return $flag;
    }

    /**
     * Trigger emergency kill switch.
     */
    public function triggerKillSwitch(FeatureFlag $flag, User $user): FeatureFlag
    {
        $flag->update([
            'is_enabled' => false,
            'rollout_percentage' => 0,
            'status' => 'killed',
        ]);

        OrganizationAuditLog::create([
            'organization_id' => $flag->organization_id,
            'user_id' => $user->id,
            'event_category' => 'devops',
            'action' => 'feature_flag_killed_emergency',
            'resource_type' => 'FeatureFlag',
            'resource_id' => (string) $flag->id,
            'status' => 'success',
            'changes' => [
                'key' => $flag->key,
                'action' => 'emergency_kill_switch_activated',
            ],
        ]);

        return $flag;
    }

    /**
     * Delete a feature flag.
     */
    public function deleteFlag(FeatureFlag $flag): bool
    {
        return (bool) $flag->delete();
    }

    /**
     * Seed baseline feature flags for demo.
     */
    public function seedDefaultFeatureFlags(Organization $organization, ?Project $project = null): void
    {
        $author = User::whereIn('id', $organization->memberships()->pluck('user_id'))->first();
        $projectId = $project?->id;

        // Flag 1: Canary Percentage Rollout
        FeatureFlag::create([
            'organization_id' => $organization->id,
            'project_id' => $projectId,
            'created_by' => $author?->id,
            'key' => 'ai_copilot_smart_autocomplete',
            'name' => 'AI Copilot Inline Task Suggestion Engine',
            'description' => 'Model inferensi lokal v2 untuk memberikan saran task completion secara realtime saat mengetik deskripsi.',
            'strategy' => 'percentage_rollout',
            'is_enabled' => true,
            'rollout_percentage' => 25,
            'target_rules' => ['@pandu.com', 'role:admin'],
            'evaluations_count' => 18450,
            'error_rate_pct' => 0.04,
            'status' => 'active',
        ]);

        // Flag 2: User Targeting
        FeatureFlag::create([
            'organization_id' => $organization->id,
            'project_id' => $projectId,
            'created_by' => $author?->id,
            'key' => 'realtime_collaborative_whiteboard_v2',
            'name' => 'WebRTC Ultra-Low Latency Canvas Engine',
            'description' => 'Mesin kanvas rendering WebGL baru dengan sinkronisasi CRDT terdistribusi.',
            'strategy' => 'user_targeting',
            'is_enabled' => true,
            'rollout_percentage' => 10,
            'target_rules' => ['internal_testers', 'beta_vip_users'],
            'evaluations_count' => 9200,
            'error_rate_pct' => 0.12,
            'status' => 'active',
        ]);

        // Flag 3: Boolean Toggle
        FeatureFlag::create([
            'organization_id' => $organization->id,
            'project_id' => $projectId,
            'created_by' => $author?->id,
            'key' => 'enterprise_multi_factor_passkeys',
            'name' => 'FIDO2 Hardware Passkeys Authentication',
            'description' => 'Aktivasi integrasi WebAuthn security key untuk login dan sudo mode action.',
            'strategy' => 'boolean',
            'is_enabled' => true,
            'rollout_percentage' => 100,
            'target_rules' => [],
            'evaluations_count' => 14200,
            'error_rate_pct' => 0.00,
            'status' => 'active',
        ]);

        // Flag 4: Kill Switch Demo
        FeatureFlag::create([
            'organization_id' => $organization->id,
            'project_id' => $projectId,
            'created_by' => $author?->id,
            'key' => 'legacy_payment_gateway_webhook_v1',
            'name' => 'Legacy Invoicing Webhook Ingestion Hook',
            'description' => 'Emergency kill switch untuk menghentikan pemrosesan invoice model v1 jika terjadi load spike.',
            'strategy' => 'kill_switch',
            'is_enabled' => false,
            'rollout_percentage' => 0,
            'target_rules' => [],
            'evaluations_count' => 450,
            'error_rate_pct' => 3.45,
            'status' => 'killed',
        ]);
    }
}
