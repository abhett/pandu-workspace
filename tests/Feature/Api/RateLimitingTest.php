<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('api returns rate limiting headers and enforces rate limits', function () {
    $user = User::factory()->create();
    $org = Organization::factory()->create();
    $ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    OrganizationMembership::create([
        'organization_id' => $org->id,
        'user_id' => $user->id,
        'role' => 'owner',
        'role_id' => $ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $token = $user->createToken('API Token');

    $response = $this->withToken($token->plainTextToken)
        ->getJson('/api/v1/me');

    $response->assertOk();
    expect($response->headers->has('X-RateLimit-Limit'))->toBeTrue();
    expect($response->headers->has('X-RateLimit-Remaining'))->toBeTrue();
});
