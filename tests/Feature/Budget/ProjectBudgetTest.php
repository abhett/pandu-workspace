<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\ProjectBudget;
use App\Models\ProjectExpense;
use App\Models\Role;
use App\Models\Task;
use App\Models\TaskWorklog;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowStatus;
use App\Services\Budget\ProjectBudgetService;
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

    $this->org = Organization::factory()->create(['name' => 'Fintech Project Org']);

    $this->ownerUser = User::factory()->create(['name' => 'Project Director', 'email' => 'director@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ownerUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->developerUser = User::factory()->create(['name' => 'Lead Dev', 'email' => 'dev@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->developerUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest Auditor', 'email' => 'guest@example.com']);
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
        'name' => 'Core Banking Modernization',
        'key' => 'BANK',
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

    $this->task = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 1,
        'key' => 'BANK-1',
        'title' => 'Integrate Swift Payment API',
        'type' => 'task',
        'priority' => 'high',
        'rank' => '0|hzzzzz:',
    ]);
});

test('user can view project budget dashboard and financial summary', function () {
    ProjectBudget::create([
        'project_id' => $this->project->id,
        'total_budget' => 100000000,
        'currency' => 'IDR',
        'budget_type' => 'fixed',
        'capex_amount' => 30000000,
        'opex_amount' => 70000000,
        'alert_threshold_percent' => 85,
        'created_by' => $this->ownerUser->id,
    ]);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/projects/{$this->project->id}/budget");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/budget')
            ->has('summary.budget')
            ->has('summary.financials')
            ->has('summary.categories')
            ->where('summary.budget.total_budget', 100000000)
        );
});

test('user can set and update project budget allocation', function () {
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/budget", [
            'total_budget' => 250000000,
            'currency' => 'IDR',
            'budget_type' => 'time_and_materials',
            'capex_amount' => 50000000,
            'opex_amount' => 200000000,
            'alert_threshold_percent' => 90,
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $this->assertDatabaseHas('project_budgets', [
        'project_id' => $this->project->id,
        'total_budget' => 250000000,
        'currency' => 'IDR',
        'alert_threshold_percent' => 90,
    ]);
});

test('user can set member hourly rate and calculate labor cost accurately', function () {
    // Set Lead Dev hourly rate: Rp 200,000 / hr
    $rateResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/budget/rates", [
            'user_id' => $this->developerUser->id,
            'hourly_rate' => 200000,
            'billing_role' => 'Senior Backend Engineer',
        ]);

    $rateResponse->assertOk()
        ->assertJson(['success' => true]);

    $this->assertDatabaseHas('project_member_rates', [
        'project_id' => $this->project->id,
        'user_id' => $this->developerUser->id,
        'hourly_rate' => 200000,
    ]);

    // Developer logs 3.5 hours (210 minutes) -> Expected cost: 3.5 * 200,000 = Rp 700,000
    $worklogResponse = $this->actingAs($this->developerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/budget/worklogs", [
            'task_id' => $this->task->id,
            'duration_minutes' => 210,
            'work_date' => now()->toDateString(),
            'description' => 'Implemented OAuth2 Swift Connect token exchange',
        ]);

    $worklogResponse->assertCreated()
        ->assertJson(['success' => true]);

    $this->assertDatabaseHas('task_worklogs', [
        'project_id' => $this->project->id,
        'task_id' => $this->task->id,
        'user_id' => $this->developerUser->id,
        'duration_minutes' => 210,
        'calculated_cost' => 700000,
    ]);
});

test('expense submission, approval, and rejection workflow', function () {
    // Developer submits software license expense
    $submitResponse = $this->actingAs($this->developerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/budget/expenses", [
            'category' => 'software_license',
            'title' => 'JetBrains All Products License',
            'amount' => 4500000,
            'currency' => 'IDR',
            'expense_date' => now()->toDateString(),
            'vendor' => 'JetBrains s.r.o.',
            'notes' => 'Annual subscription for backend engineers',
        ]);

    $submitResponse->assertCreated()
        ->assertJson(['success' => true]);

    $expense = ProjectExpense::where('title', 'JetBrains All Products License')->first();
    expect($expense)->not->toBeNull();
    expect($expense->status)->toBe('pending');

    // Director approves expense
    $approveResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/budget/expenses/{$expense->id}/approve");

    $approveResponse->assertOk()
        ->assertJson(['success' => true]);

    $expense->refresh();
    expect($expense->status)->toBe('approved');
    expect($expense->approved_by)->toBe($this->ownerUser->id);

    // Create another expense and reject it
    $expense2 = ProjectExpense::create([
        'project_id' => $this->project->id,
        'category' => 'travel_meals',
        'title' => 'Client Dinner at Five-Star Hotel',
        'amount' => 12000000,
        'currency' => 'IDR',
        'expense_date' => now()->toDateString(),
        'submitted_by' => $this->developerUser->id,
        'status' => 'pending',
    ]);

    $rejectResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/budget/expenses/{$expense2->id}/reject", [
            'reason' => 'Exceeds standard meal allowance policy',
        ]);

    $rejectResponse->assertOk()
        ->assertJson(['success' => true]);

    $expense2->refresh();
    expect($expense2->status)->toBe('rejected');
    expect($expense2->rejection_reason)->toBe('Exceeds standard meal allowance policy');
});

test('service computes budget burn rate and health status accurately', function () {
    ProjectBudget::create([
        'project_id' => $this->project->id,
        'total_budget' => 10000000, // 10 Million IDR
        'alert_threshold_percent' => 80,
    ]);

    // 1. Log labor cost: Rp 5,000,000 (50% burn -> Healthy)
    TaskWorklog::create([
        'project_id' => $this->project->id,
        'task_id' => $this->task->id,
        'user_id' => $this->developerUser->id,
        'duration_minutes' => 600,
        'calculated_cost' => 5000000,
        'work_date' => now()->toDateString(),
    ]);

    $service = app(ProjectBudgetService::class);
    $summary = $service->getBudgetSummary($this->project);
    expect($summary['financials']['burn_rate_percent'])->toBe(50.0);
    expect($summary['financials']['health_status'])->toBe('healthy');

    // 2. Add approved expense: Rp 3,500,000 (Total: Rp 8,500,000 / 85% burn -> Warning)
    ProjectExpense::create([
        'project_id' => $this->project->id,
        'category' => 'cloud_hosting',
        'title' => 'Cloud Cluster',
        'amount' => 3500000,
        'expense_date' => now()->toDateString(),
        'submitted_by' => $this->developerUser->id,
        'status' => 'approved',
    ]);

    $summary2 = $service->getBudgetSummary($this->project);
    expect($summary2['financials']['burn_rate_percent'])->toBe(85.0);
    expect($summary2['financials']['health_status'])->toBe('warning');

    // 3. Add more expense: Rp 2,000,000 (Total: Rp 10,500,000 / 105% burn -> Exceeded)
    ProjectExpense::create([
        'project_id' => $this->project->id,
        'category' => 'hardware_equipment',
        'title' => 'Server SSD',
        'amount' => 2000000,
        'expense_date' => now()->toDateString(),
        'submitted_by' => $this->developerUser->id,
        'status' => 'approved',
    ]);

    $summary3 = $service->getBudgetSummary($this->project);
    expect($summary3['financials']['burn_rate_percent'])->toBe(105.0);
    expect($summary3['financials']['health_status'])->toBe('exceeded');
});

test('guest role is forbidden from setting budget or approving expenses', function () {
    $expense = ProjectExpense::create([
        'project_id' => $this->project->id,
        'category' => 'software_license',
        'title' => 'Test Expense',
        'amount' => 1000000,
        'expense_date' => now()->toDateString(),
        'submitted_by' => $this->developerUser->id,
        'status' => 'pending',
    ]);

    // Guest cannot set budget
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/budget", [
            'total_budget' => 50000000,
            'currency' => 'IDR',
            'budget_type' => 'fixed',
            'alert_threshold_percent' => 85,
        ])
        ->assertForbidden();

    // Guest cannot approve expense
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/budget/expenses/{$expense->id}/approve")
        ->assertForbidden();
});
