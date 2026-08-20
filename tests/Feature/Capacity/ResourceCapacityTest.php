<?php

use App\Models\MemberCapacitySetting;
use App\Models\MemberTimeOffSchedule;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
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

    $this->org = Organization::factory()->create(['name' => 'Capacity Org']);

    $this->ownerUser = User::factory()->create(['name' => 'Engineering Manager', 'email' => 'em@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ownerUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devA = User::factory()->create(['name' => 'Developer Alpha', 'email' => 'devA@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devA->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devB = User::factory()->create(['name' => 'Developer Beta', 'email' => 'devB@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devB->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'External Contractor', 'email' => 'contractor@example.com']);
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
        'name' => 'Cloud Microservices',
        'key' => 'CMS',
    ]);

    $this->workflow = Workflow::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'name' => 'Default Workflow',
        'is_default' => true,
    ]);

    $this->inProgressStatus = WorkflowStatus::create([
        'workflow_id' => $this->workflow->id,
        'project_id' => $this->project->id,
        'name' => 'In Progress',
        'slug' => 'in_progress',
        'category' => 'in_progress',
        'color' => '#3b82f6',
        'position' => 1,
    ]);

    $this->task = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->inProgressStatus->id,
        'assignee_id' => $this->devA->id,
        'sequence_number' => 1,
        'key' => 'CMS-1',
        'title' => 'Optimize High Throughput Event Stream',
        'type' => 'task',
        'priority' => 'high',
        'estimate_points' => 8.0,
        'rank' => '0|hzzzzz:',
    ]);

    $this->task->assignees()->attach($this->devA->id, [
        'assigned_at' => now(),
        'assigned_by' => $this->ownerUser->id,
    ]);
});

test('user can view capacity planning dashboard', function () {
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/capacity');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/capacity/index')
            ->has('metrics')
            ->has('memberProfiles')
            ->has('timeOffSchedules')
        );
});

test('admin can configure member capacity and fte ratio', function () {
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/capacity/member-settings', [
            'user_id' => $this->devA->id,
            'weekly_capacity_hours' => 32.0,
            'max_story_points_per_sprint' => 16.0,
            'fte_ratio' => 0.8,
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $setting = MemberCapacitySetting::where('user_id', $this->devA->id)->first();
    expect($setting)->not->toBeNull();
    expect($setting->weekly_capacity_hours)->toEqual(32.0);
    expect($setting->fte_ratio)->toEqual(0.8);
});

test('admin can schedule time off and delete it', function () {
    $start = now()->toDateString();
    $end = now()->addDays(2)->toDateString();

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/capacity/time-off', [
            'user_id' => $this->devA->id,
            'type' => 'vacation',
            'title' => 'Annual Leave',
            'start_date' => $start,
            'end_date' => $end,
            'hours_deducted' => 16.0,
            'notes' => 'Traveling abroad',
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $schedule = MemberTimeOffSchedule::where('user_id', $this->devA->id)->first();
    expect($schedule)->not->toBeNull();
    expect($schedule->hours_deducted)->toEqual(16.0);

    // Delete time off
    $deleteResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/capacity/time-off/{$schedule->id}");

    $deleteResponse->assertOk()
        ->assertJson(['success' => true]);

    expect(MemberTimeOffSchedule::find($schedule->id))->toBeNull();
});

test('admin can rebalance task to another team member', function () {
    expect($this->task->assignees()->first()->id)->toBe($this->devA->id);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/capacity/reassign-task', [
            'task_id' => $this->task->id,
            'new_assignee_id' => $this->devB->id,
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $this->task->refresh();
    expect($this->task->assignees()->first()->id)->toBe($this->devB->id);
});

test('guest role is forbidden from modifying capacity settings', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/capacity/member-settings', [
            'user_id' => $this->devA->id,
            'weekly_capacity_hours' => 20.0,
            'max_story_points_per_sprint' => 10.0,
            'fte_ratio' => 0.5,
        ])
        ->assertForbidden();
});
