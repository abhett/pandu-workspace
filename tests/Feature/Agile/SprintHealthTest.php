<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\Sprint;
use App\Models\SprintImpediment;
use App\Models\Task;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowStatus;
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

    $this->org = Organization::factory()->create(['name' => 'Health Radar Org']);

    $this->ownerUser = User::factory()->create(['name' => 'Scrum Master', 'email' => 'sm@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ownerUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devA = User::factory()->create(['name' => 'Developer Bravo', 'email' => 'bravo@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devA->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Auditor Guest', 'email' => 'auditor@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->project = Project::create([
        'organization_id' => $this->org->id,
        'name' => 'FinTech Platform Core',
        'slug' => 'fintech-platform-core',
        'key' => 'FPC',
        'status' => 'active',
        'visibility' => 'private',
        'created_by' => $this->ownerUser->id,
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
        'slug' => 'to-do',
        'category' => 'todo',
        'color' => '#64748b',
        'position' => 0,
    ]);

    $this->doneStatus = WorkflowStatus::create([
        'workflow_id' => $this->workflow->id,
        'project_id' => $this->project->id,
        'name' => 'Done',
        'slug' => 'done',
        'category' => 'done',
        'color' => '#10b981',
        'position' => 2,
    ]);

    $this->sprint = Sprint::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint 12 - Core Payment Processing',
        'status' => 'active',
        'start_date' => now()->subDays(3),
        'end_date' => now()->addDays(11),
        'committed_points' => 30.0,
    ]);

    $this->task1 = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'sprint_id' => $this->sprint->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 1,
        'key' => 'FPC-1',
        'title' => 'Integrate Bank Settlement Webhook',
        'type' => 'story',
        'priority' => 'high',
        'created_by' => $this->ownerUser->id,
        'estimate_points' => 8.0,
        'rank' => '0|hzzzzz:',
    ]);

    $this->task2 = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'sprint_id' => $this->sprint->id,
        'status_id' => $this->doneStatus->id,
        'sequence_number' => 2,
        'key' => 'FPC-2',
        'title' => 'Configure Redis Cache Cluster',
        'type' => 'task',
        'priority' => 'medium',
        'created_by' => $this->ownerUser->id,
        'estimate_points' => 5.0,
        'rank' => '0|hzzzzz:0',
    ]);
});

test('user can view sprint health dashboard and composite score', function () {
    $response = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/projects/{$this->project->id}/sprints/health");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/sprints/health')
            ->has('current_sprint')
            ->has('health_score')
            ->has('health_category')
            ->has('pillars')
            ->has('scope_metrics')
            ->has('heatmap')
            ->has('impediments')
        );
});

test('user can create a sprint impediment', function () {
    $response = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/sprints/{$this->sprint->id}/impediments", [
            'title' => 'Third-party Bank Sandbox API Downtime',
            'description' => 'Cannot test webhook payload validation due to 503 response from partner sandbox',
            'category' => 'third_party_outage',
            'severity' => 'critical',
            'task_id' => $this->task1->id,
            'assigned_to' => $this->ownerUser->id,
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $impediment = SprintImpediment::where('sprint_id', $this->sprint->id)->first();
    expect($impediment)->not->toBeNull();
    expect($impediment->title)->toBe('Third-party Bank Sandbox API Downtime');
    expect($impediment->severity)->toBe('critical');
    expect($impediment->status)->toBe('open');
    expect($impediment->task_id)->toBe($this->task1->id);
});

test('user can escalate an impediment', function () {
    $impediment = SprintImpediment::create([
        'project_id' => $this->project->id,
        'sprint_id' => $this->sprint->id,
        'task_id' => $this->task1->id,
        'raised_by' => $this->devA->id,
        'title' => 'Vendor Contract Blocked',
        'category' => 'external_dependency',
        'severity' => 'high',
        'status' => 'open',
        'escalation_level' => 0,
    ]);

    $response = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/sprints/impediments/{$impediment->id}/escalate", [
            'escalation_notes' => 'Requires immediate sign-off from Head of Engineering',
            'assigned_to' => $this->ownerUser->id,
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $impediment->refresh();
    expect($impediment->status)->toBe('escalated');
    expect($impediment->escalation_level)->toBe(1);
    expect($impediment->escalated_at)->not->toBeNull();
    expect($impediment->escalation_notes)->toBe('Requires immediate sign-off from Head of Engineering');
});

test('user can resolve an impediment', function () {
    $impediment = SprintImpediment::create([
        'project_id' => $this->project->id,
        'sprint_id' => $this->sprint->id,
        'raised_by' => $this->devA->id,
        'title' => 'Redis Connection Pool Exhaustion',
        'category' => 'technical',
        'severity' => 'high',
        'status' => 'escalated',
        'escalation_level' => 1,
    ]);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/sprints/impediments/{$impediment->id}/resolve", [
            'resolution_summary' => 'Increased max connection limit in redis cluster configuration and deployed fix.',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $impediment->refresh();
    expect($impediment->status)->toBe('resolved');
    expect($impediment->resolved_at)->not->toBeNull();
    expect($impediment->resolution_summary)->toBe('Increased max connection limit in redis cluster configuration and deployed fix.');
});

test('user can delete an impediment', function () {
    $impediment = SprintImpediment::create([
        'project_id' => $this->project->id,
        'sprint_id' => $this->sprint->id,
        'raised_by' => $this->devA->id,
        'title' => 'Duplicate Blocker Note',
        'category' => 'technical',
        'severity' => 'low',
        'status' => 'open',
    ]);

    $response = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/projects/{$this->project->id}/sprints/impediments/{$impediment->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(SprintImpediment::find($impediment->id))->toBeNull();
});

test('guest role forbidden from creating or escalating impediments', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/sprints/{$this->sprint->id}/impediments", [
            'title' => 'Guest Blocker',
            'category' => 'technical',
            'severity' => 'low',
        ])
        ->assertForbidden();

    $impediment = SprintImpediment::create([
        'project_id' => $this->project->id,
        'sprint_id' => $this->sprint->id,
        'raised_by' => $this->ownerUser->id,
        'title' => 'Internal Blocker',
        'category' => 'technical',
        'severity' => 'medium',
        'status' => 'open',
    ]);

    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/sprints/impediments/{$impediment->id}/escalate", [
            'escalation_notes' => 'Unauthorized escalation',
        ])
        ->assertForbidden();
});
