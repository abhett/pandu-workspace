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
use App\Services\Dependency\DependencyGraphService;
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

    $this->org = Organization::factory()->create(['name' => 'CPM Test Org']);

    $this->user = User::factory()->create(['name' => 'Project Lead', 'email' => 'lead@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest Observer', 'email' => 'guest@example.com']);
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
        'name' => 'E-Commerce Core Re-platform',
        'key' => 'ECOMM',
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
        'name' => 'To Do',
        'slug' => 'todo',
        'category' => 'todo',
        'color' => '#64748b',
        'position' => 0,
    ]);

    $this->doneStatus = WorkflowStatus::create([
        'workflow_id' => $this->workflow->id,
        'project_id' => $this->project->id,
        'name' => 'Done',
        'slug' => 'done',
        'category' => 'done',
        'color' => '#22c55e',
        'position' => 2,
        'is_completed' => true,
    ]);

    // Create 3 sequential tasks: Task 1 -> Task 2 -> Task 3
    $this->task1 = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 1,
        'key' => 'ECOMM-1',
        'title' => 'Database Schema Migration',
        'type' => 'task',
        'priority' => 'high',
        'estimate_points' => 3,
        'rank' => '0|hzzzzz:',
    ]);

    $this->task2 = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 2,
        'key' => 'ECOMM-2',
        'title' => 'Backend REST API Implementation',
        'type' => 'task',
        'priority' => 'high',
        'estimate_points' => 4,
        'rank' => '0|i00000:',
    ]);

    $this->task3 = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 3,
        'key' => 'ECOMM-3',
        'title' => 'Frontend UI Checkout Flow',
        'type' => 'task',
        'priority' => 'urgent',
        'estimate_points' => 5,
        'rank' => '0|i00001:',
    ]);
});

test('user can view task dependency graph page with computed cpm metrics', function () {
    // Connect task1 -> task2
    TaskDependency::create([
        'project_id' => $this->project->id,
        'predecessor_id' => $this->task1->id,
        'successor_id' => $this->task2->id,
        'type' => 'finish_to_start',
        'lag_days' => 0,
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/projects/{$this->project->id}/dependencies");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/dependencies')
            ->has('graph.nodes', 3)
            ->has('graph.edges', 1)
            ->where('graph.metrics.total_dependencies', 1)
        );
});

test('user can create a valid task dependency link', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/dependencies", [
            'predecessor_id' => $this->task1->id,
            'successor_id' => $this->task2->id,
            'type' => 'finish_to_start',
            'lag_days' => 2,
        ]);

    $response->assertCreated()
        ->assertJson([
            'success' => true,
        ]);

    $this->assertDatabaseHas('task_dependencies', [
        'project_id' => $this->project->id,
        'predecessor_id' => $this->task1->id,
        'successor_id' => $this->task2->id,
        'lag_days' => 2,
    ]);
});

test('prevents self dependency on the same task', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/dependencies", [
            'predecessor_id' => $this->task1->id,
            'successor_id' => $this->task1->id,
            'type' => 'finish_to_start',
        ]);

    $response->assertStatus(422)
        ->assertJson([
            'success' => false,
        ]);
});

test('detects and prevents circular dependency cycles with cycle detection', function () {
    // 1. Create task1 -> task2
    TaskDependency::create([
        'project_id' => $this->project->id,
        'predecessor_id' => $this->task1->id,
        'successor_id' => $this->task2->id,
        'type' => 'finish_to_start',
    ]);

    // 2. Create task2 -> task3
    TaskDependency::create([
        'project_id' => $this->project->id,
        'predecessor_id' => $this->task2->id,
        'successor_id' => $this->task3->id,
        'type' => 'finish_to_start',
    ]);

    // 3. Attempting to add task3 -> task1 must fail due to cyclic loop!
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/dependencies", [
            'predecessor_id' => $this->task3->id,
            'successor_id' => $this->task1->id,
            'type' => 'finish_to_start',
        ]);

    $response->assertStatus(422)
        ->assertJson([
            'success' => false,
        ]);
});

test('calculates critical path method accurately across task chain', function () {
    // Chain: task1 (3d) -> task2 (4d) -> task3 (5d) -> Total Makespan = 12 days
    TaskDependency::create([
        'project_id' => $this->project->id,
        'predecessor_id' => $this->task1->id,
        'successor_id' => $this->task2->id,
        'type' => 'finish_to_start',
        'lag_days' => 0,
    ]);

    TaskDependency::create([
        'project_id' => $this->project->id,
        'predecessor_id' => $this->task2->id,
        'successor_id' => $this->task3->id,
        'type' => 'finish_to_start',
        'lag_days' => 0,
    ]);

    $service = app(DependencyGraphService::class);
    $data = $service->getGraphData($this->project);

    expect($data['metrics']['critical_path_length_days'])->toBe(12);
    expect($data['metrics']['critical_tasks_count'])->toBe(3);

    // All tasks in the single chain should have total_float = 0 (Critical)
    foreach ($data['nodes'] as $node) {
        expect($node['cpm']['total_float'])->toBe(0);
        expect($node['cpm']['is_critical'])->toBeTrue();
    }
});

test('user can delete a task dependency link', function () {
    $dep = TaskDependency::create([
        'project_id' => $this->project->id,
        'predecessor_id' => $this->task1->id,
        'successor_id' => $this->task2->id,
        'type' => 'finish_to_start',
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/projects/{$this->project->id}/dependencies/{$dep->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    $this->assertDatabaseMissing('task_dependencies', ['id' => $dep->id]);
});

test('can simulate cascading delay across downstream tasks', function () {
    TaskDependency::create([
        'project_id' => $this->project->id,
        'predecessor_id' => $this->task1->id,
        'successor_id' => $this->task2->id,
        'type' => 'finish_to_start',
    ]);

    TaskDependency::create([
        'project_id' => $this->project->id,
        'predecessor_id' => $this->task2->id,
        'successor_id' => $this->task3->id,
        'type' => 'finish_to_start',
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/dependencies/simulate-cascade", [
            'task_id' => $this->task1->id,
            'delay_days' => 7,
        ]);

    $response->assertOk()
        ->assertJsonStructure([
            'root_task',
            'delay_days',
            'total_affected_tasks',
            'affected_tasks',
            'message',
        ])
        ->assertJson([
            'delay_days' => 7,
            'total_affected_tasks' => 3,
        ]);
});

test('guest role is forbidden from adding or deleting dependencies', function () {
    $dep = TaskDependency::create([
        'project_id' => $this->project->id,
        'predecessor_id' => $this->task1->id,
        'successor_id' => $this->task2->id,
        'type' => 'finish_to_start',
    ]);

    // Guest cannot create dependency
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/dependencies", [
            'predecessor_id' => $this->task2->id,
            'successor_id' => $this->task3->id,
        ])
        ->assertForbidden();

    // Guest cannot delete dependency
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/projects/{$this->project->id}/dependencies/{$dep->id}")
        ->assertForbidden();
});
