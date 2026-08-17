<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\User;
use App\Models\WebhookSubscription;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<WebhookSubscription>
 */
class WebhookSubscriptionFactory extends Factory
{
    protected $model = WebhookSubscription::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'project_id' => null,
            'name' => fake()->words(3, true).' Webhook',
            'url' => fake()->url(),
            'secret' => Str::random(32),
            'events' => ['task.created', 'task.updated', 'task.moved'],
            'active' => true,
            'headers' => ['X-Custom-Header' => 'PanduWMS'],
            'created_by' => User::factory(),
        ];
    }
}
