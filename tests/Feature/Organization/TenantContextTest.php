<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\User;

test('user with organization can access dashboard and active organization is in session', function () {
    $user = User::factory()->create();
    $org = Organization::factory()->create(['name' => 'Alpha Studio']);

    OrganizationMembership::create([
        'organization_id' => $org->id,
        'user_id' => $user->id,
        'role' => 'owner',
        'status' => 'active',
    ]);

    $response = $this->actingAs($user)->get(route('dashboard'));

    $response->assertOk();
    expect(session('current_organization_id'))->toBe($org->id);
});

test('user can switch active organization', function () {
    $user = User::factory()->create();
    $org1 = Organization::factory()->create(['name' => 'Org One']);
    $org2 = Organization::factory()->create(['name' => 'Org Two']);

    OrganizationMembership::create([
        'organization_id' => $org1->id,
        'user_id' => $user->id,
        'role' => 'member',
        'status' => 'active',
    ]);

    OrganizationMembership::create([
        'organization_id' => $org2->id,
        'user_id' => $user->id,
        'role' => 'admin',
        'status' => 'active',
    ]);

    // Initial visit sets org1 as default
    $this->actingAs($user)->get(route('dashboard'));
    expect(session('current_organization_id'))->toBe($org1->id);

    // Switch to org2
    $response = $this->actingAs($user)->post(route('organizations.switch', $org2));
    $response->assertRedirect(route('dashboard'));
    expect(session('current_organization_id'))->toBe($org2->id);
});

test('user cannot switch to an organization they do not belong to', function () {
    $user = User::factory()->create();
    $unrelatedOrg = Organization::factory()->create(['name' => 'Secret Corp']);

    $response = $this->actingAs($user)->post(route('organizations.switch', $unrelatedOrg));

    $response->assertForbidden();
});
