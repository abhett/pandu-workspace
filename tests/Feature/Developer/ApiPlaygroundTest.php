<?php

use App\Models\ApiRequestPreset;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->memberRole = Role::whereNull('organization_id')->where('slug', 'member')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'Developer Org']);

    $this->devUser = User::factory()->create(['name' => 'Lead Engineer', 'email' => 'engineer@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest User', 'email' => 'guest@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view api playground dashboard', function () {
    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/developer/api-playground');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/developer/api-playground')
            ->has('metrics')
            ->has('endpointsCatalog')
            ->has('presets')
        );

    expect(ApiRequestPreset::where('organization_id', $this->org->id)->exists())->toBeTrue();
});

test('user can execute sandbox api request', function () {
    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/developer/api-playground/execute', [
            'method' => 'POST',
            'endpoint_path' => '/v1/tasks',
            'headers' => ['Content-Type' => 'application/json'],
            'request_body' => [
                'title' => 'Optimize Postgres Indexes',
                'priority' => 'high',
            ],
        ]);

    $response->assertOk()
        ->assertJson(['success' => true])
        ->assertJsonPath('execution.status_code', 201)
        ->assertJsonStructure([
            'success',
            'execution' => [
                'status_code',
                'latency_ms',
                'headers',
                'response_payload',
                'snippets' => ['curl', 'javascript', 'python', 'go', 'php'],
            ],
        ]);
});

test('user can generate sdk snippets across languages', function () {
    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/developer/api-playground/execute', [
            'method' => 'GET',
            'endpoint_path' => '/v1/projects',
            'headers' => ['Content-Type' => 'application/json'],
        ]);

    $response->assertOk();
    $snippets = $response->json('execution.snippets');
    expect($snippets['curl'])->toContain('curl -X GET');
    expect($snippets['javascript'])->toContain('fetch');
    expect($snippets['python'])->toContain('requests.get');
    expect($snippets['go'])->toContain('http.NewRequest');
    expect($snippets['php'])->toContain('GuzzleHttp');
});

test('user can save api request preset', function () {
    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/developer/api-playground/presets', [
            'name' => 'Custom Task Creator',
            'method' => 'POST',
            'endpoint_path' => '/v1/tasks',
            'headers' => ['Content-Type' => 'application/json'],
            'request_body' => ['title' => 'Sample Task'],
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $preset = ApiRequestPreset::where('name', 'Custom Task Creator')->first();
    expect($preset)->not->toBeNull();
    expect($preset->method)->toBe('POST');
});

test('user can delete api request preset', function () {
    $preset = ApiRequestPreset::create([
        'organization_id' => $this->org->id,
        'name' => 'Preset to Delete',
        'method' => 'GET',
        'endpoint_path' => '/v1/tasks',
        'created_by' => $this->devUser->id,
    ]);

    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/developer/api-playground/presets/{$preset->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(ApiRequestPreset::where('id', $preset->id)->exists())->toBeFalse();
});

test('guest role forbidden from managing presets', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/developer/api-playground/presets', [
            'name' => 'Unauthorized Preset',
            'method' => 'GET',
            'endpoint_path' => '/v1/tasks',
        ])
        ->assertForbidden();
});
