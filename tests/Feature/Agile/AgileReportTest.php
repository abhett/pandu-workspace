<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\ProjectMember;
use App\Models\Role;
use App\Models\Sprint;
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

    $this->userA = User::factory()->create(['name' => 'Tech Lead', 'email' => 'lead@example.com']);
    $this->userB = User::factory()->create(['name' => 'Developer', 'email' => 'dev2@example.com']);

    $this->org = Organization::factory()->create(['name' => 'Agile Metrics Org']);

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
        'name' => 'Metrics Dashboard Project',
        'key' => 'MET',
        'type' => 'scrum',
    ]);

    ProjectMember::create([
        'project_id' => $this->project->id,
        'user_id' => $this->userB->id,
        'role' => 'member',
        'joined_at' => now(),
    ]);
});

test('agile reports center renders burndown, velocity, and cfd metrics', function () {
    $sprint = Sprint::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint Alpha',
        'status' => 'future',
        'sequence' => 1,
        'created_by' => $this->userA->id,
    ]);

    app(TaskService::class)->create($this->project, $this->userA, [
        'title' => 'Optimize Database Queries',
        'story_points' => 8,
        'sprint_id' => $sprint->id,
        'assignee_ids' => [$this->userB->id],
    ]);

    app(SprintService::class)->startSprint($sprint, $this->userA, [
        'name' => 'Sprint Alpha Active',
        'start_date' => now()->toDateString(),
        'end_date' => now()->addDays(14)->toDateString(),
    ]);

    $response = $this->actingAs($this->userA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/projects/{$this->project->id}/reports");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('projects/reports')
        ->has('burndown')
        ->has('velocity')
        ->has('cumulativeFlow')
        ->has('cycleTime')
    );
});

test('team workload capacity page calculates member allocation accurately', function () {
    app(TaskService::class)->create($this->project, $this->userA, [
        'title' => 'Backend Architecture Refactor',
        'story_points' => 12,
        'assignee_ids' => [$this->userB->id],
    ]);

    $response = $this->actingAs($this->userA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/projects/{$this->project->id}/workload");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('projects/workload')
        ->has('workload.summary')
        ->has('workload.members')
        ->where('workload.members.1.story_points', 12)
        ->where('workload.members.1.assigned_hours', 48)
        ->where('workload.members.1.is_over_allocated', true)
    );
});
