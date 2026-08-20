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

    $this->user = User::factory()->create(['name' => 'Release Lead', 'email' => 'release@example.com']);
    $this->org = Organization::factory()->create(['name' => 'Gantt Roadmap Org']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->project = app(ProjectCreationService::class)->create($this->org, $this->user, [
        'name' => 'Product Roadmap 2026',
        'key' => 'RDM',
        'type' => 'scrum',
    ]);
});

test('user can update task schedule dates and milestone flag', function () {
    $task = app(TaskService::class)->create($this->project, $this->user, [
        'title' => 'Mobile App Beta Launch',
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/projects/{$this->project->id}/tasks/{$task->id}/schedule", [
            'start_date' => '2026-09-01',
            'due_date' => '2026-09-15',
            'is_milestone' => true,
        ]);

    $response->assertOk();

    $task->refresh();
    expect($task->start_date->toDateString())->toBe('2026-09-01');
    expect($task->due_date->toDateString())->toBe('2026-09-15');
    expect($task->is_milestone)->toBeTrue();
});

test('timeline page renders gantt chart with work items and critical path', function () {
    $task1 = app(TaskService::class)->create($this->project, $this->user, [
        'title' => 'Core Architecture',
        'start_date' => '2026-08-01',
        'due_date' => '2026-08-10',
    ]);

    $task2 = app(TaskService::class)->create($this->project, $this->user, [
        'title' => 'UI Implementation',
        'start_date' => '2026-08-11',
        'due_date' => '2026-08-20',
    ]);

    TaskDependency::create([
        'project_id' => $this->project->id,
        'predecessor_id' => $task1->id,
        'successor_id' => $task2->id,
        'type' => 'finish_to_start',
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/projects/{$this->project->id}/timeline");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('projects/timeline')
        ->has('timeline.items', 2)
        ->has('timeline.weeks')
        ->has('timeline.dependencies', 1)
        ->has('timeline.critical_path_ids', 2)
    );
});
