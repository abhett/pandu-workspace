<?php

use App\Models\AutomationLog;
use App\Models\AutomationRule;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use App\Services\Project\ProjectCreationService;
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

    $this->user = User::factory()->create(['name' => 'Automation Admin', 'email' => 'auto@example.com']);
    $this->leadUser = User::factory()->create(['name' => 'Tech Lead', 'email' => 'lead@example.com']);
    $this->org = Organization::factory()->create(['name' => 'Kinetic Automation Org']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->leadUser->id,
        'role' => 'admin',
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->project = app(ProjectCreationService::class)->create($this->org, $this->user, [
        'name' => 'Automated Project',
        'key' => 'AUT',
        'type' => 'scrum',
    ]);

    $this->project->update(['lead_user_id' => $this->leadUser->id]);
});

test('user can view automation list and open builder', function () {
    $rule = AutomationRule::create([
        'organization_id' => $this->org->id,
        'name' => 'Auto-mark High Priority Milestones',
        'trigger_event' => 'task.created',
        'actions' => [
            ['type' => 'update_task_field', 'config' => ['field' => 'is_milestone', 'value' => true]],
        ],
        'created_by' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/automation');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('automation/index')
        ->has('rules', 1)
        ->where('rules.0.name', 'Auto-mark High Priority Milestones')
    );

    $builderResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/automation/create');

    $builderResponse->assertOk();
    $builderResponse->assertInertia(fn ($page) => $page->component('automation/builder'));
});

test('user can create, update, toggle and delete an automation rule', function () {
    // 1. Create
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/automation', [
            'name' => 'Auto Assign to Lead on Bug',
            'trigger_event' => 'task.created',
            'conditions' => [
                ['field' => 'priority', 'operator' => 'equals', 'value' => 'urgent'],
            ],
            'actions' => [
                ['type' => 'assign_user', 'config' => ['user_id' => 'project_lead']],
            ],
            'is_active' => true,
        ]);

    $response->assertOk();
    $rule = AutomationRule::where('name', 'Auto Assign to Lead on Bug')->first();
    expect($rule)->not->toBeNull();
    expect($rule->is_active)->toBeTrue();

    // 2. Toggle
    $toggleResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/automation/{$rule->id}/toggle");

    $toggleResponse->assertOk();
    $rule->refresh();
    expect($rule->is_active)->toBeFalse();

    // 3. Update
    $updateResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/automation/{$rule->id}", [
            'name' => 'Auto Assign to Lead on Urgent Issue',
            'trigger_event' => 'task.created',
            'actions' => [
                ['type' => 'assign_user', 'config' => ['user_id' => 'project_lead']],
            ],
            'is_active' => true,
        ]);

    $updateResponse->assertOk();
    $rule->refresh();
    expect($rule->name)->toBe('Auto Assign to Lead on Urgent Issue');
    expect($rule->is_active)->toBeTrue();

    // 4. Delete
    $deleteResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/automation/{$rule->id}");

    $deleteResponse->assertOk();
    expect(AutomationRule::find($rule->id))->toBeNull();
});

test('automation engine evaluates condition and executes actions on task.created', function () {
    // Create rule: when task.created with priority == 'urgent', auto-mark as milestone
    $rule = AutomationRule::create([
        'organization_id' => $this->org->id,
        'name' => 'Urgent Tasks Are Milestones',
        'trigger_event' => 'task.created',
        'conditions' => [
            ['field' => 'priority', 'operator' => 'equals', 'value' => 'urgent'],
        ],
        'actions' => [
            ['type' => 'update_task_field', 'config' => ['field' => 'is_milestone', 'value' => true]],
        ],
        'is_active' => true,
        'created_by' => $this->user->id,
    ]);

    // Create non-matching task (medium priority)
    $taskNormal = app(TaskService::class)->create($this->project, $this->user, [
        'title' => 'Normal Task',
        'priority' => 'medium',
        'is_milestone' => false,
    ]);

    $taskNormal->refresh();
    expect((bool) $taskNormal->is_milestone)->toBeFalse();

    // Create matching task (urgent priority)
    $taskUrgent = app(TaskService::class)->create($this->project, $this->user, [
        'title' => 'Critical Production Bug',
        'priority' => 'urgent',
        'is_milestone' => false,
    ]);

    $taskUrgent->refresh();
    expect((bool) $taskUrgent->is_milestone)->toBeTrue();

    // Rule execution count and logs
    $rule->refresh();
    expect($rule->execution_count)->toBe(1);
    expect(AutomationLog::where('automation_rule_id', $rule->id)->count())->toBe(2); // 1 skipped, 1 success
});

test('user can run dry-run test on an automation rule', function () {
    $rule = AutomationRule::create([
        'organization_id' => $this->org->id,
        'name' => 'Test Rule',
        'trigger_event' => 'task.created',
        'conditions' => [
            ['field' => 'priority', 'operator' => 'equals', 'value' => 'high'],
        ],
        'actions' => [
            ['type' => 'send_notification', 'config' => ['title' => 'High Priority Alert']],
        ],
        'is_active' => true,
        'created_by' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/automation/{$rule->id}/test-run", [
            'payload' => [
                'priority' => 'high',
            ],
        ]);

    $response->assertOk();
    $response->assertJson([
        'success' => true,
        'result' => [
            'status' => 'success',
        ],
    ]);
});
