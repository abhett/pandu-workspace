<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\ProjectMember;
use App\Models\Role;
use App\Models\Sprint;
use App\Models\TaskBlocker;
use App\Models\User;
use App\Services\Project\ProjectCreationService;
use App\Services\Sprint\SprintService;
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

    $this->userA = User::factory()->create(['name' => 'Scrum Master', 'email' => 'sm@example.com']);
    $this->userB = User::factory()->create(['name' => 'Developer', 'email' => 'dev@example.com']);

    $this->org = Organization::factory()->create(['name' => 'Agile Tech Org']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->userA->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->userB->id,
        'role' => 'member',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->project = app(ProjectCreationService::class)->create($this->org, $this->userA, [
        'name' => 'Agile Core Project',
        'key' => 'AGL',
        'type' => 'scrum',
    ]);

    ProjectMember::create([
        'project_id' => $this->project->id,
        'user_id' => $this->userB->id,
        'role' => 'member',
        'joined_at' => now(),
    ]);
});

test('scrum master workspace renders with sprint health metrics', function () {
    $sprint = Sprint::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint 1 - Foundation',
        'status' => 'future',
        'sequence' => 1,
        'created_by' => $this->userA->id,
    ]);

    $task1 = app(TaskService::class)->create($this->project, $this->userA, [
        'title' => 'Setup CI Pipeline',
        'story_points' => 5,
        'sprint_id' => $sprint->id,
        'assignee_ids' => [$this->userB->id],
    ]);

    $task2 = app(TaskService::class)->create($this->project, $this->userA, [
        'title' => 'Design System Tokens',
        'story_points' => 8,
        'sprint_id' => $sprint->id,
        'assignee_ids' => [$this->userB->id],
    ]);

    // Start the sprint
    app(SprintService::class)->startSprint($sprint, $this->userA, [
        'name' => 'Sprint 1 - Foundation Active',
        'start_date' => now()->toDateString(),
        'end_date' => now()->addDays(14)->toDateString(),
    ]);

    $response = $this->actingAs($this->userA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/projects/{$this->project->id}/scrum-master");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('projects/scrum-master')
        ->has('sprintHealth')
        ->where('sprintHealth.story_points.total', 13)
        ->where('sprintHealth.completion_percent', 0)
    );
});

test('user can add and resolve task blockers in scrum master workspace', function () {
    $task = app(TaskService::class)->create($this->project, $this->userA, [
        'title' => 'Third-party API Integration',
        'story_points' => 5,
        'assignee_ids' => [$this->userB->id],
    ]);

    // 1. Add blocker
    $addResponse = $this->actingAs($this->userB)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/tasks/{$task->id}/blockers", [
            'reason' => 'API credentials are not provided by client.',
            'severity' => 'critical',
        ]);

    $addResponse->assertCreated();
    $blockerId = $addResponse->json('blocker.id');

    expect(TaskBlocker::where('id', $blockerId)->where('is_resolved', false)->exists())->toBeTrue();

    // 2. Resolve blocker
    $resolveResponse = $this->actingAs($this->userA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/projects/{$this->project->id}/tasks/{$task->id}/blockers/{$blockerId}/resolve", [
            'resolution_note' => 'Client has provided sandbox keys via encrypted vault.',
        ]);

    $resolveResponse->assertOk();
    $blocker = TaskBlocker::find($blockerId);
    expect($blocker->is_resolved)->toBeTrue();
    expect($blocker->resolved_by)->toBe($this->userA->id);
    expect($blocker->resolution_note)->toBe('Client has provided sandbox keys via encrypted vault.');
});
