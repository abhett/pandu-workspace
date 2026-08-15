<?php

namespace Database\Seeders;

use App\Models\ProjectTemplate;
use Illuminate\Database\Seeder;

class ProjectTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $templates = [
            [
                'name' => 'Scrum Software Development',
                'slug' => 'scrum',
                'category' => 'software',
                'description' => 'Metodologi berbasis sprint berulang, backlog refinement, estimasi poin, dan peninjauan berkala.',
                'icon' => 'Layers',
                'color' => '#6366f1',
                'is_system' => true,
                'workflow_config' => [
                    ['name' => 'Backlog', 'slug' => 'backlog', 'category' => 'unstarted', 'color' => '#64748b', 'position' => 0, 'wip_limit' => null],
                    ['name' => 'Ready for Sprint', 'slug' => 'ready-for-sprint', 'category' => 'unstarted', 'color' => '#0ea5e9', 'position' => 1, 'wip_limit' => null],
                    ['name' => 'In Development', 'slug' => 'in-development', 'category' => 'started', 'color' => '#3b82f6', 'position' => 2, 'wip_limit' => 5],
                    ['name' => 'Code Review', 'slug' => 'code-review', 'category' => 'started', 'color' => '#8b5cf6', 'position' => 3, 'wip_limit' => 3],
                    ['name' => 'Testing & QA', 'slug' => 'testing-qa', 'category' => 'started', 'color' => '#f59e0b', 'position' => 4, 'wip_limit' => 3],
                    ['name' => 'Done', 'slug' => 'done', 'category' => 'completed', 'color' => '#10b981', 'position' => 5, 'wip_limit' => null],
                ],
                'default_views' => ['board', 'backlog', 'list', 'summary'],
            ],
            [
                'name' => 'Kanban Board & Continuous Flow',
                'slug' => 'kanban',
                'category' => 'operations',
                'description' => 'Alur kerja visual berkelanjutan dengan kontrol batas WIP (Work in Progress) dan lead-time optimal.',
                'icon' => 'FolderKanban',
                'color' => '#0ea5e9',
                'is_system' => true,
                'workflow_config' => [
                    ['name' => 'Backlog', 'slug' => 'backlog', 'category' => 'unstarted', 'color' => '#64748b', 'position' => 0, 'wip_limit' => null],
                    ['name' => 'To Do', 'slug' => 'to-do', 'category' => 'unstarted', 'color' => '#38bdf8', 'position' => 1, 'wip_limit' => null],
                    ['name' => 'In Progress', 'slug' => 'in-progress', 'category' => 'started', 'color' => '#3b82f6', 'position' => 2, 'wip_limit' => 4],
                    ['name' => 'Review', 'slug' => 'review', 'category' => 'started', 'color' => '#8b5cf6', 'position' => 3, 'wip_limit' => 2],
                    ['name' => 'Done', 'slug' => 'done', 'category' => 'completed', 'color' => '#10b981', 'position' => 4, 'wip_limit' => null],
                ],
                'default_views' => ['board', 'list', 'summary'],
            ],
            [
                'name' => 'Bug & Issue Tracking',
                'slug' => 'bug_tracking',
                'category' => 'software',
                'description' => 'Pelacakan defek, investigasi regresi, pengujian verifikasi, dan manajemen rilis perbaikan.',
                'icon' => 'Bug',
                'color' => '#f43f5e',
                'is_system' => true,
                'workflow_config' => [
                    ['name' => 'Reported', 'slug' => 'reported', 'category' => 'unstarted', 'color' => '#ef4444', 'position' => 0, 'wip_limit' => null],
                    ['name' => 'Triage & Confirmed', 'slug' => 'confirmed', 'category' => 'unstarted', 'color' => '#f97316', 'position' => 1, 'wip_limit' => null],
                    ['name' => 'Fixing in Progress', 'slug' => 'fixing', 'category' => 'started', 'color' => '#3b82f6', 'position' => 2, 'wip_limit' => 4],
                    ['name' => 'Verifying', 'slug' => 'verifying', 'category' => 'started', 'color' => '#8b5cf6', 'position' => 3, 'wip_limit' => 3],
                    ['name' => 'Resolved', 'slug' => 'resolved', 'category' => 'completed', 'color' => '#10b981', 'position' => 4, 'wip_limit' => null],
                ],
                'default_views' => ['list', 'board', 'summary'],
            ],
            [
                'name' => 'General Task & Work Management',
                'slug' => 'general',
                'category' => 'general',
                'description' => 'Manajemen tugas umum tim lintas departemen, operasional bisnis, dan penugasan harian.',
                'icon' => 'CheckCircle2',
                'color' => '#10b981',
                'is_system' => true,
                'workflow_config' => [
                    ['name' => 'To Do', 'slug' => 'to-do', 'category' => 'unstarted', 'color' => '#64748b', 'position' => 0, 'wip_limit' => null],
                    ['name' => 'In Progress', 'slug' => 'in-progress', 'category' => 'started', 'color' => '#3b82f6', 'position' => 1, 'wip_limit' => 6],
                    ['name' => 'Blocked', 'slug' => 'blocked', 'category' => 'started', 'color' => '#ef4444', 'position' => 2, 'wip_limit' => null],
                    ['name' => 'Done', 'slug' => 'done', 'category' => 'completed', 'color' => '#10b981', 'position' => 3, 'wip_limit' => null],
                ],
                'default_views' => ['board', 'list', 'summary'],
            ],
        ];

        foreach ($templates as $data) {
            ProjectTemplate::updateOrCreate(
                ['slug' => $data['slug']],
                $data
            );
        }
    }
}
