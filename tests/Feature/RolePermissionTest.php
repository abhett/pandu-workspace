<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    $this->user = User::factory()->create();
    $this->organization = Organization::create([
        'name' => 'Test Corp',
        'slug' => 'test-corp',
        'status' => 'active',
    ]);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    session(['current_organization_id' => $this->organization->id]);
});

test('owner can view roles and permissions matrix', function () {
    $response = $this->actingAs($this->user)->get('/organization/roles');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/roles')
            ->has('groupedPermissions')
            ->has('roles')
        );
});

test('owner can create a custom role with permissions', function () {
    $response = $this->actingAs($this->user)->post('/organization/roles', [
        'name' => 'Quality Assurance Lead',
        'description' => 'Bertanggung jawab atas pengujian kualitas',
        'permissions' => ['tasks:view', 'tasks:comment', 'tasks:move_status'],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('roles', [
        'organization_id' => $this->organization->id,
        'name' => 'Quality Assurance Lead',
    ]);

    $role = Role::where('organization_id', $this->organization->id)->first();
    expect($role->permissions)->toHaveCount(3);
});

test('owner can update role permissions matrix', function () {
    $memberRole = Role::whereNull('organization_id')->where('slug', 'member')->first();

    $response = $this->actingAs($this->user)->put('/organization/roles/matrix', [
        'matrix' => [
            [
                'role_id' => $memberRole->id,
                'permissions' => ['tasks:view', 'tasks:create', 'tasks:comment'],
            ],
        ],
    ]);

    $response->assertRedirect();
    $memberRole->refresh();
    expect($memberRole->permissions->pluck('id')->all())->toEqualCanonicalizing(['tasks:view', 'tasks:create', 'tasks:comment']);
});

test('guest or standard member cannot modify roles', function () {
    $guestUser = User::factory()->create();
    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $guestUser->id,
        'role' => 'guest',
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $response = $this->actingAs($guestUser)->post('/organization/roles', [
        'name' => 'Unauthorized Role',
    ]);

    $response->assertForbidden();
});
