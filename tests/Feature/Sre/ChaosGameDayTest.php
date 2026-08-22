<?php

use App\Models\ChaosExperiment;
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
    $this->memberRole = Role::whereNull('organization_id')->where('slug', 'member')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'SRE Org']);

    $this->sreUser = User::factory()->create(['name' => 'SRE Lead', 'email' => 'sre@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->sreUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest User', 'email' => 'guest@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view chaos gameday dashboard', function () {
    $response = $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sre/chaos-gameday');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/sre/chaos-gameday')
            ->has('metrics')
            ->has('scenariosCatalog')
            ->has('experiments')
        );
});

test('user can create chaos experiment', function () {
    $response = $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sre/chaos-gameday', [
            'title' => 'Redis Eviction Drill',
            'target_service' => 'Session Cache Cluster',
            'fault_type' => 'service_blackhole',
            'environment' => 'staging',
            'hypothesis' => 'Sistem beralih ke in-memory fallback tanpa menolak request.',
            'safety_tripwire' => ['max_error_rate_pct' => 2.0, 'abort_timeout_sec' => 60],
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $experiment = ChaosExperiment::where('title', 'Redis Eviction Drill')->first();
    expect($experiment)->not->toBeNull();
    expect($experiment->status)->toBe('planned');
    expect($experiment->fault_type)->toBe('service_blackhole');
});

test('user can run chaos experiment simulation', function () {
    $experiment = ChaosExperiment::create([
        'organization_id' => $this->org->id,
        'title' => 'Latency Spike Drill',
        'target_service' => 'Payment Gateway',
        'fault_type' => 'latency_injection',
        'environment' => 'staging',
        'hypothesis' => 'Circuit breaker engages within 3s.',
        'status' => 'planned',
        'created_by' => $this->sreUser->id,
    ]);

    $response = $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sre/chaos-gameday/{$experiment->id}/run");

    $response->assertOk()
        ->assertJson(['success' => true]);

    $experiment->refresh();
    expect($experiment->status)->toBe('passed');
    expect($experiment->resilience_score)->toBeGreaterThan(90.0);
    expect($experiment->execution_logs)->toBeArray();
    expect(count($experiment->execution_logs))->toBeGreaterThanOrEqual(4);
});

test('user can abort running experiment', function () {
    $experiment = ChaosExperiment::create([
        'organization_id' => $this->org->id,
        'title' => 'Abort Test Drill',
        'target_service' => 'API Gateway',
        'fault_type' => 'pool_exhaustion',
        'environment' => 'staging',
        'hypothesis' => 'Should abort safely.',
        'status' => 'running',
        'created_by' => $this->sreUser->id,
    ]);

    $response = $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sre/chaos-gameday/{$experiment->id}/abort");

    $response->assertOk()
        ->assertJson(['success' => true]);

    $experiment->refresh();
    expect($experiment->status)->toBe('aborted');
    expect($experiment->execution_logs)->toBeArray();
});

test('user can delete experiment', function () {
    $experiment = ChaosExperiment::create([
        'organization_id' => $this->org->id,
        'title' => 'To Delete Drill',
        'target_service' => 'Worker Queue',
        'fault_type' => 'packet_loss',
        'environment' => 'staging',
        'hypothesis' => 'DLQ isolates poison pill.',
        'status' => 'planned',
        'created_by' => $this->sreUser->id,
    ]);

    $response = $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/sre/chaos-gameday/{$experiment->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(ChaosExperiment::where('id', $experiment->id)->exists())->toBeFalse();
});

test('guest role forbidden from managing experiments', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sre/chaos-gameday', [
            'title' => 'Unauthorized Drill',
            'target_service' => 'Core API',
            'fault_type' => 'pool_exhaustion',
            'environment' => 'staging',
            'hypothesis' => 'Should not be allowed.',
        ])
        ->assertForbidden();
});
