<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\TaskDependency;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowStatus;
use App\Services\Timeline\TimelineService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->memberRole = Role::whereNull('organization_id')->where('slug', 'member')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'Timeline Org']);

    $this->ownerUser = User::factory()->create(['name' => 'Project Director', 'email' => 'director@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ownerUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->memberUser = User::factory()->create(['name' => 'Lead Engineer', 'email' => 'lead@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->memberUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Observer Guest', 'email' => 'observer@example.com']);
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
        'name' => 'NextGen Platform',
        'key' => 'NGP',
    ]);

    $this->workflow = Workflow::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'name' => 'Default Workflow',
        'is_default' => true,
    ]);

    $this->todoStatus = WorkflowStatus::create([
        'workflow_id' => $this->workflow->id,
        'project_id' => $this->project->id,
        'name' => 'Backlog',
        'slug' => 'backlog',
        'category' => 'todo',
        'color' => '#64748b',
        'position' => 0,
    ]);

    $this->taskA = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 1,
        'key' => 'NGP-1',
        'title' => 'Database Schema Migration',
        'type' => 'task',
        'priority' => 'high',
        'start_date' => now()->startOfWeek()->toDateString(),
        'due_date' => now()->startOfWeek()->addDays(2)->toDateString(),
        'rank' => '0|hzzzzz:',
    ]);

    $this->taskB = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 2,
        'key' => 'NGP-2',
        'title' => 'Backend API Development',
        'type' => 'task',
        'priority' => 'high',
        'start_date' => now()->startOfWeek()->addDays(3)->toDateString(),
        'due_date' => now()->startOfWeek()->addDays(6)->toDateString(),
        'rank' => '0|hzzzzz:0',
    ]);

    $this->taskC = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 3,
        'key' => 'NGP-3',
        'title' => 'Frontend Integration & QA',
        'type' => 'task',
        'priority' => 'high',
        'start_date' => now()->startOfWeek()->addDays(7)->toDateString(),
        'due_date' => now()->startOfWeek()->addDays(10)->toDateString(),
        'rank' => '0|hzzzzz:1',
    ]);
});

test('user can view timeline gantt and cpm metrics', function () {
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/projects/{$this->project->id}/timeline");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/timeline')
            ->has('project')
            ->has('timeline')
            ->has('timeline.metrics')
            ->has('timeline.items')
            ->has('timeline.critical_path_ids')
        );
});

test('cpm engine calculates critical path and zero float', function () {
    // Chain A -> B -> C
    TaskDependency::create([
        'project_id' => $this->project->id,
        'predecessor_id' => $this->taskA->id,
        'successor_id' => $this->taskB->id,
        'type' => 'finish_to_start',
        'lag_days' => 0,
    ]);

    TaskDependency::create([
        'project_id' => $this->project->id,
        'predecessor_id' => $this->taskB->id,
        'successor_id' => $this->taskC->id,
        'type' => 'finish_to_start',
        'lag_days' => 0,
    ]);

    $service = app(TimelineService::class);
    $cpm = $service->calculateCPM($this->project);

    expect($cpm['project_duration_days'])->toBeGreaterThan(0);
    expect($cpm['critical_path_ids'])->toContain($this->taskA->id);
    expect($cpm['critical_path_ids'])->toContain($this->taskB->id);
    expect($cpm['critical_path_ids'])->toContain($this->taskC->id);

    // Total float on critical path should be 0
    expect($cpm['task_metrics'][$this->taskA->id]['total_float'])->toBe(0);
    expect($cpm['task_metrics'][$this->taskB->id]['total_float'])->toBe(0);
});

test('auto schedule cascades dates across dependencies', function () {
    TaskDependency::create([
        'project_id' => $this->project->id,
        'predecessor_id' => $this->taskA->id,
        'successor_id' => $this->taskB->id,
        'type' => 'finish_to_start',
        'lag_days' => 1,
    ]);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/timeline/auto-schedule");

    $response->assertOk()
        ->assertJson(['success' => true]);

    $this->taskA->refresh();
    $this->taskB->refresh();

    // taskB start_date should be >= taskA start_date
    expect($this->taskB->start_date)->toBeGreaterThanOrEqual($this->taskA->start_date);
});

test('user can toggle milestone status on a task', function () {
    expect((bool) $this->taskC->is_milestone)->toBeFalse();

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/timeline/tasks/{$this->taskC->id}/milestone");

    $response->assertOk()
        ->assertJson(['success' => true]);

    $this->taskC->refresh();
    expect((bool) $this->taskC->is_milestone)->toBeTrue();
});

test('user can add and delete dependencies with cycle detection', function () {
    // 1. Add dependency A -> B
    $addResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/timeline/dependencies", [
            'predecessor_id' => $this->taskA->id,
            'successor_id' => $this->taskB->id,
            'type' => 'finish_to_start',
            'lag_days' => 2,
        ]);

    $addResponse->assertCreated()
        ->assertJson(['success' => true]);

    $dep = TaskDependency::where('predecessor_id', $this->taskA->id)->first();
    expect($dep)->not->toBeNull();
    expect($dep->lag_days)->toBe(2);

    // 2. Attempt circular dependency B -> A (should fail with 422)
    $cycleResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/timeline/dependencies", [
            'predecessor_id' => $this->taskB->id,
            'successor_id' => $this->taskA->id,
        ]);

    $cycleResponse->assertStatus(422)
        ->assertJson(['success' => false]);

    // 3. Delete dependency
    $deleteResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/projects/{$this->project->id}/timeline/dependencies/{$dep->id}");

    $deleteResponse->assertOk()
        ->assertJson(['success' => true]);

    expect(TaskDependency::find($dep->id))->toBeNull();
});

test('guest role cannot create dependencies', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/timeline/dependencies", [
            'predecessor_id' => $this->taskA->id,
            'successor_id' => $this->taskB->id,
        ])
        ->assertForbidden();
});
