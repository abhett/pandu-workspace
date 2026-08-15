<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Workflow;
use App\Models\WorkflowStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WorkflowStatus>
 */
class WorkflowStatusFactory extends Factory
{
    protected $model = WorkflowStatus::class;

    public function definition(): array
    {
        return [
            'workflow_id' => Workflow::factory(),
            'project_id' => Project::factory(),
            'name' => 'To Do',
            'slug' => 'todo',
            'category' => 'unstarted',
            'color' => '#3b82f6',
            'position' => 0,
            'is_initial' => true,
            'is_completed' => false,
            'wip_limit' => null,
        ];
    }
}
