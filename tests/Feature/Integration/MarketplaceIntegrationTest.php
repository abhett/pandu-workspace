<?php

use App\Models\Organization;
use App\Models\OrganizationIntegration;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use App\Services\Integration\IntegrationService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    $this->user = User::factory()->create(['name' => 'DevOps Engineer', 'email' => 'devops@example.com']);
    $this->org = Organization::factory()->create(['name' => 'Cloud Ecosystem Org']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view integrations marketplace with categories', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/integrations');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('integrations/index')
        ->has('integrations')
        ->where('filters.category', 'all')
    );
});

test('user can configure and install an integration', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/integrations', [
            'provider' => 'slack',
            'config' => [
                'webhook_url' => 'https://hooks.slack.com/services/T00/B00/XXXX',
                'channel' => '#alerts-engineering',
            ],
            'is_active' => true,
        ]);

    $response->assertOk();
    $response->assertJson(['success' => true]);

    $integration = OrganizationIntegration::where('organization_id', $this->org->id)
        ->where('provider', 'slack')
        ->first();

    expect($integration)->not->toBeNull();
    expect($integration->config['channel'])->toBe('#alerts-engineering');
    expect($integration->is_active)->toBeTrue();
});

test('user can toggle active state and uninstall integration', function () {
    $service = app(IntegrationService::class);
    $integration = $service->installOrUpdate($this->org, $this->user, 'github', [
        'config' => ['repository' => 'acme/pandu-app'],
        'is_active' => true,
    ]);

    expect($integration->is_active)->toBeTrue();

    // Toggle active
    $toggleResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/integrations/{$integration->id}/toggle");

    $toggleResponse->assertOk();
    $integration->refresh();
    expect($integration->is_active)->toBeFalse();

    // Delete / Uninstall
    $deleteResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/integrations/{$integration->id}");

    $deleteResponse->assertOk();
    expect(OrganizationIntegration::where('id', $integration->id)->exists())->toBeFalse();
});

test('user can test ping connection to integration', function () {
    Http::fake([
        'https://hooks.slack.com/*' => Http::response(['ok' => true], 200),
    ]);

    $service = app(IntegrationService::class);
    $integration = $service->installOrUpdate($this->org, $this->user, 'slack', [
        'config' => ['webhook_url' => 'https://hooks.slack.com/services/T00/B00/TEST'],
    ]);

    $pingResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/integrations/{$integration->id}/test-ping");

    $pingResponse->assertOk();
    $pingResponse->assertJson(['success' => true]);
});
