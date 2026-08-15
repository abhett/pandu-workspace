<?php

use App\Models\Organization;
use App\Models\User;

test('authenticated user without organization is redirected to onboarding', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('dashboard'));

    $response->assertRedirect(route('onboarding.organization'));
});

test('organization onboarding screen can be rendered', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('onboarding.organization'));

    $response->assertOk();
});

test('user can create an organization during onboarding', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('onboarding.organization.store'), [
        'name' => 'Nusantara Tech',
        'slug' => 'nusantara-tech',
        'industry' => 'Teknologi & Perangkat Lunak',
        'size' => '11 - 50',
    ]);

    $response->assertRedirect(route('dashboard'));

    $organization = Organization::where('slug', 'nusantara-tech')->first();
    expect($organization)->not->toBeNull();
    expect($organization->name)->toBe('Nusantara Tech');
    expect($organization->id)->toBeString(); // UUIDv7

    // User is owner of the organization
    expect($user->belongsToOrganization($organization))->toBeTrue();
    expect($user->roleInOrganization($organization))->toBe('owner');

    // Current active organization is stored in session
    expect(session('current_organization_id'))->toBe($organization->id);
});

test('organization name is required', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('onboarding.organization.store'), [
        'name' => '',
    ]);

    $response->assertSessionHasErrors('name');
});
