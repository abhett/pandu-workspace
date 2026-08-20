<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
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
        'name' => 'Lead Manager',
        'email' => 'lead@example.com',
    ]);

    $this->org = Organization::factory()->create(['name' => 'Kinetic Performance Org']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->project = Project::factory()->create([
        'organization_id' => $this->org->id,
        'lead_user_id' => $this->user->id,
        'key' => 'PERF',
    ]);

    Task::factory()->count(3)->create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'created_by' => $this->user->id,
    ]);
});

test('user can view collaboration performance report dashboard', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/reports/collaboration');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('reports/collaboration')
        ->has('data.metrics')
        ->has('data.velocity_trends')
        ->has('data.members')
        ->has('data.projects')
    );
});

test('user can filter collaboration report by project', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/reports/collaboration?project_id='.$this->project->id);

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('reports/collaboration')
        ->where('data.selected_project_id', $this->project->id)
    );
});

test('user can export collaboration report as csv', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/reports/collaboration/export');

    $response->assertOk();
    $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
});
