<?php

use App\Models\CostCenter;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\ProjectBudget;
use App\Models\ProjectCostCenterAllocation;
use App\Models\ProjectExpense;
use App\Models\ProjectMemberRate;
use App\Models\Role;
use App\Models\Task;
use App\Models\TaskWorklog;
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

    $this->org = Organization::factory()->create(['name' => 'Enterprise Financial Org']);

    $this->cfoUser = User::factory()->create(['name' => 'Chief Financial Officer', 'email' => 'cfo@enterprise.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->cfoUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devUser = User::factory()->create(['name' => 'Lead Engineer', 'email' => 'engineer@enterprise.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'External Auditor', 'email' => 'auditor@enterprise.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    // Project Alpha
    $this->project = Project::create([
        'organization_id' => $this->org->id,
        'name' => 'Core Microservice Billing',
        'slug' => 'core-microservice-billing',
        'key' => 'CMB',
        'status' => 'active',
        'visibility' => 'private',
        'created_by' => $this->cfoUser->id,
    ]);

    $this->workflow = Workflow::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'name' => 'Default Workflow',
        'is_default' => true,
    ]);

    $this->status = WorkflowStatus::create([
        'workflow_id' => $this->workflow->id,
        'project_id' => $this->project->id,
        'name' => 'In Progress',
        'slug' => 'in-progress',
        'category' => 'in_progress',
        'color' => '#3b82f6',
        'position' => 1,
    ]);

    $this->task = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->status->id,
        'sequence_number' => 1,
        'key' => 'CMB-1',
        'title' => 'Implement Ledger Payment Gateway',
        'type' => 'task',
        'priority' => 'critical',
        'created_by' => $this->cfoUser->id,
        'estimate_points' => 8.0,
        'rank' => '0|hzzzzz:',
    ]);

    // Project Budget: 200,000,000 IDR
    ProjectBudget::create([
        'project_id' => $this->project->id,
        'total_budget' => 200000000,
        'currency' => 'IDR',
        'budget_type' => 'fixed',
    ]);

    // Member Hourly Rate: 500,000 IDR / hour
    ProjectMemberRate::create([
        'project_id' => $this->project->id,
        'user_id' => $this->devUser->id,
        'hourly_rate' => 500000,
        'billing_role' => 'Senior Architect',
    ]);

    // Task Worklog: 40 hours = 20,000,000 IDR Labor Cost
    TaskWorklog::create([
        'task_id' => $this->task->id,
        'project_id' => $this->project->id,
        'user_id' => $this->devUser->id,
        'duration_minutes' => 2400, // 40 hours
        'calculated_cost' => 20000000,
        'work_date' => now()->toDateString(),
        'description' => 'Architecture and initial gateway implementation',
    ]);

    // Approved Expense: 10,000,000 IDR Cloud Hosting
    ProjectExpense::create([
        'project_id' => $this->project->id,
        'submitted_by' => $this->cfoUser->id,
        'approved_by' => $this->cfoUser->id,
        'category' => 'cloud_hosting',
        'title' => 'AWS Cluster Provisioning',
        'amount' => 10000000,
        'currency' => 'IDR',
        'expense_date' => now()->toDateString(),
        'status' => 'approved',
    ]);
});

test('user can view cost allocation and profitability hub', function () {
    $costCenter = CostCenter::create([
        'organization_id' => $this->org->id,
        'manager_id' => $this->cfoUser->id,
        'code' => 'CC-ENG-01',
        'name' => 'Core Engineering',
        'department' => 'Engineering',
        'allocated_budget' => 500000000,
    ]);

    ProjectCostCenterAllocation::create([
        'cost_center_id' => $costCenter->id,
        'project_id' => $this->project->id,
        'allocation_percentage' => 100.00,
    ]);

    $response = $this->actingAs($this->cfoUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/financials/cost-allocation');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/financials/cost-allocation')
            ->has('metrics')
            ->has('projects')
            ->has('cost_centers')
            ->has('category_breakdown')
            ->has('members')
            ->has('raw_projects')
        );
});

test('user can create and update cost center', function () {
    $response = $this->actingAs($this->cfoUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/financials/cost-centers', [
            'code' => 'CC-MKT-01',
            'name' => 'Growth & Marketing',
            'department' => 'Marketing',
            'allocated_budget' => 150000000,
            'currency' => 'IDR',
            'description' => 'Digital Ads and Regional Expansion',
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $cc = CostCenter::where('code', 'CC-MKT-01')->first();
    expect($cc)->not->toBeNull();
    expect($cc->allocated_budget)->toBe(150000000.0);

    // Update
    $response2 = $this->actingAs($this->cfoUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/organization/financials/cost-centers/{$cc->id}", [
            'code' => 'CC-MKT-01',
            'name' => 'Growth, Marketing & PR',
            'department' => 'Marketing',
            'allocated_budget' => 200000000,
        ]);

    $response2->assertOk();
    $cc->refresh();
    expect($cc->name)->toBe('Growth, Marketing & PR');
    expect($cc->allocated_budget)->toBe(200000000.0);
});

test('user can allocate and remove project to cost center', function () {
    $cc = CostCenter::create([
        'organization_id' => $this->org->id,
        'code' => 'CC-OPS-01',
        'name' => 'Operations & IT',
        'department' => 'Operations',
        'allocated_budget' => 300000000,
    ]);

    // Allocate project
    $response = $this->actingAs($this->cfoUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/financials/cost-centers/{$cc->id}/allocate", [
            'project_id' => $this->project->id,
            'allocation_percentage' => 75,
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $alloc = ProjectCostCenterAllocation::where('cost_center_id', $cc->id)
        ->where('project_id', $this->project->id)
        ->first();

    expect($alloc)->not->toBeNull();
    expect($alloc->allocation_percentage)->toBe(75.0);

    // Remove allocation
    $response2 = $this->actingAs($this->cfoUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/financials/allocations/{$alloc->id}");

    $response2->assertOk();
    expect(ProjectCostCenterAllocation::find($alloc->id))->toBeNull();
});

test('project profitability and gross margin calculation', function () {
    // Budget: 200M
    // Labor: 20M (40h @ 500k)
    // Expenses: 10M
    // Total Incurred: 30M
    // Gross Margin: 170M (85% - Highly Profitable)

    $response = $this->actingAs($this->cfoUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/financials/cost-allocation');

    $response->assertOk();
    $props = $response->original->getData()['page']['props'];

    expect($props['metrics']['total_org_budget'])->toBe(200000000.0);
    expect($props['metrics']['total_incurred_cost'])->toBe(30000000.0);
    expect($props['metrics']['total_labor_cost'])->toBe(20000000.0);
    expect($props['metrics']['total_direct_expenses'])->toBe(10000000.0);
    expect($props['metrics']['overall_gross_profit'])->toBe(170000000.0);
    expect($props['metrics']['overall_gross_margin_pct'])->toBe(85.0);

    $projectRow = collect($props['projects'])->firstWhere('id', $this->project->id);
    expect($projectRow['profitability_status'])->toBe('highly_profitable');
});

test('user can delete cost center', function () {
    $cc = CostCenter::create([
        'organization_id' => $this->org->id,
        'code' => 'CC-TEMP-99',
        'name' => 'Temporary Cost Center',
        'department' => 'Misc',
        'allocated_budget' => 50000000,
    ]);

    $response = $this->actingAs($this->cfoUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/financials/cost-centers/{$cc->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(CostCenter::find($cc->id))->toBeNull();
});

test('guest role forbidden from managing cost centers', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/financials/cost-centers', [
            'code' => 'CC-UNAUTH-01',
            'name' => 'Unauthorized Cost Center',
            'department' => 'Misc',
            'allocated_budget' => 10000000,
        ])
        ->assertForbidden();
});
