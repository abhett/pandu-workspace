<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\Sprint;
use App\Models\Task;
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

    $this->user = User::factory()->create(['name' => 'Calendar Coordinator', 'email' => 'coordinator@example.com']);
    $this->org = Organization::factory()->create(['name' => 'Calendar Tech Org']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->project1 = app(ProjectCreationService::class)->create($this->org, $this->user, [
        'name' => 'Frontend Web App',
        'key' => 'FWA',
        'type' => 'scrum',
    ]);

    $this->project2 = app(ProjectCreationService::class)->create($this->org, $this->user, [
        'name' => 'Mobile iOS App',
        'key' => 'MIA',
        'type' => 'kanban',
    ]);
});

test('authenticated user can view monthly calendar with task due dates and sprint spans', function () {
    $currentDate = now()->format('Y-m-15');

    // Task due on 15th
    $task = app(TaskService::class)->create($this->project1, $this->user, [
        'title' => 'Release Candidate QA',
        'due_date' => $currentDate,
        'priority' => 'high',
        'is_milestone' => true,
    ]);

    // Active Sprint spanning 10th - 24th
    $sprint = Sprint::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project1->id,
        'name' => 'Sprint 42: Alpha Launch',
        'status' => 'future',
        'sequence' => 1,
        'created_by' => $this->user->id,
    ]);

    app(SprintService::class)->startSprint($sprint, $this->user, [
        'name' => 'Sprint 42: Alpha Launch Active',
        'start_date' => now()->startOfMonth()->addDays(9)->toDateString(),
        'end_date' => now()->startOfMonth()->addDays(23)->toDateString(),
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/calendar');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('calendar/index')
        ->has('calendar.days', 42)
        ->has('calendar.summary')
        ->where('calendar.summary.total_tasks', 1)
        ->has('calendar.available_projects', 2)
    );
});

test('user can filter calendar to a specific project', function () {
    $currentDate = now()->format('Y-m-10');

    app(TaskService::class)->create($this->project1, $this->user, [
        'title' => 'Task Project 1',
        'due_date' => $currentDate,
    ]);

    app(TaskService::class)->create($this->project2, $this->user, [
        'title' => 'Task Project 2',
        'due_date' => $currentDate,
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/projects/{$this->project1->id}/calendar");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('calendar/index')
        ->where('calendar.summary.total_tasks', 1)
        ->where('project.id', $this->project1->id)
    );
});

test('user can reschedule task due date from calendar', function () {
    $task = app(TaskService::class)->create($this->project1, $this->user, [
        'title' => 'API Auth Revamp',
        'due_date' => '2026-08-10',
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/tasks/{$task->id}/due-date", [
            'due_date' => '2026-08-25',
        ]);

    $response->assertOk();
    $response->assertJson([
        'success' => true,
    ]);

    $task->refresh();
    expect($task->due_date->toDateString())->toBe('2026-08-25');
});
