<?php

namespace App\Services\Sla;

use App\Models\Organization;
use App\Models\OrganizationAuditLog;
use App\Models\Project;
use App\Models\SlaEscalationLog;
use App\Models\SlaPolicy;
use App\Models\Task;
use App\Models\TaskSlaTracker;
use App\Models\User;

class SlaBreachForecastService
{
    /**
     * Get complete predictive SLA breach forecast dashboard and escalation queue.
     *
     * @return array<string, mixed>
     */
    public function getForecastDashboard(Organization $organization, ?string $projectId = null): array
    {
        $policyIds = SlaPolicy::where('organization_id', $organization->id)->pluck('id');

        $trackerQuery = TaskSlaTracker::whereIn('sla_policy_id', $policyIds)
            ->whereHas('task', function ($q) use ($organization, $projectId) {
                $q->where('organization_id', $organization->id)
                    ->when($projectId, fn ($pq) => $pq->where('project_id', $projectId));
            })
            ->with(['task.project:id,name,key', 'task.assignees:id,name,email', 'task.workflowStatus:id,name,color', 'policy:id,name,priority']);

        $trackers = $trackerQuery->get();

        $forecastList = $trackers->map(function (TaskSlaTracker $tracker) {
            $task = $tracker->task;
            if (! $task) {
                return null;
            }

            $riskAnalysis = $this->predictTaskBreachRisk($tracker);
            $assignee = $task->assignees->first();

            return [
                'task_id' => $task->id,
                'task_key' => $task->project ? "{$task->project->key}-{$task->id}" : "TASK-{$task->id}",
                'title' => $task->title,
                'priority' => $task->priority ?? 'medium',
                'status' => $task->workflowStatus?->name ?? 'In Progress',
                'project_name' => $task->project?->name ?? 'Default Project',
                'assignee' => $assignee ? [
                    'id' => $assignee->id,
                    'name' => $assignee->name,
                    'email' => $assignee->email,
                ] : null,
                'tracker_id' => $tracker->id,
                'policy_name' => $tracker->policy?->name ?? 'Standard SLA',
                'resolution_due_at_formatted' => $tracker->resolution_due_at?->translatedFormat('d M Y H:i'),
                'is_resolved' => ! empty($tracker->resolved_at),
                'escalation_level' => $tracker->escalation_level ?? 0,
                'risk_score' => $riskAnalysis['risk_score'],
                'risk_level' => $riskAnalysis['risk_level'],
                'minutes_remaining' => $riskAnalysis['minutes_remaining'],
                'time_remaining_human' => $riskAnalysis['time_remaining_human'],
                'recommended_action' => $riskAnalysis['recommended_action'],
            ];
        })->filter()->values();

        // Calculate KPI Metrics
        $totalTracked = $forecastList->count();
        $imminentBreach = $forecastList->where('risk_level', 'imminent_breach')->count();
        $highRisk = $forecastList->where('risk_level', 'high_risk')->count();
        $moderateRisk = $forecastList->where('risk_level', 'moderate_risk')->count();
        $onTrack = $forecastList->where('risk_level', 'on_track')->count();

        $projectedCompliance = $totalTracked > 0
            ? round((($onTrack + ($moderateRisk * 0.7)) / $totalTracked) * 100, 1)
            : 98.5;

        $escalationsMonth = SlaEscalationLog::where('organization_id', $organization->id)
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();

        $metrics = [
            'total_active_tracked' => $totalTracked,
            'projected_compliance_pct' => min(100.0, max(40.0, $projectedCompliance)),
            'imminent_breach_count' => $imminentBreach,
            'high_risk_count' => $highRisk,
            'moderate_risk_count' => $moderateRisk,
            'escalations_this_month' => $escalationsMonth,
        ];

        // Escalation Logs History
        $escalationLogs = SlaEscalationLog::where('organization_id', $organization->id)
            ->with(['task.project:id,name,key', 'triggerer:id,name', 'previousAssignee:id,name', 'newAssignee:id,name'])
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(fn (SlaEscalationLog $log) => [
                'id' => $log->id,
                'task_title' => $log->task?->title ?? 'Tugas Dihapus',
                'task_key' => $log->task?->project ? "{$log->task->project->key}-{$log->task->id}" : 'TASK',
                'escalation_tier' => $log->escalation_tier,
                'previous_priority' => $log->previous_priority,
                'new_priority' => $log->new_priority,
                'triggered_by_name' => $log->triggerer?->name ?? 'Automated AI Rule',
                'previous_assignee_name' => $log->previousAssignee?->name ?? 'Unassigned',
                'new_assignee_name' => $log->newAssignee?->name ?? 'Unassigned',
                'breach_risk_score' => $log->breach_risk_score,
                'reason' => $log->reason,
                'created_at_formatted' => $log->created_at?->translatedFormat('d M Y H:i:s'),
            ]);

        // On-call senior leads for reassignment options
        $leads = User::whereIn('id', $organization->memberships()->pluck('user_id'))
            ->select(['id', 'name', 'email'])
            ->orderBy('name')
            ->get();

        $projects = Project::where('organization_id', $organization->id)
            ->select(['id', 'name', 'key'])
            ->orderBy('name')
            ->get();

        return [
            'metrics' => $metrics,
            'tickets' => $forecastList->sortByDesc('risk_score')->values()->all(),
            'escalation_logs' => $escalationLogs,
            'leads' => $leads,
            'projects' => $projects,
            'selected_project_id' => $projectId,
        ];
    }

    /**
     * Calculate breach probability risk score and categorization.
     *
     * @return array<string, mixed>
     */
    public function predictTaskBreachRisk(TaskSlaTracker $tracker): array
    {
        $dueAt = $tracker->resolution_due_at ?? $tracker->response_due_at ?? now()->addHours(8);
        $minutesRemaining = (int) now()->diffInMinutes($dueAt, false);

        if (! empty($tracker->resolved_at)) {
            return [
                'risk_score' => 0.0,
                'risk_level' => 'resolved',
                'minutes_remaining' => $minutesRemaining,
                'time_remaining_human' => 'Terselesaikan',
                'recommended_action' => 'Tiket telah selesai sesuai target SLA.',
            ];
        }

        $baseRisk = 20.0;
        $riskLevel = 'on_track';
        $recommendedAction = 'Progres berjalan normal sesuai estimasi kecepatan tim.';

        if ($minutesRemaining <= 0) {
            $baseRisk = 100.0;
            $riskLevel = 'breached';
            $recommendedAction = '🚨 Target SLA telah terlampaui. Segera lakukan eskalasi Tier 3.';
        } elseif ($minutesRemaining <= 240) { // < 4 hours
            $baseRisk = 85.0 + min(14.0, (240 - $minutesRemaining) / 18);
            $riskLevel = 'imminent_breach';
            $recommendedAction = '⚠️ Pelanggaran SLA segera terjadi (<4 jam). Alihkan ke Lead On-Call (Tier 2).';
        } elseif ($minutesRemaining <= 720) { // < 12 hours
            $baseRisk = 60.0 + min(24.0, (720 - $minutesRemaining) / 20);
            $riskLevel = 'high_risk';
            $recommendedAction = 'Tingkatkan prioritas tugas dan koordinasikan dengan assignee (Tier 1).';
        } elseif ($minutesRemaining <= 1440) { // < 24 hours
            $baseRisk = 35.0 + min(24.0, (1440 - $minutesRemaining) / 30);
            $riskLevel = 'moderate_risk';
            $recommendedAction = 'Pantau backlog harian dan pastikan tidak ada blocker teknis.';
        }

        // Priority adjustment
        $task = $tracker->task;
        if ($task) {
            if ($task->priority === 'urgent') {
                $baseRisk = min(100.0, $baseRisk + 10.0);
            } elseif ($task->priority === 'high') {
                $baseRisk = min(100.0, $baseRisk + 5.0);
            }
        }

        // Human readable remaining time
        $timeRemainingHuman = $minutesRemaining > 0
            ? ($minutesRemaining >= 60 ? round($minutesRemaining / 60, 1).' jam' : $minutesRemaining.' menit')
            : 'Lewat '.abs($minutesRemaining).' menit';

        return [
            'risk_score' => round($baseRisk, 1),
            'risk_level' => $riskLevel,
            'minutes_remaining' => $minutesRemaining,
            'time_remaining_human' => $timeRemainingHuman,
            'recommended_action' => $recommendedAction,
        ];
    }

    /**
     * Execute manual or automated tiered escalation on an active SLA task.
     */
    public function executeManualEscalation(
        Organization $organization,
        Task $task,
        User $user,
        int $tier,
        ?int $newAssigneeId,
        string $reason
    ): SlaEscalationLog {
        $previousAssignee = $task->assignees()->first();
        $previousAssigneeId = $previousAssignee?->id;
        $previousPriority = $task->priority ?? 'medium';

        // Upgrade priority based on tier
        $newPriority = $previousPriority;
        if ($tier >= 2) {
            $newPriority = 'urgent';
        } elseif ($tier === 1 && in_array($previousPriority, ['low', 'medium'])) {
            $newPriority = 'high';
        }

        $task->update([
            'priority' => $newPriority,
        ]);

        if ($newAssigneeId) {
            $task->assignees()->sync([$newAssigneeId => ['assigned_at' => now(), 'assigned_by' => $user->id]]);
        }

        $tracker = $task->slaTracker;
        if ($tracker) {
            $tracker->update([
                'escalation_level' => $tier,
                'escalated_at' => now(),
            ]);
        }

        $riskAnalysis = $tracker ? $this->predictTaskBreachRisk($tracker) : ['risk_score' => 85.0];

        $escalationLog = SlaEscalationLog::create([
            'organization_id' => $organization->id,
            'task_id' => $task->id,
            'tracker_id' => $tracker?->id,
            'triggered_by' => $user->id,
            'escalation_tier' => $tier,
            'previous_priority' => $previousPriority,
            'new_priority' => $newPriority,
            'previous_assignee_id' => $previousAssigneeId,
            'new_assignee_id' => $newAssigneeId ?: $previousAssigneeId,
            'breach_risk_score' => $riskAnalysis['risk_score'],
            'reason' => $reason,
            'actions_taken' => [
                'priority_updated' => "{$previousPriority} -> {$newPriority}",
                'reassigned' => $newAssigneeId ? true : false,
                'tier_notified' => "Tier {$tier} Escalation Protocol Activated",
            ],
        ]);

        OrganizationAuditLog::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'event_category' => 'sla',
            'action' => 'sla_task_escalated',
            'resource_type' => 'Task',
            'resource_id' => (string) $task->id,
            'status' => 'success',
            'changes' => [
                'escalation_tier' => $tier,
                'reason' => $reason,
                'new_priority' => $newPriority,
            ],
        ]);

        return $escalationLog;
    }

    /**
     * Dismiss or record risk mitigation on a ticket.
     */
    public function dismissOrMitigateRisk(Task $task, User $user, string $note): void
    {
        OrganizationAuditLog::create([
            'organization_id' => $task->organization_id,
            'user_id' => $user->id,
            'event_category' => 'sla',
            'action' => 'sla_risk_mitigated',
            'resource_type' => 'Task',
            'resource_id' => (string) $task->id,
            'status' => 'success',
            'changes' => ['mitigation_note' => $note],
        ]);
    }
}
