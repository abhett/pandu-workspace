<?php

namespace App\Services\Capacity;

use App\Models\MemberCapacitySetting;
use App\Models\MemberTimeOffSchedule;
use App\Models\Organization;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkloadRebalanceLog;
use Illuminate\Support\Facades\DB;

class CrossProjectWorkloadBalancerService
{
    /**
     * Get multi-project cross-allocation matrix, burnout alerts, and capacity runway.
     *
     * @return array<string, mixed>
     */
    public function getWorkloadBalancingMatrix(Organization $organization): array
    {
        $members = User::whereIn('id', $organization->memberships()->pluck('user_id'))
            ->select(['id', 'name', 'email'])
            ->orderBy('name')
            ->get();

        $projects = Project::where('organization_id', $organization->id)
            ->select(['id', 'name', 'key', 'status'])
            ->orderBy('name')
            ->get();

        $capacitySettings = MemberCapacitySetting::where('organization_id', $organization->id)
            ->get()
            ->keyBy('user_id');

        $timeOffSchedules = MemberTimeOffSchedule::where('organization_id', $organization->id)
            ->orderBy('start_date')
            ->get();

        $today = now()->toDateString();
        $startOfWeek = now()->startOfWeek()->toDateString();
        $endOfWeek = now()->endOfWeek()->toDateString();

        $matrixRows = [];
        $totalOrgCapacityHours = 0.0;
        $totalAllocatedHours = 0.0;
        $overloadedCount = 0;
        $highWorkloadCount = 0;
        $onLeaveCount = 0;

        foreach ($members as $member) {
            $setting = $capacitySettings->get($member->id);
            $weeklyHours = $setting ? (float) $setting->weekly_capacity_hours : 40.0;
            $fteRatio = $setting ? (float) $setting->fte_ratio : 1.0;
            $maxPoints = $setting ? (float) $setting->max_story_points_per_sprint : 20.0;

            // Time off this week
            $currentWeekLeaves = $timeOffSchedules->filter(function ($to) use ($member, $startOfWeek, $endOfWeek) {
                return $to->user_id === $member->id &&
                    $to->start_date <= $endOfWeek &&
                    $to->end_date >= $startOfWeek;
            });

            $hoursDeducted = (float) $currentWeekLeaves->sum('hours_deducted');
            $baseCapacity = $weeklyHours * $fteRatio;
            $effectiveCapacity = max(0.0, round($baseCapacity - $hoursDeducted, 1));

            // Is on leave today
            $isOnLeaveToday = $timeOffSchedules->contains(function ($to) use ($member, $today) {
                return $to->user_id === $member->id &&
                    $to->start_date <= $today &&
                    $to->end_date >= $today;
            });

            // Active tasks across all projects
            $activeTasks = Task::where('organization_id', $organization->id)
                ->whereHas('assignees', fn ($q) => $q->where('users.id', $member->id))
                ->whereNull('completed_at')
                ->with(['project:id,key,name', 'status:id,name,color'])
                ->get();

            // Project distribution map
            $projectAllocations = [];
            $memberTotalHours = 0.0;
            $memberTotalPoints = 0.0;

            foreach ($activeTasks as $task) {
                $pId = (string) $task->project_id;
                $points = $task->estimate_points ? (float) $task->estimate_points : 2.0;
                $hours = round($points * 2.0, 1);

                $memberTotalPoints += $points;
                $memberTotalHours += $hours;

                if (! isset($projectAllocations[$pId])) {
                    $projectAllocations[$pId] = [
                        'project_id' => $pId,
                        'project_name' => $task->project?->name ?? 'Proyek',
                        'project_key' => $task->project?->key ?? 'PRJ',
                        'allocated_points' => 0.0,
                        'allocated_hours' => 0.0,
                        'tasks_count' => 0,
                    ];
                }

                $projectAllocations[$pId]['allocated_points'] += $points;
                $projectAllocations[$pId]['allocated_hours'] += $hours;
                $projectAllocations[$pId]['tasks_count']++;
            }

            // Share percentage per project
            foreach ($projectAllocations as &$pAlloc) {
                $pAlloc['share_pct'] = $memberTotalHours > 0
                    ? round(($pAlloc['allocated_hours'] / $memberTotalHours) * 100, 1)
                    : 0.0;
            }
            unset($pAlloc);

            $utilization = $effectiveCapacity > 0
                ? round(($memberTotalHours / $effectiveCapacity) * 100, 1)
                : ($memberTotalHours > 0 ? 150.0 : 0.0);

            $burnoutRisk = 'optimal';
            if ($isOnLeaveToday) {
                $burnoutRisk = 'on_leave';
                $onLeaveCount++;
            } elseif ($utilization > 120.0) {
                $burnoutRisk = 'severe_overload';
                $overloadedCount++;
            } elseif ($utilization > 100.0) {
                $burnoutRisk = 'high_workload';
                $highWorkloadCount++;
            } elseif ($utilization < 60.0) {
                $burnoutRisk = 'under_utilized';
            }

            $totalOrgCapacityHours += $effectiveCapacity;
            $totalAllocatedHours += $memberTotalHours;

            $matrixRows[] = [
                'user_id' => $member->id,
                'user_name' => $member->name,
                'user_email' => $member->email,
                'weekly_capacity_hours' => $weeklyHours,
                'effective_capacity_hours' => $effectiveCapacity,
                'allocated_hours' => $memberTotalHours,
                'allocated_points' => $memberTotalPoints,
                'active_tasks_count' => $activeTasks->count(),
                'utilization_rate' => $utilization,
                'burnout_risk' => $burnoutRisk,
                'is_on_leave' => $isOnLeaveToday,
                'project_allocations' => array_values($projectAllocations),
                'active_tasks' => $activeTasks->map(fn ($t) => [
                    'id' => $t->id,
                    'project_id' => $t->project_id,
                    'project_key' => $t->project?->key,
                    'key' => $t->key,
                    'title' => $t->title,
                    'priority' => $t->priority,
                    'estimate_points' => (float) ($t->estimate_points ?? 2.0),
                    'allocated_hours' => round(((float) ($t->estimate_points ?? 2.0)) * 2.0, 1),
                ]),
            ];
        }

        // 4-Week Forward Capacity Runway
        $runwayWeeks = [];
        for ($w = 0; $w < 4; $w++) {
            $wStart = now()->addWeeks($w)->startOfWeek();
            $wEnd = now()->addWeeks($w)->endOfWeek();

            $scheduledLeaveHours = (float) $timeOffSchedules->filter(function ($to) use ($wStart, $wEnd) {
                return $to->start_date <= $wEnd->toDateString() && $to->end_date >= $wStart->toDateString();
            })->sum('hours_deducted');

            $baseOrgWeekly = $members->sum(function ($m) use ($capacitySettings) {
                $s = $capacitySettings->get($m->id);

                return ($s ? (float) $s->weekly_capacity_hours : 40.0) * ($s ? (float) $s->fte_ratio : 1.0);
            });

            $netBandwidth = max(0.0, round($baseOrgWeekly - $scheduledLeaveHours, 1));

            $runwayWeeks[] = [
                'week_number' => $w + 1,
                'label' => 'W'.$wStart->format('W').' ('.$wStart->format('d M').')',
                'start_date' => $wStart->toDateString(),
                'end_date' => $wEnd->toDateString(),
                'base_capacity_hours' => round($baseOrgWeekly, 1),
                'leave_deducted_hours' => $scheduledLeaveHours,
                'net_bandwidth_hours' => $netBandwidth,
            ];
        }

        // Rebalance Audit Logs (latest 10)
        $auditLogs = WorkloadRebalanceLog::where('organization_id', $organization->id)
            ->with(['task:id,key,title', 'previousAssignee:id,name', 'newAssignee:id,name', 'rebalancedBy:id,name'])
            ->latest('created_at')
            ->take(10)
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'task' => $log->task ? [
                    'id' => $log->task->id,
                    'key' => $log->task->key,
                    'title' => $log->task->title,
                ] : null,
                'previous_assignee' => $log->previousAssignee?->name ?? 'Unassigned',
                'new_assignee' => $log->newAssignee?->name ?? 'Unassigned',
                'rebalanced_by' => $log->rebalancedBy?->name ?? 'Sistem',
                'reason' => $log->reason,
                'points_moved' => $log->points_moved,
                'created_at' => $log->created_at->diffForHumans(),
            ]);

        $overallUtilization = $totalOrgCapacityHours > 0
            ? round(($totalAllocatedHours / $totalOrgCapacityHours) * 100, 1)
            : 0.0;

        return [
            'metrics' => [
                'total_org_capacity_hours' => round($totalOrgCapacityHours, 1),
                'total_allocated_hours' => round($totalAllocatedHours, 1),
                'available_capacity_hours' => max(0.0, round($totalOrgCapacityHours - $totalAllocatedHours, 1)),
                'overall_utilization_pct' => $overallUtilization,
                'total_members_count' => $members->count(),
                'overloaded_members_count' => $overloadedCount,
                'high_workload_count' => $highWorkloadCount,
                'on_leave_count' => $onLeaveCount,
            ],
            'projects' => $projects,
            'matrix_rows' => $matrixRows,
            'runway_weeks' => $runwayWeeks,
            'audit_logs' => $auditLogs,
        ];
    }

    /**
     * Get candidate suggestions for rebalancing tasks from an overloaded member.
     *
     * @return array<string, mixed>
     */
    public function getRebalanceSuggestions(Organization $organization, int $overloadedUserId): array
    {
        $overloadedUser = User::find($overloadedUserId);
        if (! $overloadedUser) {
            return [];
        }

        $overview = $this->getWorkloadBalancingMatrix($organization);
        $overloadedRow = collect($overview['matrix_rows'])->firstWhere('user_id', $overloadedUserId);

        if (! $overloadedRow) {
            return [];
        }

        // Find available candidate peers with utilization < 85% and not on leave
        $candidatePeers = collect($overview['matrix_rows'])
            ->filter(fn ($row) => $row['user_id'] !== $overloadedUserId && $row['burnout_risk'] !== 'on_leave' && $row['utilization_rate'] < 90.0)
            ->sortBy('utilization_rate')
            ->values()
            ->all();

        return [
            'overloaded_user' => [
                'id' => $overloadedUser->id,
                'name' => $overloadedUser->name,
                'allocated_hours' => $overloadedRow['allocated_hours'],
                'effective_capacity' => $overloadedRow['effective_capacity_hours'],
                'utilization_rate' => $overloadedRow['utilization_rate'],
                'tasks' => $overloadedRow['active_tasks'],
            ],
            'candidate_peers' => $candidatePeers,
        ];
    }

    /**
     * Reassign a task to balance workload and record audit log.
     */
    public function executeRebalance(
        Organization $organization,
        User $adminUser,
        string $taskId,
        ?int $newAssigneeId,
        ?string $reason = null
    ): WorkloadRebalanceLog {
        $task = Task::where('organization_id', $organization->id)->where('id', $taskId)->firstOrFail();
        $previousAssignee = $task->assignees()->first();
        $previousAssigneeId = $previousAssignee?->id;

        $points = $task->estimate_points ? (float) $task->estimate_points : 2.0;

        // Sync new assignee
        if ($newAssigneeId) {
            $task->assignees()->sync([$newAssigneeId]);
        } else {
            $task->assignees()->detach();
        }

        return WorkloadRebalanceLog::create([
            'organization_id' => $organization->id,
            'task_id' => $task->id,
            'previous_assignee_id' => $previousAssigneeId,
            'new_assignee_id' => $newAssigneeId,
            'rebalanced_by' => $adminUser->id,
            'reason' => $reason ?? 'Perataan beban kerja kapasitas lintas proyek.',
            'points_moved' => $points,
        ]);
    }

    /**
     * Batch reassign multiple tasks across projects.
     *
     * @param  array<int, array<string, mixed>>  $rebalanceItems
     * @return array<int, WorkloadRebalanceLog>
     */
    public function batchRebalance(Organization $organization, User $adminUser, array $rebalanceItems): array
    {
        return DB::transaction(function () use ($organization, $adminUser, $rebalanceItems) {
            $logs = [];
            foreach ($rebalanceItems as $item) {
                if (empty($item['task_id'])) {
                    continue;
                }
                $newAssigneeId = isset($item['new_assignee_id']) && $item['new_assignee_id'] !== 'none'
                    ? (int) $item['new_assignee_id']
                    : null;

                $logs[] = $this->executeRebalance(
                    $organization,
                    $adminUser,
                    $item['task_id'],
                    $newAssigneeId,
                    $item['reason'] ?? null
                );
            }

            return $logs;
        });
    }
}
