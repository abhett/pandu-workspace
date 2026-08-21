<?php

use App\Models\OkrKeyResult;
use App\Models\OkrObjective;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
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

    $this->org = Organization::factory()->create(['name' => 'Strategic OKR Enterprise']);

    $this->ceoUser = User::factory()->create(['name' => 'Chief Executive', 'email' => 'ceo@strategic.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ceoUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->leadUser = User::factory()->create(['name' => 'Product Lead', 'email' => 'lead@strategic.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->leadUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Auditor Guest', 'email' => 'auditor@strategic.com']);
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
        'name' => 'FinTech Scale Project',
        'slug' => 'fintech-scale-project',
        'key' => 'FSP',
        'status' => 'active',
        'visibility' => 'private',
        'created_by' => $this->ceoUser->id,
    ]);

    $this->workflow = Workflow::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'name' => 'Default Workflow',
        'is_default' => true,
    ]);

    $this->statusDone = WorkflowStatus::create([
        'workflow_id' => $this->workflow->id,
        'project_id' => $this->project->id,
        'name' => 'Done',
        'slug' => 'done',
        'category' => 'done',
        'color' => '#10b981',
        'position' => 2,
    ]);

    $this->task1 = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->statusDone->id,
        'sequence_number' => 1,
        'key' => 'FSP-1',
        'title' => 'Optimize Redis Caching Layer',
        'type' => 'task',
        'priority' => 'high',
        'created_by' => $this->ceoUser->id,
        'estimate_points' => 5.0,
        'rank' => '0|hzzzzz:',
    ]);
});

test('user can view okr alignment tree and progress roll up', function () {
    // 1. Create Company Objective
    $companyObj = OkrObjective::create([
        'organization_id' => $this->org->id,
        'owner_id' => $this->ceoUser->id,
        'title' => 'Expand Southeast Asia Market Share to 25%',
        'level' => 'company',
        'period' => '2026-Q1',
        'status' => 'on_track',
    ]);

    // 2. Create Key Result (50% done)
    OkrKeyResult::create([
        'objective_id' => $companyObj->id,
        'title' => 'Acquire 100,000 new active merchants',
        'metric_type' => 'numeric',
        'initial_value' => 0,
        'current_value' => 50000,
        'target_value' => 100000,
        'unit' => 'merchants',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/okrs/tree');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/okrs/tree')
            ->has('metrics')
            ->has('tree')
            ->has('flat_objectives')
            ->has('periods')
            ->has('projects')
            ->has('members')
        );
});

test('user can create company and child objectives', function () {
    // Top-level Company Objective
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/okrs/objectives', [
            'title' => 'Achieve 99.99% Infrastructure High Availability',
            'level' => 'company',
            'period' => '2026-Q1',
            'confidence_score' => 0.9,
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $companyObj = OkrObjective::where('title', 'Achieve 99.99% Infrastructure High Availability')->first();
    expect($companyObj)->not->toBeNull();
    expect($companyObj->level)->toBe('company');

    // Child Team Objective
    $response2 = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/okrs/objectives', [
            'parent_id' => $companyObj->id,
            'title' => 'Implement Multi-Region Database Replication',
            'level' => 'team',
            'period' => '2026-Q1',
            'project_id' => $this->project->id,
        ]);

    $response2->assertCreated();

    $childObj = OkrObjective::where('title', 'Implement Multi-Region Database Replication')->first();
    expect($childObj->parent_id)->toBe($companyObj->id);
    expect($childObj->project_id)->toBe($this->project->id);
});

test('user can update objective', function () {
    $obj = OkrObjective::create([
        'organization_id' => $this->org->id,
        'owner_id' => $this->ceoUser->id,
        'title' => 'Initial Objective Title',
        'level' => 'company',
        'period' => '2026-Q1',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/organization/okrs/objectives/{$obj->id}", [
            'title' => 'Updated Objective Title',
            'level' => 'department',
            'period' => '2026-Q2',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $obj->refresh();
    expect($obj->title)->toBe('Updated Objective Title');
    expect($obj->level)->toBe('department');
    expect($obj->period)->toBe('2026-Q2');
});

test('user can create and update key results', function () {
    $obj = OkrObjective::create([
        'organization_id' => $this->org->id,
        'owner_id' => $this->ceoUser->id,
        'title' => 'Speed up checkout API',
        'level' => 'project',
        'period' => '2026-Q1',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/okrs/objectives/{$obj->id}/key-results", [
            'title' => 'Reduce API p95 response time',
            'metric_type' => 'numeric',
            'initial_value' => 800,
            'current_value' => 800,
            'target_value' => 200,
            'unit' => 'ms',
            'weight' => 1.5,
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $kr = OkrKeyResult::where('objective_id', $obj->id)->first();
    expect($kr)->not->toBeNull();
    expect($kr->title)->toBe('Reduce API p95 response time');
    expect($kr->target_value)->toBe(200.0);

    // Update Progress
    $response2 = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/organization/okrs/key-results/{$kr->id}", [
            'current_value' => 300,
        ]);

    $response2->assertOk();
    $kr->refresh();
    expect($kr->current_value)->toBe(300.0);
});

test('user can link and unlink tasks to key results', function () {
    $obj = OkrObjective::create([
        'organization_id' => $this->org->id,
        'owner_id' => $this->ceoUser->id,
        'title' => 'Performance OKR',
        'level' => 'company',
        'period' => '2026-Q1',
    ]);

    $kr = OkrKeyResult::create([
        'objective_id' => $obj->id,
        'title' => 'Redis latency reduction',
        'metric_type' => 'percentage',
        'initial_value' => 0,
        'current_value' => 0,
        'target_value' => 100,
    ]);

    // Link Task
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/okrs/key-results/{$kr->id}/link-task", [
            'task_id' => $this->task1->id,
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect($kr->linkedTasks->pluck('id')->all())->toBe([$this->task1->id]);

    // Unlink Task
    $response2 = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/okrs/key-results/{$kr->id}/tasks/{$this->task1->id}");

    $response2->assertOk();
    expect($kr->fresh()->linkedTasks->count())->toBe(0);
});

test('user can delete objective and cascade key results', function () {
    $obj = OkrObjective::create([
        'organization_id' => $this->org->id,
        'owner_id' => $this->ceoUser->id,
        'title' => 'Temporary Goal',
        'level' => 'team',
        'period' => '2026-Q1',
    ]);

    $kr = OkrKeyResult::create([
        'objective_id' => $obj->id,
        'title' => 'Temporary Key Result',
        'metric_type' => 'percentage',
        'initial_value' => 0,
        'current_value' => 0,
        'target_value' => 100,
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/okrs/objectives/{$obj->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(OkrObjective::find($obj->id))->toBeNull();
    expect(OkrKeyResult::find($kr->id))->toBeNull();
});

test('guest role forbidden from managing okrs', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/okrs/objectives', [
            'title' => 'Guest Unauthorized Goal',
            'level' => 'company',
            'period' => '2026-Q1',
        ])
        ->assertForbidden();
});
