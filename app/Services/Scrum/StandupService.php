<?php

namespace App\Services\Scrum;

use App\Models\DailyStandup;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Collection;

class StandupService
{
    /**
     * Get the standup submissions for a specific date and organization/project.
     */
    public function getTodayFeed(Organization $organization, ?string $projectId = null, ?string $date = null): Collection
    {
        $targetDate = $date ?: now()->toDateString();

        return DailyStandup::where('organization_id', $organization->id)
            ->where('date', $targetDate)
            ->when($projectId, fn ($q) => $q->where('project_id', $projectId))
            ->with(['user:id,name,email,avatar', 'project:id,name,key'])
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Store or update user's daily standup submission.
     */
    public function submitStandup(User $user, Organization $organization, array $data): DailyStandup
    {
        $targetDate = $data['date'] ?? now()->toDateString();
        $projectId = $data['project_id'] ?? null;

        return DailyStandup::updateOrCreate(
            [
                'organization_id' => $organization->id,
                'user_id' => $user->id,
                'date' => $targetDate,
                'project_id' => $projectId,
            ],
            [
                'yesterday_work' => $data['yesterday_work'],
                'today_work' => $data['today_work'],
                'blockers' => $data['blockers'] ?? null,
                'mood' => $data['mood'] ?? 'good',
            ]
        );
    }

    /**
     * Generate an AI synthesis briefing across all submitted standups.
     */
    public function synthesizeAiSummary(Organization $organization, ?string $projectId = null, ?string $date = null): array
    {
        $feed = $this->getTodayFeed($organization, $projectId, $date);

        if ($feed->isEmpty()) {
            return [
                'summary' => 'Belum ada anggota tim yang mengirimkan check-in standup untuk tanggal ini.',
                'blockers_count' => 0,
                'blockers_list' => [],
                'velocity_health' => 'neutral',
            ];
        }

        $totalMembers = $feed->count();
        $blockersList = $feed->filter(fn ($s) => ! empty($s->blockers))->map(fn ($s) => [
            'user' => $s->user->name,
            'blocker' => $s->blockers,
        ])->values()->all();

        $blockersCount = count($blockersList);
        $health = $blockersCount === 0 ? 'optimal' : ($blockersCount <= 2 ? 'moderate' : 'critical');

        $summary = "Ringkasan Standup Harian: Total {$totalMembers} anggota tim telah check-in. ";
        if ($blockersCount === 0) {
            $summary .= 'Seluruh anggota tim melaporkan kemajuan lancar tanpa kendala kritis yang menghambat rilis sprint.';
        } else {
            $summary .= "Terdapat {$blockersCount} potensi kendala terdeteksi yang memerlukan koordinasi tindak lanjut dengan lead tim.";
        }

        return [
            'summary' => $summary,
            'blockers_count' => $blockersCount,
            'blockers_list' => $blockersList,
            'velocity_health' => $health,
        ];
    }
}
