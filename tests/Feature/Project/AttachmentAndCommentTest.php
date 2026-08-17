<?php

use App\Models\Comment;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\Task;
use App\Models\TaskChecklist;
use App\Models\User;
use App\Services\Project\ProjectCreationService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->user = User::factory()->create();
    $this->organization = Organization::factory()->create();
    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->project = app(ProjectCreationService::class)->create(
        $this->organization,
        $this->user,
        [
            'name' => 'Collab Project',
            'key' => 'COL',
            'type' => 'kanban',
        ]
    );

    $status = $this->project->statuses()->first();

    $this->task = Task::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'status_id' => $status->id,
        'sequence_number' => 1,
        'key' => 'COL-1',
        'title' => 'Task for Collaboration',
        'rank' => '0|hzzzzz:',
        'created_by' => $this->user->id,
    ]);
});

test('user can add, update, and delete comments on a task via web', function () {
    // 1. Add Comment
    $response = $this->actingAs($this->user)->post("/tasks/{$this->task->id}/comments", [
        'content' => 'Reviewing the design spec right now.',
    ]);

    $response->assertRedirect();
    $comment = Comment::where('task_id', $this->task->id)->first();
    expect($comment)->not->toBeNull();
    expect($comment->content)->toBe('Reviewing the design spec right now.');

    // 2. Add Nested Reply
    $replyResponse = $this->actingAs($this->user)->post("/tasks/{$this->task->id}/comments", [
        'content' => 'Looks great, approved!',
        'parent_id' => $comment->id,
    ]);

    $replyResponse->assertRedirect();
    expect($comment->replies()->count())->toBe(1);

    // 3. Update Comment
    $updateResponse = $this->actingAs($this->user)->put("/tasks/{$this->task->id}/comments/{$comment->id}", [
        'content' => 'Updated comment content.',
    ]);

    $updateResponse->assertRedirect();
    $comment->refresh();
    expect($comment->content)->toBe('Updated comment content.');

    // 4. Delete Comment
    $deleteResponse = $this->actingAs($this->user)->delete("/tasks/{$this->task->id}/comments/{$comment->id}");

    $deleteResponse->assertRedirect();
    $this->assertSoftDeleted('comments', ['id' => $comment->id]);
});

test('user can add, toggle, and delete checklist items on a task via web', function () {
    // 1. Add checklist item
    $response = $this->actingAs($this->user)->post("/tasks/{$this->task->id}/checklists", [
        'title' => 'Write unit tests for authentication',
    ]);

    $response->assertRedirect();
    $checklist = TaskChecklist::where('task_id', $this->task->id)->first();
    expect($checklist)->not->toBeNull();
    expect($checklist->title)->toBe('Write unit tests for authentication');
    expect($checklist->is_completed)->toBeFalse();

    // 2. Toggle checklist item to completed
    $toggleResponse = $this->actingAs($this->user)->patch("/tasks/{$this->task->id}/checklists/{$checklist->id}/toggle");

    $toggleResponse->assertRedirect();
    $checklist->refresh();
    expect($checklist->is_completed)->toBeTrue();
    expect($checklist->completed_at)->not->toBeNull();
    expect($checklist->completed_by)->toBe($this->user->id);

    // 3. Delete checklist item
    $deleteResponse = $this->actingAs($this->user)->delete("/tasks/{$this->task->id}/checklists/{$checklist->id}");

    $deleteResponse->assertRedirect();
    expect(TaskChecklist::find($checklist->id))->toBeNull();
});
