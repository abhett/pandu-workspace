<?php

use App\Models\Attachment;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);
});

test('user can upload an attachment for a task via api', function () {
    Storage::fake('local');

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

    $project = Project::factory()->create(['organization_id' => $org->id]);
    $task = Task::factory()->create(['organization_id' => $org->id, 'project_id' => $project->id]);

    $token = $user->createToken('API Token');
    $file = UploadedFile::fake()->create('design_spec.pdf', 500, 'application/pdf');

    $response = $this->withToken($token->plainTextToken)
        ->postJson("/api/v1/tasks/{$task->id}/attachments", [
            'file' => $file,
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.filename', 'design_spec.pdf')
        ->assertJsonPath('data.mime_type', 'application/pdf');

    $attachmentId = $response->json('data.id');
    $attachment = Attachment::find($attachmentId);

    expect($attachment)->not->toBeNull();
    expect($attachment->checksum_sha256)->not->toBeNull();
    Storage::disk('local')->assertExists($attachment->object_key);
});

test('dangerous file extensions are rejected', function () {
    Storage::fake('local');

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

    $project = Project::factory()->create(['organization_id' => $org->id]);
    $task = Task::factory()->create(['organization_id' => $org->id, 'project_id' => $project->id]);

    $token = $user->createToken('API Token');
    $maliciousFile = UploadedFile::fake()->create('shell.php', 100, 'application/x-php');

    $response = $this->withToken($token->plainTextToken)
        ->postJson("/api/v1/tasks/{$task->id}/attachments", [
            'file' => $maliciousFile,
        ]);

    $response->assertStatus(422);
});

test('user can download an attachment with permission check and cross-tenant protection', function () {
    Storage::fake('local');

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

    $projectA = Project::factory()->create(['organization_id' => $orgA->id]);
    $taskA = Task::factory()->create(['organization_id' => $orgA->id, 'project_id' => $projectA->id]);

    $tokenA = $userA->createToken('Token A');
    $file = UploadedFile::fake()->create('architecture.png', 200, 'image/png');

    $uploadRes = $this->withToken($tokenA->plainTextToken)
        ->postJson("/api/v1/tasks/{$taskA->id}/attachments", ['file' => $file]);

    $attachmentId = $uploadRes->json('data.id');

    // Authorized download by User A
    $downloadRes = $this->withToken($tokenA->plainTextToken)
        ->get("/api/v1/attachments/{$attachmentId}/download");

    $downloadRes->assertOk();

    // User B from Organization B tries to download
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

    $this->withToken($tokenB->plainTextToken)
        ->get("/api/v1/attachments/{$attachmentId}/download")
        ->assertForbidden();
});

test('user can delete an attachment', function () {
    Storage::fake('local');

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

    $project = Project::factory()->create(['organization_id' => $org->id]);
    $task = Task::factory()->create(['organization_id' => $org->id, 'project_id' => $project->id]);

    $token = $user->createToken('Token');
    $file = UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf');

    $uploadRes = $this->withToken($token->plainTextToken)
        ->postJson("/api/v1/tasks/{$task->id}/attachments", ['file' => $file]);

    $attachmentId = $uploadRes->json('data.id');

    $deleteRes = $this->withToken($token->plainTextToken)
        ->deleteJson("/api/v1/attachments/{$attachmentId}");

    $deleteRes->assertOk();
    expect(Attachment::find($attachmentId))->toBeNull();
});
