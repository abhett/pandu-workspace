<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    protected $model = Project::class;

    public function definition(): array
    {
        $name = fake()->catchPhrase();

        return [
            'organization_id' => Organization::factory(),
            'name' => $name,
            'key' => strtoupper(fake()->unique()->lexify('???')),
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(100, 999),
            'description' => fake()->sentence(),
            'type' => fake()->randomElement(['scrum', 'kanban', 'bug_tracking', 'general']),
            'color' => fake()->hexColor(),
            'icon' => 'FolderKanban',
            'lead_user_id' => User::factory(),
            'status' => 'active',
            'settings' => [],
        ];
    }
}
