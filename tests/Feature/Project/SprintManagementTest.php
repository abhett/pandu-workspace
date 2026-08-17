<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\User;
use App\Services\Project\ProjectCreationService;
use App\Services\Sprint\SprintService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->user = User::factory()->create();
    $this->organization = Organization::create([
        'name' => 'Acme Scrum Corp',
        'slug' => 'acme-scrum-corp',
        'status' => 'active',
    ]);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    session(['current_organization_id' => $this->organization->id]);

    $service = app(ProjectCreationService::class);
    $this->project = $service->create($this->organization, $this->user, [
        'name' => 'Agile Scrum Core',
        'key' => 'ASC',
        'type' => 'scrum',
    ]);
});

test('user can view backlog and sprint planning page', function () {
    $response = $this->actingAs($this->user)->get("/projects/{$this->project->id}/backlog");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/backlog')
            ->has('project')
            ->has('backlog')
            ->has('futureSprints')
        );
});

test('user can create a new future sprint', function () {
    $response = $this->actingAs($this->user)->post("/projects/{$this->project->id}/sprints", [
        'name' => 'Sprint 1 - Foundation Spike',
        'goal' => 'Setup database schema and auth flows',
    ]);

    $response->assertRedirect();
    $sprint = Sprint::where('project_id', $this->project->id)->first();

    expect($sprint)->not->toBeNull();
    expect($sprint->name)->toBe('Sprint 1 - Foundation Spike');
    expect($sprint->status)->toBe('future');
    expect($sprint->sequence_number)->toBe(1);
});

test('user can move task between backlog and sprint', function () {
    $sprintService = app(SprintService::class);
    $sprint = $sprintService->createSprint($this->project, $this->user, ['name' => 'Sprint 1']);

    $status = $this->project->statuses()->first();
    $task = Task::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'status_id' => $status->id,
        'sequence_number' => 1,
        'key' => 'ASC-1',
        'title' => 'Implement Auth Microservice',
        'rank' => '0|hzzzzz:',
        'estimate_points' => 5.0,
        'created_by' => $this->user->id,
    ]);

    expect($task->sprint_id)->toBeNull();

    // Move to Sprint
    $response = $this->actingAs($this->user)->patch("/projects/{$this->project->id}/tasks/{$task->id}/sprint", [
        'sprint_id' => $sprint->id,
    ]);

    $response->assertRedirect();
    $task->refresh();
    expect($task->sprint_id)->toBe($sprint->id);

    // Move back to Backlog
    $this->actingAs($this->user)->patch("/projects/{$this->project->id}/tasks/{$task->id}/sprint", [
        'sprint_id' => null,
    ]);

    $task->refresh();
    expect($task->sprint_id)->toBeNull();
});

test('user can start a sprint and lock baseline points', function () {
    $sprintService = app(SprintService::class);
    $sprint = $sprintService->createSprint($this->project, $this->user, ['name' => 'Sprint 1']);

    $status = $this->project->statuses()->first();
    Task::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'status_id' => $status->id,
        'sprint_id' => $sprint->id,
        'sequence_number' => 1,
        'key' => 'ASC-1',
        'title' => 'Design Sprint Board',
        'rank' => '0|hzzzzz:',
        'estimate_points' => 8.0,
        'created_by' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->post("/projects/{$this->project->id}/sprints/{$sprint->id}/start", [
        'duration_weeks' => 2,
        'goal' => 'Launch initial MVP',
    ]);

    $response->assertRedirect();
    $sprint->refresh();

    expect($sprint->status)->toBe('active');
    expect($sprint->committed_points)->toEqual(8.0);
    expect($sprint->started_at)->not->toBeNull();
    expect($sprint->end_date)->not->toBeNull();
});

test('cannot start multiple active sprints on the same project', function () {
    $sprintService = app(SprintService::class);
    $sprint1 = $sprintService->createSprint($this->project, $this->user, ['name' => 'Sprint 1']);
    $sprint2 = $sprintService->createSprint($this->project, $this->user, ['name' => 'Sprint 2']);

    $sprintService->startSprint($sprint1, $this->user);

    // Attempt starting sprint2 while sprint1 is active
    $response = $this->actingAs($this->user)->post("/projects/{$this->project->id}/sprints/{$sprint2->id}/start", [
        'duration_weeks' => 2,
    ]);

    $response->assertSessionHasErrors(['sprint']);
    $sprint2->refresh();
    expect($sprint2->status)->toBe('future');
});

test('user can complete an active sprint and move incomplete tasks to backlog', function () {
    $sprintService = app(SprintService::class);
    $sprint = $sprintService->createSprint($this->project, $this->user, ['name' => 'Sprint 1']);

    $todoStatus = $this->project->statuses()->where('slug', 'backlog')->first() ?? $this->project->statuses()->first();
    $doneStatus = $this->project->statuses()->where('is_completed', true)->first();

    // Task 1: Completed (5 SP)
    $task1 = Task::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'status_id' => $doneStatus->id,
        'sprint_id' => $sprint->id,
        'sequence_number' => 1,
        'key' => 'ASC-1',
        'title' => 'Finished Feature',
        'rank' => '0|hzzzzz:',
        'estimate_points' => 5.0,
        'completed_at' => now(),
        'created_by' => $this->user->id,
    ]);

    // Task 2: Incomplete (3 SP)
    $task2 = Task::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'status_id' => $todoStatus->id,
        'sprint_id' => $sprint->id,
        'sequence_number' => 2,
        'key' => 'ASC-2',
        'title' => 'Unfinished Feature',
        'rank' => '0|i00000:',
        'estimate_points' => 3.0,
        'created_by' => $this->user->id,
    ]);

    $sprintService->startSprint($sprint, $this->user);

    $response = $this->actingAs($this->user)->post("/projects/{$this->project->id}/sprints/{$sprint->id}/complete", [
        'destination_type' => 'backlog',
    ]);

    $response->assertRedirect();
    $sprint->refresh();
    $task1->refresh();
    $task2->refresh();

    expect($sprint->status)->toBe('completed');
    expect($sprint->completed_points)->toEqual(5.0);
    expect($task1->sprint_id)->toBe($sprint->id); // Completed task stays associated
    expect($task2->sprint_id)->toBeNull(); // Incomplete task moved to Backlog
});

test('user can complete an active sprint and move incomplete tasks to next sprint', function () {
    $sprintService = app(SprintService::class);
    $sprint1 = $sprintService->createSprint($this->project, $this->user, ['name' => 'Sprint 1']);
    $sprint2 = $sprintService->createSprint($this->project, $this->user, ['name' => 'Sprint 2']);

    $todoStatus = $this->project->statuses()->first();

    $task = Task::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'status_id' => $todoStatus->id,
        'sprint_id' => $sprint1->id,
        'sequence_number' => 1,
        'key' => 'ASC-1',
        'title' => 'Unfinished Feature',
        'rank' => '0|hzzzzz:',
        'estimate_points' => 5.0,
        'created_by' => $this->user->id,
    ]);

    $sprintService->startSprint($sprint1, $this->user);

    $response = $this->actingAs($this->user)->post("/projects/{$this->project->id}/sprints/{$sprint1->id}/complete", [
        'destination_type' => 'sprint',
        'target_sprint_id' => $sprint2->id,
    ]);

    $response->assertRedirect();
    $task->refresh();
    expect($task->sprint_id)->toBe($sprint2->id); // Incomplete task moved to Sprint 2
});

test('user can fetch burndown chart data for sprint', function () {
    $sprintService = app(SprintService::class);
    $sprint = $sprintService->createSprint($this->project, $this->user, [
        'name' => 'Sprint 1',
        'start_date' => now()->toDateString(),
        'end_date' => now()->addWeeks(2)->toDateString(),
    ]);

    $sprintService->startSprint($sprint, $this->user);

    $response = $this->actingAs($this->user)->get("/projects/{$this->project->id}/sprints/{$sprint->id}/burndown");

    $response->assertOk()
        ->assertJsonStructure([
            'sprint' => ['id', 'name', 'start_date', 'end_date', 'committed_points', 'status'],
            'days' => [
                '*' => ['date', 'day_label', 'ideal_remaining', 'actual_remaining'],
            ],
        ]);
});

test('deleting a sprint moves its tasks back to backlog', function () {
    $sprintService = app(SprintService::class);
    $sprint = $sprintService->createSprint($this->project, $this->user, ['name' => 'Sprint To Delete']);

    $status = $this->project->statuses()->first();
    $task = Task::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'status_id' => $status->id,
        'sprint_id' => $sprint->id,
        'sequence_number' => 1,
        'key' => 'ASC-1',
        'title' => 'Task in Deleted Sprint',
        'rank' => '0|hzzzzz:',
        'created_by' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->delete("/projects/{$this->project->id}/sprints/{$sprint->id}");

    $response->assertRedirect();
    $this->assertSoftDeleted('sprints', ['id' => $sprint->id]);
    $task->refresh();
    expect($task->sprint_id)->toBeNull();
});
