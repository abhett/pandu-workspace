<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use App\Models\WebhookDelivery;
use App\Models\WebhookSubscription;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->memberRole = Role::whereNull('organization_id')->where('slug', 'member')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'Webhook Test Org']);

    $this->ownerUser = User::factory()->create(['name' => 'Org Owner', 'email' => 'owner@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ownerUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest User', 'email' => 'guest@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->project = Project::factory()->create([
        'organization_id' => $this->org->id,
        'name' => 'Backend API Gateway',
        'key' => 'GATEWAY',
    ]);
});

test('owner can view organization webhooks management hub', function () {
    $sub = WebhookSubscription::create([
        'organization_id' => $this->org->id,
        'name' => 'Slack Notifications Bot',
        'url' => 'https://hooks.slack.com/services/T00/B00/X00',
        'secret' => 'whsec_test1234567890',
        'events' => ['task.created', 'task.status_changed'],
        'active' => true,
        'created_by' => $this->ownerUser->id,
    ]);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/webhooks');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/webhooks/index')
            ->has('webhooks', 1)
            ->has('stats')
            ->has('available_events')
            ->where('webhooks.0.name', 'Slack Notifications Bot')
        );
});

test('owner can register a new webhook subscription', function () {
    Queue::fake();

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/webhooks', [
            'name' => 'CI/CD Pipeline Dispatcher',
            'url' => 'https://ci.example.com/webhooks/pandu',
            'events' => ['release.published', 'sprint.completed'],
            'project_id' => $this->project->id,
            'active' => true,
            'headers' => [
                'Authorization' => 'Bearer token_secret_123',
            ],
        ]);

    $response->assertCreated()
        ->assertJson([
            'success' => true,
        ]);

    $this->assertDatabaseHas('webhook_subscriptions', [
        'organization_id' => $this->org->id,
        'name' => 'CI/CD Pipeline Dispatcher',
        'url' => 'https://ci.example.com/webhooks/pandu',
        'project_id' => $this->project->id,
    ]);
});

test('owner can update webhook subscription details and status', function () {
    $webhook = WebhookSubscription::create([
        'organization_id' => $this->org->id,
        'name' => 'Legacy Bot',
        'url' => 'https://old.example.com/webhook',
        'secret' => 'whsec_oldsecret',
        'events' => ['task.created'],
        'active' => true,
    ]);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/organization/webhooks/{$webhook->id}", [
            'name' => 'Updated Modern Bot',
            'url' => 'https://modern.example.com/webhook',
            'events' => ['task.created', 'task.deleted'],
            'active' => false,
        ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
        ]);

    $webhook->refresh();
    expect($webhook->name)->toBe('Updated Modern Bot');
    expect($webhook->url)->toBe('https://modern.example.com/webhook');
    expect($webhook->active)->toBeFalse();
    expect($webhook->events)->toBe(['task.created', 'task.deleted']);
});

test('owner can rotate webhook signing secret', function () {
    $webhook = WebhookSubscription::create([
        'organization_id' => $this->org->id,
        'name' => 'Security Tested Endpoint',
        'url' => 'https://sec.example.com/webhook',
        'secret' => 'whsec_originalsecret',
        'events' => ['task.created'],
        'active' => true,
    ]);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/webhooks/{$webhook->id}/rotate-secret");

    $response->assertOk()
        ->assertJson([
            'success' => true,
        ]);

    $webhook->refresh();
    expect($webhook->secret)->not->toBe('whsec_originalsecret');
    expect(str_starts_with($webhook->secret, 'whsec_'))->toBeTrue();
});

test('owner can send ping test webhook', function () {
    Queue::fake();

    $webhook = WebhookSubscription::create([
        'organization_id' => $this->org->id,
        'name' => 'Discord Server Relay',
        'url' => 'https://discord.example.com/webhook',
        'secret' => 'whsec_secret_123',
        'events' => ['*'],
        'active' => true,
    ]);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/webhooks/{$webhook->id}/test");

    $response->assertOk()
        ->assertJson([
            'success' => true,
        ]);

    $this->assertDatabaseHas('webhook_deliveries', [
        'webhook_subscription_id' => $webhook->id,
        'event_type' => 'ping',
    ]);
});

test('owner can view recent delivery logs for inspector', function () {
    $webhook = WebhookSubscription::create([
        'organization_id' => $this->org->id,
        'name' => 'Audit Relay',
        'url' => 'https://audit.example.com/webhook',
        'secret' => 'whsec_audit_sec',
        'events' => ['task.created'],
        'active' => true,
    ]);

    $delivery = WebhookDelivery::create([
        'webhook_subscription_id' => $webhook->id,
        'event_id' => 'evt_test_12345',
        'event_type' => 'task.created',
        'payload' => ['title' => 'Important Task'],
        'attempt' => 1,
        'status' => 'success',
        'response_code' => 200,
        'duration_ms' => 145,
    ]);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->getJson("/organization/webhooks/{$webhook->id}/deliveries");

    $response->assertOk()
        ->assertJsonStructure([
            'success',
            'deliveries' => [
                '*' => [
                    'id',
                    'event_id',
                    'event_type',
                    'status',
                    'response_code',
                    'duration_ms',
                    'payload',
                ],
            ],
        ])
        ->assertJsonPath('deliveries.0.event_id', 'evt_test_12345');
});

test('owner can redeliver / replay a webhook delivery payload', function () {
    Queue::fake();

    $webhook = WebhookSubscription::create([
        'organization_id' => $this->org->id,
        'name' => 'Replay Tester',
        'url' => 'https://replay.example.com/webhook',
        'secret' => 'whsec_replay_sec',
        'events' => ['task.created'],
        'active' => true,
    ]);

    $delivery = WebhookDelivery::create([
        'webhook_subscription_id' => $webhook->id,
        'event_id' => 'evt_original_999',
        'event_type' => 'task.status_changed',
        'payload' => ['task_id' => 'T-100', 'from' => 'todo', 'to' => 'done'],
        'attempt' => 1,
        'status' => 'failed',
        'response_code' => 500,
    ]);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/webhooks/deliveries/{$delivery->id}/redeliver");

    $response->assertOk()
        ->assertJson([
            'success' => true,
        ]);

    // A new delivery record with the same event_type and payload was created
    $this->assertDatabaseHas('webhook_deliveries', [
        'webhook_subscription_id' => $webhook->id,
        'event_type' => 'task.status_changed',
        'status' => 'pending',
    ]);
});

test('owner can delete webhook subscription', function () {
    $webhook = WebhookSubscription::create([
        'organization_id' => $this->org->id,
        'name' => 'Temporary Endpoint',
        'url' => 'https://temp.example.com/webhook',
        'secret' => 'whsec_temp_sec',
        'events' => ['task.created'],
        'active' => true,
    ]);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/webhooks/{$webhook->id}");

    $response->assertOk()
        ->assertJson([
            'success' => true,
        ]);

    $this->assertSoftDeleted('webhook_subscriptions', [
        'id' => $webhook->id,
    ]);
});

test('guest role is forbidden from managing webhooks', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/webhooks')
        ->assertForbidden();

    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/webhooks', [
            'name' => 'Unauthorized Hook',
            'url' => 'https://hacker.com',
            'events' => ['*'],
        ])
        ->assertForbidden();
});
