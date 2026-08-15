<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users with organization can visit the dashboard', function () {
    $user = User::factory()->create();
    $org = Organization::factory()->create();

    OrganizationMembership::create([
        'organization_id' => $org->id,
        'user_id' => $user->id,
        'role' => 'owner',
        'status' => 'active',
    ]);

    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});
