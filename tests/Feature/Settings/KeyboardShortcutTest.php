<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use App\Models\UserAccessibilityPreference;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    $this->user = User::factory()->create([
        'name' => 'Alex Rivera',
        'email' => 'alex@example.com',
        'email_verified_at' => now(),
    ]);

    $this->org = Organization::factory()->create(['name' => 'Kinetic Dev Studio']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view keyboard shortcuts and accessibility page', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/settings/keyboard-shortcuts');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('settings/keyboard-shortcuts')
        ->has('preferences')
        ->has('shortcuts')
    );

    $pref = UserAccessibilityPreference::where('user_id', $this->user->id)->first();
    expect($pref)->not->toBeNull();
    expect($pref->single_key_shortcuts_enabled)->toBeTrue();
});

test('user can update keyboard accessibility preferences', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson('/settings/keyboard-shortcuts', [
            'single_key_shortcuts_enabled' => false,
            'reduce_motion' => true,
            'high_contrast' => true,
        ]);

    $response->assertOk();
    $pref = UserAccessibilityPreference::where('user_id', $this->user->id)->first();
    expect($pref->single_key_shortcuts_enabled)->toBeFalse();
    expect($pref->reduce_motion)->toBeTrue();
    expect($pref->high_contrast)->toBeTrue();
});
