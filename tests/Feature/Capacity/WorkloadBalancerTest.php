<?php

use App\Models\MemberCapacitySetting;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowStatus;
use App\Models\WorkloadRebalanceLog;
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

    $this->org = Organization::factory()->create(['name' => 'Balancer Enterprise Org']);

    $this->managerUser = User::factory()->create(['name' => 'Engineering Lead', 'email' => 'lead@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->managerUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devOverloaded = User::factory()->create(['name' => 'Senior Dev Overloaded', 'email' => 'dev1@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devOverloaded->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devAvailable = User::factory()->create(['name' => 'Junior Dev Available', 'email' => 'dev2@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devAvailable->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Auditor Guest', 'email' => 'auditor@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    // Setup Capacity Settings
    MemberCapacitySetting::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devOverloaded->id,
        'weekly_capacity_hours' => 40.0,
        'fte_ratio' => 1.0,
        'max_story_points_per_sprint' => 20.0,
    ]);

    MemberCapacitySetting::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devAvailable->id,
        'weekly_capacity_hours' => 40.0,
        'fte_ratio' => 1.0,
        'max_story_points_per_sprint' => 20.0,
    ]);

    // Setup Projects
    $this->projectAlpha = Project::create([
        'organization_id' => $this->org->id,
        'name' => 'Alpha Backend Engine',
        'slug' => 'alpha-backend-engine',
        'key' => 'ABE',
        'status' => 'active',
        'visibility' => 'private',
        'created_by' => $this->managerUser->id,
    ]);

    $this->projectBeta = Project::create([
        'organization_id' => $this->org->id,
        'name' => 'Beta Mobile Application',
        'slug' => 'beta-mobile-application',
        'key' => 'BMA',
        'status' => 'active',
        'visibility' => 'private',
        'created_by' => $this->managerUser->id,
    ]);

    $this->workflowA = Workflow::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->projectAlpha->id,
        'name' => 'Workflow Alpha',
        'is_default' => true,
    ]);

    $this->statusA = WorkflowStatus::create([
        'workflow_id' => $this->workflowA->id,
        'project_id' => $this->projectAlpha->id,
        'name' => 'In Progress',
        'slug' => 'in-progress',
        'category' => 'in_progress',
        'color' => '#3b82f6',
        'position' => 1,
    ]);

    $this->workflowB = Workflow::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->projectBeta->id,
        'name' => 'Workflow Beta',
        'is_default' => true,
    ]);

    $this->statusB = WorkflowStatus::create([
        'workflow_id' => $this->workflowB->id,
        'project_id' => $this->projectBeta->id,
        'name' => 'To Do',
        'slug' => 'to-do',
        'category' => 'todo',
        'color' => '#64748b',
        'position' => 0,
    ]);

    // Create Tasks for DevOverloaded (Alpha Project: 15 pts = 30h, Beta Project: 15 pts = 30h -> Total 60h on 40h capacity = 150% Overload!)
    $this->task1 = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->projectAlpha->id,
        'status_id' => $this->statusA->id,
        'sequence_number' => 1,
        'key' => 'ABE-1',
        'title' => 'Optimize Database Index Queries',
        'type' => 'task',
        'priority' => 'high',
        'created_by' => $this->managerUser->id,
        'estimate_points' => 15.0,
        'rank' => '0|hzzzzz:',
    ]);
    $this->task1->assignees()->sync([$this->devOverloaded->id]);

    $this->task2 = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->projectBeta->id,
        'status_id' => $this->statusB->id,
        'sequence_number' => 2,
        'key' => 'BMA-1',
        'title' => 'Implement Push Notification Gateway',
        'type' => 'story',
        'priority' => 'medium',
        'created_by' => $this->managerUser->id,
        'estimate_points' => 15.0,
        'rank' => '0|hzzzzz:0',
    ]);
    $this->task2->assignees()->sync([$this->devOverloaded->id]);
});

test('user can view cross project workload balancing matrix', function () {
    $response = $this->actingAs($this->managerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/capacity/balancer');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/capacity/balancer')
            ->has('metrics')
            ->has('projects')
            ->has('matrix_rows')
            ->has('runway_weeks')
            ->has('audit_logs')
        );
});

test('smart rebalance suggestions for overloaded member', function () {
    $response = $this->actingAs($this->managerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->getJson("/organization/capacity/balancer/suggestions/{$this->devOverloaded->id}");

    $response->assertOk()
        ->assertJson(['success' => true])
        ->assertJsonStructure([
            'suggestions' => [
                'overloaded_user',
                'candidate_peers',
            ],
        ]);
});

test('executing task rebalance updates assignee and records audit log', function () {
    $response = $this->actingAs($this->managerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/capacity/balancer/reassign', [
            'task_id' => $this->task2->id,
            'new_assignee_id' => $this->devAvailable->id,
            'reason' => 'Offloading mobile push gateway to balance sprint capacity',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect($this->task2->fresh()->assignees->pluck('id')->all())->toBe([$this->devAvailable->id]);

    $log = WorkloadRebalanceLog::where('task_id', $this->task2->id)->first();
    expect($log)->not->toBeNull();
    expect($log->previous_assignee_id)->toBe($this->devOverloaded->id);
    expect($log->new_assignee_id)->toBe($this->devAvailable->id);
    expect($log->rebalanced_by)->toBe($this->managerUser->id);
    expect($log->points_moved)->toBe(15.0);
});

test('batch rebalancing multiple tasks', function () {
    $response = $this->actingAs($this->managerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/capacity/balancer/batch', [
            'items' => [
                [
                    'task_id' => $this->task1->id,
                    'new_assignee_id' => $this->devAvailable->id,
                    'reason' => 'Batch rebalance alpha task',
                ],
                [
                    'task_id' => $this->task2->id,
                    'new_assignee_id' => 'none',
                    'reason' => 'Batch unassign beta task',
                ],
            ],
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect($this->task1->fresh()->assignees->pluck('id')->all())->toBe([$this->devAvailable->id]);
    expect($this->task2->fresh()->assignees->count())->toBe(0);
    expect(WorkloadRebalanceLog::count())->toBe(2);
});

test('guest role forbidden from rebalancing tasks', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/capacity/balancer/reassign', [
            'task_id' => $this->task1->id,
            'new_assignee_id' => $this->devAvailable->id,
        ])
        ->assertForbidden();
});
