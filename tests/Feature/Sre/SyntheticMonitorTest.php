<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\SyntheticMonitor;
use App\Models\SyntheticProbeLog;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'SRE Synthetic Org']);

    $this->sreLead = User::factory()->create(['name' => 'SRE Synthetics Lead', 'email' => 'sre_synthetics@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->sreLead->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest SRE', 'email' => 'guest_sre_syn@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view synthetics dashboard', function () {
    $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sre/synthetics')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/sre/synthetics')
            ->has('metrics')
            ->has('monitors')
            ->has('probe_logs')
            ->has('available_locations')
        );
});

test('dashboard seeds default monitors on first visit', function () {
    expect(SyntheticMonitor::where('organization_id', $this->org->id)->count())->toBe(0);

    $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sre/synthetics')
        ->assertOk();

    expect(SyntheticMonitor::where('organization_id', $this->org->id)->count())->toBeGreaterThanOrEqual(3);
    expect(SyntheticProbeLog::whereHas('monitor', fn ($q) => $q->where('organization_id', $this->org->id))->count())->toBeGreaterThanOrEqual(3);
});

test('user can create synthetic monitor', function () {
    $response = $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sre/synthetics', [
            'name' => 'Payment Gateway Checkout Health',
            'target_url' => 'https://checkout.pandu.app/healthz',
            'probe_type' => 'http',
            'interval_seconds' => 60,
            'timeout_seconds' => 10,
            'expected_status_code' => 200,
            'locations' => ['JKT-1', 'SIN-1', 'HND-1'],
        ]);

    $response->assertCreated()->assertJson(['success' => true]);

    $monitor = SyntheticMonitor::where('name', 'Payment Gateway Checkout Health')->first();
    expect($monitor)->not->toBeNull();
    expect($monitor->target_url)->toBe('https://checkout.pandu.app/healthz');
    expect($monitor->probe_type)->toBe('http');
    expect($monitor->status)->toBe('healthy');
});

test('user can trigger instant probe check', function () {
    $monitor = SyntheticMonitor::create([
        'organization_id' => $this->org->id,
        'name' => 'Search Service Probe',
        'target_url' => 'https://search.pandu.app/ping',
        'probe_type' => 'http',
        'interval_seconds' => 60,
        'locations' => ['JKT-1', 'SIN-1'],
        'status' => 'healthy',
    ]);

    $response = $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sre/synthetics/{$monitor->id}/probe");

    $response->assertOk()->assertJson(['success' => true]);

    $logs = SyntheticProbeLog::where('synthetic_monitor_id', $monitor->id)->get();
    expect($logs->count())->toBeGreaterThanOrEqual(2);
    expect($logs->first()->status_code)->toBe(200);
});

test('user can toggle monitor active paused status', function () {
    $monitor = SyntheticMonitor::create([
        'organization_id' => $this->org->id,
        'name' => 'Toggle Status Monitor',
        'target_url' => 'https://example.com',
        'status' => 'healthy',
    ]);

    $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sre/synthetics/{$monitor->id}/toggle")
        ->assertOk()
        ->assertJson(['success' => true]);

    $monitor->refresh();
    expect($monitor->status)->toBe('paused');

    $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sre/synthetics/{$monitor->id}/toggle")
        ->assertOk();

    $monitor->refresh();
    expect($monitor->status)->toBe('healthy');
});

test('user can delete synthetic monitor', function () {
    $monitor = SyntheticMonitor::create([
        'organization_id' => $this->org->id,
        'name' => 'Delete Me Monitor',
        'target_url' => 'https://delete.example.com',
        'status' => 'healthy',
    ]);

    $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/sre/synthetics/{$monitor->id}")
        ->assertOk()
        ->assertJson(['success' => true]);

    expect(SyntheticMonitor::where('id', $monitor->id)->exists())->toBeFalse();
});

test('guest role forbidden from managing synthetics', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sre/synthetics', [
            'name' => 'Unauthorized Monitor',
            'target_url' => 'https://example.com',
            'probe_type' => 'http',
        ])
        ->assertForbidden();
});
