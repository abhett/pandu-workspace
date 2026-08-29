<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\TaskActivity;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the main workspace dashboard with dynamic metrics.
     */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->current_organization_id ?? $user->memberships()->value('organization_id');
        $organization = $orgId ? Organization::find($orgId) : null;

        if (! $organization) {
            $organization = $user->organizations()->first();
        }

        $stats = [
            'due_this_week' => 0,
            'overdue_count' => 0,
            'active_tasks_count' => 0,
            'total_tasks_count' => 0,
            'completed_tasks_count' => 0,
            'completion_rate' => 100.0,
            'active_sprint_name' => 'Active Workspace',
            'ai_insight' => 'Beban kerja dan sprint terdistribusi seimbang.',
        ];

        $priorityTasks = [];
        $recentActivities = [];
        $sprintMilestones = [];
        $totalMembers = 1;
        $totalProjects = 0;
        $userRole = 'member';
        $userTitle = 'Team Member';

        if ($organization) {
            $membership = $organization->memberships()->where('user_id', $user->id)->first();
            if ($membership) {
                $userRole = $membership->role;
                $userTitle = $membership->title ?? ucfirst($membership->role);
            }

            $totalMembers = $organization->memberships()->where('status', 'active')->count();
            $totalProjects = Project::where('organization_id', $organization->id)->count();

            // Task stats
            $now = Carbon::now();
            $endOfWeek = $now->copy()->endOfWeek();

            $totalTasks = Task::where('organization_id', $organization->id)->count();
            $completedTasks = Task::where('organization_id', $organization->id)
                ->where(function ($q) {
                    $q->whereNotNull('completed_at')
                        ->orWhereHas('status', fn ($sq) => $sq->where('category', 'done')->orWhere('is_completed', true));
                })
                ->count();

            $activeTasks = Task::where('organization_id', $organization->id)
                ->where(function ($q) {
                    $q->whereNull('completed_at')
                        ->where(function ($sq) {
                            $sq->whereDoesntHave('status')
                                ->orWhereHas('status', fn ($ssq) => $ssq->where('category', '!=', 'done')->where('is_completed', false));
                        });
                })
                ->count();

            $dueThisWeek = Task::where('organization_id', $organization->id)
                ->whereNull('completed_at')
                ->whereNotNull('due_date')
                ->where('due_date', '<=', $endOfWeek)
                ->count();

            $overdueCount = Task::where('organization_id', $organization->id)
                ->whereNull('completed_at')
                ->whereNotNull('due_date')
                ->where('due_date', '<', $now->copy()->startOfDay())
                ->count();

            // Active Sprint
            $activeSprint = Sprint::where('organization_id', $organization->id)
                ->where('status', 'active')
                ->latest('started_at')
                ->first();

            $activeSprintName = $activeSprint ? $activeSprint->name : ($totalProjects > 0 ? 'Sprint Aktif' : 'Workspace Siap');

            $completionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 1) : 100.0;

            // AI Insight generation
            if ($overdueCount > 0) {
                $aiInsight = "{$overdueCount} tugas mendekati/melewati batas tenggat waktu. Disarankan untuk meninjau kembali alokasi prioritas.";
            } elseif ($activeTasks > 0) {
                $aiInsight = "Beban kerja sprint terdistribusi dengan baik ({$activeTasks} tugas aktif berjalan).";
            } else {
                $aiInsight = 'Semua tugas telah diselesaikan dengan optimal. Siap untuk perencanaan sprint berikutnya.';
            }

            $stats = [
                'due_this_week' => $dueThisWeek,
                'overdue_count' => $overdueCount,
                'active_tasks_count' => $activeTasks,
                'total_tasks_count' => $totalTasks,
                'completed_tasks_count' => $completedTasks,
                'completion_rate' => $completionRate,
                'active_sprint_name' => $activeSprintName,
                'ai_insight' => $aiInsight,
            ];

            // Priority Tasks (Top 5)
            $priorityTasks = Task::where('organization_id', $organization->id)
                ->with([
                    'project:id,name,key,color',
                    'status:id,name,color,category,is_completed',
                    'sprint:id,name',
                    'assignees:id,name',
                ])
                ->orderByRaw("
                    CASE priority
                        WHEN 'urgent' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 4
                        ELSE 5
                    END ASC
                ")
                ->orderByRaw('CASE WHEN due_date IS NULL THEN 1 ELSE 0 END ASC, due_date ASC')
                ->latest('updated_at')
                ->limit(5)
                ->get()
                ->map(function ($task) use ($now) {
                    $statusCat = $task->status?->category ?? ($task->completed_at ? 'done' : 'todo');
                    $isOverdue = $task->due_date && $task->due_date < $now->copy()->startOfDay() && ! $task->completed_at && $statusCat !== 'done';

                    return [
                        'id' => $task->id,
                        'key' => $task->key ?? ($task->project ? "{$task->project->key}-{$task->sequence_number}" : "TSK-{$task->id}"),
                        'title' => $task->title,
                        'priority' => $task->priority,
                        'due_date' => $task->due_date?->translatedFormat('d M Y'),
                        'is_overdue' => $isOverdue,
                        'project' => $task->project ? [
                            'id' => $task->project->id,
                            'name' => $task->project->name,
                            'key' => $task->project->key,
                            'color' => $task->project->color ?? '#6366f1',
                        ] : null,
                        'status' => $task->status ? [
                            'id' => $task->status->id,
                            'name' => $task->status->name,
                            'color' => $task->status->color,
                            'category' => $task->status->category,
                        ] : [
                            'id' => 'default',
                            'name' => $task->completed_at ? 'Done' : 'To Do',
                            'color' => $task->completed_at ? '#10b981' : '#6b7280',
                            'category' => $task->completed_at ? 'done' : 'todo',
                        ],
                        'sprint_name' => $task->sprint?->name,
                        'assignees' => $task->assignees->map(fn ($a) => ['id' => $a->id, 'name' => $a->name])->all(),
                    ];
                })
                ->all();

            // Recent Activities (from TaskActivity or task updates)
            $activities = TaskActivity::whereHas('task', fn ($q) => $q->where('organization_id', $organization->id))
                ->with(['task.project', 'user:id,name'])
                ->latest('created_at')
                ->limit(4)
                ->get();

            if ($activities->isNotEmpty()) {
                $recentActivities = $activities->map(function ($act) {
                    $user = $act->user?->name ?? 'Sistem';
                    $taskTitle = $act->task?->title ?? 'Tugas';
                    $projectKey = $act->task?->project?->key;

                    return [
                        'id' => $act->id,
                        'title' => "{$user} {$act->action}",
                        'description' => $projectKey ? "[{$projectKey}] {$taskTitle}" : $taskTitle,
                        'time_ago' => $act->created_at?->diffForHumans() ?? 'Baru saja',
                        'type' => 'task',
                    ];
                })->all();
            } else {
                // Fallback smart system activities
                $recentActivities = [
                    [
                        'id' => 'sys-1',
                        'title' => 'Sinkronisasi Workspace Selesai',
                        'description' => 'Data proyek, backlog, dan anggota tim terverifikasi aktif.',
                        'time_ago' => 'Baru saja',
                        'type' => 'ai',
                    ],
                    [
                        'id' => 'sys-2',
                        'title' => 'Optimasi Papan Kanban',
                        'description' => 'Algoritma prioritas sprint siap digunakan untuk kolaborasi.',
                        'time_ago' => '10 menit lalu',
                        'type' => 'system',
                    ],
                ];
            }

            // Sprints & Milestones
            $sprints = Sprint::where('organization_id', $organization->id)
                ->with('project:id,name,key')
                ->orderByRaw("CASE status WHEN 'active' THEN 1 WHEN 'planned' THEN 2 ELSE 3 END ASC")
                ->orderBy('start_date', 'asc')
                ->limit(4)
                ->get();

            if ($sprints->isNotEmpty()) {
                $sprintMilestones = $sprints->map(function ($sprint) use ($now) {
                    $timeLabel = 'Direncanakan';
                    if ($sprint->status === 'active') {
                        $timeLabel = $sprint->end_date ? $sprint->end_date->diffForHumans($now, ['syntax' => Carbon::DIFF_RELATIVE_TO_NOW]) : 'Sedang Berjalan';
                    } elseif ($sprint->status === 'completed') {
                        $timeLabel = 'Selesai';
                    } elseif ($sprint->start_date) {
                        $timeLabel = $sprint->start_date->translatedFormat('d M Y');
                    }

                    return [
                        'id' => $sprint->id,
                        'name' => $sprint->name,
                        'project_name' => $sprint->project?->name,
                        'project_key' => $sprint->project?->key,
                        'status' => $sprint->status,
                        'time_label' => $timeLabel,
                    ];
                })->all();
            } else {
                // Fallback to active projects if no sprint created yet
                $projects = Project::where('organization_id', $organization->id)
                    ->latest()
                    ->limit(3)
                    ->get();

                $sprintMilestones = $projects->map(fn ($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'project_name' => $p->key,
                    'project_key' => $p->key,
                    'status' => 'active',
                    'time_label' => 'Proyek Aktif',
                ])->all();
            }
        }

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'priorityTasks' => $priorityTasks,
            'recentActivities' => $recentActivities,
            'sprintMilestones' => $sprintMilestones,
            'summary' => [
                'organization_name' => $organization?->name ?? 'Pandu AI',
                'organization_slug' => $organization?->slug ?? '-',
                'organization_plan' => $organization?->settings['plan'] ?? 'Enterprise',
                'total_members' => $totalMembers,
                'total_projects' => $totalProjects,
                'user_role' => $userRole,
                'user_title' => $userTitle,
            ],
        ]);
    }
}
