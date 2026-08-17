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

test('owner and admin can access role management and ai settings', function () {
    // Owner access
    $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/roles')
        ->assertOk();

    $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/ai-settings')
        ->assertOk();

    // Admin access
    $this->actingAs($this->adminUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/roles')
        ->assertOk();

    $this->actingAs($this->adminUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/ai-settings')
        ->assertOk();
});

test('regular member and guest are forbidden from accessing role management and ai settings', function () {
    // Member forbidden
    $this->actingAs($this->memberUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/roles')
        ->assertForbidden();

    $this->actingAs($this->memberUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/ai-settings')
        ->assertForbidden();

    // Guest forbidden
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/roles')
        ->assertForbidden();

    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/ai-settings')
        ->assertForbidden();
});
