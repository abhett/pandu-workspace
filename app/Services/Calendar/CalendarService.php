<?php

namespace App\Services\Calendar;

use App\Models\Organization;
use App\Models\Project;
use App\Models\Sprint;
use App\Models\Task;
use Illuminate\Support\Carbon;

class CalendarService
{
    /**
     * Get monthly calendar grid data with tasks, sprint spans, and summary counts.
     *
     * @return array<string, mixed>
     */
    public function getMonthViewData(
        Organization $organization,
        ?Project $project = null,
        ?int $year = null,
        ?int $month = null,
        ?int $assigneeId = null
    ): array {
        $now = now();
        $targetYear = $year ?? (int) $now->year;
        $targetMonth = $month ?? (int) $now->month;

        $targetDate = Carbon::createFromDate($targetYear, $targetMonth, 1)->startOfDay();
        $startOfMonth = $targetDate->copy()->startOfMonth();
        $endOfMonth = $targetDate->copy()->endOfMonth();

        // 42-day calendar grid starting Sunday
        $gridStart = $startOfMonth->copy()->startOfWeek(Carbon::SUNDAY);
        $gridEnd = $gridStart->copy()->addDays(41)->endOfDay();

        // Query Tasks
        $taskQuery = Task::where('organization_id', $organization->id)
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [$gridStart->toDateString(), $gridEnd->toDateString()])
            ->with(['project', 'status', 'assignees']);

        if ($project) {
            $taskQuery->where('project_id', $project->id);
        }

        if ($assigneeId) {
            $taskQuery->whereHas('assignees', function ($q) use ($assigneeId) {
                $q->where('users.id', $assigneeId);
            });
        }

        $tasks = $taskQuery->orderBy('due_date')->get();

        // Query Sprints overlapping the calendar range
        $sprintQuery = Sprint::where('organization_id', $organization->id)
            ->whereNotNull('start_date')
            ->whereNotNull('end_date')
            ->where(function ($q) use ($gridStart, $gridEnd) {
                $q->whereBetween('start_date', [$gridStart->toDateString(), $gridEnd->toDateString()])
                    ->orWhereBetween('end_date', [$gridStart->toDateString(), $gridEnd->toDateString()])
                    ->orWhere(function ($sub) use ($gridStart, $gridEnd) {
                        $sub->where('start_date', '<=', $gridStart->toDateString())
                            ->where('end_date', '>=', $gridEnd->toDateString());
                    });
            })
            ->with('project');

        if ($project) {
            $sprintQuery->where('project_id', $project->id);
        }

        $sprints = $sprintQuery->get();

        // Build 42 calendar day cells
        $days = [];
        $cursor = $gridStart->copy();
        $todayStr = now()->toDateString();

        $monthTasksCount = 0;
        $completedTasksCount = 0;
        $overdueTasksCount = 0;

        for ($i = 0; $i < 42; $i++) {
            $dateStr = $cursor->toDateString();
            $isCurrentMonth = $cursor->month === $targetMonth;
            $isToday = $dateStr === $todayStr;

            // Find tasks due on this date
            $dayTasks = $tasks->filter(function ($t) use ($dateStr) {
                return $t->due_date && Carbon::parse($t->due_date)->toDateString() === $dateStr;
            })->map(function ($t) use ($todayStr) {
                $isCompleted = $t->status?->category === 'done' || $t->completed_at !== null;
                $isPastDue = ! $isCompleted && $t->due_date && Carbon::parse($t->due_date)->toDateString() < $todayStr;

                return [
                    'id' => $t->id,
                    'key' => $t->key,
                    'title' => $t->title,
                    'project_id' => $t->project_id,
                    'project_name' => $t->project?->name,
                    'project_key' => $t->project?->key,
                    'priority' => $t->priority,
                    'is_milestone' => (bool) $t->is_milestone,
                    'status_name' => $t->status?->name ?? 'To Do',
                    'status_category' => $t->status?->category ?? 'todo',
                    'is_completed' => $isCompleted,
                    'is_past_due' => $isPastDue,
                    'due_date' => $t->due_date ? Carbon::parse($t->due_date)->toDateString() : null,
                    'assignee' => $t->assignees->first()?->name,
                    'assignee_avatar' => $t->assignees->first()?->avatar,
                ];
            })->values()->all();

            if ($isCurrentMonth) {
                $monthTasksCount += count($dayTasks);
                foreach ($dayTasks as $dt) {
                    if ($dt['is_completed']) {
                        $completedTasksCount++;
                    } elseif ($dt['is_past_due']) {
                        $overdueTasksCount++;
                    }
                }
            }

            // Find sprints active on this date
            $daySprints = $sprints->filter(function ($s) use ($dateStr) {
                $start = Carbon::parse($s->start_date)->toDateString();
                $end = Carbon::parse($s->end_date)->toDateString();

                return $dateStr >= $start && $dateStr <= $end;
            })->map(function ($s) use ($dateStr) {
                $start = Carbon::parse($s->start_date)->toDateString();
                $end = Carbon::parse($s->end_date)->toDateString();

                return [
                    'id' => $s->id,
                    'name' => $s->name,
                    'project_name' => $s->project?->name,
                    'is_start' => $dateStr === $start,
                    'is_end' => $dateStr === $end,
                ];
            })->values()->all();

            $days[] = [
                'date' => $dateStr,
                'day_number' => (int) $cursor->day,
                'day_name' => $cursor->format('D'),
                'is_current_month' => $isCurrentMonth,
                'is_today' => $isToday,
                'tasks' => $dayTasks,
                'sprints' => $daySprints,
            ];

            $cursor = $cursor->copy()->addDay();
        }

        // Available projects for filtering
        $availableProjects = Project::where('organization_id', $organization->id)
            ->select(['id', 'name', 'key', 'type'])
            ->get();

        return [
            'year' => $targetYear,
            'month' => $targetMonth,
            'month_name' => $targetDate->translatedFormat('F Y'),
            'prev_month' => [
                'year' => $targetDate->copy()->subMonth()->year,
                'month' => $targetDate->copy()->subMonth()->month,
            ],
            'next_month' => [
                'year' => $targetDate->copy()->addMonth()->year,
                'month' => $targetDate->copy()->addMonth()->month,
            ],
            'today' => $todayStr,
            'summary' => [
                'total_tasks' => $monthTasksCount,
                'completed_tasks' => $completedTasksCount,
                'overdue_tasks' => $overdueTasksCount,
            ],
            'days' => $days,
            'project' => $project ? [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
            ] : null,
            'available_projects' => $availableProjects,
        ];
    }

    /**
     * Update task due date from calendar.
     */
    public function updateTaskDueDate(Task $task, ?string $dueDate): Task
    {
        $task->update([
            'due_date' => $dueDate,
        ]);

        return $task->fresh();
    }
}
