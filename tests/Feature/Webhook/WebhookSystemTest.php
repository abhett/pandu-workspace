<?php

use App\Jobs\DispatchWebhookJob;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use App\Models\WebhookDelivery;
use App\Models\WebhookSubscription;
use App\Services\Project\ProjectCreationService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);
});

test('user can manage webhook subscriptions via rest api', function () {
    $user = User::factory()->create();
    $org = Organization::factory()->create();
    $ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    OrganizationMembership::create([
        'organization_id' => $org->id,
        'user_id' => $user->id,
        'role' => 'owner',
        'role_id' => $ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $token = $user->createToken('API Token');

    // Create webhook
    $createResponse = $this->withToken($token->plainTextToken)
        ->withHeader('X-Organization-Id', $org->id)
        ->postJson('/api/v1/webhooks', [
            'name' => 'Slack Incident Notifier',
            'url' => 'https://hooks.example.com/services/T00/B00/XXXX',
            'events' => ['task.created', 'task.moved'],
        ]);

    $createResponse->assertCreated()
        ->assertJsonPath('data.name', 'Slack Incident Notifier')
        ->assertJsonPath('data.events', ['task.created', 'task.moved']);

    expect($createResponse->json('secret'))->not->toBeEmpty();

    $webhookId = $createResponse->json('data.id');

    // Update webhook
    $updateResponse = $this->withToken($token->plainTextToken)
        ->putJson("/api/v1/webhooks/{$webhookId}", [
            'name' => 'Slack Alerts 2.0',
        ]);

    $updateResponse->assertOk()
        ->assertJsonPath('data.name', 'Slack Alerts 2.0');

    // Rotate secret
    $rotateResponse = $this->withToken($token->plainTextToken)
        ->postJson("/api/v1/webhooks/{$webhookId}/rotate-secret");

    $rotateResponse->assertOk();
    expect($rotateResponse->json('secret'))->not->toBeEmpty();

    // Delete webhook
    $deleteResponse = $this->withToken($token->plainTextToken)
        ->deleteJson("/api/v1/webhooks/{$webhookId}");

    $deleteResponse->assertOk();
    expect(WebhookSubscription::find($webhookId))->toBeNull();
});

test('webhook delivery job computes hmac signature and sends payload to endpoint', function () {
    Http::fake([
        'https://api.subscriber.com/events' => Http::response(['received' => true], 200),
    ]);

    $user = User::factory()->create();
    $org = Organization::factory()->create();
    $secret = 'test_secret_key_12345';

    $subscription = WebhookSubscription::create([
        'organization_id' => $org->id,
        'name' => 'Subscriber Webhook',
        'url' => 'https://api.subscriber.com/events',
        'secret' => $secret,
        'events' => ['task.created'],
        'active' => true,
    ]);

    $delivery = WebhookDelivery::create([
        'webhook_subscription_id' => $subscription->id,
        'event_id' => 'evt_1234567890',
        'event_type' => 'task.created',
        'payload' => [
            'id' => 'evt_1234567890',
            'type' => 'task.created',
            'data' => ['task_id' => '019...'],
        ],
        'attempt' => 1,
        'status' => 'pending',
    ]);

    $job = new DispatchWebhookJob($delivery->id);
    $job->handle();

    // Verify HTTP call was made with HMAC signature
    Http::assertSent(function (Request $request) use ($secret) {
        $hasEventId = $request->header('X-WMS-Event-Id')[0] === 'evt_1234567890';
        $hasEventType = $request->header('X-WMS-Event-Type')[0] === 'task.created';
        $timestamp = $request->header('X-WMS-Timestamp')[0];
        $signature = $request->header('X-WMS-Signature')[0];

        $rawBody = $request->body();
        $expectedSignature = 'v1='.hash_hmac('sha256', "{$timestamp}.{$rawBody}", $secret);

        return $hasEventId && $hasEventType && $signature === $expectedSignature;
    });

    $delivery->refresh();
    expect($delivery->status)->toBe('success');
    expect($delivery->response_code)->toBe(200);
});

test('task creation dispatches matching webhooks', function () {
    Queue::fake();

    $user = User::factory()->create();
    $org = Organization::factory()->create();
    $ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    OrganizationMembership::create([
        'organization_id' => $org->id,
        'user_id' => $user->id,
        'role' => 'owner',
        'role_id' => $ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $project = app(ProjectCreationService::class)->create($org, $user, [
        'name' => 'Auto Webhook Project',
        'key' => 'AWP',
        'type' => 'kanban',
    ]);

    $subscription = WebhookSubscription::create([
        'organization_id' => $org->id,
        'name' => 'Auto Webhook',
        'url' => 'https://webhook.site/test',
        'secret' => 'whsec_secret',
        'events' => ['task.created'],
        'active' => true,
    ]);

    $token = $user->createToken('API Token');

    $this->withToken($token->plainTextToken)
        ->postJson("/api/v1/projects/{$project->id}/tasks", [
            'title' => 'Task that triggers webhook',
            'type' => 'task',
        ])
        ->assertCreated();

    Queue::assertPushed(DispatchWebhookJob::class);
});
