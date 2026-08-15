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
    $this->user = User::factory()->create(['name' => 'Budi Santoso']);
    $this->member1 = User::factory()->create(['name' => 'Siti Rahma']);
    $this->member2 = User::factory()->create(['name' => 'Ahmad Dahlan']);

    $this->organization = Organization::create([
        'name' => 'Acme Corporation',
        'slug' => 'acme-corp',
    ]);

    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
    ]);
    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->member1->id,
        'role' => 'member',
    ]);
    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->member2->id,
        'role' => 'member',
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

    $this->status = WorkflowStatus::create([
        'workflow_id' => $this->workflow->id,
        'project_id' => $this->project->id,
        'name' => 'To Do',
        'slug' => 'to-do',
        'category' => 'unstarted',
        'color' => '#3b82f6',
        'position' => 1,
        'is_initial' => true,
    ]);
});

test('task supports multiple assignees via junction table per ADR-004', function () {
    $response = $this->actingAs($this->user)
        ->post("/projects/{$this->project->id}/tasks", [
            'title' => 'Tugas dengan 2 Assignee',
            'type' => 'task',
            'status_id' => $this->status->id,
            'assignee_ids' => [$this->member1->id, $this->member2->id],
        ]);

    $response->assertSessionHasNoErrors();

    $task = Task::where('project_id', $this->project->id)->first();
    expect($task->assignees)->toHaveCount(2)
        ->and($task->assignees->pluck('id')->all())->toEqualCanonicalizing([$this->member1->id, $this->member2->id]);

    $this->assertDatabaseHas('task_assignees', [
        'task_id' => $task->id,
        'user_id' => $this->member1->id,
        'assigned_by' => $this->user->id,
    ]);

    expect($this->member1->assignedTasks)->toHaveCount(1)
        ->and($this->member1->assignedTasks->first()->id)->toBe($task->id);
});

test('updating task assignees syncs junction table and keeps assigned_at metadata', function () {
    $task = Task::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'status_id' => $this->status->id,
        'sequence_number' => 1,
        'key' => 'PANDU-1',
        'title' => 'Tugas Sync Assignee',
        'type' => 'task',
        'priority' => 'medium',
        'rank' => 'V',
        'version' => 1,
    ]);

    $task->assignees()->attach([
        $this->member1->id => ['assigned_at' => now(), 'assigned_by' => $this->user->id],
    ]);

    expect($task->fresh()->assignees)->toHaveCount(1);

    // Update to replace member1 with member2 and user
    $this->actingAs($this->user)
        ->put("/projects/{$this->project->id}/tasks/{$task->id}", [
            'assignee_ids' => [$this->member2->id, $this->user->id],
        ]);

    $fresh = $task->fresh();
    expect($fresh->assignees)->toHaveCount(2)
        ->and($fresh->assignees->pluck('id')->all())->toEqualCanonicalizing([$this->member2->id, $this->user->id]);
});
