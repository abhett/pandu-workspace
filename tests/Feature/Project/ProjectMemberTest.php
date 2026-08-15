<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use App\Services\Project\ProjectCreationService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->user = User::factory()->create();
    $this->organization = Organization::create([
        'name' => 'Acme Member Corp',
        'slug' => 'acme-member-corp',
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

    $service = app(ProjectCreationService::class);
    $this->project = $service->create($this->organization, $this->user, [
        'name' => 'Team Collaboration Project',
        'key' => 'TCP',
    ]);
});

test('owner can add an organization member to the project', function () {
    $collaborator = User::factory()->create();
    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $collaborator->id,
        'role' => 'member',
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $response = $this->actingAs($this->user)->post("/projects/{$this->project->id}/members", [
        'user_id' => $collaborator->id,
        'role' => 'member',
    ]);

    $response->assertRedirect();
    $this->project->refresh();
    expect($this->project->members)->toHaveCount(2);
});

test('owner can update role of a project member', function () {
    $collaborator = User::factory()->create();
    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $collaborator->id,
        'role' => 'member',
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->actingAs($this->user)->post("/projects/{$this->project->id}/members", [
        'user_id' => $collaborator->id,
        'role' => 'member',
    ]);

    $member = $this->project->projectMembers()->where('user_id', $collaborator->id)->first();

    $response = $this->actingAs($this->user)->patch("/projects/{$this->project->id}/members/{$member->id}", [
        'role' => 'admin',
    ]);

    $response->assertRedirect();
    $member->refresh();
    expect($member->role)->toBe('admin');
});

test('owner can remove a member from the project', function () {
    $collaborator = User::factory()->create();
    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $collaborator->id,
        'role' => 'member',
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->actingAs($this->user)->post("/projects/{$this->project->id}/members", [
        'user_id' => $collaborator->id,
        'role' => 'member',
    ]);

    $member = $this->project->projectMembers()->where('user_id', $collaborator->id)->first();

    $response = $this->actingAs($this->user)->delete("/projects/{$this->project->id}/members/{$member->id}");

    $response->assertRedirect();
    $this->project->refresh();
    expect($this->project->members)->toHaveCount(1);
});
