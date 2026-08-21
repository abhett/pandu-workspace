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

    $this->org = Organization::factory()->create(['name' => 'Matrix Cross-Project Org']);

    $this->ownerUser = User::factory()->create(['name' => 'Lead Architect', 'email' => 'lead@matrix.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ownerUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devUser = User::factory()->create(['name' => 'Developer Charlie', 'email' => 'charlie@matrix.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Auditor Guest', 'email' => 'guest@matrix.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    // Project Alpha (Frontend Gateway)
    $this->projectAlpha = Project::create([
        'organization_id' => $this->org->id,
        'name' => 'Project Alpha Gateway',
        'slug' => 'project-alpha-gateway',
        'key' => 'PAG',
        'status' => 'active',
        'visibility' => 'private',
        'created_by' => $this->ownerUser->id,
    ]);

    // Project Beta (Core Banking Microservice)
    $this->projectBeta = Project::create([
        'organization_id' => $this->org->id,
        'name' => 'Project Beta Banking Core',
        'slug' => 'project-beta-banking-core',
        'key' => 'PBC',
        'status' => 'active',
        'visibility' => 'private',
        'created_by' => $this->ownerUser->id,
    ]);

    $this->workflowAlpha = Workflow::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->projectAlpha->id,
        'name' => 'Workflow Alpha',
        'is_default' => true,
    ]);
    $this->statusAlphaTodo = WorkflowStatus::create([
        'workflow_id' => $this->workflowAlpha->id,
        'project_id' => $this->projectAlpha->id,
        'name' => 'To Do',
        'slug' => 'to-do',
        'category' => 'todo',
        'color' => '#64748b',
        'position' => 0,
    ]);

    $this->workflowBeta = Workflow::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->projectBeta->id,
        'name' => 'Workflow Beta',
        'is_default' => true,
    ]);
    $this->statusBetaInProgress = WorkflowStatus::create([
        'workflow_id' => $this->workflowBeta->id,
        'project_id' => $this->projectBeta->id,
        'name' => 'In Progress',
        'slug' => 'in-progress',
        'category' => 'in_progress',
        'color' => '#3b82f6',
        'position' => 1,
    ]);

    // Tasks in Alpha
    $this->taskAlpha1 = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->projectAlpha->id,
        'status_id' => $this->statusAlphaTodo->id,
        'sequence_number' => 1,
        'key' => 'PAG-1',
        'title' => 'Implement Mobile Payment Screen',
        'type' => 'story',
        'priority' => 'high',
        'due_date' => now()->addDays(14)->toDateString(),
        'created_by' => $this->ownerUser->id,
        'estimate_points' => 5.0,
        'rank' => '0|hzzzzz:',
    ]);

    // Tasks in Beta
    $this->taskBeta1 = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->projectBeta->id,
        'status_id' => $this->statusBetaInProgress->id,
        'sequence_number' => 1,
        'key' => 'PBC-1',
        'title' => 'Publish Ledger Settlement API Spec',
        'type' => 'task',
        'priority' => 'critical',
        'due_date' => now()->addDays(5)->toDateString(),
        'created_by' => $this->ownerUser->id,
        'estimate_points' => 8.0,
        'rank' => '0|hzzzzz:0',
    ]);
});

test('user can view cross project dependency matrix dashboard', function () {
    // Create an inbound cross-project dependency: PBC-1 (Beta) -> PAG-1 (Alpha)
    TaskDependency::create([
        'project_id' => $this->projectAlpha->id,
        'predecessor_id' => $this->taskBeta1->id,
        'successor_id' => $this->taskAlpha1->id,
        'type' => 'finish_to_start',
        'lag_days' => 2,
    ]);

    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/projects/{$this->projectAlpha->id}/dependencies/matrix");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/dependencies/matrix')
            ->has('metrics')
            ->has('inbound_dependencies')
            ->has('outbound_dependencies')
            ->has('internal_dependencies')
            ->has('cycles')
            ->has('other_projects')
            ->has('local_tasks')
        );
});

test('create cross project dependency between two projects', function () {
    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->projectAlpha->id}/dependencies/matrix/store", [
            'predecessor_id' => $this->taskBeta1->id,
            'successor_id' => $this->taskAlpha1->id,
            'type' => 'finish_to_start',
            'lag_days' => 3,
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $dep = TaskDependency::where('predecessor_id', $this->taskBeta1->id)
        ->where('successor_id', $this->taskAlpha1->id)
        ->first();

    expect($dep)->not->toBeNull();
    expect($dep->type)->toBe('finish_to_start');
    expect($dep->lag_days)->toBe(3);
});

test('circular dependency is detected and rejected', function () {
    // 1. Create Alpha1 -> Beta1
    TaskDependency::create([
        'project_id' => $this->projectAlpha->id,
        'predecessor_id' => $this->taskAlpha1->id,
        'successor_id' => $this->taskBeta1->id,
        'type' => 'finish_to_start',
        'lag_days' => 0,
    ]);

    // 2. Try to create Beta1 -> Alpha1 (Circular Deadlock Cycle!)
    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->projectAlpha->id}/dependencies/matrix/store", [
            'predecessor_id' => $this->taskBeta1->id,
            'successor_id' => $this->taskAlpha1->id,
            'type' => 'finish_to_start',
            'lag_days' => 0,
        ]);

    $response->assertStatus(422)
        ->assertJson(['success' => false]);
});

test('simulate cascade delay impact', function () {
    // PBC-1 -> PAG-1
    TaskDependency::create([
        'project_id' => $this->projectAlpha->id,
        'predecessor_id' => $this->taskBeta1->id,
        'successor_id' => $this->taskAlpha1->id,
        'type' => 'finish_to_start',
        'lag_days' => 0,
    ]);

    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->projectAlpha->id}/dependencies/matrix/simulate", [
            'task_id' => $this->taskBeta1->id,
            'delay_days' => 5,
        ]);

    $response->assertOk()
        ->assertJson(['success' => true])
        ->assertJsonStructure([
            'simulation' => [
                'root_task',
                'simulated_delay_days',
                'affected_tasks_count',
                'affected_projects_count',
                'affected_tasks',
            ],
        ]);
});

test('delete cross project dependency', function () {
    $dep = TaskDependency::create([
        'project_id' => $this->projectAlpha->id,
        'predecessor_id' => $this->taskBeta1->id,
        'successor_id' => $this->taskAlpha1->id,
        'type' => 'finish_to_start',
        'lag_days' => 1,
    ]);

    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/projects/{$this->projectAlpha->id}/dependencies/matrix/{$dep->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(TaskDependency::find($dep->id))->toBeNull();
});

test('guest role forbidden from managing dependencies', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->projectAlpha->id}/dependencies/matrix/store", [
            'predecessor_id' => $this->taskBeta1->id,
            'successor_id' => $this->taskAlpha1->id,
            'type' => 'finish_to_start',
        ])
        ->assertForbidden();
});
