<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\SlaEscalationLog;
use App\Models\SlaPolicy;
use App\Models\Task;
use App\Models\TaskSlaTracker;
use App\Models\User;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->memberRole = Role::whereNull('organization_id')->where('slug', 'member')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'Support Desk Org']);

    $this->leadUser = User::factory()->create(['name' => 'Support Lead', 'email' => 'lead@support.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->leadUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devUser = User::factory()->create(['name' => 'Dev Engineer', 'email' => 'dev@support.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest Observer', 'email' => 'guest@support.com']);
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
        'name' => 'Customer Helpdesk Project',
        'key' => 'HELP',
    ]);

    $this->policy = SlaPolicy::create([
        'organization_id' => $this->org->id,
        'name' => 'High Priority Customer SLA',
        'priority' => 'high',
        'response_time_hours' => 2,
        'resolution_time_hours' => 8,
        'operational_hours' => '24x7',
        'active' => true,
    ]);

    $this->task = Task::factory()->create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'title' => 'Critical Payment Gateway Timeout',
        'priority' => 'medium',
    ]);
    $this->task->assignees()->attach($this->devUser->id, ['assigned_at' => now()]);

    $this->tracker = TaskSlaTracker::create([
        'task_id' => $this->task->id,
        'sla_policy_id' => $this->policy->id,
        'response_due_at' => now()->addHours(1),
        'resolution_due_at' => now()->addHours(2), // < 4 hours -> imminent breach
        'status' => 'in_progress',
    ]);
});

test('user can view sla breach forecast dashboard', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sla/forecast');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/sla/forecast')
            ->has('metrics')
            ->has('tickets')
            ->has('escalationLogs')
            ->has('leads')
            ->has('projects')
        );
});

test('user can execute tiered escalation on task', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sla/forecast/tasks/{$this->task->id}/escalate", [
            'tier' => 2,
            'new_assignee_id' => $this->leadUser->id,
            'reason' => 'Predicted breach in 2 hours, engineering manager takeover needed.',
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $this->task->refresh();
    expect($this->task->priority)->toBe('urgent');
    expect($this->task->assignees->pluck('id'))->toContain($this->leadUser->id);

    $log = SlaEscalationLog::where('task_id', $this->task->id)->first();
    expect($log)->not->toBeNull();
    expect($log->escalation_tier)->toBe(2);
    expect($log->new_priority)->toBe('urgent');
});

test('user can record mitigation note', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sla/forecast/tasks/{$this->task->id}/mitigate", [
            'note' => 'Downstream provider database index rebuild in progress.',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);
});

test('guest role forbidden from escalating sla', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sla/forecast/tasks/{$this->task->id}/escalate", [
            'tier' => 1,
            'reason' => 'Unauthorized escalation attempt.',
        ])
        ->assertForbidden();
});
