<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use App\Models\WebhookDeliveryAttempt;
use App\Models\WebhookEndpoint;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->memberRole = Role::whereNull('organization_id')->where('slug', 'member')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'Webhook Resilience Org']);

    $this->leadUser = User::factory()->create(['name' => 'Integration Engineer', 'email' => 'integrations@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->leadUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devUser = User::factory()->create(['name' => 'Backend Dev', 'email' => 'backend@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest Observer', 'email' => 'guest@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view webhook dlq dashboard', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/developer/webhooks/dlq');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/developer/webhooks/dlq')
            ->has('metrics')
            ->has('trafficTrend')
            ->has('attempts')
            ->has('endpoints')
        );

    expect(WebhookEndpoint::where('organization_id', $this->org->id)->exists())->toBeTrue();
});

test('user can replay single failed delivery', function () {
    $endpoint = WebhookEndpoint::create([
        'organization_id' => $this->org->id,
        'name' => 'Test Webhook',
        'target_url' => 'https://api.test.com/hook',
        'event_subscriptions' => ['task.created'],
    ]);

    $attempt = WebhookDeliveryAttempt::create([
        'organization_id' => $this->org->id,
        'endpoint_id' => $endpoint->id,
        'event_type' => 'task.created',
        'payload' => ['task_id' => 'tsk_123'],
        'response_status' => 500,
        'status' => 'dead_letter',
        'error_reason' => 'http_500_error',
    ]);

    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/developer/webhooks/dlq/{$attempt->id}/replay");

    $response->assertOk()
        ->assertJson(['success' => true]);

    $attempt->refresh();
    expect($attempt->status)->toBe('replayed');
    expect($attempt->response_status)->toBe(200);
});

test('user can bulk replay dlq deliveries', function () {
    $endpoint = WebhookEndpoint::create([
        'organization_id' => $this->org->id,
        'name' => 'Bulk Webhook',
        'target_url' => 'https://api.test.com/bulk',
        'event_subscriptions' => ['sprint.closed'],
    ]);

    $att1 = WebhookDeliveryAttempt::create([
        'organization_id' => $this->org->id,
        'endpoint_id' => $endpoint->id,
        'event_type' => 'sprint.closed',
        'payload' => ['sprint_id' => '1'],
        'status' => 'dead_letter',
    ]);

    $att2 = WebhookDeliveryAttempt::create([
        'organization_id' => $this->org->id,
        'endpoint_id' => $endpoint->id,
        'event_type' => 'sprint.closed',
        'payload' => ['sprint_id' => '2'],
        'status' => 'failed',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/developer/webhooks/dlq/bulk-replay', [
            'attempt_ids' => [$att1->id, $att2->id],
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $att1->refresh();
    $att2->refresh();
    expect($att1->status)->toBe('replayed');
    expect($att2->status)->toBe('replayed');
});

test('user can create webhook endpoint', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/developer/webhooks/endpoints', [
            'name' => 'Discord Release Alerts',
            'target_url' => 'https://discord.com/api/webhooks/123/abc',
            'event_subscriptions' => 'release.published, task.completed',
            'max_retries' => 3,
            'backoff_strategy' => 'exponential',
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    expect(WebhookEndpoint::where('name', 'Discord Release Alerts')->exists())->toBeTrue();
});

test('user can purge delivery attempt', function () {
    $endpoint = WebhookEndpoint::create([
        'organization_id' => $this->org->id,
        'name' => 'Purge Endpoint',
        'target_url' => 'https://api.test.com/purge',
        'event_subscriptions' => ['test'],
    ]);

    $attempt = WebhookDeliveryAttempt::create([
        'organization_id' => $this->org->id,
        'endpoint_id' => $endpoint->id,
        'event_type' => 'test.event',
        'payload' => [],
        'status' => 'dead_letter',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/developer/webhooks/dlq/{$attempt->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(WebhookDeliveryAttempt::where('id', $attempt->id)->exists())->toBeFalse();
});

test('guest role forbidden from replaying or modifying', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/developer/webhooks/endpoints', [
            'name' => 'Unauthorized Hook',
            'target_url' => 'https://unauth.com/hook',
        ])
        ->assertForbidden();
});
