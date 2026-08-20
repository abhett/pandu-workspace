<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\OrganizationSecurityPolicy;
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

    $this->user = User::factory()->create(['name' => 'Security Director', 'email' => 'director@example.com']);
    $this->org = Organization::factory()->create(['name' => 'Zero Trust Holdings']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view organization security settings page', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/security-settings');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('organization/security-settings')
        ->has('policy')
        ->has('sessions')
    );
});

test('user can update password and session policies', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson('/organization/security-settings/policy', [
            'mfa_enforced' => true,
            'min_password_length' => 16,
            'password_rotation_days' => 60,
            'require_uppercase' => true,
            'require_lowercase' => true,
            'require_numeric' => true,
            'require_symbols' => true,
            'lockout_enabled' => true,
            'lockout_max_attempts' => 5,
            'lockout_duration_minutes' => 30,
            'session_timeout_minutes' => 60,
        ]);

    $response->assertOk();
    $policy = OrganizationSecurityPolicy::where('organization_id', $this->org->id)->first();
    expect($policy)->not->toBeNull();
    expect($policy->mfa_enforced)->toBeTrue();
    expect($policy->min_password_length)->toBe(16);
    expect($policy->session_timeout_minutes)->toBe(60);
});

test('user can add and remove allowed ip cidr', function () {
    // Add IP
    $addResp = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/security-settings/ip', [
            'ip' => '10.200.0.0/16',
        ]);

    $addResp->assertOk();
    $policy = OrganizationSecurityPolicy::where('organization_id', $this->org->id)->first();
    expect($policy->ip_allowlist)->toContain('10.200.0.0/16');

    // Remove IP
    $delResp = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson('/organization/security-settings/ip', [
            'ip' => '10.200.0.0/16',
        ]);

    $delResp->assertOk();
    $policy->refresh();
    expect($policy->ip_allowlist)->not->toContain('10.200.0.0/16');
});

test('user can revoke other active sessions', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/security-settings/sessions/revoke-others');

    $response->assertOk();
    $response->assertJson(['success' => true]);
});
