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

test('user can create a personal access token with scopes and access api', function () {
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

    // Create token via web session or API
    $token = $user->createToken('Integration Token', ['tasks:read', 'tasks:write']);

    $response = $this->withToken($token->plainTextToken)
        ->getJson('/api/v1/me');

    $response->assertOk()
        ->assertJsonPath('data.user.id', $user->id)
        ->assertJsonPath('data.user.email', $user->email)
        ->assertJsonPath('meta.token_abilities', ['tasks:read', 'tasks:write']);
});

test('unauthenticated request to api is rejected with 401', function () {
    $response = $this->getJson('/api/v1/me');

    $response->assertUnauthorized();
});

test('user can list, create, and revoke api tokens via token endpoints', function () {
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

    $baseToken = $user->createToken('Base Token');

    // Create a new token via API
    $createResponse = $this->withToken($baseToken->plainTextToken)
        ->postJson('/api/v1/tokens', [
            'name' => 'CI/CD Deploy Token',
            'abilities' => ['projects:read'],
        ]);

    $createResponse->assertCreated()
        ->assertJsonPath('data.name', 'CI/CD Deploy Token')
        ->assertJsonPath('data.abilities', ['projects:read']);

    $newTokenId = $createResponse->json('data.id');

    // List tokens
    $listResponse = $this->withToken($baseToken->plainTextToken)
        ->getJson('/api/v1/tokens');

    $listResponse->assertOk()
        ->assertJsonCount(2, 'data');

    // Revoke token
    $deleteResponse = $this->withToken($baseToken->plainTextToken)
        ->deleteJson("/api/v1/tokens/{$newTokenId}");

    $deleteResponse->assertOk();

    // Verify only 1 token remains
    expect($user->tokens()->count())->toBe(1);
});
