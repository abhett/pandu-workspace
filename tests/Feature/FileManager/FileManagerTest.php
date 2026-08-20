<?php

use App\Models\Attachment;
use App\Models\Folder;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use App\Services\FileManager\FileManagerService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    $this->user = User::factory()->create(['name' => 'Media Manager', 'email' => 'media@example.com']);
    $this->org = Organization::factory()->create(['name' => 'Asset Hub Org']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    Storage::fake('public');
});

test('user can view file manager page with folders and storage metrics', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/files');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('files/index')
        ->has('folders')
        ->has('files')
        ->has('storage')
    );

    expect(Folder::where('organization_id', $this->org->id)->count())->toBeGreaterThan(0);
});

test('user can upload a file and see updated storage usage', function () {
    $file = UploadedFile::fake()->create('project-mockup.png', 1024, 'image/png');

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->post('/files/upload', [
            'file' => $file,
        ]);

    $response->assertRedirect();

    $attachment = Attachment::where('organization_id', $this->org->id)
        ->where('filename', 'project-mockup.png')
        ->first();

    expect($attachment)->not->toBeNull();
    expect($attachment->mime_type)->toBe('image/png');

    $service = app(FileManagerService::class);
    $storage = $service->calculateStorageUsage($this->org);
    expect($storage['used_bytes'])->toBeGreaterThan(0);
});

test('user can create a folder and assign file to folder', function () {
    // 1. Create Folder
    $folderResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/files/folders', [
            'name' => 'Brand Guidelines 2026',
            'color' => 'emerald',
        ]);

    $folderResponse->assertOk();
    $folderResponse->assertJson(['success' => true]);

    $folder = Folder::where('organization_id', $this->org->id)
        ->where('name', 'Brand Guidelines 2026')
        ->first();

    expect($folder)->not->toBeNull();
    expect($folder->color)->toBe('emerald');

    // 2. Upload file into folder
    $file = UploadedFile::fake()->create('brand-logo.svg', 50, 'image/svg+xml');

    $uploadResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->post('/files/upload', [
            'file' => $file,
            'folder_id' => $folder->id,
        ]);

    $uploadResponse->assertRedirect();

    $attachment = Attachment::where('folder_id', $folder->id)->first();
    expect($attachment)->not->toBeNull();
    expect($attachment->filename)->toBe('brand-logo.svg');
});

test('user can download and delete a file', function () {
    $service = app(FileManagerService::class);
    $file = UploadedFile::fake()->create('contract.pdf', 500, 'application/pdf');

    $attachment = $service->uploadFile($this->org, $this->user, $file);

    // Download file
    $downloadResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/files/{$attachment->id}/download");

    $downloadResponse->assertOk();

    // Delete file
    $deleteResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/files/{$attachment->id}");

    $deleteResponse->assertOk();
    expect(Attachment::where('id', $attachment->id)->whereNull('deleted_at')->exists())->toBeFalse();
});
