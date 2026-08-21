<?php

use App\Models\FeatureFlag;
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

    $this->org = Organization::factory()->create(['name' => 'DevOps Release Org']);

    $this->leadUser = User::factory()->create(['name' => 'Release Engineer', 'email' => 'release@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->leadUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devUser = User::factory()->create(['name' => 'Fullstack Dev', 'email' => 'dev@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Visitor Guest', 'email' => 'visitor@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view feature flags dashboard', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/devops/feature-flags');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/devops/feature-flags')
            ->has('metrics')
            ->has('strategyStats')
            ->has('flags')
            ->has('projects')
        );

    expect(FeatureFlag::where('organization_id', $this->org->id)->exists())->toBeTrue();
});

test('user can create feature flag', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/devops/feature-flags', [
            'key' => 'smart_ai_search_v3',
            'name' => 'Smart Semantic Vector Search V3',
            'description' => 'Fast vector search on ticket descriptions',
            'strategy' => 'percentage_rollout',
            'is_enabled' => true,
            'rollout_percentage' => 35,
            'target_rules' => '@pandu.com, beta_vip',
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    expect(FeatureFlag::where('key', 'smart_ai_search_v3')->exists())->toBeTrue();
});

test('user can update rollout percentage', function () {
    $flag = FeatureFlag::create([
        'organization_id' => $this->org->id,
        'key' => 'new_kanban_renderer',
        'name' => 'New Kanban Board Engine',
        'strategy' => 'percentage_rollout',
        'is_enabled' => true,
        'rollout_percentage' => 10,
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/devops/feature-flags/{$flag->id}/rollout", [
            'rollout_percentage' => 50,
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $flag->refresh();
    expect($flag->rollout_percentage)->toBe(50);
});

test('user can toggle flag', function () {
    $flag = FeatureFlag::create([
        'organization_id' => $this->org->id,
        'key' => 'instant_pdf_exporter',
        'name' => 'Client-Side PDF Exporter',
        'strategy' => 'boolean',
        'is_enabled' => false,
        'status' => 'paused',
    ]);

    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/devops/feature-flags/{$flag->id}/toggle", [
            'is_enabled' => true,
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $flag->refresh();
    expect($flag->is_enabled)->toBeTrue();
    expect($flag->status)->toBe('active');
});

test('user can trigger kill switch', function () {
    $flag = FeatureFlag::create([
        'organization_id' => $this->org->id,
        'key' => 'buggy_checkout_module',
        'name' => 'Checkout Module with Memory Leak',
        'strategy' => 'kill_switch',
        'is_enabled' => true,
        'rollout_percentage' => 100,
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/devops/feature-flags/{$flag->id}/kill");

    $response->assertOk()
        ->assertJson(['success' => true]);

    $flag->refresh();
    expect($flag->is_enabled)->toBeFalse();
    expect($flag->status)->toBe('killed');
});

test('user can delete feature flag', function () {
    $flag = FeatureFlag::create([
        'organization_id' => $this->org->id,
        'key' => 'temporary_test_flag',
        'name' => 'Temporary Test Flag',
        'strategy' => 'boolean',
        'is_enabled' => false,
        'status' => 'archived',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/devops/feature-flags/{$flag->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(FeatureFlag::where('id', $flag->id)->exists())->toBeFalse();
});

test('guest role forbidden from modifying flags', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/devops/feature-flags', [
            'key' => 'unauthorized_flag',
            'name' => 'Unauthorized Flag',
            'strategy' => 'boolean',
        ])
        ->assertForbidden();
});
