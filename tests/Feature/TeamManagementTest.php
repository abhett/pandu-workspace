<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\Team;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    $this->owner = User::factory()->create();
    $this->organization = Organization::create([
        'name' => 'Team Test Org',
        'slug' => 'team-test-org',
        'status' => 'active',
    ]);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->owner->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    session(['current_organization_id' => $this->organization->id]);
});

test('user can view teams list in current organization', function () {
    $response = $this->actingAs($this->owner)->get('/teams');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('teams/index')
            ->has('teams')
            ->has('departments')
            ->has('availableMembers')
        );
});

test('owner can create team with lead and members', function () {
    $engineer = User::factory()->create();
    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $engineer->id,
        'role' => 'member',
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $response = $this->actingAs($this->owner)->post('/teams', [
        'name' => 'DevOps & Reliability',
        'department' => 'Engineering',
        'description' => 'Mengelola ketersediaan cloud dan CI/CD.',
        'lead_user_id' => $engineer->id,
        'member_user_ids' => [$this->owner->id, $engineer->id],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('teams', [
        'organization_id' => $this->organization->id,
        'name' => 'DevOps & Reliability',
        'lead_user_id' => $engineer->id,
    ]);

    $team = Team::where('slug', 'devops-reliability')->first();
    expect($team->users)->toHaveCount(2);
});

test('owner can update team details', function () {
    $team = Team::create([
        'organization_id' => $this->organization->id,
        'name' => 'Old Team Name',
        'slug' => 'old-team-name',
        'department' => 'Product',
    ]);

    $response = $this->actingAs($this->owner)->put("/teams/{$team->id}", [
        'name' => 'New Strategic Team',
        'department' => 'Executive',
        'description' => 'Inisiatif strategis level eksekutif.',
    ]);

    $response->assertRedirect();
    $team->refresh();
    expect($team->name)->toBe('New Strategic Team')
        ->and($team->department)->toBe('Executive');
});

test('owner can delete a team', function () {
    $team = Team::create([
        'organization_id' => $this->organization->id,
        'name' => 'Temporary Project Team',
        'slug' => 'temporary-project-team',
    ]);

    $response = $this->actingAs($this->owner)->delete("/teams/{$team->id}");

    $response->assertRedirect();
    $this->assertSoftDeleted('teams', [
        'id' => $team->id,
    ]);
});
