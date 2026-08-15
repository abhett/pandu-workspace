<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->organization = Organization::create([
        'name' => 'Acme Corporation',
        'slug' => 'acme-corp',
    ]);

    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
    ]);

    session(['current_organization_id' => $this->organization->id]);

    $this->project = Project::create([
        'organization_id' => $this->organization->id,
        'name' => 'Pandu Core Platform',
        'key' => 'PANDU',
        'slug' => 'pandu-core-platform',
        'type' => 'kanban',
        'status' => 'active',
        'lead_user_id' => $this->user->id,
    ]);

    $this->workflow = Workflow::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'name' => 'Kanban Workflow',
        'is_default' => true,
    ]);

    $this->todoStatus = WorkflowStatus::create([
        'workflow_id' => $this->workflow->id,
        'project_id' => $this->project->id,
        'name' => 'To Do',
        'slug' => 'to-do',
        'category' => 'unstarted',
        'color' => '#3b82f6',
        'position' => 1,
        'is_initial' => true,
    ]);

    $this->inProgressStatus = WorkflowStatus::create([
        'workflow_id' => $this->workflow->id,
        'project_id' => $this->project->id,
        'name' => 'In Progress',
        'slug' => 'in-progress',
        'category' => 'started',
        'color' => '#f59e0b',
        'position' => 2,
    ]);

    $this->doneStatus = WorkflowStatus::create([
        'workflow_id' => $this->workflow->id,
        'project_id' => $this->project->id,
        'name' => 'Done',
        'slug' => 'done',
        'category' => 'completed',
        'color' => '#10b981',
        'position' => 3,
        'is_completed' => true,
    ]);
});

test('user can view project tasks list page', function () {
    $response = $this->actingAs($this->user)
        ->get("/projects/{$this->project->id}/tasks");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/tasks/index')
            ->has('tasks.data')
            ->has('statuses', 3)
            ->has('stats')
        );
});

test('user can create a task with sequential key', function () {
    $response = $this->actingAs($this->user)
        ->post("/projects/{$this->project->id}/tasks", [
            'title' => 'Buat auth token API',
            'description' => 'Implementasikan Sanctum token generator',
            'type' => 'task',
            'priority' => 'high',
            'status_id' => $this->todoStatus->id,
            'estimate_points' => 3,
            'due_date' => '2026-09-01',
        ]);

    $response->assertSessionHasNoErrors();

    $this->assertDatabaseHas('tasks', [
        'project_id' => $this->project->id,
        'key' => 'PANDU-1',
        'title' => 'Buat auth token API',
        'type' => 'task',
        'priority' => 'high',
        'status_id' => $this->todoStatus->id,
        'version' => 1,
    ]);

    // Create second task
    $this->actingAs($this->user)
        ->post("/projects/{$this->project->id}/tasks", [
            'title' => 'Bug memory leak pada worker',
            'type' => 'bug',
            'priority' => 'highest',
        ]);

    $this->assertDatabaseHas('tasks', [
        'project_id' => $this->project->id,
        'key' => 'PANDU-2',
        'title' => 'Bug memory leak pada worker',
        'type' => 'bug',
    ]);
});

test('user can view task details via JSON XHR', function () {
    $task = Task::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 1,
        'key' => 'PANDU-1',
        'title' => 'Tugas Uji',
        'type' => 'task',
        'priority' => 'medium',
        'rank' => 'V',
        'version' => 1,
    ]);

    $response = $this->actingAs($this->user)
        ->getJson("/projects/{$this->project->id}/tasks/{$task->id}");

    $response->assertOk()
        ->assertJsonPath('task.id', $task->id)
        ->assertJsonPath('task.key', 'PANDU-1')
        ->assertJsonPath('task.title', 'Tugas Uji');
});

test('user can update task details', function () {
    $task = Task::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 1,
        'key' => 'PANDU-1',
        'title' => 'Judul Awal',
        'type' => 'task',
        'priority' => 'low',
        'rank' => 'V',
        'version' => 1,
    ]);

    $response = $this->actingAs($this->user)
        ->put("/projects/{$this->project->id}/tasks/{$task->id}", [
            'title' => 'Judul Baru yang Diperbarui',
            'priority' => 'highest',
            'estimate_points' => 5,
        ]);

    $response->assertSessionHasNoErrors();

    $task->refresh();
    expect($task->title)->toBe('Judul Baru yang Diperbarui')
        ->and($task->priority)->toBe('highest')
        ->and($task->estimate_points)->toBe(5.0)
        ->and($task->version)->toBe(2);
});

test('user can soft delete a task', function () {
    $task = Task::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 1,
        'key' => 'PANDU-1',
        'title' => 'Tugas Dihapus',
        'type' => 'task',
        'priority' => 'low',
        'rank' => 'V',
        'version' => 1,
    ]);

    $response = $this->actingAs($this->user)
        ->delete("/projects/{$this->project->id}/tasks/{$task->id}");

    $response->assertSessionHasNoErrors();
    $this->assertSoftDeleted('tasks', ['id' => $task->id]);
});

test('tenant isolation: user from another organization cannot access tasks', function () {
    $otherUser = User::factory()->create();
    $otherOrg = Organization::create([
        'name' => 'Other Corp',
        'slug' => 'other-corp',
    ]);
    OrganizationMembership::create([
        'organization_id' => $otherOrg->id,
        'user_id' => $otherUser->id,
        'role' => 'owner',
    ]);

    session(['current_organization_id' => $otherOrg->id]);

    $response = $this->actingAs($otherUser)
        ->get("/projects/{$this->project->id}/tasks");

    $response->assertForbidden();
});
