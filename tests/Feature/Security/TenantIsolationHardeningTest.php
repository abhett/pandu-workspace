<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\User;
use App\Services\Project\ProjectCreationService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    // 1. Tenant A (Org A)
    $this->userA = User::factory()->create();
    $this->orgA = Organization::factory()->create(['name' => 'Organization Alpha']);
    OrganizationMembership::create([
        'organization_id' => $this->orgA->id,
        'user_id' => $this->userA->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->projectA = app(ProjectCreationService::class)->create($this->orgA, $this->userA, [
        'name' => 'Alpha Project',
        'key' => 'ALP',
        'type' => 'kanban',
    ]);

    // 2. Tenant B (Org B)
    $this->userB = User::factory()->create();
    $this->orgB = Organization::factory()->create(['name' => 'Organization Beta']);
    OrganizationMembership::create([
        'organization_id' => $this->orgB->id,
        'user_id' => $this->userB->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->projectB = app(ProjectCreationService::class)->create($this->orgB, $this->userB, [
        'name' => 'Beta Project',
        'key' => 'BET',
        'type' => 'scrum',
    ]);

    $statusB = $this->projectB->statuses()->first();

    $this->taskB = Task::create([
        'organization_id' => $this->orgB->id,
        'project_id' => $this->projectB->id,
        'status_id' => $statusB->id,
        'sequence_number' => 1,
        'key' => 'BET-1',
        'title' => 'Top Secret Beta Task',
        'rank' => '0|hzzzzz:',
        'created_by' => $this->userB->id,
    ]);

    $this->sprintB = Sprint::create([
        'organization_id' => $this->orgB->id,
        'project_id' => $this->projectB->id,
        'name' => 'Beta Sprint 1',
        'status' => 'active',
        'sequence' => 1,
        'created_by' => $this->userB->id,
    ]);
});

test('user from org A cannot access org B projects or tasks (IDOR protection)', function () {
    // Attempt to view Org B project
    $response = $this->actingAs($this->userA)->get("/projects/{$this->projectB->id}");
    $response->assertForbidden();

    // Attempt to view Org B task
    $taskResponse = $this->actingAs($this->userA)->get("/projects/{$this->projectB->id}/tasks/{$this->taskB->id}");
    $taskResponse->assertForbidden();

    // Attempt to mutate Org B task
    $mutateResponse = $this->actingAs($this->userA)->deleteJson("/projects/{$this->projectB->id}/tasks/{$this->taskB->id}");
    $mutateResponse->assertForbidden();
});

test('user from org A cannot execute AI capability on org B sprints or tasks', function () {
    // Attempt to generate AI Sprint Summary for Org B sprint
    $response = $this->actingAs($this->userA)->postJson(
        "/projects/{$this->projectB->id}/ai/sprint-summary/{$this->sprintB->id}"
    );

    $response->assertForbidden();

    // Attempt to generate AI Task Breakdown for Org B project
    $breakdownResponse = $this->actingAs($this->userA)->postJson(
        "/projects/{$this->projectB->id}/ai/task-breakdown",
        ['title' => 'Hacked Task']
    );

    $breakdownResponse->assertForbidden();
});
