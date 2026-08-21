<?php

namespace App\Services\Agile;

use App\Models\KaizenInitiative;
use App\Models\Organization;
use App\Models\OrganizationAuditLog;
use App\Models\Project;
use App\Models\Sprint;
use App\Models\User;

class KaizenImprovementService
{
    /**
     * Get complete Kaizen continuous improvement dashboard, pillar metrics, and action board.
     *
     * @return array<string, mixed>
     */
    public function getKaizenDashboard(Organization $organization, ?string $projectId = null): array
    {
        $hasInitiatives = KaizenInitiative::where('organization_id', $organization->id)->exists();
        if (! $hasInitiatives) {
            $defaultProject = Project::where('organization_id', $organization->id)->first();
            if ($defaultProject) {
                $this->seedDefaultKaizenData($organization, $defaultProject);
            }
        }

        $query = KaizenInitiative::where('organization_id', $organization->id)
            ->when($projectId, fn ($q) => $q->where('project_id', $projectId))
            ->with(['project:id,name,key', 'owner:id,name,email', 'sourceSprint:id,name', 'targetSprint:id,name'])
            ->orderByDesc('created_at');

        $initiatives = $query->get()->map(fn (KaizenInitiative $k) => [
            'id' => $k->id,
            'project_id' => $k->project_id,
            'project_name' => $k->project?->name ?? 'Default Project',
            'project_key' => $k->project?->key ?? 'PRJ',
            'pillar' => $k->pillar,
            'title' => $k->title,
            'problem_statement' => $k->problem_statement,
            'action_plan' => $k->action_plan,
            'expected_impact' => $k->expected_impact,
            'measured_outcome' => $k->measured_outcome,
            'status' => $k->status,
            'impact_score' => $k->impact_score,
            'due_date_formatted' => $k->due_date?->translatedFormat('d M Y'),
            'verified_at_formatted' => $k->verified_at?->translatedFormat('d M Y H:i'),
            'owner' => $k->owner ? [
                'id' => $k->owner->id,
                'name' => $k->owner->name,
                'email' => $k->owner->email,
            ] : null,
            'source_sprint_name' => $k->sourceSprint?->name,
            'target_sprint_name' => $k->targetSprint?->name,
            'created_at_formatted' => $k->created_at?->translatedFormat('d M Y'),
        ]);

        $totalCount = $initiatives->count();
        $verifiedCount = $initiatives->where('status', 'verified_effective')->count();
        $implementedCount = $initiatives->whereIn('status', ['implemented', 'verified_effective'])->count();
        $rate = $totalCount > 0 ? round(($implementedCount / $totalCount) * 100, 1) : 85.0;
        $avgImpact = $verifiedCount > 0 ? round($initiatives->where('status', 'verified_effective')->avg('impact_score')) : 88;

        $metrics = [
            'total_initiatives' => $totalCount,
            'implementation_rate_pct' => $rate,
            'verified_effective_count' => $verifiedCount,
            'avg_impact_score' => $avgImpact,
        ];

        // Pillar distribution
        $pillars = [
            'engineering_quality' => 'Engineering Quality & Reliability',
            'process_agility' => 'Process Agility & Delivery Velocity',
            'team_collaboration' => 'Team Collaboration & Async Work',
            'developer_experience' => 'Developer Experience & Tooling',
        ];

        $pillarStats = [];
        foreach ($pillars as $key => $label) {
            $matching = $initiatives->where('pillar', $key);
            $pTotal = $matching->count();
            $pDone = $matching->whereIn('status', ['implemented', 'verified_effective'])->count();
            $pillarStats[] = [
                'key' => $key,
                'label' => $label,
                'total' => $pTotal,
                'completed' => $pDone,
                'rate' => $pTotal > 0 ? round(($pDone / $pTotal) * 100, 1) : 100.0,
            ];
        }

        $projects = Project::where('organization_id', $organization->id)
            ->select(['id', 'name', 'key'])
            ->orderBy('name')
            ->get();

        $sprints = Sprint::whereHas('project', fn ($q) => $q->where('organization_id', $organization->id))
            ->select(['id', 'name', 'project_id', 'status'])
            ->orderByDesc('created_at')
            ->get();

        $members = User::whereIn('id', $organization->memberships()->pluck('user_id'))
            ->select(['id', 'name', 'email'])
            ->orderBy('name')
            ->get();

        return [
            'metrics' => $metrics,
            'pillar_stats' => $pillarStats,
            'initiatives' => $initiatives->values()->all(),
            'projects' => $projects,
            'sprints' => $sprints,
            'members' => $members,
            'selected_project_id' => $projectId,
        ];
    }

    /**
     * Create a new Kaizen initiative.
     *
     * @param  array<string, mixed>  $data
     */
    public function createInitiative(Organization $organization, Project $project, array $data, User $user): KaizenInitiative
    {
        $initiative = KaizenInitiative::create([
            'organization_id' => $organization->id,
            'project_id' => $project->id,
            'retrospective_item_id' => $data['retrospective_item_id'] ?? null,
            'source_sprint_id' => $data['source_sprint_id'] ?? null,
            'target_sprint_id' => $data['target_sprint_id'] ?? null,
            'owner_id' => $data['owner_id'] ?? $user->id,
            'pillar' => $data['pillar'] ?? 'engineering_quality',
            'title' => $data['title'],
            'problem_statement' => $data['problem_statement'],
            'action_plan' => $data['action_plan'],
            'expected_impact' => $data['expected_impact'] ?? null,
            'status' => $data['status'] ?? 'in_progress',
            'due_date' => $data['due_date'] ?? null,
        ]);

        OrganizationAuditLog::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'event_category' => 'agile',
            'action' => 'kaizen_initiative_created',
            'resource_type' => 'KaizenInitiative',
            'resource_id' => (string) $initiative->id,
            'status' => 'success',
            'changes' => [
                'title' => $initiative->title,
                'pillar' => $initiative->pillar,
            ],
        ]);

        return $initiative;
    }

    /**
     * Update an existing Kaizen initiative.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateInitiative(KaizenInitiative $initiative, array $data, User $user): KaizenInitiative
    {
        $initiative->update([
            'owner_id' => array_key_exists('owner_id', $data) ? ($data['owner_id'] === 'none' ? null : $data['owner_id']) : $initiative->owner_id,
            'pillar' => $data['pillar'] ?? $initiative->pillar,
            'title' => $data['title'] ?? $initiative->title,
            'problem_statement' => $data['problem_statement'] ?? $initiative->problem_statement,
            'action_plan' => $data['action_plan'] ?? $initiative->action_plan,
            'expected_impact' => $data['expected_impact'] ?? $initiative->expected_impact,
            'measured_outcome' => $data['measured_outcome'] ?? $initiative->measured_outcome,
            'status' => $data['status'] ?? $initiative->status,
            'impact_score' => $data['impact_score'] ?? $initiative->impact_score,
            'due_date' => $data['due_date'] ?? $initiative->due_date,
            'target_sprint_id' => array_key_exists('target_sprint_id', $data) ? ($data['target_sprint_id'] === 'none' ? null : $data['target_sprint_id']) : $initiative->target_sprint_id,
        ]);

        return $initiative;
    }

    /**
     * Verify Kaizen impact and effectiveness score.
     */
    public function verifyImpact(KaizenInitiative $initiative, User $user, int $impactScore, string $measuredOutcome): KaizenInitiative
    {
        $initiative->update([
            'status' => 'verified_effective',
            'impact_score' => $impactScore,
            'measured_outcome' => $measuredOutcome,
            'verified_at' => now(),
        ]);

        OrganizationAuditLog::create([
            'organization_id' => $initiative->organization_id,
            'user_id' => $user->id,
            'event_category' => 'agile',
            'action' => 'kaizen_impact_verified',
            'resource_type' => 'KaizenInitiative',
            'resource_id' => (string) $initiative->id,
            'status' => 'success',
            'changes' => [
                'impact_score' => $impactScore,
                'measured_outcome' => $measuredOutcome,
            ],
        ]);

        return $initiative;
    }

    /**
     * Delete an initiative.
     */
    public function deleteInitiative(KaizenInitiative $initiative): bool
    {
        return (bool) $initiative->delete();
    }

    /**
     * Seed baseline Kaizen initiatives for demo.
     */
    public function seedDefaultKaizenData(Organization $organization, Project $project): void
    {
        $owner = User::whereIn('id', $organization->memberships()->pluck('user_id'))->first();

        KaizenInitiative::create([
            'organization_id' => $organization->id,
            'project_id' => $project->id,
            'owner_id' => $owner?->id,
            'pillar' => 'engineering_quality',
            'title' => 'Otomasi Mocking Test Suite & Fixture Isolation',
            'problem_statement' => 'Eksekusi feature test berjalan lambat (>45 detik) karena interaksi database I/O berulang.',
            'action_plan' => 'Implementasi transactional in-memory fixtures dan parallel runner pada Pest testing pipeline.',
            'expected_impact' => 'Waktu eksekusi CI test berkurang 60% dan tidak ada flaky tests.',
            'measured_outcome' => 'Waktu pipeline CI turun dari 52 detik menjadi 14 detik. Test suite 100% stabil.',
            'status' => 'verified_effective',
            'impact_score' => 95,
            'due_date' => now()->subDays(3)->toDateString(),
            'verified_at' => now()->subDays(2),
        ]);

        KaizenInitiative::create([
            'organization_id' => $organization->id,
            'project_id' => $project->id,
            'owner_id' => $owner?->id,
            'pillar' => 'process_agility',
            'title' => 'Standarisasi Story Point Estimation & Definition of Ready (DoR)',
            'problem_statement' => 'Banyak task masuk ke sprint tanpa kriteria akseptasi yang jelas sehingga terjadi rollover.',
            'action_plan' => 'Terapkan checklist DoR wajib dan Planning Poker async sebelum sprint planning.',
            'expected_impact' => 'Tingkat penyelesaian sprint (Sprint Commitment Completion) meningkat di atas 90%.',
            'measured_outcome' => null,
            'status' => 'in_progress',
            'impact_score' => 0,
            'due_date' => now()->addDays(5)->toDateString(),
        ]);

        KaizenInitiative::create([
            'organization_id' => $organization->id,
            'project_id' => $project->id,
            'owner_id' => $owner?->id,
            'pillar' => 'team_collaboration',
            'title' => 'Async Daily Standup Format dengan Blocker Radar Alert',
            'problem_statement' => 'Daily standup meeting sering memakan waktu >30 menit dan mengganggu jam fokus pagi.',
            'action_plan' => 'Gunakan modul check-in harian Pandu dan batasi meeting verbal hanya untuk task terblokir.',
            'expected_impact' => 'Menghemat 2.5 jam fokus developer per minggu.',
            'measured_outcome' => 'Standup selesai dalam 8 menit. Fokus coding developer meningkat signifikan.',
            'status' => 'verified_effective',
            'impact_score' => 90,
            'due_date' => now()->subDays(8)->toDateString(),
            'verified_at' => now()->subDays(7),
        ]);
    }
}
