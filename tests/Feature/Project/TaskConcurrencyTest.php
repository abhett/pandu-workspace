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
});

test('moving task with matching expected_version succeeds and increments version', function () {
    $task = Task::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 1,
        'key' => 'PANDU-1',
        'title' => 'Tugas Concurrency',
        'type' => 'task',
        'priority' => 'medium',
        'rank' => 'V',
        'version' => 1,
    ]);

    $response = $this->actingAs($this->user)
        ->patchJson("/projects/{$this->project->id}/tasks/{$task->id}/move", [
            'target_status_id' => $this->inProgressStatus->id,
            'prev_rank' => null,
            'next_rank' => null,
            'expected_version' => 1,
        ]);

    $response->assertOk()
        ->assertJsonPath('task.status_id', $this->inProgressStatus->id)
        ->assertJsonPath('task.version', 2);

    $task->refresh();
    expect($task->version)->toBe(2)
        ->and($task->status_id)->toBe($this->inProgressStatus->id);
});

test('moving task with stale expected_version triggers 409 conflict error', function () {
    $task = Task::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 1,
        'key' => 'PANDU-1',
        'title' => 'Tugas Concurrency',
        'type' => 'task',
        'priority' => 'medium',
        'rank' => 'V',
        'version' => 3, // Already updated by someone else to v3
    ]);

    // Client still thinks it is version 1
    $response = $this->actingAs($this->user)
        ->patchJson("/projects/{$this->project->id}/tasks/{$task->id}/move", [
            'target_status_id' => $this->inProgressStatus->id,
            'expected_version' => 1,
        ]);

    $response->assertStatus(409)
        ->assertJsonPath('error.code', 'TASK_VERSION_CONFLICT')
        ->assertJsonPath('error.details.expected_version', 1)
        ->assertJsonPath('error.details.current_version', 3);
});

test('updating task with stale expected_version triggers 409 conflict error', function () {
    $task = Task::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 1,
        'key' => 'PANDU-1',
        'title' => 'Tugas Concurrency',
        'type' => 'task',
        'priority' => 'medium',
        'rank' => 'V',
        'version' => 5,
    ]);

    $response = $this->actingAs($this->user)
        ->putJson("/projects/{$this->project->id}/tasks/{$task->id}", [
            'title' => 'Perubahan Judul',
            'expected_version' => 4,
        ]);

    $response->assertStatus(409)
        ->assertJsonPath('error.code', 'TASK_VERSION_CONFLICT')
        ->assertJsonPath('error.details.expected_version', 4)
        ->assertJsonPath('error.details.current_version', 5);
});
