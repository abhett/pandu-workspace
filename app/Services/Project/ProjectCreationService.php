<?php

namespace App\Services\Project;

use App\Models\Organization;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\ProjectTemplate;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class ProjectCreationService
{
    /**
     * Create a new project with its workflow and initial members.
     *
     * @param  array{
     *     name: string,
     *     key?: string|null,
     *     description?: string|null,
     *     template_id?: string|null,
     *     type?: string|null,
     *     color?: string|null,
     *     icon?: string|null,
     *     lead_user_id?: int|null,
     *     default_assignee_id?: int|null
     * }  $data
     */
    public function create(Organization $organization, User $creator, array $data): Project
    {
        return DB::transaction(function () use ($organization, $creator, $data) {
            $name = trim($data['name']);

            // 1. Generate or format Project Key (e.g., "Pandu Platform" -> "PP" or "KNT")
            $key = ! empty($data['key'])
                ? strtoupper(trim($data['key']))
                : $this->generateUniqueKey($organization, $name);

            // Ensure key is alphanumeric and max 10 chars
            $key = preg_replace('/[^A-Z0-9]/', '', $key) ?: 'PRJ';
            $key = substr($key, 0, 10);

            // Check key uniqueness within organization
            if (Project::where('organization_id', $organization->id)->where('key', $key)->exists()) {
                throw new InvalidArgumentException("Project key '{$key}' sudah digunakan dalam organisasi ini.");
            }

            // 2. Generate slug
            $slug = Str::slug($name);
            $existingSlugCount = Project::where('organization_id', $organization->id)->where('slug', $slug)->count();
            if ($existingSlugCount > 0) {
                $slug = $slug.'-'.Str::lower(Str::random(4));
            }

            // 3. Find Template
            $template = null;
            if (! empty($data['template_id'])) {
                $template = ProjectTemplate::find($data['template_id']);
            }

            if (! $template) {
                $type = $data['type'] ?? 'kanban';
                $template = ProjectTemplate::where('slug', $type)->first()
                    ?? ProjectTemplate::where('slug', 'kanban')->first();
            }

            $type = $data['type'] ?? $template?->slug ?? 'kanban';
            $color = $data['color'] ?? $template?->color ?? '#3b82f6';
            $icon = $data['icon'] ?? $template?->icon ?? 'FolderKanban';
            $leadUserId = ! empty($data['lead_user_id']) ? (int) $data['lead_user_id'] : $creator->id;

            // 4. Create Project
            $project = Project::create([
                'organization_id' => $organization->id,
                'name' => $name,
                'key' => $key,
                'slug' => $slug,
                'description' => $data['description'] ?? null,
                'type' => $type,
                'color' => $color,
                'icon' => $icon,
                'lead_user_id' => $leadUserId,
                'default_assignee_id' => $data['default_assignee_id'] ?? null,
                'status' => 'active',
                'settings' => [
                    'default_views' => $template?->default_views ?? ['board', 'list', 'summary'],
                ],
            ]);

            // 5. Create Workflow & Duplicate Template Statuses
            $workflow = Workflow::create([
                'organization_id' => $organization->id,
                'project_id' => $project->id,
                'name' => $project->name.' Workflow',
                'description' => 'Default workflow for '.$project->name,
                'is_default' => true,
            ]);

            $statusesConfig = $template?->workflow_config ?? $this->defaultWorkflowConfig($type);

            foreach ($statusesConfig as $index => $statusData) {
                WorkflowStatus::create([
                    'workflow_id' => $workflow->id,
                    'project_id' => $project->id,
                    'name' => $statusData['name'],
                    'slug' => $statusData['slug'] ?? Str::slug($statusData['name']),
                    'category' => $statusData['category'] ?? 'started',
                    'color' => $statusData['color'] ?? '#3b82f6',
                    'position' => $statusData['position'] ?? $index,
                    'is_initial' => $statusData['is_initial'] ?? ($index === 0),
                    'is_completed' => $statusData['is_completed'] ?? ($index === count($statusesConfig) - 1),
                    'wip_limit' => $statusData['wip_limit'] ?? null,
                ]);
            }

            // 6. Assign Members (Creator & Lead)
            ProjectMember::create([
                'project_id' => $project->id,
                'user_id' => $creator->id,
                'role' => 'lead',
                'joined_at' => now(),
            ]);

            if ($leadUserId !== $creator->id) {
                ProjectMember::firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'user_id' => $leadUserId,
                    ],
                    [
                        'role' => 'lead',
                        'joined_at' => now(),
                    ]
                );
            }

            return $project->load(['lead', 'workflow.statuses', 'members']);
        });
    }

    /**
     * Auto-generate a unique project key candidate from name.
     */
    protected function generateUniqueKey(Organization $organization, string $name): string
    {
        $words = preg_split('/\s+/', trim($name));
        $key = '';

        if (count($words) >= 2) {
            foreach (array_slice($words, 0, 4) as $w) {
                $key .= mb_substr($w, 0, 1);
            }
        } else {
            $cleaned = preg_replace('/[^A-Za-z0-9]/', '', $name);
            $key = mb_substr($cleaned, 0, 4);
        }

        $key = strtoupper($key);
        if (strlen($key) < 2) {
            $key = strtoupper(Str::random(3));
        }

        // Ensure key uniqueness in organization
        $candidate = $key;
        $counter = 1;
        while (Project::where('organization_id', $organization->id)->where('key', $candidate)->exists()) {
            $candidate = substr($key, 0, 3).$counter;
            $counter++;
        }

        return $candidate;
    }

    /**
     * Fallback workflow configuration if template has none.
     *
     * @return array<int, array{name: string, slug: string, category: string, color: string, position: int, is_initial?: bool, is_completed?: bool, wip_limit?: int|null}>
     */
    protected function defaultWorkflowConfig(string $type): array
    {
        if ($type === 'scrum') {
            return [
                ['name' => 'Backlog', 'slug' => 'backlog', 'category' => 'unstarted', 'color' => '#64748b', 'position' => 0, 'is_initial' => true, 'is_completed' => false, 'wip_limit' => null],
                ['name' => 'Ready for Dev', 'slug' => 'ready', 'category' => 'unstarted', 'color' => '#0ea5e9', 'position' => 1, 'is_initial' => false, 'is_completed' => false, 'wip_limit' => null],
                ['name' => 'In Development', 'slug' => 'in-dev', 'category' => 'started', 'color' => '#3b82f6', 'position' => 2, 'is_initial' => false, 'is_completed' => false, 'wip_limit' => 5],
                ['name' => 'Code Review', 'slug' => 'review', 'category' => 'started', 'color' => '#8b5cf6', 'position' => 3, 'is_initial' => false, 'is_completed' => false, 'wip_limit' => 3],
                ['name' => 'Testing & QA', 'slug' => 'qa', 'category' => 'started', 'color' => '#f59e0b', 'position' => 4, 'is_initial' => false, 'is_completed' => false, 'wip_limit' => 3],
                ['name' => 'Done', 'slug' => 'done', 'category' => 'completed', 'color' => '#10b981', 'position' => 5, 'is_initial' => false, 'is_completed' => true, 'wip_limit' => null],
            ];
        }

        if ($type === 'bug_tracking') {
            return [
                ['name' => 'Reported', 'slug' => 'reported', 'category' => 'unstarted', 'color' => '#ef4444', 'position' => 0, 'is_initial' => true, 'is_completed' => false, 'wip_limit' => null],
                ['name' => 'Confirmed', 'slug' => 'confirmed', 'category' => 'unstarted', 'color' => '#f97316', 'position' => 1, 'is_initial' => false, 'is_completed' => false, 'wip_limit' => null],
                ['name' => 'Fixing', 'slug' => 'fixing', 'category' => 'started', 'color' => '#3b82f6', 'position' => 2, 'is_initial' => false, 'is_completed' => false, 'wip_limit' => 4],
                ['name' => 'Verifying', 'slug' => 'verifying', 'category' => 'started', 'color' => '#8b5cf6', 'position' => 3, 'is_initial' => false, 'is_completed' => false, 'wip_limit' => 3],
                ['name' => 'Resolved', 'slug' => 'resolved', 'category' => 'completed', 'color' => '#10b981', 'position' => 4, 'is_initial' => false, 'is_completed' => true, 'wip_limit' => null],
            ];
        }

        // Kanban / General default
        return [
            ['name' => 'Backlog', 'slug' => 'backlog', 'category' => 'unstarted', 'color' => '#64748b', 'position' => 0, 'is_initial' => true, 'is_completed' => false, 'wip_limit' => null],
            ['name' => 'To Do', 'slug' => 'todo', 'category' => 'unstarted', 'color' => '#0ea5e9', 'position' => 1, 'is_initial' => false, 'is_completed' => false, 'wip_limit' => null],
            ['name' => 'In Progress', 'slug' => 'in-progress', 'category' => 'started', 'color' => '#3b82f6', 'position' => 2, 'is_initial' => false, 'is_completed' => false, 'wip_limit' => 4],
            ['name' => 'Review', 'slug' => 'review', 'category' => 'started', 'color' => '#8b5cf6', 'position' => 3, 'is_initial' => false, 'is_completed' => false, 'wip_limit' => 3],
            ['name' => 'Done', 'slug' => 'done', 'category' => 'completed', 'color' => '#10b981', 'position' => 4, 'is_initial' => false, 'is_completed' => true, 'wip_limit' => null],
        ];
    }
}
