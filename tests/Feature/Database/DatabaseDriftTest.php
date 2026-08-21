<?php

use App\Models\DatabaseEnvironment;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\SchemaDriftReport;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->memberRole = Role::whereNull('organization_id')->where('slug', 'member')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'Database Drift Org']);

    $this->dbaUser = User::factory()->create(['name' => 'Lead Database Architect', 'email' => 'dba@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->dbaUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devUser = User::factory()->create(['name' => 'Software Engineer', 'email' => 'dev@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest Stakeholder', 'email' => 'guest@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view database drift dashboard', function () {
    $response = $this->actingAs($this->dbaUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/database/drift');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/database/drift')
            ->has('metrics')
            ->has('environments')
            ->has('driftReports')
        );

    expect(DatabaseEnvironment::where('organization_id', $this->org->id)->exists())->toBeTrue();
    expect(SchemaDriftReport::where('organization_id', $this->org->id)->exists())->toBeTrue();
});

test('user can trigger schema drift scan', function () {
    $response = $this->actingAs($this->dbaUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/database/drift/scan');

    $response->assertOk()
        ->assertJson(['success' => true]);

    $env = DatabaseEnvironment::where('organization_id', $this->org->id)->first();
    expect($env->last_scanned_at)->not->toBeNull();
});

test('user can resolve drift report', function () {
    $env1 = DatabaseEnvironment::create([
        'organization_id' => $this->org->id,
        'name' => 'Prod',
        'environment_slug' => 'production',
        'schema_version' => 'v1',
    ]);
    $env2 = DatabaseEnvironment::create([
        'organization_id' => $this->org->id,
        'name' => 'Staging',
        'environment_slug' => 'staging',
        'schema_version' => 'v1',
    ]);

    $report = SchemaDriftReport::create([
        'organization_id' => $this->org->id,
        'source_environment_id' => $env2->id,
        'target_environment_id' => $env1->id,
        'table_name' => 'users',
        'drift_type' => 'missing_index',
        'severity' => 'high',
        'description' => 'Missing email index',
        'safe_ddl_remedy' => 'CREATE INDEX CONCURRENTLY idx_users_email ON users (email);',
        'is_resolved' => false,
        'detected_at' => now(),
    ]);

    $response = $this->actingAs($this->dbaUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/database/drift/{$report->id}/resolve");

    $response->assertOk()
        ->assertJson(['success' => true]);

    $report->refresh();
    expect($report->is_resolved)->toBeTrue();
    expect($report->resolved_at)->not->toBeNull();
});

test('user can generate safe ddl recipe', function () {
    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/database/drift/generate-ddl', [
            'action' => 'create_index_concurrently',
            'table_name' => 'tasks',
            'column_name' => 'project_id',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true])
        ->assertJsonPath('result.table_name', 'tasks')
        ->assertJsonPath('result.column_name', 'project_id');
});

test('user can delete drift report', function () {
    $env1 = DatabaseEnvironment::create([
        'organization_id' => $this->org->id,
        'name' => 'Prod',
        'environment_slug' => 'production',
        'schema_version' => 'v1',
    ]);
    $env2 = DatabaseEnvironment::create([
        'organization_id' => $this->org->id,
        'name' => 'Staging',
        'environment_slug' => 'staging',
        'schema_version' => 'v1',
    ]);

    $report = SchemaDriftReport::create([
        'organization_id' => $this->org->id,
        'source_environment_id' => $env2->id,
        'target_environment_id' => $env1->id,
        'table_name' => 'projects',
        'drift_type' => 'type_mismatch',
        'severity' => 'low',
        'description' => 'To delete',
        'safe_ddl_remedy' => '-- Remedy',
        'is_resolved' => false,
        'detected_at' => now(),
    ]);

    $response = $this->actingAs($this->dbaUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/database/drift/{$report->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(SchemaDriftReport::where('id', $report->id)->exists())->toBeFalse();
});

test('guest role forbidden from managing database drift', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/database/drift/scan')
        ->assertForbidden();
});
