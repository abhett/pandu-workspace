<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowStatus;
use App\Notifications\AutomationTriggeredNotification;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    $this->user = User::factory()->create(['name' => 'Inbox User', 'email' => 'inbox@example.com']);
    $this->org = Organization::factory()->create(['name' => 'Inbox Command Org']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->workflow = Workflow::create([
        'organization_id' => $this->org->id,
        'name' => 'Default Flow',
    ]);

    $this->todoStatus = WorkflowStatus::create([
        'workflow_id' => $this->workflow->id,
        'name' => 'To Do',
        'slug' => 'to-do',
        'category' => 'todo',
        'position' => 1,
    ]);

    $this->doneStatus = WorkflowStatus::create([
        'workflow_id' => $this->workflow->id,
        'name' => 'Done',
        'slug' => 'done',
        'category' => 'done',
        'position' => 2,
    ]);

    $this->project = Project::create([
        'organization_id' => $this->org->id,
        'workflow_id' => $this->workflow->id,
        'name' => 'Inbox Test Project',
        'slug' => 'inbox-test-project',
        'key' => 'INB',
        'owner_id' => $this->user->id,
    ]);
});

test('user can view inbox page with categorized counts and feed items', function () {
    // 1. Create a notification
    $this->user->notify(new AutomationTriggeredNotification(
        'Auto Assign Rule',
        'Tugas baru ditugaskan kepada Anda secara otomatis.'
    ));

    // 2. Create an overdue task
    $task = Task::factory()->create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'title' => 'Overdue Budget Task',
        'priority' => 'high',
        'due_date' => now()->subDays(2),
        'created_by' => $this->user->id,
    ]);
    $task->assignees()->attach($this->user->id);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/inbox');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('inbox/index')
        ->has('counts')
        ->has('items')
        ->where('counts.overdue', 1)
        ->where('counts.assigned', 1)
    );
});

test('user can mark a single notification as read and mark all as read', function () {
    $this->user->notify(new AutomationTriggeredNotification(
        'Rule 1',
        'Message 1'
    ));
    $this->user->notify(new AutomationTriggeredNotification(
        'Rule 2',
        'Message 2'
    ));

    $notif = $this->user->unreadNotifications()->first();
    expect($this->user->unreadNotifications()->count())->toBe(2);

    // Mark single as read
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/inbox/{$notif->id}/read");

    $response->assertOk();
    expect($this->user->unreadNotifications()->count())->toBe(1);

    // Mark all as read
    $allResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/inbox/mark-all-read');

    $allResponse->assertOk();
    expect($this->user->unreadNotifications()->count())->toBe(0);
});

test('user can snooze a notification until tomorrow', function () {
    $this->user->notify(new AutomationTriggeredNotification(
        'Sprint Reminder',
        'Sprint dimulai besok pagi.'
    ));

    $notif = $this->user->notifications()->first();

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/inbox/{$notif->id}/snooze", [
            'duration' => 'tomorrow',
        ]);

    $response->assertOk();
    $notif->refresh();
    expect($notif->snoozed_until)->not->toBeNull();
});

test('user can quick complete a task directly from inbox', function () {
    $task = Task::factory()->create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'title' => 'Quick Triage Task',
        'created_by' => $this->user->id,
    ]);

    expect($task->status_id)->toBe($this->todoStatus->id);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/inbox/tasks/{$task->id}/complete");

    $response->assertOk();
    $task->refresh();
    expect($task->status_id)->toBe($this->doneStatus->id);
});
