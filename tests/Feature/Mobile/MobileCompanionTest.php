<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\Sprint;
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

    $this->user = User::factory()->create();
    $this->org = Organization::factory()->create();

    $ownerRole = Role::where('slug', 'owner')->first();
    OrganizationMembership::create([
        'user_id' => $this->user->id,
        'organization_id' => $this->org->id,
        'role_id' => $ownerRole->id,
    ]);

    $this->user->update(['current_organization_id' => $this->org->id]);

    $this->project = Project::factory()->create([
        'organization_id' => $this->org->id,
        'lead_user_id' => $this->user->id,
    ]);

    $this->sprint = Sprint::factory()->create([
        'project_id' => $this->project->id,
        'status' => 'active',
    ]);

    Task::factory()->count(3)->create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'created_by' => $this->user->id,
    ]);
});

test('authenticated user can access mobile companion hub', function () {
    $response = $this->actingAs($this->user)->get('/mobile');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('mobile/index')
        ->has('tasks')
        ->has('activeSprint')
        ->has('notifications')
    );
});

test('unauthenticated guest is redirected to login from mobile hub', function () {
    $response = $this->get('/mobile');

    $response->assertRedirect('/login');
});
