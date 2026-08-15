<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Project;
use App\Models\Workflow;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Workflow>
 */
class WorkflowFactory extends Factory
{
    protected $model = Workflow::class;

    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'project_id' => Project::factory(),
            'name' => 'Default Workflow',
            'description' => 'Project default workflow',
            'is_default' => true,
        ];
    }
}
