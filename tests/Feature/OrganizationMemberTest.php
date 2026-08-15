<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    $this->owner = User::factory()->create();
    $this->organization = Organization::create([
        'name' => 'Acme Test Corp',
        'slug' => 'acme-test-corp',
        'status' => 'active',
    ]);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->adminRole = Role::whereNull('organization_id')->where('slug', 'admin')->first();
    $this->memberRole = Role::whereNull('organization_id')->where('slug', 'member')->first();

    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->owner->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'title' => 'CEO & Founder',
        'status' => 'active',
        'joined_at' => now(),
    ]);

    session(['current_organization_id' => $this->organization->id]);
});

test('owner can view organization members list and stats', function () {
    $response = $this->actingAs($this->owner)->get('/organization/members');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/members')
            ->has('members')
            ->has('stats')
            ->has('availableRoles')
        );
});

test('owner can manually add a new user as member', function () {
    $response = $this->actingAs($this->owner)->post('/organization/members', [
        'name' => 'Budi Santoso',
        'email' => 'budi.santoso@acme.corp',
        'password' => 'secretpassword123',
        'role' => 'member',
        'title' => 'Backend Engineer',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('users', [
        'email' => 'budi.santoso@acme.corp',
        'name' => 'Budi Santoso',
    ]);

    $user = User::where('email', 'budi.santoso@acme.corp')->first();
    $this->assertDatabaseHas('organization_memberships', [
        'organization_id' => $this->organization->id,
        'user_id' => $user->id,
        'role' => 'member',
        'title' => 'Backend Engineer',
    ]);
});

test('owner can manually add an existing user to organization', function () {
    $existingUser = User::factory()->create([
        'email' => 'existing.developer@global.com',
    ]);

    $response = $this->actingAs($this->owner)->post('/organization/members', [
        'name' => $existingUser->name,
        'email' => 'existing.developer@global.com',
        'role' => 'manager',
        'title' => 'Lead Architect',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('organization_memberships', [
        'organization_id' => $this->organization->id,
        'user_id' => $existingUser->id,
        'role' => 'manager',
        'title' => 'Lead Architect',
    ]);
});

test('adding an already existing member to same org fails validation', function () {
    $existingMember = User::factory()->create([
        'email' => 'already.here@acme.corp',
    ]);
    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $existingMember->id,
        'role' => 'member',
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $response = $this->actingAs($this->owner)->post('/organization/members', [
        'name' => $existingMember->name,
        'email' => 'already.here@acme.corp',
        'role' => 'member',
    ]);

    $response->assertSessionHasErrors('email');
});

test('owner can update role of a member', function () {
    $member = User::factory()->create();
    $membership = OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $member->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'title' => 'Software Engineer',
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $response = $this->actingAs($this->owner)->patch("/organization/members/{$membership->id}/role", [
        'role' => 'manager',
        'title' => 'Engineering Manager',
    ]);

    $response->assertRedirect();
    $membership->refresh();
    expect($membership->role)->toBe('manager')
        ->and($membership->title)->toBe('Engineering Manager');
});

test('sole owner cannot demote their own role', function () {
    $ownerMembership = OrganizationMembership::where('organization_id', $this->organization->id)
        ->where('user_id', $this->owner->id)
        ->first();

    $response = $this->actingAs($this->owner)->patch("/organization/members/{$ownerMembership->id}/role", [
        'role' => 'member',
    ]);

    $response->assertSessionHasErrors('role');
    $ownerMembership->refresh();
    expect($ownerMembership->role)->toBe('owner');
});

test('owner can remove a non-owner member', function () {
    $member = User::factory()->create();
    $membership = OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $member->id,
        'role' => 'member',
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $response = $this->actingAs($this->owner)->delete("/organization/members/{$membership->id}");

    $response->assertRedirect();
    $this->assertDatabaseMissing('organization_memberships', [
        'id' => $membership->id,
    ]);
});
