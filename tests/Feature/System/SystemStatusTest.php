<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\SystemServiceHealth;
use App\Models\User;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    $this->user = User::factory()->create([
        'name' => 'DevOps Engineer',
        'email' => 'devops@example.com',
    ]);

    $this->org = Organization::factory()->create(['name' => 'Kinetic Infrastructure Org']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view system status dashboard page', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/system-status');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('system/status')
        ->has('overview.status')
        ->has('overview.average_uptime')
        ->has('overview.services')
        ->has('overview.incidents')
    );

    expect(SystemServiceHealth::count())->toBeGreaterThanOrEqual(5);
});

test('public api health check returns operational metrics', function () {
    $response = $this->getJson('/api/v1/system-status/health');

    $response->assertOk();
    $response->assertJsonStructure([
        'status',
        'status_label',
        'average_uptime',
        'timestamp',
        'services',
    ]);

    $data = $response->json();
    expect($data['status'])->toBe('all_operational');
    expect($data['average_uptime'])->toBeGreaterThanOrEqual(99.0);
});
