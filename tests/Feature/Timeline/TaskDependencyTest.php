<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\TaskDependency;
use App\Models\User;
use App\Services\Project\ProjectCreationService;
use App\Services\Task\TaskService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    $this->user = User::factory()->create(['name' => 'Project Manager', 'email' => 'pm@example.com']);
    $this->org = Organization::factory()->create(['name' => 'Roadmap Tech Org']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->project = app(ProjectCreationService::class)->create($this->org, $this->user, [
        'name' => 'Timeline Core Project',
        'key' => 'TML',
        'type' => 'scrum',
    ]);
});

test('user can create task dependency link between tasks', function () {
    $taskA = app(TaskService::class)->create($this->project, $this->user, [
        'title' => 'Backend API Architecture',
        'story_points' => 5,
    ]);

    $taskB = app(TaskService::class)->create($this->project, $this->user, [
        'title' => 'Frontend Integration',
        'story_points' => 8,
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/dependencies", [
            'predecessor_id' => $taskA->id,
            'successor_id' => $taskB->id,
            'type' => 'finish_to_start',
        ]);

    $response->assertCreated();
    $response->assertJson([
        'success' => true,
    ]);

    expect(TaskDependency::where('predecessor_id', $taskA->id)->where('successor_id', $taskB->id)->exists())->toBeTrue();
});

test('circular dependency is rejected by graph cycle detector', function () {
    $taskA = app(TaskService::class)->create($this->project, $this->user, ['title' => 'Task A']);
    $taskB = app(TaskService::class)->create($this->project, $this->user, ['title' => 'Task B']);
    $taskC = app(TaskService::class)->create($this->project, $this->user, ['title' => 'Task C']);

    // A -> B
    TaskDependency::create([
        'project_id' => $this->project->id,
        'predecessor_id' => $taskA->id,
        'successor_id' => $taskB->id,
        'type' => 'finish_to_start',
    ]);

    // B -> C
    TaskDependency::create([
        'project_id' => $this->project->id,
        'predecessor_id' => $taskB->id,
        'successor_id' => $taskC->id,
        'type' => 'finish_to_start',
    ]);

    // Attempt C -> A (Creates loop: A -> B -> C -> A)
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/dependencies", [
            'predecessor_id' => $taskC->id,
            'successor_id' => $taskA->id,
            'type' => 'finish_to_start',
        ]);

    $response->assertStatus(422);
    $response->assertJson([
        'success' => false,
    ]);
});

test('user can delete task dependency', function () {
    $taskA = app(TaskService::class)->create($this->project, $this->user, ['title' => 'Task A']);
    $taskB = app(TaskService::class)->create($this->project, $this->user, ['title' => 'Task B']);

    $dep = TaskDependency::create([
        'project_id' => $this->project->id,
        'predecessor_id' => $taskA->id,
        'successor_id' => $taskB->id,
        'type' => 'finish_to_start',
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/projects/{$this->project->id}/dependencies/{$dep->id}");

    $response->assertOk();
    expect(TaskDependency::where('id', $dep->id)->exists())->toBeFalse();
});
