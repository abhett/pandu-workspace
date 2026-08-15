<?php

namespace Database\Factories;

use App\Models\ProjectTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProjectTemplate>
 */
class ProjectTemplateFactory extends Factory
{
    protected $model = ProjectTemplate::class;

    public function definition(): array
    {
        $name = fake()->words(2, true);

        return [
            'name' => ucfirst($name),
            'slug' => Str::slug($name),
            'category' => 'software',
            'description' => fake()->sentence(),
            'icon' => 'FolderKanban',
            'color' => '#3b82f6',
            'is_system' => false,
            'workflow_config' => [],
            'default_views' => ['board', 'list', 'summary'],
        ];
    }
}
