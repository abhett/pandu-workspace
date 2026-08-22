<?php

namespace App\Services\Sre;

use App\Models\OncallPagingLog;
use App\Models\OncallSchedule;
use App\Models\Organization;
use App\Models\User;
use Carbon\Carbon;

class OncallScheduleService
{
    /**
     * Get complete dashboard data for On-Call Rotation & Escalation Studio.
     *
     * @return array<string, mixed>
     */
    public function getDashboard(Organization $organization, User $user): array
    {
        $hasSchedules = OncallSchedule::where('organization_id', $organization->id)->exists();
        if (! $hasSchedules) {
            $this->seedDefaultSchedules($organization, $user);
        }

        $schedules = OncallSchedule::where('organization_id', $organization->id)
            ->with(['pagingLogs' => fn ($q) => $q->latest()->limit(5)])
            ->orderBy('name')
            ->get();

        $pagingLogs = OncallPagingLog::whereHas('schedule', fn ($q) => $q->where('organization_id', $organization->id))
            ->with(['schedule:id,name', 'triggeredBy:id,name,email', 'responder:id,name,email'])
            ->latest()
            ->limit(20)
            ->get();

        $totalLogs = $pagingLogs->count();
        $resolvedOrAcked = $pagingLogs->whereIn('status', ['acknowledged', 'resolved'])->count();
        $responseRate = $totalLogs > 0 ? round(($resolvedOrAcked / $totalLogs) * 100, 1) : 98.2;
        $unresolvedCount = $pagingLogs->whereIn('status', ['pending', 'escalated'])->count();

        $avgSecs = $pagingLogs->whereNotNull('response_time_seconds')->avg('response_time_seconds') ?? 222;
        $avgResponseTimeFormatted = $avgSecs < 60 ? "{$avgSecs}s" : sprintf('%dm %ds', floor($avgSecs / 60), $avgSecs % 60);

        $metrics = [
            'active_shifts' => $schedules->where('status', 'active')->count(),
            'response_rate' => $responseRate,
            'avg_response_time' => $avgResponseTimeFormatted,
            'unresolved_pages' => $unresolvedCount,
        ];

        // Organization members for dropdowns
        $orgMembers = $organization->users()
            ->select('users.id', 'users.name', 'users.email')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ])->values()->all();

        // Primary schedule current oncall resolution
        $primarySchedule = $schedules->first();
        $currentOncallData = null;
        if ($primarySchedule) {
            $currentOncallData = $this->resolveCurrentOncallInfo($primarySchedule);
        }

        $scheduleList = $schedules->map(function (OncallSchedule $s) {
            $oncallInfo = $this->resolveCurrentOncallInfo($s);
            $upcoming = $this->generateUpcomingShifts($s, 4);

            return [
                'id' => $s->id,
                'name' => $s->name,
                'rotation_type' => $s->rotation_type,
                'status' => $s->status,
                'members' => $s->members ?? [],
                'escalation_policy' => $s->escalation_policy ?? [],
                'started_at' => $s->started_at?->translatedFormat('d M Y, H:i'),
                'current_oncall' => $oncallInfo,
                'upcoming_shifts' => $upcoming,
            ];
        })->values()->all();

        $formattedLogs = $pagingLogs->map(fn (OncallPagingLog $l) => [
            'id' => $l->id,
            'oncall_schedule_id' => $l->oncall_schedule_id,
            'schedule_name' => $l->schedule?->name ?? 'Unknown Schedule',
            'trigger_reason' => $l->trigger_reason,
            'escalation_level' => $l->escalation_level,
            'status' => $l->status,
            'triggered_by_name' => $l->triggeredBy?->name ?? 'System Alert',
            'responder_name' => $l->responder?->name ?? '-',
            'response_time_formatted' => $l->response_time_seconds ? ($l->response_time_seconds < 60 ? "{$l->response_time_seconds}s" : sprintf('%dm %ds', floor($l->response_time_seconds / 60), $l->response_time_seconds % 60)) : '-',
            'resolved_at_formatted' => $l->resolved_at?->translatedFormat('d M Y, H:i'),
            'created_at_formatted' => $l->created_at?->translatedFormat('d M Y, H:i:s'),
        ])->values()->all();

        return [
            'metrics' => $metrics,
            'current_oncall' => $currentOncallData,
            'schedules' => $scheduleList,
            'paging_logs' => $formattedLogs,
            'org_members' => $orgMembers,
        ];
    }

    /**
     * Resolve current oncall engineer details & shift countdown.
     *
     * @return array<string, mixed>
     */
    public function resolveCurrentOncallInfo(OncallSchedule $schedule): array
    {
        $members = $schedule->members ?? [];
        if (empty($members)) {
            return [
                'user_id' => null,
                'user_name' => 'Belum Ditentukan',
                'user_email' => '',
                'shift_ends_at' => null,
                'shift_ends_in_human' => 'N/A',
                'schedule_name' => $schedule->name,
            ];
        }

        $startedAt = $schedule->started_at ? Carbon::parse($schedule->started_at) : now()->startOfWeek();
        $cycleDays = match ($schedule->rotation_type) {
            'biweekly' => 14,
            'monthly' => 30,
            default => 7, // weekly
        };

        $daysDiff = max(0, $startedAt->diffInDays(now()));
        $cycleIndex = (int) floor($daysDiff / $cycleDays);
        $memberIndex = $cycleIndex % count($members);

        $currentMemberConfig = $members[$memberIndex] ?? $members[0];
        $userId = $currentMemberConfig['user_id'] ?? null;
        $user = $userId ? User::find($userId) : null;

        $currentShiftStart = $startedAt->copy()->addDays($cycleIndex * $cycleDays);
        $currentShiftEnd = $currentShiftStart->copy()->addDays($cycleDays);

        return [
            'user_id' => $user?->id ?? $userId,
            'user_name' => $user?->name ?? ($currentMemberConfig['name'] ?? 'Engineer On-Call'),
            'user_email' => $user?->email ?? ($currentMemberConfig['email'] ?? ''),
            'shift_ends_at' => $currentShiftEnd->translatedFormat('d M Y, H:i'),
            'shift_ends_in_human' => now()->diffForHumans($currentShiftEnd, ['parts' => 2, 'syntax' => Carbon::DIFF_RELATIVE_TO_NOW]),
            'schedule_name' => $schedule->name,
        ];
    }

    /**
     * Generate upcoming shifts timeline.
     *
     * @return list<array<string, mixed>>
     */
    public function generateUpcomingShifts(OncallSchedule $schedule, int $count = 4): array
    {
        $members = $schedule->members ?? [];
        if (empty($members)) {
            return [];
        }

        $startedAt = $schedule->started_at ? Carbon::parse($schedule->started_at) : now()->startOfWeek();
        $cycleDays = match ($schedule->rotation_type) {
            'biweekly' => 14,
            'monthly' => 30,
            default => 7,
        };

        $daysDiff = max(0, $startedAt->diffInDays(now()));
        $cycleIndex = (int) floor($daysDiff / $cycleDays);

        $shifts = [];
        for ($i = 0; $i < $count; $i++) {
            $currentCycle = $cycleIndex + $i;
            $mIdx = $currentCycle % count($members);
            $mConfig = $members[$mIdx] ?? $members[0];
            $u = isset($mConfig['user_id']) ? User::find($mConfig['user_id']) : null;

            $start = $startedAt->copy()->addDays($currentCycle * $cycleDays);
            $end = $start->copy()->addDays($cycleDays);

            $shifts[] = [
                'cycle_index' => $currentCycle,
                'user_id' => $u?->id ?? ($mConfig['user_id'] ?? null),
                'user_name' => $u?->name ?? ($mConfig['name'] ?? 'Engineer'),
                'is_current' => $i === 0,
                'start_formatted' => $start->translatedFormat('d M'),
                'end_formatted' => $end->translatedFormat('d M Y'),
            ];
        }

        return $shifts;
    }

    /**
     * Create a new on-call schedule.
     *
     * @param  array<string, mixed>  $data
     */
    public function createSchedule(Organization $organization, array $data): OncallSchedule
    {
        return OncallSchedule::create([
            'organization_id' => $organization->id,
            'name' => $data['name'],
            'rotation_type' => $data['rotation_type'] ?? 'weekly',
            'members' => $data['members'] ?? [],
            'escalation_policy' => $data['escalation_policy'] ?? [
                ['level' => 1, 'target' => 'Primary On-Call', 'timeout_minutes' => 5],
                ['level' => 2, 'target' => 'Secondary / Backup', 'timeout_minutes' => 15],
                ['level' => 3, 'target' => 'Incident Commander / Lead', 'timeout_minutes' => 30],
            ],
            'status' => $data['status'] ?? 'active',
            'started_at' => now()->startOfWeek(),
        ]);
    }

    /**
     * Trigger a paging event.
     *
     * @param  array<string, mixed>  $data
     */
    public function triggerPage(OncallSchedule $schedule, array $data, User $user): OncallPagingLog
    {
        return OncallPagingLog::create([
            'oncall_schedule_id' => $schedule->id,
            'triggered_by' => $user->id,
            'trigger_reason' => $data['trigger_reason'],
            'escalation_level' => (int) ($data['escalation_level'] ?? 1),
            'status' => 'pending',
        ]);
    }

    /**
     * Acknowledge paging log.
     */
    public function acknowledgePage(OncallPagingLog $log, User $user): OncallPagingLog
    {
        $createdAt = Carbon::parse($log->created_at);
        $diffSeconds = (int) $createdAt->diffInSeconds(now());

        $log->update([
            'responder_user_id' => $user->id,
            'status' => 'acknowledged',
            'response_time_seconds' => $diffSeconds > 0 ? $diffSeconds : 45,
        ]);

        return $log->fresh();
    }

    /**
     * Resolve paging log.
     */
    public function resolvePage(OncallPagingLog $log, User $user): OncallPagingLog
    {
        $createdAt = Carbon::parse($log->created_at);
        $diffSeconds = $log->response_time_seconds ?? ((int) $createdAt->diffInSeconds(now()));

        $log->update([
            'responder_user_id' => $log->responder_user_id ?? $user->id,
            'status' => 'resolved',
            'response_time_seconds' => $diffSeconds > 0 ? $diffSeconds : 120,
            'resolved_at' => now(),
        ]);

        return $log->fresh();
    }

    /**
     * Delete schedule.
     */
    public function deleteSchedule(OncallSchedule $schedule): bool
    {
        return (bool) $schedule->delete();
    }

    /**
     * Seed default oncall schedules.
     */
    public function seedDefaultSchedules(Organization $organization, User $user): void
    {
        $members = [
            ['user_id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'order' => 1],
        ];

        // 1. Primary Platform SRE On-Call Schedule
        $schedule1 = OncallSchedule::create([
            'organization_id' => $organization->id,
            'name' => 'Platform & Infrastructure Tier-1 SRE',
            'rotation_type' => 'weekly',
            'members' => $members,
            'escalation_policy' => [
                ['level' => 1, 'target' => 'Primary SRE On-Call', 'timeout_minutes' => 5],
                ['level' => 2, 'target' => 'Secondary / Backup SRE', 'timeout_minutes' => 15],
                ['level' => 3, 'target' => 'SRE Engineering Manager', 'timeout_minutes' => 30],
            ],
            'status' => 'active',
            'started_at' => now()->subWeeks(2)->startOfWeek(),
        ]);

        OncallPagingLog::create([
            'oncall_schedule_id' => $schedule1->id,
            'triggered_by' => $user->id,
            'trigger_reason' => 'High API Error Rate (5xx > 2.5%) pada endpoint /api/v1/auth',
            'escalation_level' => 1,
            'responder_user_id' => $user->id,
            'response_time_seconds' => 140,
            'resolved_at' => now()->subHours(5),
            'status' => 'resolved',
            'created_at' => now()->subHours(6),
        ]);

        OncallPagingLog::create([
            'oncall_schedule_id' => $schedule1->id,
            'triggered_by' => $user->id,
            'trigger_reason' => 'PostgreSQL Connection Pool Exhaustion (> 92% capacity)',
            'escalation_level' => 1,
            'responder_user_id' => $user->id,
            'response_time_seconds' => 95,
            'status' => 'acknowledged',
            'created_at' => now()->subMinutes(25),
        ]);

        // 2. Security & Compliance Incident Response Schedule
        OncallSchedule::create([
            'organization_id' => $organization->id,
            'name' => 'Security & SOC Incident Response On-Call',
            'rotation_type' => 'biweekly',
            'members' => $members,
            'escalation_policy' => [
                ['level' => 1, 'target' => 'SOC Analyst On-Duty', 'timeout_minutes' => 10],
                ['level' => 2, 'target' => 'Security Architect Lead', 'timeout_minutes' => 20],
                ['level' => 3, 'target' => 'CISO / Head of Security', 'timeout_minutes' => 45],
            ],
            'status' => 'active',
            'started_at' => now()->subWeeks(1)->startOfWeek(),
        ]);
    }
}
