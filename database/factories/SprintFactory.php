<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Project;
use App\Models\Sprint;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Sprint>
 */
class SprintFactory extends Factory
{
    protected $model = Sprint::class;

    public function definition(): array
    {
        $seq = fake()->numberBetween(1, 20);

        return [
            'organization_id' => Organization::factory(),
            'project_id' => Project::factory(),
            'name' => "Sprint {$seq}",
            'goal' => fake()->sentence(),
            'status' => 'future',
            'start_date' => now()->addDays(2),
            'end_date' => now()->addDays(16),
            'sequence_number' => $seq,
            'committed_points' => null,
            'completed_points' => null,
            'settings' => [],
        ];
    }

    /**
     * Active sprint state.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
            'started_at' => now(),
            'start_date' => now(),
            'end_date' => now()->addWeeks(2),
            'committed_points' => 30.0,
        ]);
    }

    /**
     * Completed sprint state.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'started_at' => now()->subWeeks(2),
            'completed_at' => now(),
            'start_date' => now()->subWeeks(2),
            'end_date' => now(),
            'committed_points' => 35.0,
            'completed_points' => 32.0,
        ]);
    }
}
