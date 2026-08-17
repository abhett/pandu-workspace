<?php

namespace Database\Factories;

use App\Models\WebhookDelivery;
use App\Models\WebhookSubscription;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<WebhookDelivery>
 */
class WebhookDeliveryFactory extends Factory
{
    protected $model = WebhookDelivery::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'webhook_subscription_id' => WebhookSubscription::factory(),
            'event_id' => (string) Str::uuid7(),
            'event_type' => 'task.created',
            'payload' => [
                'id' => (string) Str::uuid7(),
                'type' => 'task.created',
                'occurred_at' => now()->toIso8601String(),
                'data' => ['title' => 'Test Task'],
            ],
            'attempt' => 1,
            'status' => 'success',
            'response_code' => 200,
            'response_body' => '{"received":true}',
            'error_message' => null,
            'duration_ms' => 120,
            'next_attempt_at' => null,
            'delivered_at' => now(),
        ];
    }
}
