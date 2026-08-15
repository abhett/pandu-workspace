<?php

use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    $this->owner = User::factory()->create();
    $this->organization = Organization::create([
        'name' => 'Invitation Test Org',
        'slug' => 'invitation-test-org',
        'status' => 'active',
    ]);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->owner->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    session(['current_organization_id' => $this->organization->id]);
});

test('owner can send single invitation', function () {
    $response = $this->actingAs($this->owner)->post('/organization/invitations', [
        'email' => 'new.colleague@example.com',
        'role' => 'member',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('organization_invitations', [
        'organization_id' => $this->organization->id,
        'email' => 'new.colleague@example.com',
        'role' => 'member',
    ]);
});

test('owner can send batch invitations from onboarding', function () {
    $response = $this->actingAs($this->owner)->post('/organization/invitations', [
        'invites' => [
            ['email' => 'dev1@example.com', 'role' => 'member'],
            ['email' => 'designer1@example.com', 'role' => 'manager'],
        ],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('organization_invitations', [
        'organization_id' => $this->organization->id,
        'email' => 'dev1@example.com',
    ]);
    $this->assertDatabaseHas('organization_invitations', [
        'organization_id' => $this->organization->id,
        'email' => 'designer1@example.com',
    ]);
});

test('owner can cancel pending invitation', function () {
    $invitation = OrganizationInvitation::create([
        'organization_id' => $this->organization->id,
        'inviter_user_id' => $this->owner->id,
        'email' => 'pending@example.com',
        'role' => 'member',
        'token' => 'test-token-123',
        'expires_at' => now()->addDays(7),
    ]);

    $response = $this->actingAs($this->owner)->delete("/organization/invitations/{$invitation->id}");

    $response->assertRedirect();
    $this->assertDatabaseMissing('organization_invitations', [
        'id' => $invitation->id,
    ]);
});
