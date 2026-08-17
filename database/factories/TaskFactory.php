<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkflowStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    protected $model = Task::class;

    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'project_id' => Project::factory(),
            'status_id' => WorkflowStatus::factory(),
            'created_by' => User::factory(),
            'sequence_number' => fake()->unique()->numberBetween(1, 10000),
            'key' => 'TSK-'.fake()->unique()->numberBetween(1, 10000),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'type' => 'task',
            'priority' => 'medium',
            'rank' => '0|hzzzzz:',
            'version' => 1,
        ];
    }
}
