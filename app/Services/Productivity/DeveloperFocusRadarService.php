<?php

namespace App\Services\Productivity;

use App\Models\DeveloperFocusSnapshot;
use App\Models\FocusTimeRecommendation;
use App\Models\Organization;
use App\Models\OrganizationAuditLog;
use App\Models\User;
use Illuminate\Support\Carbon;

class DeveloperFocusRadarService
{
    /**
     * Get complete developer cognitive focus analytics, burnout radar, and focus time recommendations.
     *
     * @return array<string, mixed>
     */
    public function getFocusDashboard(Organization $organization, ?int $userId = null): array
    {
        $hasSnapshots = DeveloperFocusSnapshot::where('organization_id', $organization->id)->exists();
        if (! $hasSnapshots) {
            $this->seedDefaultFocusTelemetry($organization);
        }

        $query = DeveloperFocusSnapshot::where('organization_id', $organization->id)
            ->when($userId, fn ($q) => $q->where('user_id', $userId));

        $snapshots = $query->get();

        $avgDeepWorkMins = $snapshots->count() > 0 ? (int) $snapshots->avg('deep_work_minutes') : 275;
        $avgContextSwitches = $snapshots->count() > 0 ? round($snapshots->avg('context_switches_count'), 1) : 11.2;
        $avgMeetingMins = $snapshots->count() > 0 ? (int) $snapshots->avg('meeting_minutes') : 110;
        $avgBurnout = $snapshots->count() > 0 ? (int) $snapshots->avg('burnout_risk_score') : 24;

        $totalWorkMins = max(1, $avgDeepWorkMins + $avgMeetingMins);
        $meetingRatio = round(($avgMeetingMins / $totalWorkMins) * 100, 1);

        $metrics = [
            'avg_deep_work_hours' => round($avgDeepWorkMins / 60, 1),
            'avg_context_switches' => $avgContextSwitches,
            'team_burnout_risk_score' => $avgBurnout,
            'meeting_fragmentation_ratio' => $meetingRatio,
            'active_focus_blocks_count' => 14,
        ];

        // 14-day Daily Trend
        $dailyTrend = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $daySnapshots = DeveloperFocusSnapshot::where('organization_id', $organization->id)
                ->when($userId, fn ($q) => $q->where('user_id', $userId))
                ->where('snapshot_date', $date)
                ->get();

            $deepHours = $daySnapshots->count() > 0
                ? round($daySnapshots->avg('deep_work_minutes') / 60, 1)
                : round((240 + ($i % 4) * 30) / 60, 1);

            $meetingHours = $daySnapshots->count() > 0
                ? round($daySnapshots->avg('meeting_minutes') / 60, 1)
                : round((90 + (($i * 2) % 3) * 30) / 60, 1);

            $switches = $daySnapshots->count() > 0
                ? (int) $daySnapshots->avg('context_switches_count')
                : (9 + ($i % 5));

            $dailyTrend[] = [
                'date' => Carbon::parse($date)->translatedFormat('d M'),
                'deep_work_hours' => $deepHours,
                'meeting_hours' => $meetingHours,
                'context_switches' => $switches,
            ];
        }

        // Developer Health Radar List
        $memberIds = $organization->memberships()->pluck('user_id');
        $membersList = User::whereIn('id', $memberIds)->get();

        $developerRadar = $membersList->map(function (User $u) use ($organization) {
            $userSnaps = DeveloperFocusSnapshot::where('organization_id', $organization->id)
                ->where('user_id', $u->id)
                ->orderByDesc('snapshot_date')
                ->take(7)
                ->get();

            $deepAvg = $userSnaps->count() > 0 ? round($userSnaps->avg('deep_work_minutes') / 60, 1) : 4.5;
            $switchesAvg = $userSnaps->count() > 0 ? (int) $userSnaps->avg('context_switches_count') : 10;
            $wipTasks = $userSnaps->first()?->active_tasks_count ?? 3;
            $burnoutScore = $userSnaps->first()?->burnout_risk_score ?? 22;
            $burnoutLevel = $userSnaps->first()?->burnout_risk_level ?? 'low';

            return [
                'user_id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'deep_work_hours' => $deepAvg,
                'context_switches' => $switchesAvg,
                'active_wip_tasks' => $wipTasks,
                'burnout_risk_score' => $burnoutScore,
                'burnout_risk_level' => $burnoutLevel,
            ];
        });

        // Focus Time Recommendations
        $recommendations = FocusTimeRecommendation::where('organization_id', $organization->id)
            ->with('user:id,name')
            ->orderByRaw("CASE status WHEN 'active' THEN 1 WHEN 'acknowledged' THEN 2 ELSE 3 END")
            ->get()
            ->map(fn (FocusTimeRecommendation $r) => [
                'id' => $r->id,
                'type' => $r->type,
                'title' => $r->title,
                'description' => $r->description,
                'suggested_schedule' => $r->suggested_schedule,
                'status' => $r->status,
                'user_name' => $r->user?->name,
                'created_at_formatted' => $r->created_at?->translatedFormat('d M Y'),
            ]);

        $members = $membersList->map(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
        ]);

        return [
            'metrics' => $metrics,
            'dailyTrend' => $dailyTrend,
            'developerRadar' => $developerRadar->values()->all(),
            'recommendations' => $recommendations->values()->all(),
            'members' => $members->values()->all(),
            'selectedUserId' => $userId,
        ];
    }

    /**
     * Apply a focus time optimization recommendation.
     */
    public function applyRecommendation(FocusTimeRecommendation $rec, User $user): FocusTimeRecommendation
    {
        $rec->update([
            'status' => 'applied',
        ]);

        OrganizationAuditLog::create([
            'organization_id' => $rec->organization_id,
            'user_id' => $user->id,
            'event_category' => 'productivity',
            'action' => 'focus_recommendation_applied',
            'resource_type' => 'FocusTimeRecommendation',
            'resource_id' => (string) $rec->id,
            'status' => 'success',
            'changes' => [
                'type' => $rec->type,
                'title' => $rec->title,
            ],
        ]);

        return $rec;
    }

    /**
     * Acknowledge a focus time recommendation.
     */
    public function acknowledgeRecommendation(FocusTimeRecommendation $rec, User $user): FocusTimeRecommendation
    {
        $rec->update([
            'status' => 'acknowledged',
        ]);

        return $rec;
    }

    /**
     * Seed baseline telemetry data and focus recommendations for demo.
     */
    public function seedDefaultFocusTelemetry(Organization $organization): void
    {
        $members = User::whereIn('id', $organization->memberships()->pluck('user_id'))->get();
        if ($members->isEmpty()) {
            return;
        }

        $today = now();

        foreach ($members as $index => $dev) {
            // Seed 14 days of snapshots
            for ($i = 13; $i >= 0; $i--) {
                $date = $today->copy()->subDays($i)->toDateString();
                $isBurnoutCandidate = ($index === 1 && $i < 3);

                $deepMins = $isBurnoutCandidate ? rand(90, 150) : rand(240, 360);
                $meetMins = $isBurnoutCandidate ? rand(180, 260) : rand(60, 120);
                $switches = $isBurnoutCandidate ? rand(18, 28) : rand(6, 14);
                $wip = $isBurnoutCandidate ? rand(5, 7) : rand(2, 4);
                $burnoutScore = $isBurnoutCandidate ? rand(75, 88) : rand(15, 32);
                $burnoutLevel = $isBurnoutCandidate ? 'high' : ($burnoutScore > 50 ? 'moderate' : 'low');

                DeveloperFocusSnapshot::create([
                    'organization_id' => $organization->id,
                    'user_id' => $dev->id,
                    'snapshot_date' => $date,
                    'deep_work_minutes' => $deepMins,
                    'meeting_minutes' => $meetMins,
                    'context_switches_count' => $switches,
                    'active_tasks_count' => $wip,
                    'pr_reviews_count' => rand(1, 4),
                    'burnout_risk_score' => $burnoutScore,
                    'burnout_risk_level' => $burnoutLevel,
                    'focus_efficiency_pct' => round(($deepMins / max(1, $deepMins + $meetMins)) * 100, 1),
                ]);
            }
        }

        // Seed Focus Recommendations
        FocusTimeRecommendation::create([
            'organization_id' => $organization->id,
            'type' => 'no_meeting_block',
            'title' => 'Terapkan No-Meeting Focus Block (Selasa & Kamis Pagi)',
            'description' => '68% developer mengalami fragmentasi waktu terparah di hari Selasa dan Kamis pagi akibat 3 meeting pendek terpisah.',
            'suggested_schedule' => 'Selasa & Kamis, 09:00 - 12:00 WIB',
            'status' => 'active',
        ]);

        FocusTimeRecommendation::create([
            'organization_id' => $organization->id,
            'type' => 'wip_limit_alert',
            'title' => 'Terapkan Batasan WIP Maksimal 3 Task per Developer',
            'description' => 'Frekuensi context switching meningkat 2.4x saat developer menangani lebih dari 3 task "In Progress" secara bersamaan.',
            'suggested_schedule' => 'Sprint Workflow WIP Limit: 3',
            'status' => 'active',
        ]);

        FocusTimeRecommendation::create([
            'organization_id' => $organization->id,
            'type' => 'batch_pr_review',
            'title' => 'Jadwalkan Jendela Batch Review PR (16:00 - 17:00)',
            'description' => 'Mengonsolidasikan review pull request di akhir hari dapat menyelamatkan hingga 90 menit deep work di jam produktif pagi.',
            'suggested_schedule' => 'Setiap Hari Kerja, 16:00 - 17:00 WIB',
            'status' => 'active',
        ]);
    }
}
