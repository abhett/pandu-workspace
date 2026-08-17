<?php

use App\Models\IdempotencyKey;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use App\Services\Project\ProjectCreationService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);
});

test('submitting identical request with idempotency key replays cached response without duplicate side-effects', function () {
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

    $project = app(ProjectCreationService::class)->create($org, $user, [
        'name' => 'Idempotency Test Project',
        'key' => 'IDEM',
        'type' => 'kanban',
    ]);

    $token = $user->createToken('API Token');
    $idempotencyKey = 'idem_key_unique_12345';

    // First request
    $firstResponse = $this->withToken($token->plainTextToken)
        ->withHeader('Idempotency-Key', $idempotencyKey)
        ->postJson("/api/v1/projects/{$project->id}/tasks", [
            'title' => 'Idempotent Task 1',
            'type' => 'task',
        ]);

    $firstResponse->assertCreated()
        ->assertJsonPath('data.title', 'Idempotent Task 1');

    $taskId = $firstResponse->json('data.id');

    // Second request with SAME idempotency key
    $secondResponse = $this->withToken($token->plainTextToken)
        ->withHeader('Idempotency-Key', $idempotencyKey)
        ->postJson("/api/v1/projects/{$project->id}/tasks", [
            'title' => 'Idempotent Task 1',
            'type' => 'task',
        ]);

    $secondResponse->assertCreated()
        ->assertHeader('X-Idempotent-Replayed', 'true')
        ->assertJsonPath('data.id', $taskId);

    // Verify only ONE task was created in database
    expect(Task::where('project_id', $project->id)->count())->toBe(1);
});

test('reusing idempotency key with different payload returns 422 error', function () {
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

    $project = app(ProjectCreationService::class)->create($org, $user, [
        'name' => 'Tamper Test Project',
        'key' => 'TAMP',
        'type' => 'kanban',
    ]);

    $token = $user->createToken('API Token');
    $idempotencyKey = 'idem_key_tamper_test';

    // First request
    $this->withToken($token->plainTextToken)
        ->withHeader('Idempotency-Key', $idempotencyKey)
        ->postJson("/api/v1/projects/{$project->id}/tasks", [
            'title' => 'Original Title',
        ])
        ->assertCreated();

    // Second request with modified title
    $tamperedResponse = $this->withToken($token->plainTextToken)
        ->withHeader('Idempotency-Key', $idempotencyKey)
        ->postJson("/api/v1/projects/{$project->id}/tasks", [
            'title' => 'Modified Title',
        ]);

    $tamperedResponse->assertStatus(422)
        ->assertJsonPath('error.code', 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PARAMS');
});

test('in-flight idempotency key returns 409 conflict', function () {
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

    $project = app(ProjectCreationService::class)->create($org, $user, [
        'name' => 'InFlight Test Project',
        'key' => 'INFL',
        'type' => 'kanban',
    ]);

    $idempotencyKey = 'idem_key_inflight_test';

    // Pre-seed an in-flight processing key
    IdempotencyKey::create([
        'key' => $idempotencyKey,
        'organization_id' => $org->id,
        'user_id' => $user->id,
        'request_method' => 'POST',
        'request_path' => "api/v1/projects/{$project->id}/tasks",
        'request_checksum' => 'checksum',
        'status' => 'processing',
        'expires_at' => now()->addHour(),
    ]);

    $token = $user->createToken('API Token');

    $response = $this->withToken($token->plainTextToken)
        ->withHeader('Idempotency-Key', $idempotencyKey)
        ->postJson("/api/v1/projects/{$project->id}/tasks", [
            'title' => 'Concurrent Task',
        ]);

    $response->assertStatus(409)
        ->assertJsonPath('error.code', 'IDEMPOTENCY_KEY_IN_FLIGHT');
});
