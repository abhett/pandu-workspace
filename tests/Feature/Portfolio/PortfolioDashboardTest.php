<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\TaskBlocker;
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

    $this->user = User::factory()->create(['name' => 'Executive Director', 'email' => 'director@example.com']);
    $this->org = Organization::factory()->create(['name' => 'Global Enterprise Org']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    // Create 3 Projects
    $this->project1 = app(ProjectCreationService::class)->create($this->org, $this->user, [
        'name' => 'Cloud Migration Project',
        'key' => 'CLD',
        'type' => 'scrum',
    ]);

    $this->project2 = app(ProjectCreationService::class)->create($this->org, $this->user, [
        'name' => 'Mobile App Replatform',
        'key' => 'MOB',
        'type' => 'scrum',
    ]);

    $this->project3 = app(ProjectCreationService::class)->create($this->org, $this->user, [
        'name' => 'Data Governance Framework',
        'key' => 'DGV',
        'type' => 'kanban',
    ]);
});

test('executive can view portfolio overview with cross-project health aggregation', function () {
    // Project 1: On Track (1 completed task, 1 milestone)
    $doneStatus = $this->project1->statuses()->where('category', 'done')->first();
    app(TaskService::class)->create($this->project1, $this->user, [
        'title' => 'Initial Assessment',
        'status_id' => $doneStatus?->id,
    ]);

    app(TaskService::class)->create($this->project1, $this->user, [
        'title' => 'Cloud Migration Milestone Beta',
        'is_milestone' => true,
        'due_date' => now()->addDays(30)->toDateString(),
    ]);

    // Project 2: Delayed (Has critical blocker)
    $task2 = app(TaskService::class)->create($this->project2, $this->user, [
        'title' => 'Payment Gateway Integration',
    ]);

    TaskBlocker::create([
        'project_id' => $this->project2->id,
        'task_id' => $task2->id,
        'reported_by' => $this->user->id,
        'reason' => 'Vendor license expired',
        'severity' => 'critical',
        'is_resolved' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/portfolio');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('portfolio/index')
        ->where('portfolio.total_projects', 3)
        ->has('portfolio.resource_utilization')
        ->has('portfolio.health_matrix')
        ->has('portfolio.projects', 3)
        ->has('portfolio.milestones_roadmap')
        ->where('portfolio.delayed_count', 1)
    );
});

test('portfolio correctly includes upcoming cross-project milestones in roadmap', function () {
    app(TaskService::class)->create($this->project1, $this->user, [
        'title' => 'Strategic Milestone Q3',
        'is_milestone' => true,
        'due_date' => now()->addDays(15)->toDateString(),
    ]);

    app(TaskService::class)->create($this->project3, $this->user, [
        'title' => 'Compliance Certification Go-Live',
        'is_milestone' => true,
        'due_date' => now()->addDays(45)->toDateString(),
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/portfolio');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('portfolio/index')
        ->has('portfolio.milestones_roadmap', 2)
        ->where('portfolio.milestones_roadmap.0.title', 'Strategic Milestone Q3')
        ->where('portfolio.milestones_roadmap.1.title', 'Compliance Certification Go-Live')
    );
});
