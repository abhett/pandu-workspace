<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\Sprint;
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

test('user can perform CRUD on projects via rest api v1', function () {
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

    // Create project
    $createResponse = $this->withToken($token->plainTextToken)
        ->withHeader('X-Organization-Id', $org->id)
        ->postJson('/api/v1/projects', [
            'name' => 'Mobile App Replatform',
            'key' => 'MOB',
            'description' => 'Rebuilding the mobile app in React Native',
            'type' => 'kanban',
        ]);

    $createResponse->assertCreated()
        ->assertJsonPath('data.name', 'Mobile App Replatform')
        ->assertJsonPath('data.key', 'MOB');

    $projectId = $createResponse->json('data.id');

    // Show project
    $showResponse = $this->withToken($token->plainTextToken)
        ->getJson("/api/v1/projects/{$projectId}");

    $showResponse->assertOk()
        ->assertJsonPath('data.id', $projectId)
        ->assertJsonPath('data.key', 'MOB');

    // Update project
    $updateResponse = $this->withToken($token->plainTextToken)
        ->putJson("/api/v1/projects/{$projectId}", [
            'name' => 'Mobile App 2.0',
        ]);

    $updateResponse->assertOk()
        ->assertJsonPath('data.name', 'Mobile App 2.0');

    // Delete project
    $deleteResponse = $this->withToken($token->plainTextToken)
        ->deleteJson("/api/v1/projects/{$projectId}");

    $deleteResponse->assertOk();
    expect(Project::find($projectId))->toBeNull();
});

test('user can perform task lifecycle and move with version control via rest api v1', function () {
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
        'name' => 'Development Core',
        'key' => 'DEV',
        'type' => 'kanban',
    ]);

    $todoStatus = $project->statuses()->first();
    $doneStatus = $project->statuses()->where('is_completed', true)->first() ?? $project->statuses()->skip(1)->first();

    $token = $user->createToken('API Token');

    // Create task
    $createResponse = $this->withToken($token->plainTextToken)
        ->postJson("/api/v1/projects/{$project->id}/tasks", [
            'title' => 'Implement API Rate Limiter',
            'type' => 'task',
            'priority' => 'high',
            'estimate_points' => 5,
        ]);

    $createResponse->assertCreated()
        ->assertJsonPath('data.title', 'Implement API Rate Limiter')
        ->assertJsonPath('data.key', 'DEV-1')
        ->assertJsonPath('data.status_id', $todoStatus->id)
        ->assertJsonPath('data.version', 1);

    $taskId = $createResponse->json('data.id');

    // Move task with If-Match concurrency header
    $moveResponse = $this->withToken($token->plainTextToken)
        ->withHeader('If-Match', '"1"')
        ->postJson("/api/v1/tasks/{$taskId}/move", [
            'status_id' => $doneStatus->id,
        ]);

    $moveResponse->assertOk()
        ->assertJsonPath('data.status_id', $doneStatus->id)
        ->assertJsonPath('data.version', 2);

    // Stale version move attempt fails with 409 Conflict
    $conflictResponse = $this->withToken($token->plainTextToken)
        ->withHeader('If-Match', '"1"')
        ->postJson("/api/v1/tasks/{$taskId}/move", [
            'status_id' => $todoStatus->id,
        ]);

    $conflictResponse->assertStatus(409)
        ->assertJsonPath('error.code', 'TASK_VERSION_CONFLICT');
});

test('user can manage sprints via rest api v1', function () {
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
        'name' => 'Scrum Core',
        'key' => 'SCRUM',
        'type' => 'scrum',
    ]);

    $token = $user->createToken('API Token');

    // Create sprint
    $createResponse = $this->withToken($token->plainTextToken)
        ->postJson("/api/v1/projects/{$project->id}/sprints", [
            'name' => 'Sprint 1 - Foundation',
            'goal' => 'Build authentication and core REST API',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addWeeks(2)->toDateString(),
        ]);

    $createResponse->assertCreated()
        ->assertJsonPath('data.name', 'Sprint 1 - Foundation')
        ->assertJsonPath('data.status', 'future');

    $sprintId = $createResponse->json('data.id');

    // Start sprint
    $startResponse = $this->withToken($token->plainTextToken)
        ->postJson("/api/v1/sprints/{$sprintId}/start");

    $startResponse->assertOk()
        ->assertJsonPath('data.status', 'active');

    // Complete sprint
    $completeResponse = $this->withToken($token->plainTextToken)
        ->postJson("/api/v1/sprints/{$sprintId}/complete");

    $completeResponse->assertOk()
        ->assertJsonPath('data.status', 'completed');
});

test('tenant isolation: user from organization b cannot access or mutate organization a resources via api', function () {
    $userA = User::factory()->create();
    $orgA = Organization::factory()->create();
    $ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    OrganizationMembership::create([
        'organization_id' => $orgA->id,
        'user_id' => $userA->id,
        'role' => 'owner',
        'role_id' => $ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $projectA = app(ProjectCreationService::class)->create($orgA, $userA, [
        'name' => 'Project A',
        'key' => 'PRJA',
        'type' => 'kanban',
    ]);

    $statusA = $projectA->statuses()->first();

    $taskA = Task::create([
        'organization_id' => $orgA->id,
        'project_id' => $projectA->id,
        'status_id' => $statusA->id,
        'sequence_number' => 1,
        'key' => 'PRJA-1',
        'title' => 'Task A',
        'rank' => '0|hzzzzz:',
        'created_by' => $userA->id,
    ]);

    $userB = User::factory()->create();
    $orgB = Organization::factory()->create();

    OrganizationMembership::create([
        'organization_id' => $orgB->id,
        'user_id' => $userB->id,
        'role' => 'owner',
        'role_id' => $ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $tokenB = $userB->createToken('Token B');

    auth()->forgetGuards();

    // User B tries to access Org A's project
    $this->withToken($tokenB->plainTextToken)
        ->getJson("/api/v1/projects/{$projectA->id}")
        ->assertForbidden();

    // User B tries to access Org A's task
    $this->withToken($tokenB->plainTextToken)
        ->getJson("/api/v1/tasks/{$taskA->id}")
        ->assertForbidden();
});
