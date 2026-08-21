<?php

use App\Models\CicdPipelineConfig;
use App\Models\CicdPipelineRun;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
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

    $this->org = Organization::factory()->create(['name' => 'DevOps Cloud Org']);

    $this->leadUser = User::factory()->create(['name' => 'DevOps Lead', 'email' => 'lead@devops.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->leadUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devUser = User::factory()->create(['name' => 'Software Engineer', 'email' => 'dev@devops.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Auditor Guest', 'email' => 'guest@devops.com']);
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
        'name' => 'Core Backend API',
        'key' => 'CORE',
    ]);

    $this->pipelineConfig = CicdPipelineConfig::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'name' => 'Main Backend CI/CD',
        'repository_url' => 'https://github.com/org/core-api',
        'provider' => 'github_actions',
        'default_branch' => 'main',
        'require_prod_approval' => true,
        'is_active' => true,
    ]);
});

test('user can view devops pipelines dashboard', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/devops/pipelines');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/devops/pipelines')
            ->has('metrics')
            ->has('configs')
            ->has('runs')
            ->has('pendingGates')
            ->has('projects')
        );
});

test('user can create pipeline config', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/devops/pipelines/configs', [
            'project_id' => $this->project->id,
            'name' => 'Frontend Web App Pipeline',
            'repository_url' => 'https://github.com/org/web-app',
            'provider' => 'gitlab_ci',
            'default_branch' => 'main',
            'require_prod_approval' => true,
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    expect(CicdPipelineConfig::where('name', 'Frontend Web App Pipeline')->exists())->toBeTrue();
});

test('user can trigger manual pipeline run', function () {
    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/devops/pipelines/configs/{$this->pipelineConfig->id}/trigger", [
            'environment' => 'staging',
            'branch' => 'develop',
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $run = CicdPipelineRun::where('pipeline_config_id', $this->pipelineConfig->id)->first();
    expect($run)->not->toBeNull();
    expect($run->environment)->toBe('staging');
    expect($run->status)->toBe('passed');
    expect($run->branch)->toBe('develop');
});

test('user can approve production gate', function () {
    $run = CicdPipelineRun::create([
        'pipeline_config_id' => $this->pipelineConfig->id,
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'run_number' => 1,
        'environment' => 'production',
        'status' => 'blocked_by_gate',
        'branch' => 'main',
        'commit_sha' => 'abc1234567890abcdef1234567890abcdef12345',
        'commit_message' => 'feat: new payment method',
        'author_name' => 'Lead Dev',
        'trigger_type' => 'manual_trigger',
        'stages' => [
            ['name' => 'build', 'label' => 'Build', 'status' => 'passed', 'duration_seconds' => 45],
            ['name' => 'test', 'label' => 'Test', 'status' => 'passed', 'duration_seconds' => 60],
            ['name' => 'security_scan', 'label' => 'Security', 'status' => 'passed', 'duration_seconds' => 30],
            ['name' => 'deploy', 'label' => 'Deploy', 'status' => 'blocked_by_gate', 'duration_seconds' => 0],
        ],
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/devops/pipelines/runs/{$run->id}/approve-gate", [
            'notes' => 'Production deployment approved after QA signoff.',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $run->refresh();
    expect($run->status)->toBe('passed');
    expect($run->gate_approved_by)->toBe($this->leadUser->id);
    expect($run->gate_notes)->toBe('Production deployment approved after QA signoff.');
});

test('user can reject production gate', function () {
    $run = CicdPipelineRun::create([
        'pipeline_config_id' => $this->pipelineConfig->id,
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'run_number' => 2,
        'environment' => 'production',
        'status' => 'blocked_by_gate',
        'branch' => 'main',
        'commit_sha' => 'def1234567890abcdef1234567890abcdef12345',
        'trigger_type' => 'manual_trigger',
        'stages' => [
            ['name' => 'build', 'label' => 'Build', 'status' => 'passed', 'duration_seconds' => 45],
            ['name' => 'deploy', 'label' => 'Deploy', 'status' => 'blocked_by_gate', 'duration_seconds' => 0],
        ],
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/devops/pipelines/runs/{$run->id}/reject-gate", [
            'reason' => 'High memory leak detected in staging benchmark.',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $run->refresh();
    expect($run->status)->toBe('failed');
    expect($run->gate_notes)->toContain('High memory leak detected');
});

test('user can trigger pipeline rollback', function () {
    $run = CicdPipelineRun::create([
        'pipeline_config_id' => $this->pipelineConfig->id,
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'run_number' => 3,
        'environment' => 'production',
        'status' => 'passed',
        'branch' => 'main',
        'commit_sha' => '1231234567890abcdef1234567890abcdef12345',
        'trigger_type' => 'manual_trigger',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/devops/pipelines/runs/{$run->id}/rollback");

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $rollbackRun = CicdPipelineRun::where('trigger_type', 'rollback')->first();
    expect($rollbackRun)->not->toBeNull();
    expect($rollbackRun->environment)->toBe('production');
});

test('guest role forbidden from triggering pipeline', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/devops/pipelines/configs/{$this->pipelineConfig->id}/trigger", [
            'environment' => 'staging',
        ])
        ->assertForbidden();
});
