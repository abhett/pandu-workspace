<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Release;
use App\Models\Role;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\User;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->user = User::factory()->create();
    $this->org = Organization::factory()->create();

    $ownerRole = Role::where('slug', 'owner')->first();
    OrganizationMembership::create([
        'user_id' => $this->user->id,
        'organization_id' => $this->org->id,
        'role_id' => $ownerRole->id,
    ]);

    $this->user->update(['current_organization_id' => $this->org->id]);
    session(['current_organization_id' => $this->org->id]);

    $this->project = Project::factory()->create([
        'organization_id' => $this->org->id,
        'lead_user_id' => $this->user->id,
    ]);

    $this->sprint = Sprint::factory()->create([
        'project_id' => $this->project->id,
        'name' => 'Sprint 36 Foundation',
        'status' => 'active',
    ]);

    Task::factory()->create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'sprint_id' => $this->sprint->id,
        'created_by' => $this->user->id,
        'title' => 'Fitur Baru: Automated Release Notes Hub',
        'completed_at' => now(),
    ]);

    Task::factory()->create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'sprint_id' => $this->sprint->id,
        'created_by' => $this->user->id,
        'title' => 'Fix: Perbaikan bug sesi timeout redirect',
        'completed_at' => now(),
    ]);
});

test('authenticated user can access releases management hub', function () {
    $response = $this->actingAs($this->user)->get('/releases');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('releases/index')
        ->has('releases')
        ->has('projects')
        ->has('sprints')
    );
});

test('authenticated user can create a release draft', function () {
    $response = $this->actingAs($this->user)->post('/releases', [
        'version' => 'v3.5.0',
        'title' => 'Rilis Musim Semi',
        'description' => 'Pembaruan changelog dan release hub.',
        'type' => 'minor',
        'project_id' => $this->project->id,
        'is_public' => true,
        'content' => [
            'new_features' => ['Fitur rilis otomatis'],
            'improvements' => [],
            'bug_fixes' => [],
            'breaking_changes' => [],
        ],
    ]);

    $response->assertSessionHas('success');

    $this->assertDatabaseHas('releases', [
        'organization_id' => $this->org->id,
        'version' => 'v3.5.0',
        'title' => 'Rilis Musim Semi',
        'status' => 'draft',
    ]);
});

test('authenticated user can auto generate release notes from sprint', function () {
    $response = $this->actingAs($this->user)->post('/releases/generate-ai', [
        'sprint_id' => $this->sprint->id,
        'version' => 'v3.6.0',
        'type' => 'minor',
    ]);

    $response->assertSessionHas('success');

    $this->assertDatabaseHas('releases', [
        'organization_id' => $this->org->id,
        'version' => 'v3.6.0',
        'status' => 'draft',
    ]);
});

test('authenticated user can publish release', function () {
    $release = Release::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'created_by' => $this->user->id,
        'version' => 'v3.4.0',
        'title' => 'Rilis Stabil v3.4.0',
        'type' => 'major',
        'status' => 'draft',
        'is_public' => true,
    ]);

    $response = $this->actingAs($this->user)->post("/releases/{$release->id}/publish", [
        'is_public' => true,
    ]);

    $response->assertSessionHas('success');

    $this->assertDatabaseHas('releases', [
        'id' => $release->id,
        'status' => 'published',
        'is_public' => true,
    ]);
});

test('guest can view public changelog', function () {
    Release::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'created_by' => $this->user->id,
        'version' => 'v3.4.0',
        'title' => 'Rilis Publik v3.4.0',
        'type' => 'major',
        'status' => 'published',
        'is_public' => true,
        'published_at' => now(),
    ]);

    $response = $this->get('/changelog');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('public/changelog')
        ->has('releases')
    );
});

test('guest can react to a public release', function () {
    $release = Release::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'created_by' => $this->user->id,
        'version' => 'v3.4.0',
        'title' => 'Rilis Publik v3.4.0',
        'type' => 'major',
        'status' => 'published',
        'is_public' => true,
        'published_at' => now(),
    ]);

    $response = $this->postJson("/changelog/{$release->id}/react", [
        'emoji' => 'rocket',
    ]);

    $response->assertOk();
    $response->assertJson([
        'success' => true,
        'reactions_count' => 1,
    ]);

    $this->assertDatabaseHas('release_reactions', [
        'release_id' => $release->id,
        'emoji' => 'rocket',
    ]);
});
