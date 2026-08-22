<?php

use App\Models\DeploymentPipeline;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'DevOps Org']);

    $this->devOpsUser = User::factory()->create(['name' => 'DevOps Lead', 'email' => 'devops@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devOpsUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest', 'email' => 'guest@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view deployment pipeline dashboard', function () {
    $this->actingAs($this->devOpsUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sre/deployments')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/devops/deployments')
            ->has('metrics')
            ->has('pipelines')
        );
});

test('dashboard seeds default pipelines on first visit', function () {
    expect(DeploymentPipeline::where('organization_id', $this->org->id)->count())->toBe(0);

    $this->actingAs($this->devOpsUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sre/deployments')
        ->assertOk();

    expect(DeploymentPipeline::where('organization_id', $this->org->id)->count())->toBeGreaterThanOrEqual(3);
});

test('user can create deployment pipeline', function () {
    $response = $this->actingAs($this->devOpsUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sre/deployments', [
            'title' => 'Rilis Fitur Multi-Tenant SSO v5.0',
            'version_tag' => 'v5.0.0',
            'commit_sha' => 'abc1234def56789',
            'repository_url' => 'https://github.com/abhett/pandu',
            'auto_rollback_enabled' => true,
            'rollback_threshold_pct' => 2.0,
        ]);

    $response->assertCreated()->assertJson(['success' => true]);

    $pipeline = DeploymentPipeline::where('title', 'Rilis Fitur Multi-Tenant SSO v5.0')->first();
    expect($pipeline)->not->toBeNull();
    expect($pipeline->status)->toBe('pending');
    expect($pipeline->current_environment)->toBe('dev');
    expect($pipeline->risk_score)->toBeFloat();
    expect($pipeline->risk_factors)->toBeArray();
    expect($pipeline->auto_rollback_enabled)->toBeTrue();
});

test('user can promote deployment to next environment', function () {
    $pipeline = DeploymentPipeline::create([
        'organization_id' => $this->org->id,
        'title' => 'Promote Test Pipeline',
        'version_tag' => 'v4.20.0',
        'environments' => [
            ['name' => 'dev', 'status' => 'running', 'started_at' => now()->toIso8601String(), 'completed_at' => null],
            ['name' => 'staging', 'status' => 'pending', 'started_at' => null, 'completed_at' => null],
            ['name' => 'canary', 'status' => 'pending', 'started_at' => null, 'completed_at' => null],
            ['name' => 'production', 'status' => 'pending', 'started_at' => null, 'completed_at' => null],
        ],
        'risk_score' => 18.5,
        'risk_factors' => [],
        'current_environment' => 'dev',
        'status' => 'running',
        'auto_rollback_enabled' => true,
        'rollback_threshold_pct' => 2.0,
        'deployed_by' => $this->devOpsUser->id,
        'started_at' => now(),
    ]);

    $response = $this->actingAs($this->devOpsUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sre/deployments/{$pipeline->id}/promote");

    $response->assertOk()->assertJson(['success' => true]);

    $pipeline->refresh();
    expect($pipeline->current_environment)->toBe('staging');

    $devStage = collect($pipeline->environments)->firstWhere('name', 'dev');
    expect($devStage['status'])->toBe('passed');

    $stagingStage = collect($pipeline->environments)->firstWhere('name', 'staging');
    expect($stagingStage['status'])->toBe('running');
});

test('user can rollback deployment', function () {
    $pipeline = DeploymentPipeline::create([
        'organization_id' => $this->org->id,
        'title' => 'Rollback Test Pipeline',
        'version_tag' => 'v4.19.1',
        'environments' => [
            ['name' => 'dev', 'status' => 'passed', 'started_at' => now()->subHour()->toIso8601String(), 'completed_at' => now()->subMinutes(45)->toIso8601String()],
            ['name' => 'staging', 'status' => 'running', 'started_at' => now()->subMinutes(10)->toIso8601String(), 'completed_at' => null],
            ['name' => 'canary', 'status' => 'pending', 'started_at' => null, 'completed_at' => null],
            ['name' => 'production', 'status' => 'pending', 'started_at' => null, 'completed_at' => null],
        ],
        'risk_score' => 62.0,
        'risk_factors' => [],
        'current_environment' => 'staging',
        'status' => 'running',
        'auto_rollback_enabled' => true,
        'rollback_threshold_pct' => 1.5,
        'deployed_by' => $this->devOpsUser->id,
        'started_at' => now()->subHour(),
    ]);

    $response = $this->actingAs($this->devOpsUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sre/deployments/{$pipeline->id}/rollback");

    $response->assertOk()->assertJson(['success' => true]);

    $pipeline->refresh();
    expect($pipeline->status)->toBe('rolled_back');

    $stagingStage = collect($pipeline->environments)->firstWhere('name', 'staging');
    expect($stagingStage['status'])->toBe('rolled_back');
});

test('rollout risk score is calculated correctly', function () {
    $response = $this->actingAs($this->devOpsUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sre/deployments', [
            'title' => 'High-Risk Production Deploy',
            'version_tag' => 'v4.99.0',
            'auto_rollback_enabled' => true,
            'rollback_threshold_pct' => 1.0,
        ]);

    $response->assertCreated();

    $pipeline = DeploymentPipeline::where('title', 'High-Risk Production Deploy')->first();
    expect($pipeline)->not->toBeNull();
    expect($pipeline->risk_score)->toBeFloat();
    expect($pipeline->risk_score)->toBeGreaterThanOrEqual(0.0);
    expect($pipeline->risk_score)->toBeLessThanOrEqual(100.0);
    expect($pipeline->risk_factors)->toBeArray();
    expect(count($pipeline->risk_factors))->toBe(5);

    $factorKeys = collect($pipeline->risk_factors)->pluck('key')->all();
    expect($factorKeys)->toContain('diff_size');
    expect($factorKeys)->toContain('test_coverage');
    expect($factorKeys)->toContain('incident_history');
    expect($factorKeys)->toContain('off_hours');
    expect($factorKeys)->toContain('environment');
});

test('user can delete deployment pipeline', function () {
    $pipeline = DeploymentPipeline::create([
        'organization_id' => $this->org->id,
        'title' => 'Delete Me Pipeline',
        'version_tag' => 'v0.0.1',
        'environments' => [],
        'risk_score' => 5.0,
        'risk_factors' => [],
        'current_environment' => 'dev',
        'status' => 'pending',
        'auto_rollback_enabled' => false,
        'rollback_threshold_pct' => 2.0,
        'deployed_by' => $this->devOpsUser->id,
    ]);

    $this->actingAs($this->devOpsUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/sre/deployments/{$pipeline->id}")
        ->assertOk()
        ->assertJson(['success' => true]);

    expect(DeploymentPipeline::where('id', $pipeline->id)->exists())->toBeFalse();
});

test('guest role forbidden from managing deployment pipelines', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sre/deployments', [
            'title' => 'Unauthorized Deploy',
            'version_tag' => 'v1.0.0',
        ])
        ->assertForbidden();
});
