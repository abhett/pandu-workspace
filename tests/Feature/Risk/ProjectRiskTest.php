<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\RiskActionLog;
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

    $this->org = Organization::factory()->create(['name' => 'Fintech Risk Org']);

    $this->ownerUser = User::factory()->create(['name' => 'Risk Lead', 'email' => 'risklead@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ownerUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->memberUser = User::factory()->create(['name' => 'Tech Specialist', 'email' => 'techspec@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->memberUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'External Viewer', 'email' => 'viewer@example.com']);
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
        'name' => 'Banking Payment Gateway',
        'key' => 'BPG',
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
        'name' => 'Backlog',
        'slug' => 'backlog',
        'category' => 'todo',
        'color' => '#64748b',
        'position' => 0,
    ]);

    $this->task = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 1,
        'key' => 'BPG-1',
        'title' => 'Integrate Central Bank Settlement API',
        'type' => 'task',
        'priority' => 'high',
        'rank' => '0|hzzzzz:',
    ]);
});

test('user can view project risk register and heatmap summary', function () {
    ProjectRisk::create([
        'project_id' => $this->project->id,
        'title' => 'Third-party API latency spike',
        'category' => 'technical',
        'probability' => 4,
        'impact' => 4,
        'exposure_score' => 16,
        'risk_level' => 'high',
        'status' => 'open',
        'identified_date' => now()->toDateString(),
    ]);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/projects/{$this->project->id}/risks");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/risks')
            ->has('project')
            ->has('summary')
            ->has('summary.metrics')
            ->has('summary.heatmap')
            ->has('summary.risks')
        );
});

test('user can create a risk with automatic exposure and risk level calculation', function () {
    // Probability 5 * Impact 4 = 20 => Critical
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/risks", [
            'title' => 'Payment Gateway Compliance Audit Failure',
            'category' => 'compliance',
            'description' => 'Risk of license suspension if audit findings are not resolved.',
            'probability' => 5,
            'impact' => 4,
            'status' => 'open',
            'mitigation_strategy' => 'Engage external auditor and fix findings.',
            'identified_date' => now()->toDateString(),
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $risk = ProjectRisk::where('title', 'Payment Gateway Compliance Audit Failure')->first();
    expect($risk)->not->toBeNull();
    expect($risk->exposure_score)->toBe(20);
    expect($risk->risk_level)->toBe('critical');
});

test('user can update risk and recalculate scores', function () {
    $risk = ProjectRisk::create([
        'project_id' => $this->project->id,
        'title' => 'Database Storage Exhaustion',
        'category' => 'technical',
        'probability' => 2,
        'impact' => 2,
        'exposure_score' => 4,
        'risk_level' => 'low',
        'status' => 'open',
        'identified_date' => now()->toDateString(),
    ]);

    // Update to probability 3 and impact 4 = 12 => High
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/projects/{$this->project->id}/risks/{$risk->id}", [
            'title' => 'Database Storage & IOPS Exhaustion',
            'category' => 'technical',
            'probability' => 3,
            'impact' => 4,
            'status' => 'mitigating',
            'identified_date' => now()->toDateString(),
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $risk->refresh();
    expect($risk->title)->toBe('Database Storage & IOPS Exhaustion');
    expect($risk->exposure_score)->toBe(12);
    expect($risk->risk_level)->toBe('high');
    expect($risk->status)->toBe('mitigating');
});

test('user can delete a risk', function () {
    $risk = ProjectRisk::create([
        'project_id' => $this->project->id,
        'title' => 'Temporary Vendor Delay',
        'category' => 'external',
        'probability' => 1,
        'impact' => 1,
        'exposure_score' => 1,
        'risk_level' => 'low',
        'status' => 'closed',
        'identified_date' => now()->toDateString(),
    ]);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/projects/{$this->project->id}/risks/{$risk->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(ProjectRisk::find($risk->id))->toBeNull();
});

test('user can log mitigation action and update risk status and residual scores', function () {
    $risk = ProjectRisk::create([
        'project_id' => $this->project->id,
        'title' => 'Cloud Provider Outage',
        'category' => 'technical',
        'probability' => 4,
        'impact' => 5,
        'exposure_score' => 20,
        'risk_level' => 'critical',
        'status' => 'open',
        'identified_date' => now()->toDateString(),
    ]);

    // Log mitigation: deployed multi-region active-active cluster, residual probability reduced to 1
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/risks/{$risk->id}/action-logs", [
            'action_taken' => 'Deployed multi-region active-active Kubernetes clusters across AWS and GCP.',
            'status_after' => 'mitigating',
            'residual_probability' => 1,
            'residual_impact' => 3,
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $risk->refresh();
    expect($risk->status)->toBe('mitigating');
    expect($risk->probability)->toBe(1);
    expect($risk->impact)->toBe(3);
    expect($risk->exposure_score)->toBe(3);
    expect($risk->risk_level)->toBe('low');

    $log = RiskActionLog::where('risk_id', $risk->id)->first();
    expect($log)->not->toBeNull();
    expect($log->user_id)->toBe($this->ownerUser->id);
    expect($log->status_before)->toBe('open');
    expect($log->status_after)->toBe('mitigating');
});

test('guest role is forbidden from modifying project risks', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/risks", [
            'title' => 'Unauthorized Risk Modification',
            'category' => 'technical',
            'probability' => 3,
            'impact' => 3,
            'status' => 'open',
            'identified_date' => now()->toDateString(),
        ])
        ->assertForbidden();
});
