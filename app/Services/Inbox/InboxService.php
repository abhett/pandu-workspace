<?php

namespace App\Services\Inbox;

use App\Models\Organization;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkflowStatus;

class InboxService
{
    /**
     * Get consolidated personal inbox feed with category counts and time grouping.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function getInboxFeed(User $user, Organization $organization, array $filters = []): array
    {
        $view = $filters['view'] ?? 'all_unread';

        // 1. Calculate Category Counts
        $unreadNotificationsCount = $user->notifications()
            ->whereNull('read_at')
            ->where(function ($q) {
                $q->whereNull('snoozed_until')->orWhere('snoozed_until', '<=', now());
            })
            ->count();

        $assignedTasksCount = Task::whereHas('project', fn ($q) => $q->where('organization_id', $organization->id))
            ->whereHas('assignees', fn ($q) => $q->where('users.id', $user->id))
            ->whereHas('status', fn ($q) => $q->where('category', '!=', 'done'))
            ->count();

        $overdueTasksCount = Task::whereHas('project', fn ($q) => $q->where('organization_id', $organization->id))
            ->whereHas('assignees', fn ($q) => $q->where('users.id', $user->id))
            ->whereHas('status', fn ($q) => $q->where('category', '!=', 'done'))
            ->where('due_date', '<', now()->toDateString())
            ->count();

        $mentionsCount = $user->notifications()
            ->whereNull('read_at')
            ->where(function ($q) {
                $q->where('type', 'like', '%Mention%')
                    ->orWhere('type', 'like', '%Comment%');
            })
            ->count();

        $aiCount = $user->notifications()
            ->whereNull('read_at')
            ->where(function ($q) {
                $q->where('type', 'like', '%Automation%')
                    ->orWhere('type', 'like', '%Ai%');
            })
            ->count();

        $counts = [
            'all_unread' => $unreadNotificationsCount + $overdueTasksCount,
            'assigned' => $assignedTasksCount,
            'mentions' => $mentionsCount,
            'overdue' => $overdueTasksCount,
            'ai_insights' => $aiCount,
        ];

        // 2. Fetch Feed Items based on View
        $items = [];

        if ($view === 'assigned' || $view === 'overdue') {
            $taskQuery = Task::whereHas('project', fn ($q) => $q->where('organization_id', $organization->id))
                ->whereHas('assignees', fn ($q) => $q->where('users.id', $user->id))
                ->with(['project:id,name,key', 'status:id,name,category,color', 'creator:id,name,avatar'])
                ->orderBy('due_date');

            if ($view === 'overdue') {
                $taskQuery->whereHas('status', fn ($q) => $q->where('category', '!=', 'done'))
                    ->where('due_date', '<', now()->toDateString());
            } else {
                $taskQuery->whereHas('status', fn ($q) => $q->where('category', '!=', 'done'));
            }

            $tasks = $taskQuery->limit(30)->get();

            foreach ($tasks as $task) {
                $isOverdue = $task->due_date && $task->due_date < now()->toDateString();
                $items[] = [
                    'id' => 'task-'.$task->id,
                    'notification_id' => null,
                    'task_id' => $task->id,
                    'type' => $isOverdue ? 'overdue' : 'assignment',
                    'title' => $task->title,
                    'subtitle' => $task->description ? substr(strip_tags($task->description), 0, 100) : 'Tugas ditugaskan kepada Anda.',
                    'project_name' => $task->project->name,
                    'project_key' => $task->project->key,
                    'task_key' => $task->key ?? $task->project->key.'-'.$task->id,
                    'priority' => $task->priority,
                    'status_name' => $task->status->name,
                    'status_color' => $task->status->color,
                    'status_category' => $task->status->category,
                    'actor_name' => $task->creator?->name ?? 'Pimpinan Proyek',
                    'actor_avatar' => $task->creator?->avatar,
                    'due_date' => $task->due_date?->translatedFormat('d M Y'),
                    'is_overdue' => $isOverdue,
                    'is_read' => false,
                    'time_group' => $isOverdue ? 'overdue' : ($task->created_at?->isToday() ? 'today' : 'this_week'),
                    'created_at' => $task->created_at?->toIso8601String(),
                    'created_at_formatted' => $task->created_at?->translatedFormat('d M, H:i'),
                ];
            }
        } else {
            // Notifications Feed (All Unread, Mentions, AI, Archived)
            $notifQuery = $user->notifications()->orderByDesc('created_at');

            if ($view === 'archived') {
                $notifQuery->whereNotNull('read_at');
            } elseif ($view === 'mentions') {
                $notifQuery->where(function ($q) {
                    $q->where('type', 'like', '%Mention%')->orWhere('type', 'like', '%Comment%');
                });
            } elseif ($view === 'ai') {
                $notifQuery->where(function ($q) {
                    $q->where('type', 'like', '%Automation%')->orWhere('type', 'like', '%Ai%');
                });
            } else {
                // all_unread
                $notifQuery->whereNull('read_at')
                    ->where(function ($q) {
                        $q->whereNull('snoozed_until')->orWhere('snoozed_until', '<=', now());
                    });
            }

            $notifications = $notifQuery->limit(40)->get();

            foreach ($notifications as $notif) {
                $data = $notif->data;
                $createdAt = $notif->created_at;

                $timeGroup = 'earlier';
                if ($createdAt->isToday()) {
                    $timeGroup = 'today';
                } elseif ($createdAt->isCurrentWeek()) {
                    $timeGroup = 'this_week';
                }

                $items[] = [
                    'id' => $notif->id,
                    'notification_id' => $notif->id,
                    'task_id' => $data['task_id'] ?? null,
                    'type' => $data['type'] ?? 'notification',
                    'title' => $data['title'] ?? ($data['message'] ?? 'Pemberitahuan Sistem'),
                    'subtitle' => $data['summary'] ?? ($data['action_summary'] ?? ($data['body'] ?? '')),
                    'project_name' => $data['project_name'] ?? 'Workspace',
                    'project_key' => $data['project_key'] ?? 'PRJ',
                    'task_key' => $data['task_key'] ?? null,
                    'priority' => $data['priority'] ?? 'medium',
                    'status_name' => $data['status'] ?? 'Active',
                    'status_color' => 'blue',
                    'status_category' => 'inprogress',
                    'actor_name' => $data['actor_name'] ?? ($data['sender_name'] ?? 'Sistem Pandu'),
                    'actor_avatar' => $data['actor_avatar'] ?? null,
                    'due_date' => $data['due_date'] ?? null,
                    'is_overdue' => false,
                    'is_read' => $notif->read_at !== null,
                    'time_group' => $timeGroup,
                    'created_at' => $createdAt->toIso8601String(),
                    'created_at_formatted' => $createdAt->translatedFormat('d M, H:i'),
                ];
            }
        }

        return [
            'counts' => $counts,
            'items' => $items,
            'total_items' => count($items),
        ];
    }

    /**
     * Mark a single notification as read.
     */
    public function markAsRead(User $user, string $notificationId): void
    {
        $user->notifications()->where('id', $notificationId)->update(['read_at' => now()]);
    }

    /**
     * Mark all user notifications as read.
     */
    public function markAllAsRead(User $user): void
    {
        $user->unreadNotifications()->update(['read_at' => now()]);
    }

    /**
     * Snooze notification until a future time.
     */
    public function snoozeNotification(User $user, string $notificationId, string $duration = 'tomorrow'): void
    {
        $until = match ($duration) {
            '1hour' => now()->addHour(),
            '3hours' => now()->addHours(3),
            'next_week' => now()->addWeek()->startOfDay()->addHours(9),
            default => now()->addDay()->startOfDay()->addHours(9), // tomorrow 09:00
        };

        $user->notifications()->where('id', $notificationId)->update(['snoozed_until' => $until]);
    }

    /**
     * Quick complete a task from inbox item.
     *
     * @return array<string, mixed>
     */
    public function quickCompleteTask(User $user, Task $task): array
    {
        $workflowId = $task->status?->workflow_id ?? $task->project?->workflow?->id;

        $doneStatus = null;
        if ($workflowId) {
            $doneStatus = WorkflowStatus::where('workflow_id', $workflowId)
                ->where('category', 'done')
                ->first();
        }

        if (! $doneStatus && $task->project_id) {
            $doneStatus = WorkflowStatus::where('project_id', $task->project_id)
                ->where('category', 'done')
                ->first();
        }

        if (! $doneStatus) {
            $doneStatus = WorkflowStatus::where('category', 'done')->first();
        }

        if ($doneStatus) {
            $task->update(['status_id' => $doneStatus->id]);
        }

        return [
            'success' => true,
            'message' => "Tugas \"{$task->title}\" berhasil ditandai selesai.",
            'task' => $task->fresh(['status']),
        ];
    }
}
