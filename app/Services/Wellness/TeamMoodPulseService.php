<?php

namespace App\Services\Wellness;

use App\Models\Organization;
use App\Models\TeamMoodPulse;
use App\Models\User;
use App\Models\WellnessInitiative;

class TeamMoodPulseService
{
    /**
     * Get tag catalog definitions.
     *
     * @return array<string, array<string, mixed>>
     */
    public function getTagCatalog(): array
    {
        return [
            'positives' => [
                ['key' => 'clear_goals', 'label' => 'Tujuan & Prioritas Jelas', 'icon' => 'Target'],
                ['key' => 'supportive_team', 'label' => 'Dukungan Rekan Tim Hebat', 'icon' => 'Users'],
                ['key' => 'proud_achievement', 'label' => 'Capaian Membanggakan', 'icon' => 'Trophy'],
                ['key' => 'smooth_collaboration', 'label' => 'Kolaborasi Lancar', 'icon' => 'Sparkles'],
                ['key' => 'learning_growth', 'label' => 'Belajar Hal Baru', 'icon' => 'BookOpen'],
            ],
            'frictions' => [
                ['key' => 'meeting_fatigue', 'label' => 'Kelelahan Jadwal Rapat', 'icon' => 'Clock'],
                ['key' => 'unclear_reqs', 'label' => 'Kebutuhan Tugas Belum Jelas', 'icon' => 'HelpCircle'],
                ['key' => 'technical_debt', 'label' => 'Beban Masalah Teknis/Bug', 'icon' => 'Bug'],
                ['key' => 'tight_deadline', 'label' => 'Tenggat Waktu Sangat Ketat', 'icon' => 'AlertTriangle'],
                ['key' => 'context_switching', 'label' => 'Terlalu Sering Ganti Konteks', 'icon' => 'Shuffle'],
            ],
        ];
    }

    /**
     * Get aggregate pulse dashboard data for an organization.
     *
     * @return array<string, mixed>
     */
    public function getDashboard(Organization $organization, User $currentUser, string $range = '14d'): array
    {
        $days = match ($range) {
            '7d' => 7,
            '30d' => 30,
            default => 14,
        };

        $startDate = now()->subDays($days - 1)->startOfDay();
        $todayDateStr = now()->toDateString();

        // 1. Current user today check-in
        $myTodayPulse = TeamMoodPulse::where('organization_id', $organization->id)
            ->where('user_id', $currentUser->id)
            ->whereDate('pulse_date', $todayDateStr)
            ->first();

        // 2. Active members count
        $totalMembers = $organization->users()->count();

        // 3. Today's organization stats
        $todayPulses = TeamMoodPulse::where('organization_id', $organization->id)
            ->whereDate('pulse_date', $todayDateStr)
            ->get();

        $todayCount = $todayPulses->count();
        $participationRate = $totalMembers > 0
            ? round(($todayCount / $totalMembers) * 100, 1)
            : 0.0;

        $todayAvgMood = $todayCount > 0
            ? round($todayPulses->avg('mood_score'), 2)
            : 0.0;

        // 4. Historical window pulses
        $pulses = TeamMoodPulse::where('organization_id', $organization->id)
            ->where('pulse_date', '>=', $startDate->toDateString())
            ->with('user')
            ->orderByDesc('pulse_date')
            ->get();

        $totalSubmissions = $pulses->count();
        $avgMood = $totalSubmissions > 0 ? round($pulses->avg('mood_score'), 2) : 0.0;
        $avgEnergy = $totalSubmissions > 0 ? round($pulses->avg('energy_level'), 2) : 0.0;

        // 5. Burnout Risk Index (Mood <= 2 OR workload = 'overwhelmed')
        $burnoutCount = $pulses->filter(fn ($p) => $p->mood_score <= 2 || $p->workload_feeling === 'overwhelmed')->count();
        $burnoutRiskRate = $totalSubmissions > 0
            ? round(($burnoutCount / $totalSubmissions) * 100, 1)
            : 0.0;

        // 6. Mood distribution
        $moodDistribution = [
            1 => $pulses->where('mood_score', 1)->count(),
            2 => $pulses->where('mood_score', 2)->count(),
            3 => $pulses->where('mood_score', 3)->count(),
            4 => $pulses->where('mood_score', 4)->count(),
            5 => $pulses->where('mood_score', 5)->count(),
        ];

        // 7. Workload feeling distribution
        $workloadDistribution = [
            'underworked' => $pulses->where('workload_feeling', 'underworked')->count(),
            'manageable' => $pulses->where('workload_feeling', 'manageable')->count(),
            'heavy' => $pulses->where('workload_feeling', 'heavy')->count(),
            'overwhelmed' => $pulses->where('workload_feeling', 'overwhelmed')->count(),
        ];

        // 8. Tag Cloud Analytics
        $tagFrequency = [];
        foreach ($pulses as $p) {
            if (is_array($p->tags)) {
                foreach ($p->tags as $t) {
                    $tagFrequency[$t] = ($tagFrequency[$t] ?? 0) + 1;
                }
            }
        }
        arsort($tagFrequency);

        // 9. Daily Trend Timeline
        $dailyTrends = [];
        $cursor = $startDate->copy();
        while ($cursor->lte(now())) {
            $dStr = $cursor->toDateString();
            $dPulses = $pulses->filter(fn ($p) => $p->pulse_date?->toDateString() === $dStr);
            $dCount = $dPulses->count();
            $dAvg = $dCount > 0 ? round($dPulses->avg('mood_score'), 2) : null;
            $dAvgEnergy = $dCount > 0 ? round($dPulses->avg('energy_level'), 2) : null;

            $dailyTrends[] = [
                'date' => $dStr,
                'label' => $cursor->format('d M'),
                'avg_mood' => $dAvg,
                'avg_energy' => $dAvgEnergy,
                'checkin_count' => $dCount,
            ];
            $cursor = $cursor->addDay();
        }

        // 10. Recent Feed of Reflections
        $recentFeed = $pulses->filter(fn ($p) => ! empty($p->notes) || ! empty($p->tags))
            ->take(20)
            ->map(function ($p) {
                return [
                    'id' => $p->id,
                    'mood_score' => $p->mood_score,
                    'energy_level' => $p->energy_level,
                    'workload_feeling' => $p->workload_feeling,
                    'tags' => $p->tags ?? [],
                    'notes' => $p->notes,
                    'is_anonymous' => (bool) $p->is_anonymous,
                    'author' => $p->is_anonymous ? [
                        'name' => 'Anggota Tim (Anonim)',
                        'avatar' => null,
                    ] : [
                        'name' => $p->user?->name ?? 'Anggota Tim',
                        'avatar' => $p->user?->avatar,
                    ],
                    'pulse_date' => $p->pulse_date->toDateString(),
                    'created_at' => $p->created_at->toIso8601String(),
                ];
            })->values()->all();

        // 11. Wellness Initiatives
        $initiatives = WellnessInitiative::where('organization_id', $organization->id)
            ->with('creator')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($i) => [
                'id' => $i->id,
                'title' => $i->title,
                'category' => $i->category,
                'status' => $i->status,
                'impact_summary' => $i->impact_summary,
                'target_date' => $i->target_date ? $i->target_date->toDateString() : null,
                'creator' => [
                    'id' => $i->creator?->id,
                    'name' => $i->creator?->name,
                    'avatar' => $i->creator?->avatar,
                ],
                'created_at' => $i->created_at->toIso8601String(),
            ]);

        return [
            'range' => $range,
            'my_today_pulse' => $myTodayPulse ? [
                'id' => $myTodayPulse->id,
                'mood_score' => $myTodayPulse->mood_score,
                'energy_level' => $myTodayPulse->energy_level,
                'workload_feeling' => $myTodayPulse->workload_feeling,
                'tags' => $myTodayPulse->tags ?? [],
                'notes' => $myTodayPulse->notes,
                'is_anonymous' => (bool) $myTodayPulse->is_anonymous,
            ] : null,
            'metrics' => [
                'today_avg_mood' => $todayAvgMood,
                'today_checkins' => $todayCount,
                'total_members' => $totalMembers,
                'participation_rate' => $participationRate,
                'period_avg_mood' => $avgMood,
                'period_avg_energy' => $avgEnergy,
                'burnout_risk_rate' => $burnoutRiskRate,
                'total_submissions' => $totalSubmissions,
            ],
            'distributions' => [
                'mood' => $moodDistribution,
                'workload' => $workloadDistribution,
            ],
            'tag_frequency' => $tagFrequency,
            'tag_catalog' => $this->getTagCatalog(),
            'daily_trends' => $dailyTrends,
            'recent_feed' => $recentFeed,
            'initiatives' => $initiatives,
        ];
    }

    /**
     * Submit or update daily pulse check-in.
     *
     * @param  array<string, mixed>  $data
     */
    public function submitDailyPulse(Organization $organization, User $user, array $data): TeamMoodPulse
    {
        $todayStr = now()->toDateString();

        $pulse = TeamMoodPulse::where('organization_id', $organization->id)
            ->where('user_id', $user->id)
            ->whereDate('pulse_date', $todayStr)
            ->first();

        if ($pulse) {
            $pulse->update([
                'mood_score' => (int) $data['mood_score'],
                'energy_level' => (int) ($data['energy_level'] ?? 3),
                'workload_feeling' => $data['workload_feeling'] ?? 'manageable',
                'tags' => $data['tags'] ?? [],
                'notes' => $data['notes'] ?? null,
                'is_anonymous' => (bool) ($data['is_anonymous'] ?? false),
            ]);

            return $pulse->fresh();
        }

        return TeamMoodPulse::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'pulse_date' => $todayStr,
            'mood_score' => (int) $data['mood_score'],
            'energy_level' => (int) ($data['energy_level'] ?? 3),
            'workload_feeling' => $data['workload_feeling'] ?? 'manageable',
            'tags' => $data['tags'] ?? [],
            'notes' => $data['notes'] ?? null,
            'is_anonymous' => (bool) ($data['is_anonymous'] ?? false),
        ]);
    }

    /**
     * Create wellness initiative.
     *
     * @param  array<string, mixed>  $data
     */
    public function createInitiative(Organization $organization, User $creator, array $data): WellnessInitiative
    {
        return WellnessInitiative::create([
            'organization_id' => $organization->id,
            'created_by' => $creator->id,
            'title' => $data['title'],
            'category' => $data['category'] ?? 'workload_adjustment',
            'status' => $data['status'] ?? 'active',
            'impact_summary' => $data['impact_summary'] ?? null,
            'target_date' => $data['target_date'] ?? null,
        ]);
    }

    /**
     * Update wellness initiative.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateInitiative(WellnessInitiative $initiative, array $data): WellnessInitiative
    {
        $initiative->update([
            'title' => $data['title'] ?? $initiative->title,
            'category' => $data['category'] ?? $initiative->category,
            'status' => $data['status'] ?? $initiative->status,
            'impact_summary' => array_key_exists('impact_summary', $data) ? $data['impact_summary'] : $initiative->impact_summary,
            'target_date' => array_key_exists('target_date', $data) ? $data['target_date'] : $initiative->target_date,
        ]);

        return $initiative->fresh();
    }

    /**
     * Destroy wellness initiative.
     */
    public function destroyInitiative(WellnessInitiative $initiative): bool
    {
        return (bool) $initiative->delete();
    }
}
