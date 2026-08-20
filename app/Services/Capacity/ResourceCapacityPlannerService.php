<?php

namespace App\Services\Capacity;

use App\Models\MemberCapacitySetting;
use App\Models\MemberTimeOffSchedule;
use App\Models\Organization;
use App\Models\Task;
use App\Models\User;

class ResourceCapacityPlannerService
{
    /**
     * Get organization capacity and workload distribution overview.
     *
     * @return array<string, mixed>
     */
    public function getOrganizationCapacityOverview(Organization $organization): array
    {
        $members = User::whereIn('id', $organization->memberships()->pluck('user_id'))
            ->select(['id', 'name', 'email'])
            ->orderBy('name')
            ->get();

        $capacitySettings = MemberCapacitySetting::where('organization_id', $organization->id)
            ->get()
            ->keyBy('user_id');

        $timeOffSchedules = MemberTimeOffSchedule::where('organization_id', $organization->id)
            ->with('user:id,name,email')
            ->orderBy('start_date')
            ->get();

        $today = now()->toDateString();
        $startOfWeek = now()->startOfWeek()->toDateString();
        $endOfWeek = now()->endOfWeek()->toDateString();

        $memberProfiles = [];
        $totalOrgCapacityHours = 0.0;
        $totalAllocatedHours = 0.0;
        $overburdenedCount = 0;
        $onLeaveCount = 0;

        foreach ($members as $member) {
            $setting = $capacitySettings->get($member->id);
            $weeklyHours = $setting ? (float) $setting->weekly_capacity_hours : 40.0;
            $fteRatio = $setting ? (float) $setting->fte_ratio : 1.0;
            $maxPoints = $setting ? (float) $setting->max_story_points_per_sprint : 20.0;

            // Member time offs in current week
            $memberTimeOffs = $timeOffSchedules->filter(function ($to) use ($member, $startOfWeek, $endOfWeek) {
                return $to->user_id === $member->id &&
                    $to->start_date <= $endOfWeek &&
                    $to->end_date >= $startOfWeek;
            });

            $hoursDeducted = (float) $memberTimeOffs->sum('hours_deducted');
            $baseCapacity = $weeklyHours * $fteRatio;
            $effectiveCapacity = max(0.0, round($baseCapacity - $hoursDeducted, 1));

            // Is member currently on leave today?
            $isOnLeaveToday = $timeOffSchedules->contains(function ($to) use ($member, $today) {
                return $to->user_id === $member->id &&
                    $to->start_date <= $today &&
                    $to->end_date >= $today;
            });

            // Fetch active tasks assigned to user
            $activeTasks = Task::whereHas('assignees', fn ($q) => $q->where('users.id', $member->id))
                ->whereNull('completed_at')
                ->with('project:id,key,name,color')
                ->orderByDesc('priority')
                ->get();

            $totalPoints = 0.0;
            foreach ($activeTasks as $t) {
                $points = $t->estimate_points ? (float) $t->estimate_points : 2.0;
                $totalPoints += $points;
            }

            // Standard conversion: 1 Story Point ~ 2 Hours
            $allocatedHours = round($totalPoints * 2.0, 1);
            $utilization = $effectiveCapacity > 0
                ? round(($allocatedHours / $effectiveCapacity) * 100, 1)
                : ($allocatedHours > 0 ? 150.0 : 0.0);

            $status = 'optimal';
            if ($isOnLeaveToday) {
                $status = 'on_leave';
                $onLeaveCount++;
            } elseif ($utilization > 100.0) {
                $status = 'over_allocated';
                $overburdenedCount++;
            } elseif ($utilization < 60.0) {
                $status = 'under_allocated';
            }

            $totalOrgCapacityHours += $effectiveCapacity;
            $totalAllocatedHours += $allocatedHours;

            $memberProfiles[] = [
                'user_id' => $member->id,
                'user_name' => $member->name,
                'user_email' => $member->email,
                'weekly_capacity_hours' => $weeklyHours,
                'fte_ratio' => $fteRatio,
                'max_story_points' => $maxPoints,
                'hours_deducted' => $hoursDeducted,
                'effective_capacity_hours' => $effectiveCapacity,
                'allocated_hours' => $allocatedHours,
                'allocated_points' => $totalPoints,
                'active_tasks_count' => $activeTasks->count(),
                'utilization_rate' => $utilization,
                'status' => $status,
                'active_tasks' => $activeTasks->map(fn ($t) => [
                    'id' => $t->id,
                    'key' => $t->key,
                    'title' => $t->title,
                    'priority' => $t->priority,
                    'estimate_points' => (float) ($t->estimate_points ?? 2.0),
                    'project_id' => $t->project_id,
                    'project_name' => $t->project?->name,
                    'project_key' => $t->project?->key,
                ]),
            ];
        }

        $overallUtilization = $totalOrgCapacityHours > 0
            ? round(($totalAllocatedHours / $totalOrgCapacityHours) * 100, 1)
            : 0.0;

        return [
            'metrics' => [
                'total_org_capacity_hours' => round($totalOrgCapacityHours, 1),
                'total_allocated_hours' => round($totalAllocatedHours, 1),
                'overall_utilization_rate' => $overallUtilization,
                'overburdened_members_count' => $overburdenedCount,
                'members_on_leave_count' => $onLeaveCount,
                'total_members_count' => count($memberProfiles),
            ],
            'member_profiles' => $memberProfiles,
            'time_off_schedules' => $timeOffSchedules->map(fn ($to) => [
                'id' => $to->id,
                'user_id' => $to->user_id,
                'user_name' => $to->user?->name,
                'user_email' => $to->user?->email,
                'type' => $to->type,
                'title' => $to->title,
                'start_date' => $to->start_date->toDateString(),
                'end_date' => $to->end_date->toDateString(),
                'start_date_formatted' => $to->start_date->translatedFormat('d M Y'),
                'end_date_formatted' => $to->end_date->translatedFormat('d M Y'),
                'hours_deducted' => (float) $to->hours_deducted,
                'notes' => $to->notes,
            ]),
        ];
    }

    /**
     * Update member capacity settings.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateMemberCapacity(Organization $organization, int $userId, array $data): MemberCapacitySetting
    {
        return MemberCapacitySetting::updateOrCreate(
            [
                'organization_id' => $organization->id,
                'user_id' => $userId,
            ],
            [
                'weekly_capacity_hours' => (float) ($data['weekly_capacity_hours'] ?? 40.0),
                'max_story_points_per_sprint' => (float) ($data['max_story_points_per_sprint'] ?? 20.0),
                'fte_ratio' => (float) ($data['fte_ratio'] ?? 1.0),
                'is_active' => true,
            ]
        );
    }

    /**
     * Schedule member time off or leave.
     *
     * @param  array<string, mixed>  $data
     */
    public function scheduleTimeOff(Organization $organization, int $userId, array $data): MemberTimeOffSchedule
    {
        return MemberTimeOffSchedule::create([
            'organization_id' => $organization->id,
            'user_id' => $userId,
            'type' => $data['type'] ?? 'vacation',
            'title' => $data['title'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'hours_deducted' => (float) ($data['hours_deducted'] ?? 8.0),
            'notes' => $data['notes'] ?? null,
        ]);
    }

    /**
     * Delete scheduled time off.
     */
    public function deleteTimeOff(string $timeOffId): bool
    {
        return (bool) MemberTimeOffSchedule::where('id', $timeOffId)->delete();
    }

    /**
     * Rebalance task by reassigning to a new member.
     */
    public function rebalanceTask(Task $task, ?int $newAssigneeId): Task
    {
        if ($newAssigneeId) {
            $task->assignees()->sync([$newAssigneeId => [
                'assigned_at' => now(),
                'assigned_by' => auth()->id(),
            ]]);
        } else {
            $task->assignees()->detach();
        }

        return $task->fresh(['assignees']);
    }
}
