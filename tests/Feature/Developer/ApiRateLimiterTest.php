<?php

use App\Models\ApiRateLimitPolicy;
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

    $this->org = Organization::factory()->create(['name' => 'API Traffic Infrastructure Org']);

    $this->leadUser = User::factory()->create(['name' => 'API Gateway Architect', 'email' => 'gateway@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->leadUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devUser = User::factory()->create(['name' => 'API Developer', 'email' => 'developer@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Viewer Guest', 'email' => 'viewer@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view rate limiter dashboard', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/developer/rate-limits');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/developer/rate-limits')
            ->has('metrics')
            ->has('trafficTrend')
            ->has('policies')
            ->has('topEndpoints')
        );

    expect(ApiRateLimitPolicy::where('organization_id', $this->org->id)->exists())->toBeTrue();
});

test('user can create rate limit policy', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/developer/rate-limits', [
            'name' => 'Webhook Dispatcher High Burst Policy',
            'tier' => 'pro',
            'requests_per_minute' => 500,
            'burst_allowance' => 150,
            'daily_quota' => 250000,
            'is_throttling_enabled' => true,
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    expect(ApiRateLimitPolicy::where('name', 'Webhook Dispatcher High Burst Policy')->exists())->toBeTrue();
});

test('user can update policy', function () {
    $policy = ApiRateLimitPolicy::create([
        'organization_id' => $this->org->id,
        'name' => 'Standard Policy',
        'tier' => 'free',
        'requests_per_minute' => 60,
        'burst_allowance' => 20,
        'daily_quota' => 10000,
    ]);

    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/organization/developer/rate-limits/{$policy->id}", [
            'name' => 'Standard Policy Upgraded',
            'tier' => 'pro',
            'requests_per_minute' => 120,
            'burst_allowance' => 40,
            'daily_quota' => 50000,
            'is_throttling_enabled' => true,
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $policy->refresh();
    expect($policy->name)->toBe('Standard Policy Upgraded');
    expect($policy->requests_per_minute)->toBe(120);
});

test('user can toggle throttling', function () {
    $policy = ApiRateLimitPolicy::create([
        'organization_id' => $this->org->id,
        'name' => 'Bypass Policy',
        'tier' => 'custom',
        'requests_per_minute' => 100,
        'daily_quota' => 10000,
        'is_throttling_enabled' => true,
    ]);

    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/developer/rate-limits/{$policy->id}/toggle", [
            'is_throttling_enabled' => false,
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $policy->refresh();
    expect($policy->is_throttling_enabled)->toBeFalse();
});

test('user can simulate traffic spike', function () {
    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/developer/rate-limits/simulate', [
            'simulated_requests' => 300,
        ]);

    $response->assertOk()
        ->assertJson(['success' => true])
        ->assertJsonStructure([
            'simulation' => [
                'simulated_requests',
                'policy_limit_rpm',
                'burst_allowance',
                'allowed_requests',
                'throttled_requests_429',
                'throttled_percentage',
                'limiter_defense_status',
            ],
        ]);
});

test('user can delete policy', function () {
    $policy = ApiRateLimitPolicy::create([
        'organization_id' => $this->org->id,
        'name' => 'Temporary Policy',
        'tier' => 'free',
        'requests_per_minute' => 30,
        'daily_quota' => 5000,
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/developer/rate-limits/{$policy->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(ApiRateLimitPolicy::where('id', $policy->id)->exists())->toBeFalse();
});

test('guest role forbidden from modifying policies', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/developer/rate-limits', [
            'name' => 'Unauthorized Policy',
            'tier' => 'free',
            'requests_per_minute' => 60,
            'daily_quota' => 10000,
        ])
        ->assertForbidden();
});
