<?php

use App\Models\MfaGraceExemption;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\OrganizationMfaSetting;
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

    $this->org = Organization::factory()->create(['name' => 'Zero Trust Secure Org']);

    $this->ownerUser = User::factory()->create([
        'name' => 'CISO Chief',
        'email' => 'ciso@zerotrust.com',
        'two_factor_confirmed_at' => now(),
    ]);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ownerUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now()->subDays(30),
    ]);

    $this->memberUser = User::factory()->create([
        'name' => 'Developer Dave',
        'email' => 'dave@zerotrust.com',
        'two_factor_confirmed_at' => null,
    ]);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->memberUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now()->subDays(2),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Auditor Guest', 'email' => 'guest@zerotrust.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view mfa enforcement dashboard', function () {
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/security/mfa-enforcement');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/security/mfa-enforcement')
            ->has('settings')
            ->has('metrics')
            ->has('members')
        );
});

test('user can update mfa policy mode', function () {
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson('/organization/security/mfa-enforcement', [
            'enforcement_mode' => 'all_members',
            'grace_period_days' => 14,
            'remember_device_days' => 45,
            'allowed_methods' => ['totp_authenticator', 'security_keys_webauthn'],
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $setting = OrganizationMfaSetting::where('organization_id', $this->org->id)->first();
    expect($setting)->not->toBeNull();
    expect($setting->enforcement_mode)->toBe('all_members');
    expect($setting->grace_period_days)->toBe(14);
    expect($setting->remember_device_days)->toBe(45);
    expect($setting->allowed_methods)->toContain('security_keys_webauthn');
});

test('user can grant and revoke grace exemptions', function () {
    // Grant
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/security/mfa-enforcement/exempt/{$this->memberUser->id}", [
            'extra_days' => 20,
            'reason' => 'Waiting for security hardware token key shipment',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $exemption = MfaGraceExemption::where('organization_id', $this->org->id)
        ->where('user_id', $this->memberUser->id)
        ->first();

    expect($exemption)->not->toBeNull();
    expect($exemption->reason)->toBe('Waiting for security hardware token key shipment');

    // Revoke
    $response2 = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/security/mfa-enforcement/exemptions/{$exemption->id}");

    $response2->assertOk();
    expect(MfaGraceExemption::find($exemption->id))->toBeNull();
});

test('user can send mfa setup reminder', function () {
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/security/mfa-enforcement/remind/{$this->memberUser->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);
});

test('user can trigger emergency session kill switch', function () {
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/security/mfa-enforcement/kill-switch');

    $response->assertOk()
        ->assertJson(['success' => true]);

    $setting = OrganizationMfaSetting::where('organization_id', $this->org->id)->first();
    expect($setting->kill_switch_last_triggered_at)->not->toBeNull();
    expect($setting->kill_switch_triggered_by)->toBe($this->ownerUser->id);
});

test('guest role forbidden from managing mfa', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson('/organization/security/mfa-enforcement', [
            'enforcement_mode' => 'all_members',
            'grace_period_days' => 7,
            'remember_device_days' => 30,
            'allowed_methods' => ['totp_authenticator'],
        ])
        ->assertForbidden();
});
