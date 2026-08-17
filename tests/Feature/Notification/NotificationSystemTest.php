<?php

use App\Models\Comment;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\Role;
use App\Models\Sprint;
use App\Models\User;
use App\Services\Project\ProjectCreationService;
use App\Services\Task\TaskService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    // 1. Organization & Users
    $this->userA = User::factory()->create(['name' => 'Alice Developer', 'email' => 'alice@example.com']);
    $this->userB = User::factory()->create(['name' => 'Bob Reviewer', 'email' => 'bob@example.com']);
    $this->userC = User::factory()->create(['name' => 'Charlie Manager', 'email' => 'charlie@example.com']);

    $this->org = Organization::factory()->create(['name' => 'Acme Corporation']);

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

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->userC->id,
        'role' => 'member',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->project = app(ProjectCreationService::class)->create($this->org, $this->userA, [
        'name' => 'Acme Core Project',
        'key' => 'ACM',
        'type' => 'scrum',
    ]);

    // Attach Bob & Charlie to project
    ProjectMember::create([
        'project_id' => $this->project->id,
        'user_id' => $this->userB->id,
        'role' => 'member',
        'joined_at' => now(),
    ]);

    ProjectMember::create([
        'project_id' => $this->project->id,
        'user_id' => $this->userC->id,
        'role' => 'member',
        'joined_at' => now(),
    ]);
});

test('user receives notification when assigned to a task', function () {
    $task = app(TaskService::class)->create($this->project, $this->userA, [
        'title' => 'Build Authentication Flow',
        'assignee_ids' => [$this->userB->id],
    ]);

    expect($this->userB->unreadNotifications)->toHaveCount(1);
    $notification = $this->userB->unreadNotifications->first();
    expect($notification->data['category'])->toBe('assigned');
    expect($notification->data['task_key'])->toBe($task->key);
});

test('user receives mention and comment notifications upon comment creation', function () {
    $task = app(TaskService::class)->create($this->project, $this->userA, [
        'title' => 'Implement Payment Gateway',
        'assignee_ids' => [$this->userB->id],
    ]);

    // User A comments and mentions User C: "@charlie@example.com please review this"
    $response = $this->actingAs($this->userA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/tasks/{$task->id}/comments", [
            'content' => 'Hey @charlie@example.com please check the invoice format.',
        ]);

    $response->assertCreated();

    // User C gets a mention notification
    expect($this->userC->unreadNotifications)->toHaveCount(1);
    expect($this->userC->unreadNotifications->first()->data['category'])->toBe('mention');

    // User B (assignee) gets both assigned and comment notifications
    $userBCategories = $this->userB->unreadNotifications->pluck('data.category')->all();
    expect($this->userB->unreadNotifications)->toHaveCount(2);
    expect($userBCategories)->toContain('assigned');
    expect($userBCategories)->toContain('comment');
});

test('project members receive sprint started notification', function () {
    $sprint = Sprint::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint 1',
        'status' => 'future',
        'sequence' => 1,
        'created_by' => $this->userA->id,
    ]);

    $response = $this->actingAs($this->userA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->post("/projects/{$this->project->id}/sprints/{$sprint->id}/start", [
            'name' => 'Sprint 1 - Kickoff',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addWeeks(2)->toDateString(),
        ]);

    $response->assertRedirect();

    // User B should receive sprint started notification
    $sprintNotification = $this->userB->unreadNotifications()->where('data->category', 'sprint')->first();
    expect($sprintNotification)->not->toBeNull();
    expect($sprintNotification->data['title'])->toBe('Sprint Dimulai');
});

test('user can fetch unread notifications via json and mark as read', function () {
    $task = app(TaskService::class)->create($this->project, $this->userA, [
        'title' => 'Design System Tokens',
        'assignee_ids' => [$this->userB->id],
    ]);

    // Fetch unread dropdown
    $response = $this->actingAs($this->userB)->getJson('/notifications/unread');
    $response->assertOk();
    $response->assertJsonStructure(['unread_count', 'notifications']);
    expect($response->json('unread_count'))->toBe(1);

    $notifId = $response->json('notifications.0.id');

    // Mark single notification as read
    $markResponse = $this->actingAs($this->userB)->postJson("/notifications/{$notifId}/read");
    $markResponse->assertOk();
    expect($markResponse->json('unread_count'))->toBe(0);

    $this->userB->refresh();
    expect($this->userB->unreadNotifications)->toHaveCount(0);
});

test('user can mark all notifications as read and delete notification', function () {
    app(TaskService::class)->create($this->project, $this->userA, [
        'title' => 'Task 1',
        'assignee_ids' => [$this->userB->id],
    ]);
    app(TaskService::class)->create($this->project, $this->userA, [
        'title' => 'Task 2',
        'assignee_ids' => [$this->userB->id],
    ]);

    expect($this->userB->unreadNotifications)->toHaveCount(2);

    // Mark all as read
    $markAllResponse = $this->actingAs($this->userB)->postJson('/notifications/read-all');
    $markAllResponse->assertOk();

    $this->userB->refresh();
    expect($this->userB->unreadNotifications)->toHaveCount(0);
    expect($this->userB->notifications)->toHaveCount(2);

    // Delete one notification
    $firstId = $this->userB->notifications->first()->id;
    $delResponse = $this->actingAs($this->userB)->deleteJson("/notifications/{$firstId}");
    $delResponse->assertOk();

    $this->userB->refresh();
    expect($this->userB->notifications)->toHaveCount(1);
});

test('user can view and update notification preferences', function () {
    $editResponse = $this->actingAs($this->userA)->get('/settings/notifications');
    $editResponse->assertOk();

    $updateResponse = $this->actingAs($this->userA)->putJson('/settings/notifications', [
        'preferences' => [
            [
                'event_type' => 'task_assigned',
                'in_app_enabled' => true,
                'email_enabled' => false,
            ],
            [
                'event_type' => 'mentioned',
                'in_app_enabled' => true,
                'email_enabled' => true,
            ],
            [
                'event_type' => 'task_commented',
                'in_app_enabled' => false,
                'email_enabled' => false,
            ],
            [
                'event_type' => 'sprint_events',
                'in_app_enabled' => true,
                'email_enabled' => true,
            ],
            [
                'event_type' => 'ai_completed',
                'in_app_enabled' => true,
                'email_enabled' => false,
            ],
        ],
    ]);

    $updateResponse->assertOk();
    expect($this->userA->wantsNotification('task_assigned', 'email'))->toBeFalse();
    expect($this->userA->wantsNotification('task_commented', 'in_app'))->toBeFalse();
    expect($this->userA->wantsNotification('mentioned', 'in_app'))->toBeTrue();
});
