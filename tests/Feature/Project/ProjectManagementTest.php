<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use App\Services\Project\ProjectCreationService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->user = User::factory()->create();
    $this->organization = Organization::create([
        'name' => 'Acme Test Corp',
        'slug' => 'acme-test-corp',
        'status' => 'active',
    ]);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    session(['current_organization_id' => $this->organization->id]);
});

test('user can view project catalog directory', function () {
    $response = $this->actingAs($this->user)->get('/projects');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/index')
            ->has('projects')
            ->has('stats')
        );
});

test('user can view create project page with templates and members', function () {
    $response = $this->actingAs($this->user)->get('/projects/create');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/create')
            ->has('templates')
            ->has('members')
        );
});

test('user can create a new project from scrum template', function () {
    $response = $this->actingAs($this->user)->post('/projects', [
        'name' => 'NextGen Core Platform',
        'key' => 'NGC',
        'description' => 'Platform arsitektur baru',
        'type' => 'scrum',
        'color' => '#6366f1',
    ]);

    $project = Project::where('organization_id', $this->organization->id)->first();

    expect($project)->not->toBeNull();
    expect($project->key)->toBe('NGC');
    expect($project->type)->toBe('scrum');
    expect($project->statuses)->toHaveCount(6); // Scrum default has 6 columns
    expect($project->members)->toHaveCount(1); // Creator attached

    $response->assertRedirect(route('projects.show', $project->id));
});

test('user can view project overview page', function () {
    $service = app(ProjectCreationService::class);
    $project = $service->create($this->organization, $this->user, [
        'name' => 'Demo Project',
        'key' => 'DMO',
    ]);

    $response = $this->actingAs($this->user)->get("/projects/{$project->id}");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/overview')
            ->has('project')
            ->where('project.name', 'Demo Project')
            ->where('project.key', 'DMO')
        );
});

test('user can update project settings', function () {
    $service = app(ProjectCreationService::class);
    $project = $service->create($this->organization, $this->user, [
        'name' => 'Old Project Name',
        'key' => 'OLD',
    ]);

    $response = $this->actingAs($this->user)->put("/projects/{$project->id}", [
        'name' => 'Updated Project Name',
        'key' => 'UPD',
        'description' => 'Updated description text',
        'status' => 'active',
    ]);

    $response->assertRedirect();
    $project->refresh();
    expect($project->name)->toBe('Updated Project Name');
    expect($project->key)->toBe('UPD');
});

test('user can delete a project', function () {
    $service = app(ProjectCreationService::class);
    $project = $service->create($this->organization, $this->user, [
        'name' => 'To Be Deleted',
        'key' => 'DEL',
    ]);

    $response = $this->actingAs($this->user)->delete("/projects/{$project->id}");

    $response->assertRedirect(route('projects.index'));
    $this->assertSoftDeleted('projects', ['id' => $project->id]);
});
