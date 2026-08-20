<?php

namespace App\Services\Sla;

use App\Models\Organization;
use App\Models\SlaEscalationRule;
use App\Models\SlaPolicy;
use App\Models\Task;
use App\Models\TaskSlaTracker;
use Carbon\Carbon;
use Carbon\CarbonInterface;

class SlaEngineService
{
    /**
     * Find the best matching active SLA policy for a task.
     */
    public function findMatchingPolicy(Task $task): ?SlaPolicy
    {
        $policies = SlaPolicy::where('organization_id', $task->organization_id)
            ->where('active', true)
            ->where(function ($q) use ($task) {
                $q->whereNull('project_id')->orWhere('project_id', $task->project_id);
            })
            ->get();

        // Sort so project-specific policies take precedence over global policies
        return $policies->first(function (SlaPolicy $policy) use ($task) {
            $priorityMatch = $policy->priority === 'all' || $policy->priority === $task->priority;
            $typeMatch = $policy->issue_type === 'all' || $policy->issue_type === $task->type;

            return $priorityMatch && $typeMatch;
        });
    }

    /**
     * Calculate target due date according to operational hours.
     */
    public function calculateDueDate(CarbonInterface $startDate, int $hours, string $operationalHours = '24x7'): CarbonInterface
    {
        if ($operationalHours === '24x7') {
            return $startDate->copy()->addHours($hours);
        }

        // Business Hours Calculation (Mon-Fri 09:00 - 18:00)
        $current = $startDate->copy();
        $remainingMinutes = $hours * 60;

        while ($remainingMinutes > 0) {
            // If weekend, advance to next Monday 09:00
            if ($current->isWeekend()) {
                $current->next(Carbon::MONDAY)->setTime(9, 0, 0);
            }

            // If before 09:00, set to 09:00
            if ($current->hour < 9) {
                $current->setTime(9, 0, 0);
            }

            // If after 18:00, advance to next business day 09:00
            if ($current->hour >= 18) {
                $current->addDay()->setTime(9, 0, 0);
                if ($current->isWeekend()) {
                    $current->next(Carbon::MONDAY)->setTime(9, 0, 0);
                }
            }

            $endOfDay = $current->copy()->setTime(18, 0, 0);
            $minutesAvailableToday = $current->diffInMinutes($endOfDay);

            if ($remainingMinutes <= $minutesAvailableToday) {
                $current->addMinutes($remainingMinutes);
                $remainingMinutes = 0;
            } else {
                $remainingMinutes -= $minutesAvailableToday;
                $current->addDay()->setTime(9, 0, 0);
            }
        }

        return $current;
    }

    /**
     * Attach or recompute SLA targets for a task.
     */
    public function attachOrUpdateTaskSla(Task $task): ?TaskSlaTracker
    {
        $policy = $this->findMatchingPolicy($task);
        if (! $policy) {
            return null;
        }

        $now = now();
        $responseDueAt = $this->calculateDueDate($now, $policy->response_time_hours, $policy->operational_hours);
        $resolutionDueAt = $this->calculateDueDate($now, $policy->resolution_time_hours, $policy->operational_hours);

        $tracker = TaskSlaTracker::updateOrCreate(
            ['task_id' => $task->id],
            [
                'sla_policy_id' => $policy->id,
                'response_due_at' => $responseDueAt,
                'resolution_due_at' => $resolutionDueAt,
                'status' => 'in_progress',
            ]
        );

        return $tracker;
    }

    /**
     * Record first response on a task.
     */
    public function recordTaskResponse(Task $task): ?TaskSlaTracker
    {
        $tracker = $task->slaTracker;
        if (! $tracker || $tracker->responded_at !== null) {
            return $tracker;
        }

        $now = now();
        $isBreached = $tracker->response_due_at && $now->isAfter($tracker->response_due_at);

        $tracker->update([
            'responded_at' => $now,
            'is_response_breached' => $isBreached,
        ]);

        return $tracker->fresh();
    }

    /**
     * Record resolution of a task.
     */
    public function recordTaskResolution(Task $task): ?TaskSlaTracker
    {
        $tracker = $task->slaTracker;
        if (! $tracker) {
            return null;
        }

        $now = now();
        $isBreached = $tracker->resolution_due_at && $now->isAfter($tracker->resolution_due_at);

        $tracker->update([
            'resolved_at' => $now,
            'is_resolution_breached' => $isBreached,
            'status' => $isBreached ? 'breached' : 'achieved',
        ]);

        return $tracker->fresh();
    }

    /**
     * Scan active tasks, identify breaches, and trigger automated escalation rules.
     *
     * @return array<string, mixed>
     */
    public function scanAndEscalate(Organization $organization): array
    {
        $now = now();
        $trackers = TaskSlaTracker::whereHas('task', function ($q) use ($organization) {
            $q->where('organization_id', $organization->id);
        })
            ->where('status', 'in_progress')
            ->with(['task', 'policy.escalationRules' => function ($q) {
                $q->where('active', true)->orderBy('position');
            }])
            ->get();

        $scannedCount = $trackers->count();
        $breachedCount = 0;
        $escalatedCount = 0;

        foreach ($trackers as $tracker) {
            $task = $tracker->task;
            if (! $task) {
                continue;
            }

            $policy = $tracker->policy;
            $hasBreached = false;

            // Check Response Breach
            if ($tracker->responded_at === null && $tracker->response_due_at && $now->isAfter($tracker->response_due_at)) {
                if (! $tracker->is_response_breached) {
                    $tracker->is_response_breached = true;
                    $hasBreached = true;
                }
            }

            // Check Resolution Breach
            if ($tracker->resolved_at === null && $tracker->resolution_due_at && $now->isAfter($tracker->resolution_due_at)) {
                if (! $tracker->is_resolution_breached) {
                    $tracker->is_resolution_breached = true;
                    $tracker->status = 'breached';
                    $hasBreached = true;
                }
            }

            if ($hasBreached) {
                $breachedCount++;
                $tracker->save();
            }

            // Execute Escalation Matrix Rules
            if ($policy && $policy->escalationRules->isNotEmpty()) {
                foreach ($policy->escalationRules as $rule) {
                    $shouldTrigger = false;

                    if ($rule->trigger_type === 'response_breached' && $tracker->is_response_breached) {
                        $shouldTrigger = true;
                    } elseif ($rule->trigger_type === 'resolution_breached' && $tracker->is_resolution_breached) {
                        $shouldTrigger = true;
                    } elseif ($rule->trigger_type === 'approaching_breach' && $tracker->resolution_due_at) {
                        $warningThreshold = $tracker->resolution_due_at->copy()->subMinutes(abs($rule->trigger_offset_minutes ?: 60));
                        if ($now->isAfter($warningThreshold) && ! $tracker->is_resolution_breached) {
                            $shouldTrigger = true;
                        }
                    }

                    if ($shouldTrigger && $tracker->escalation_level < $rule->position + 1) {
                        $this->applyEscalationAction($task, $rule);
                        $tracker->escalated_at = $now;
                        $tracker->escalation_level = $rule->position + 1;
                        $tracker->save();
                        $escalatedCount++;
                    }
                }
            }
        }

        return [
            'scanned_tasks_count' => $scannedCount,
            'newly_breached_count' => $breachedCount,
            'escalated_tasks_count' => $escalatedCount,
        ];
    }

    /**
     * Apply specific escalation action on a task.
     */
    protected function applyEscalationAction(Task $task, SlaEscalationRule $rule): void
    {
        switch ($rule->action_type) {
            case 'escalate_priority':
                $newPriority = $rule->action_payload['new_priority'] ?? 'urgent';
                $task->update(['priority' => $newPriority]);
                break;

            case 'add_tag':
                // Custom tag handling or label flagging
                $task->touch();
                break;

            default:
                $task->touch();
                break;
        }
    }

    /**
     * Get organization aggregate metrics and list of at-risk tasks.
     *
     * @return array<string, mixed>
     */
    public function getOrganizationMetrics(Organization $organization): array
    {
        $policyIds = SlaPolicy::where('organization_id', $organization->id)->pluck('id');

        $totalPolicies = $policyIds->count();
        $activePolicies = SlaPolicy::where('organization_id', $organization->id)->where('active', true)->count();

        $totalTrackers = TaskSlaTracker::whereIn('sla_policy_id', $policyIds)->count();
        $achievedTrackers = TaskSlaTracker::whereIn('sla_policy_id', $policyIds)->where('status', 'achieved')->count();
        $breachedTrackers = TaskSlaTracker::whereIn('sla_policy_id', $policyIds)->where('status', 'breached')->count();
        $inProgressTrackers = TaskSlaTracker::whereIn('sla_policy_id', $policyIds)->where('status', 'in_progress')->count();

        $finishedCount = $achievedTrackers + $breachedTrackers;
        $complianceRate = $finishedCount > 0
            ? round(($achievedTrackers / $finishedCount) * 100, 1)
            : 100.0;

        // Fetch At-Risk & Breached Tasks
        $now = now();
        $activeTasks = TaskSlaTracker::whereIn('sla_policy_id', $policyIds)
            ->whereIn('status', ['in_progress', 'breached'])
            ->with(['task.project', 'policy'])
            ->orderBy('resolution_due_at')
            ->limit(20)
            ->get()
            ->map(function (TaskSlaTracker $tracker) use ($now) {
                $isOverdue = $tracker->resolution_due_at ? $now->isAfter($tracker->resolution_due_at) : false;
                $diffMinutes = $tracker->resolution_due_at ? (int) abs($now->diffInMinutes($tracker->resolution_due_at)) : 0;
                $hours = floor($diffMinutes / 60);
                $mins = $diffMinutes % 60;
                $timeLeftText = $isOverdue ? "Terlambat {$hours}j {$mins}m" : "Tersisa {$hours}j {$mins}m";

                return [
                    'id' => $tracker->id,
                    'task_id' => $tracker->task_id,
                    'task_key' => $tracker->task?->key,
                    'task_title' => $tracker->task?->title,
                    'task_priority' => $tracker->task?->priority,
                    'project_name' => $tracker->task?->project?->name,
                    'policy_name' => $tracker->policy?->name,
                    'status' => $tracker->status,
                    'is_overdue' => $isOverdue,
                    'time_text' => $timeLeftText,
                    'response_due_at_formatted' => $tracker->response_due_at?->translatedFormat('d M H:i'),
                    'resolution_due_at_formatted' => $tracker->resolution_due_at?->translatedFormat('d M H:i'),
                    'escalation_level' => $tracker->escalation_level,
                ];
            });

        return [
            'total_policies' => $totalPolicies,
            'active_policies' => $activePolicies,
            'total_trackers' => $totalTrackers,
            'achieved_count' => $achievedTrackers,
            'breached_count' => $breachedTrackers,
            'in_progress_count' => $inProgressTrackers,
            'compliance_rate' => $complianceRate,
            'active_tasks' => $activeTasks,
        ];
    }
}
