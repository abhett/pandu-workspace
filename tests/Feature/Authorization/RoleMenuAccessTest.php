<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
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
    $this->adminRole = Role::whereNull('organization_id')->where('slug', 'admin')->first();
    $this->managerRole = Role::whereNull('organization_id')->where('slug', 'manager')->first();
    $this->memberRole = Role::whereNull('organization_id')->where('slug', 'member')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'Security Audit Org']);

    $this->ownerUser = User::factory()->create(['name' => 'Org Owner', 'email' => 'owner@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ownerUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->adminUser = User::factory()->create(['name' => 'Org Admin', 'email' => 'admin@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->adminUser->id,
        'role' => 'admin',
        'role_id' => $this->adminRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->managerUser = User::factory()->create(['name' => 'Project Manager', 'email' => 'manager@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->managerUser->id,
        'role' => 'manager',
        'role_id' => $this->managerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->memberUser = User::factory()->create(['name' => 'Regular Member', 'email' => 'member@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->memberUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest User', 'email' => 'guest@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('owner can access all modules including billing and security settings', function () {
    $endpoints = [
        '/organization/billing',
        '/organization/roles',
        '/organization/sso',
        '/organization/security-settings',
        '/organization/audit-logs',
        '/organization/data-retention',
        '/organization/ai-settings',
        '/integrations',
        '/import',
        '/automation',
        '/portfolio',
        '/organization/members',
    ];

    foreach ($endpoints as $endpoint) {
        $this->actingAs($this->ownerUser)
            ->withSession(['current_organization_id' => $this->org->id])
            ->get($endpoint)
            ->assertOk();
    }
});

test('admin can access security and integrations but is forbidden from billing by default', function () {
    $allowedEndpoints = [
        '/organization/roles',
        '/organization/sso',
        '/organization/security-settings',
        '/organization/audit-logs',
        '/organization/data-retention',
        '/organization/ai-settings',
        '/integrations',
        '/import',
        '/automation',
        '/portfolio',
        '/organization/members',
    ];

    foreach ($allowedEndpoints as $endpoint) {
        $this->actingAs($this->adminUser)
            ->withSession(['current_organization_id' => $this->org->id])
            ->get($endpoint)
            ->assertOk();
    }

    // Admin without explicit org:billing permission cannot access billing
    $this->actingAs($this->adminUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/billing')
        ->assertForbidden();
});

test('manager can access workspace features but is forbidden from admin and security settings', function () {
    $allowedEndpoints = [
        '/portfolio',
        '/import',
        '/automation',
        '/organization/members',
    ];

    foreach ($allowedEndpoints as $endpoint) {
        $this->actingAs($this->managerUser)
            ->withSession(['current_organization_id' => $this->org->id])
            ->get($endpoint)
            ->assertOk();
    }

    $forbiddenEndpoints = [
        '/organization/billing',
        '/organization/roles',
        '/organization/sso',
        '/organization/security-settings',
        '/organization/audit-logs',
        '/organization/data-retention',
        '/organization/ai-settings',
        '/integrations',
    ];

    foreach ($forbiddenEndpoints as $endpoint) {
        $this->actingAs($this->managerUser)
            ->withSession(['current_organization_id' => $this->org->id])
            ->get($endpoint)
            ->assertForbidden();
    }
});

test('regular member is forbidden from admin, security, billing, and integrations', function () {
    $forbiddenEndpoints = [
        '/organization/billing',
        '/organization/roles',
        '/organization/sso',
        '/organization/security-settings',
        '/organization/audit-logs',
        '/organization/data-retention',
        '/organization/ai-settings',
        '/integrations',
        '/import',
        '/automation',
    ];

    foreach ($forbiddenEndpoints as $endpoint) {
        $this->actingAs($this->memberUser)
            ->withSession(['current_organization_id' => $this->org->id])
            ->get($endpoint)
            ->assertForbidden();
    }
});

test('guest is strictly forbidden from administrative and member-only pages', function () {
    $forbiddenEndpoints = [
        '/organization/billing',
        '/organization/roles',
        '/organization/sso',
        '/organization/security-settings',
        '/organization/audit-logs',
        '/organization/data-retention',
        '/organization/ai-settings',
        '/integrations',
        '/import',
        '/automation',
        '/portfolio',
        '/organization/members',
    ];

    foreach ($forbiddenEndpoints as $endpoint) {
        $this->actingAs($this->guestUser)
            ->withSession(['current_organization_id' => $this->org->id])
            ->get($endpoint)
            ->assertForbidden();
    }
});
