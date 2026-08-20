<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\ProjectForecastScenario;
use App\Models\Role;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowStatus;
use App\Services\Agile\SprintForecastService;
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

    $this->org = Organization::factory()->create(['name' => 'Forecast Org']);

    $this->ownerUser = User::factory()->create(['name' => 'Scrum Master', 'email' => 'sm@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ownerUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devA = User::factory()->create(['name' => 'Developer Alpha', 'email' => 'alpha@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devA->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest Observer', 'email' => 'guest@example.com']);
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
        'name' => 'Predictive Analytics Platform',
        'slug' => 'predictive-analytics-platform',
        'key' => 'PAP',
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

    // Historical completed sprints with velocity
    $this->sprint1 = Sprint::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint 1',
        'status' => 'completed',
        'completed_points' => 20.0,
        'committed_points' => 22.0,
        'completed_at' => now()->subWeeks(4),
    ]);

    $this->sprint2 = Sprint::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint 2',
        'status' => 'completed',
        'completed_points' => 24.0,
        'committed_points' => 25.0,
        'completed_at' => now()->subWeeks(2),
    ]);

    // Backlog tasks
    Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 1,
        'key' => 'PAP-1',
        'title' => 'Implement Monte Carlo CDF Graph',
        'type' => 'story',
        'priority' => 'high',
        'created_by' => $this->ownerUser->id,
        'estimate_points' => 13.0,
        'rank' => '0|hzzzzz:',
    ]);

    Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 2,
        'key' => 'PAP-2',
        'title' => 'Add Throughput Stability Gauge',
        'type' => 'story',
        'priority' => 'medium',
        'created_by' => $this->ownerUser->id,
        'estimate_points' => 8.0,
        'rank' => '0|hzzzzz:0',
    ]);
});

test('user can view sprint forecast dashboard and historical velocity', function () {
    $response = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/projects/{$this->project->id}/forecast");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/forecast/index')
            ->has('historical_sprints', 2)
            ->has('velocity_metrics')
            ->has('backlog_stats')
            ->has('simulation')
            ->where('velocity_metrics.avg_velocity', 22)
        );
});

test('on the fly monte carlo simulation calculation', function () {
    $response = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/forecast/simulate", [
            'target_points' => 60,
            'simulation_runs' => 500,
            'historical_sprints_count' => 5,
            'sprint_duration_days' => 14,
        ]);

    $response->assertOk()
        ->assertJsonStructure([
            'success',
            'simulation' => [
                'target_points',
                'simulation_runs',
                'metrics',
                'percentiles' => [
                    'p50',
                    'p85',
                    'p95',
                ],
                'distribution_bins',
                'readiness_score',
            ],
        ]);
});

test('user can save and delete forecast scenarios', function () {
    // 1. Save scenario
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/forecast/scenarios", [
            'title' => 'Release 1.0 Scope Forecast',
            'target_scope_type' => 'custom_points',
            'target_points' => 50,
            'simulation_runs' => 1000,
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $scenario = ProjectForecastScenario::where('project_id', $this->project->id)->first();
    expect($scenario)->not->toBeNull();
    expect($scenario->title)->toBe('Release 1.0 Scope Forecast');
    expect($scenario->results)->not->toBeNull();

    // 2. Delete scenario
    $deleteResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/projects/{$this->project->id}/forecast/scenarios/{$scenario->id}");

    $deleteResponse->assertOk()
        ->assertJson(['success' => true]);

    expect(ProjectForecastScenario::find($scenario->id))->toBeNull();
});

test('forecast handles projects without historical sprints gracefully', function () {
    $emptyProject = Project::create([
        'organization_id' => $this->org->id,
        'name' => 'Brand New Project',
        'slug' => 'brand-new-project',
        'key' => 'BNP',
        'status' => 'active',
        'visibility' => 'private',
        'created_by' => $this->ownerUser->id,
    ]);

    $service = app(SprintForecastService::class);
    $dashboard = $service->getForecastDashboard($emptyProject);

    expect($dashboard['historical_sprints'])->not->toBeEmpty();
    expect($dashboard['velocity_metrics']['avg_velocity'])->toBeGreaterThan(0);
    expect($dashboard['simulation']['percentiles']['p85']['sprints'])->toBeGreaterThan(0);
});

test('guest role forbidden from saving forecast scenarios', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/forecast/scenarios", [
            'title' => 'Unauthorized Scenario',
            'target_points' => 100,
        ])
        ->assertForbidden();
});
