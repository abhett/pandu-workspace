<?php

namespace Database\Factories;

use App\Models\Label;
use App\Models\Organization;
use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Label>
 */
class LabelFactory extends Factory
{
    protected $model = Label::class;

    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'project_id' => Project::factory(),
            'name' => fake()->word(),
            'color' => fake()->hexColor(),
            'description' => fake()->sentence(),
        ];
    }
}
