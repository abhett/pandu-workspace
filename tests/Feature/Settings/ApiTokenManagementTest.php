<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use App\Models\UserConnectedAccount;
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

test('user can view api tokens and connected accounts page', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/settings/api-tokens');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('settings/api-tokens')
        ->has('tokens')
        ->has('connected_accounts')
    );
});

test('user can create personal access token with abilities', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/settings/api-tokens', [
            'name' => 'CI/CD Deploy Key',
            'abilities' => ['read', 'write'],
            'expires_in_days' => 90,
        ]);

    $response->assertOk();
    $response->assertJsonStructure([
        'success',
        'message',
        'plain_text_token',
    ]);

    $token = $this->user->tokens()->where('name', 'CI/CD Deploy Key')->first();
    expect($token)->not->toBeNull();
    expect($token->abilities)->toEqual(['read', 'write']);
    expect($token->expires_at)->not->toBeNull();
});

test('user can revoke personal access token', function () {
    $token = $this->user->createToken('Grafana Sync', ['read']);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/settings/api-tokens/{$token->accessToken->id}");

    $response->assertOk();
    $tokenExists = $this->user->tokens()->where('name', 'Grafana Sync')->exists();
    expect($tokenExists)->toBeFalse();
});

test('user can connect and disconnect third party oauth application', function () {
    // Connect Google Cloud
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/settings/connected-accounts/toggle', [
            'provider' => 'google',
            'connect' => true,
            'username' => 'alex_gcp_dev',
        ]);

    $response->assertOk();
    $acc = UserConnectedAccount::where('user_id', $this->user->id)->where('provider', 'google')->first();
    expect($acc)->not->toBeNull();
    expect($acc->is_connected)->toBeTrue();
    expect($acc->provider_username)->toBe('alex_gcp_dev');

    // Disconnect Google Cloud
    $response2 = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/settings/connected-accounts/toggle', [
            'provider' => 'google',
            'connect' => false,
        ]);

    $response2->assertOk();
    $acc->refresh();
    expect($acc->is_connected)->toBeFalse();
});
