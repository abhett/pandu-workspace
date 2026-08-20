<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\SlaEscalationRule;
use App\Models\SlaPolicy;
use App\Models\Task;
use App\Models\TaskSlaTracker;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowStatus;
use App\Services\Sla\SlaEngineService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'SLA Ops Enterprise']);

    $this->ownerUser = User::factory()->create(['name' => 'Ops Director', 'email' => 'ops@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ownerUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest Inspector', 'email' => 'guest@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->project = Project::factory()->create([
        'organization_id' => $this->org->id,
        'name' => 'Payment Gateway Service',
        'key' => 'PAY',
    ]);

    $this->workflow = Workflow::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'name' => 'Default Workflow',
        'is_default' => true,
    ]);

    $this->todoStatus = WorkflowStatus::create([
        'workflow_id' => $this->workflow->id,
        'project_id' => $this->project->id,
        'name' => 'To Do',
        'slug' => 'todo',
        'category' => 'todo',
        'color' => '#64748b',
        'position' => 0,
    ]);
});

test('user can view organization sla dashboard and metrics', function () {
    $policy = SlaPolicy::create([
        'organization_id' => $this->org->id,
        'name' => 'Critical Incident Policy',
        'priority' => 'urgent',
        'issue_type' => 'bug',
        'response_time_hours' => 1,
        'resolution_time_hours' => 4,
        'operational_hours' => '24x7',
        'active' => true,
    ]);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sla');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/sla/index')
            ->has('policies', 1)
            ->has('metrics')
            ->where('policies.0.name', 'Critical Incident Policy')
        );
});

test('user can create a new sla policy with default escalation rule', function () {
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sla', [
            'name' => 'High Priority Customer Ticket SLA',
            'description' => 'Guarantees response within 2 hours',
            'project_id' => $this->project->id,
            'priority' => 'high',
            'issue_type' => 'all',
            'response_time_hours' => 2,
            'resolution_time_hours' => 12,
            'operational_hours' => 'business_hours',
            'active' => true,
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $this->assertDatabaseHas('sla_policies', [
        'organization_id' => $this->org->id,
        'name' => 'High Priority Customer Ticket SLA',
        'response_time_hours' => 2,
        'resolution_time_hours' => 12,
    ]);

    $policy = SlaPolicy::where('name', 'High Priority Customer Ticket SLA')->first();
    expect($policy->escalationRules)->not->toBeEmpty();
});

test('user can update sla policy details', function () {
    $policy = SlaPolicy::create([
        'organization_id' => $this->org->id,
        'name' => 'Standard SLA',
        'priority' => 'medium',
        'issue_type' => 'task',
        'response_time_hours' => 4,
        'resolution_time_hours' => 24,
        'operational_hours' => '24x7',
        'active' => true,
    ]);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/organization/sla/{$policy->id}", [
            'name' => 'Enhanced Standard SLA',
            'priority' => 'medium',
            'issue_type' => 'task',
            'response_time_hours' => 3,
            'resolution_time_hours' => 18,
            'operational_hours' => 'business_hours',
            'active' => true,
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $policy->refresh();
    expect($policy->name)->toBe('Enhanced Standard SLA');
    expect($policy->response_time_hours)->toBe(3);
    expect($policy->resolution_time_hours)->toBe(18);
});

test('user can add and delete escalation rules on a policy', function () {
    $policy = SlaPolicy::create([
        'organization_id' => $this->org->id,
        'name' => 'Security SLA',
        'priority' => 'urgent',
        'issue_type' => 'all',
        'response_time_hours' => 1,
        'resolution_time_hours' => 4,
        'operational_hours' => '24x7',
    ]);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sla/{$policy->id}/escalation-rules", [
            'trigger_type' => 'response_breached',
            'action_type' => 'escalate_priority',
            'action_payload' => ['new_priority' => 'urgent'],
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $rule = SlaEscalationRule::where('sla_policy_id', $policy->id)->first();
    expect($rule)->not->toBeNull();

    // Delete rule
    $delResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/sla/escalation-rules/{$rule->id}");

    $delResponse->assertOk()
        ->assertJson(['success' => true]);

    $this->assertDatabaseMissing('sla_escalation_rules', ['id' => $rule->id]);
});

test('tasks automatically attach to matching sla and compute due dates', function () {
    $policy = SlaPolicy::create([
        'organization_id' => $this->org->id,
        'name' => 'Urgent Bug SLA',
        'priority' => 'urgent',
        'issue_type' => 'bug',
        'response_time_hours' => 2,
        'resolution_time_hours' => 6,
        'operational_hours' => '24x7',
        'active' => true,
    ]);

    $task = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 10,
        'key' => 'PAY-10',
        'title' => 'Critical Payment Failure in Production',
        'type' => 'bug',
        'priority' => 'urgent',
        'rank' => '0|hzzzzz:',
    ]);

    $service = app(SlaEngineService::class);
    $tracker = $service->attachOrUpdateTaskSla($task);

    expect($tracker)->not->toBeNull();
    expect($tracker->sla_policy_id)->toBe($policy->id);
    expect($tracker->response_due_at)->not->toBeNull();
    expect($tracker->resolution_due_at)->not->toBeNull();
});

test('sla engine detects breaches and triggers escalation matrix to urgent', function () {
    $policy = SlaPolicy::create([
        'organization_id' => $this->org->id,
        'name' => 'Auto-Escalating SLA',
        'priority' => 'high',
        'issue_type' => 'task',
        'response_time_hours' => 1,
        'resolution_time_hours' => 2,
        'operational_hours' => '24x7',
        'active' => true,
    ]);

    SlaEscalationRule::create([
        'sla_policy_id' => $policy->id,
        'trigger_type' => 'resolution_breached',
        'action_type' => 'escalate_priority',
        'action_payload' => ['new_priority' => 'urgent'],
        'position' => 0,
        'active' => true,
    ]);

    $task = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 11,
        'key' => 'PAY-11',
        'title' => 'API Timeout on Webhook',
        'type' => 'task',
        'priority' => 'high',
        'rank' => '0|i00000:',
    ]);

    // Create an overdue tracker (due 2 hours ago)
    $tracker = TaskSlaTracker::create([
        'task_id' => $task->id,
        'sla_policy_id' => $policy->id,
        'response_due_at' => now()->subHours(3),
        'resolution_due_at' => now()->subHours(2),
        'status' => 'in_progress',
    ]);

    $service = app(SlaEngineService::class);
    $result = $service->scanAndEscalate($this->org);

    expect($result['newly_breached_count'])->toBe(1);
    expect($result['escalated_tasks_count'])->toBe(1);

    $task->refresh();
    expect($task->priority)->toBe('urgent');

    $tracker->refresh();
    expect($tracker->is_resolution_breached)->toBeTrue();
    expect($tracker->status)->toBe('breached');
});

test('first response and resolution flow updates tracker accurately', function () {
    $policy = SlaPolicy::create([
        'organization_id' => $this->org->id,
        'name' => 'Fast Response Policy',
        'priority' => 'all',
        'issue_type' => 'all',
        'response_time_hours' => 4,
        'resolution_time_hours' => 24,
        'operational_hours' => '24x7',
        'active' => true,
    ]);

    $task = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 12,
        'key' => 'PAY-12',
        'title' => 'Customer UI Issue',
        'type' => 'task',
        'priority' => 'medium',
        'rank' => '0|i00001:',
    ]);

    $service = app(SlaEngineService::class);
    $tracker = $service->attachOrUpdateTaskSla($task);

    // Record response within target
    $service->recordTaskResponse($task);
    $tracker->refresh();
    expect($tracker->responded_at)->not->toBeNull();
    expect($tracker->is_response_breached)->toBeFalse();

    // Record resolution within target
    $service->recordTaskResolution($task);
    $tracker->refresh();
    expect($tracker->resolved_at)->not->toBeNull();
    expect($tracker->is_resolution_breached)->toBeFalse();
    expect($tracker->status)->toBe('achieved');
});

test('user can trigger on-demand scan via run-scan endpoint', function () {
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sla/run-scan');

    $response->assertOk()
        ->assertJsonStructure([
            'success',
            'message',
            'result' => [
                'scanned_tasks_count',
                'newly_breached_count',
                'escalated_tasks_count',
            ],
        ]);
});

test('guest role is forbidden from managing sla policies', function () {
    $policy = SlaPolicy::create([
        'organization_id' => $this->org->id,
        'name' => 'Protected SLA',
        'priority' => 'urgent',
        'issue_type' => 'all',
        'response_time_hours' => 1,
        'resolution_time_hours' => 4,
        'operational_hours' => '24x7',
    ]);

    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sla', [
            'name' => 'Unauthorized SLA',
            'priority' => 'all',
            'issue_type' => 'all',
            'response_time_hours' => 1,
            'resolution_time_hours' => 4,
            'operational_hours' => '24x7',
        ])
        ->assertForbidden();

    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/sla/{$policy->id}")
        ->assertForbidden();
});
