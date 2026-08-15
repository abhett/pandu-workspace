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
        'wip_limit' => 3,
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

test('user can view kanban board page with statuses and tasks', function () {
    Task::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 1,
        'key' => 'PANDU-1',
        'title' => 'Kartu Pertama',
        'type' => 'task',
        'priority' => 'high',
        'rank' => 'V',
        'version' => 1,
    ]);

    $response = $this->actingAs($this->user)
        ->get("/projects/{$this->project->id}/board");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/board')
            ->has('statuses', 3)
            ->has('tasks', 1)
        );
});

test('moving task to completed status sets completed_at timestamp', function () {
    $task = Task::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'status_id' => $this->inProgressStatus->id,
        'sequence_number' => 1,
        'key' => 'PANDU-1',
        'title' => 'Tugas Selesai',
        'type' => 'task',
        'priority' => 'medium',
        'rank' => 'V',
        'version' => 1,
    ]);

    expect($task->completed_at)->toBeNull();

    $response = $this->actingAs($this->user)
        ->patchJson("/projects/{$this->project->id}/tasks/{$task->id}/move", [
            'target_status_id' => $this->doneStatus->id,
            'expected_version' => 1,
        ]);

    $response->assertOk();

    $task->refresh();
    expect($task->status_id)->toBe($this->doneStatus->id)
        ->and($task->completed_at)->not->toBeNull()
        ->and($task->version)->toBe(2);
});
