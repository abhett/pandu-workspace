<?php

namespace App\Services\Okr;

use App\Models\OkrKeyResult;
use App\Models\OkrObjective;
use App\Models\Organization;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Collection;

class OkrAlignmentTreeService
{
    /**
     * Get multi-tier OKR alignment tree hierarchy, progress roll-up, and alignment metrics.
     *
     * @return array<string, mixed>
     */
    public function getOkrTreeData(Organization $organization, ?string $period = null): array
    {
        $query = OkrObjective::where('organization_id', $organization->id);

        if ($period && $period !== 'all') {
            $query->where('period', $period);
        }

        $allObjectives = $query->with([
            'owner:id,name,email',
            'project:id,key,name',
            'keyResults.owner:id,name,email',
            'keyResults.linkedTasks.status:id,name,category',
            'keyResults.linkedTasks.project:id,key,name',
        ])
            ->orderBy('created_at')
            ->get();

        // Calculate progress for each objective & key result
        $formattedObjectives = $allObjectives->map(function (OkrObjective $obj) {
            return $this->formatObjectiveNode($obj);
        })->keyBy('id');

        // Build hierarchical tree (top-level nodes where parent_id is null or parent not in current list)
        $treeNodes = [];
        foreach ($formattedObjectives as $objNode) {
            if (empty($objNode['parent_id']) || ! $formattedObjectives->has($objNode['parent_id'])) {
                $treeNodes[] = $this->buildRecursiveTree($objNode, $formattedObjectives);
            }
        }

        // Available periods in organization
        $periods = OkrObjective::where('organization_id', $organization->id)
            ->distinct()
            ->pluck('period')
            ->values()
            ->all();

        if (empty($periods)) {
            $periods = ['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4', '2026-Annual'];
        }

        // Summary KPI Metrics
        $totalObjectives = $formattedObjectives->count();
        $avgProgress = $totalObjectives > 0
            ? round($formattedObjectives->avg('progress_pct'), 1)
            : 0.0;

        $onTrackCount = $formattedObjectives->where('status', 'on_track')->count();
        $atRiskCount = $formattedObjectives->where('status', 'at_risk')->count();
        $behindCount = $formattedObjectives->where('status', 'behind')->count();
        $achievedCount = $formattedObjectives->where('status', 'achieved')->count();

        $totalKeyResults = $formattedObjectives->sum(fn ($o) => count($o['key_results']));

        // Projects and Members in Organization for dialog forms
        $projects = Project::where('organization_id', $organization->id)
            ->select(['id', 'key', 'name'])
            ->orderBy('name')
            ->get();

        $members = User::whereIn('id', $organization->memberships()->pluck('user_id'))
            ->select(['id', 'name', 'email'])
            ->orderBy('name')
            ->get();

        return [
            'metrics' => [
                'total_objectives' => $totalObjectives,
                'avg_progress_pct' => $avgProgress,
                'on_track_count' => $onTrackCount,
                'at_risk_count' => $atRiskCount,
                'behind_count' => $behindCount,
                'achieved_count' => $achievedCount,
                'total_key_results' => $totalKeyResults,
                'alignment_score' => $avgProgress,
            ],
            'tree' => $treeNodes,
            'flat_objectives' => $formattedObjectives->values()->all(),
            'periods' => $periods,
            'current_period' => $period ?? ($periods[0] ?? '2026-Q1'),
            'projects' => $projects,
            'members' => $members,
        ];
    }

    /**
     * Format an Objective node with roll-up calculation.
     *
     * @return array<string, mixed>
     */
    protected function formatObjectiveNode(OkrObjective $obj): array
    {
        $krs = $obj->keyResults->map(function (OkrKeyResult $kr) {
            $range = $kr->target_value - $kr->initial_value;
            $progressPct = $range != 0
                ? max(0.0, min(100.0, round((($kr->current_value - $kr->initial_value) / $range) * 100, 1)))
                : ($kr->current_value >= $kr->target_value ? 100.0 : 0.0);

            $linkedTasks = $kr->linkedTasks->map(fn (Task $t) => [
                'id' => $t->id,
                'key' => $t->key,
                'title' => $t->title,
                'priority' => $t->priority,
                'is_completed' => $t->status?->category === 'done' || $t->completed_at !== null,
                'status_name' => $t->status?->name ?? 'Open',
                'status_color' => $t->status?->color ?? '#64748b',
                'project_key' => $t->project?->key,
            ]);

            $completedTasksCount = $linkedTasks->where('is_completed', true)->count();
            $tasksCompletionPct = $linkedTasks->count() > 0
                ? round(($completedTasksCount / $linkedTasks->count()) * 100, 1)
                : 0.0;

            return [
                'id' => $kr->id,
                'objective_id' => $kr->objective_id,
                'title' => $kr->title,
                'metric_type' => $kr->metric_type,
                'initial_value' => (float) $kr->initial_value,
                'current_value' => (float) $kr->current_value,
                'target_value' => (float) $kr->target_value,
                'unit' => $kr->unit,
                'weight' => (float) $kr->weight,
                'status' => $kr->status,
                'progress_pct' => $progressPct,
                'owner' => $kr->owner ? ['id' => $kr->owner->id, 'name' => $kr->owner->name] : null,
                'linked_tasks' => $linkedTasks->values()->all(),
                'linked_tasks_count' => $linkedTasks->count(),
                'tasks_completion_pct' => $tasksCompletionPct,
            ];
        });

        $krProgressAvg = $krs->count() > 0
            ? round($krs->avg('progress_pct'), 1)
            : 0.0;

        $status = $obj->status;
        if ($krProgressAvg >= 100.0) {
            $status = 'achieved';
        } elseif ($krProgressAvg >= 70.0) {
            $status = 'on_track';
        } elseif ($krProgressAvg >= 40.0) {
            $status = 'at_risk';
        } elseif ($krProgressAvg > 0.0) {
            $status = 'behind';
        }

        return [
            'id' => $obj->id,
            'parent_id' => $obj->parent_id,
            'project_id' => $obj->project_id,
            'title' => $obj->title,
            'description' => $obj->description,
            'level' => $obj->level,
            'period' => $obj->period,
            'status' => $status,
            'confidence_score' => (float) $obj->confidence_score,
            'progress_pct' => $krProgressAvg,
            'owner' => $obj->owner ? ['id' => $obj->owner->id, 'name' => $obj->owner->name] : null,
            'project' => $obj->project ? ['id' => $obj->project->id, 'key' => $obj->project->key, 'name' => $obj->project->name] : null,
            'key_results' => $krs->values()->all(),
            'children' => [],
        ];
    }

    /**
     * Recursively attach child nodes in the tree hierarchy.
     *
     * @param  array<string, mixed>  $node
     * @param  Collection<string, array<string, mixed>>  $allNodes
     * @return array<string, mixed>
     */
    protected function buildRecursiveTree(array $node, Collection $allNodes): array
    {
        $children = $allNodes->where('parent_id', $node['id'])->values();
        $builtChildren = [];

        foreach ($children as $child) {
            $builtChildren[] = $this->buildRecursiveTree($child, $allNodes);
        }

        $node['children'] = $builtChildren;

        // If node has children and no direct KRs, its progress is the average of its children
        if (empty($node['key_results']) && count($builtChildren) > 0) {
            $childrenAvg = round(collect($builtChildren)->avg('progress_pct'), 1);
            $node['progress_pct'] = $childrenAvg;
            if ($childrenAvg >= 100.0) {
                $node['status'] = 'achieved';
            } elseif ($childrenAvg >= 70.0) {
                $node['status'] = 'on_track';
            } elseif ($childrenAvg >= 40.0) {
                $node['status'] = 'at_risk';
            } elseif ($childrenAvg > 0.0) {
                $node['status'] = 'behind';
            }
        }

        return $node;
    }

    /**
     * Create an objective.
     */
    public function createObjective(Organization $organization, User $user, array $data): OkrObjective
    {
        return OkrObjective::create([
            'organization_id' => $organization->id,
            'parent_id' => ! empty($data['parent_id']) && $data['parent_id'] !== 'none' ? $data['parent_id'] : null,
            'project_id' => ! empty($data['project_id']) && $data['project_id'] !== 'none' ? $data['project_id'] : null,
            'owner_id' => ! empty($data['owner_id']) && $data['owner_id'] !== 'none' ? (int) $data['owner_id'] : $user->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'level' => $data['level'] ?? 'company',
            'period' => $data['period'] ?? '2026-Q1',
            'status' => $data['status'] ?? 'on_track',
            'confidence_score' => isset($data['confidence_score']) ? (float) $data['confidence_score'] : 0.80,
        ]);
    }

    /**
     * Update an objective.
     */
    public function updateObjective(OkrObjective $objective, array $data): OkrObjective
    {
        $objective->update([
            'parent_id' => array_key_exists('parent_id', $data) ? ($data['parent_id'] === 'none' ? null : $data['parent_id']) : $objective->parent_id,
            'project_id' => array_key_exists('project_id', $data) ? ($data['project_id'] === 'none' ? null : $data['project_id']) : $objective->project_id,
            'owner_id' => array_key_exists('owner_id', $data) ? ($data['owner_id'] === 'none' ? null : (int) $data['owner_id']) : $objective->owner_id,
            'title' => $data['title'] ?? $objective->title,
            'description' => array_key_exists('description', $data) ? $data['description'] : $objective->description,
            'level' => $data['level'] ?? $objective->level,
            'period' => $data['period'] ?? $objective->period,
            'status' => $data['status'] ?? $objective->status,
            'confidence_score' => isset($data['confidence_score']) ? (float) $data['confidence_score'] : $objective->confidence_score,
        ]);

        return $objective;
    }

    /**
     * Delete an objective and cascade children.
     */
    public function deleteObjective(OkrObjective $objective): bool
    {
        return (bool) $objective->delete();
    }

    /**
     * Create a key result.
     */
    public function createKeyResult(OkrObjective $objective, array $data): OkrKeyResult
    {
        return OkrKeyResult::create([
            'objective_id' => $objective->id,
            'owner_id' => ! empty($data['owner_id']) && $data['owner_id'] !== 'none' ? (int) $data['owner_id'] : null,
            'title' => $data['title'],
            'metric_type' => $data['metric_type'] ?? 'percentage',
            'initial_value' => (float) ($data['initial_value'] ?? 0),
            'current_value' => (float) ($data['current_value'] ?? 0),
            'target_value' => (float) ($data['target_value'] ?? 100),
            'unit' => $data['unit'] ?? '%',
            'weight' => (float) ($data['weight'] ?? 1.0),
            'status' => $data['status'] ?? 'on_track',
        ]);
    }

    /**
     * Update key result progress and details.
     */
    public function updateKeyResult(OkrKeyResult $kr, array $data): OkrKeyResult
    {
        $kr->update([
            'owner_id' => array_key_exists('owner_id', $data) ? ($data['owner_id'] === 'none' ? null : (int) $data['owner_id']) : $kr->owner_id,
            'title' => $data['title'] ?? $kr->title,
            'metric_type' => $data['metric_type'] ?? $kr->metric_type,
            'initial_value' => isset($data['initial_value']) ? (float) $data['initial_value'] : $kr->initial_value,
            'current_value' => isset($data['current_value']) ? (float) $data['current_value'] : $kr->current_value,
            'target_value' => isset($data['target_value']) ? (float) $data['target_value'] : $kr->target_value,
            'unit' => array_key_exists('unit', $data) ? $data['unit'] : $kr->unit,
            'weight' => isset($data['weight']) ? (float) $data['weight'] : $kr->weight,
            'status' => $data['status'] ?? $kr->status,
        ]);

        return $kr;
    }

    /**
     * Delete a key result.
     */
    public function deleteKeyResult(OkrKeyResult $kr): bool
    {
        return (bool) $kr->delete();
    }

    /**
     * Link task to a key result.
     */
    public function linkTask(OkrKeyResult $kr, Task $task): void
    {
        $kr->linkedTasks()->syncWithoutDetaching([$task->id]);
    }

    /**
     * Unlink task from a key result.
     */
    public function unlinkTask(OkrKeyResult $kr, Task $task): void
    {
        $kr->linkedTasks()->detach($task->id);
    }
}
