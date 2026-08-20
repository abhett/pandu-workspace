<?php

use App\Models\DailyStandup;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
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
});

test('authenticated user can access daily standup hub', function () {
    $response = $this->actingAs($this->user)->get('/scrum/daily-standup');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('scrum/daily-standup')
        ->has('feed')
        ->has('projects')
        ->has('selectedDate')
    );
});

test('authenticated user can submit standup checkin', function () {
    $response = $this->actingAs($this->user)->post('/scrum/daily-standup', [
        'yesterday_work' => 'Menyelesaikan modul OAuth2 login',
        'today_work' => 'Mengembangkan antarmuka standup harian',
        'blockers' => 'Tidak ada',
        'mood' => 'great',
        'project_id' => $this->project->id,
        'date' => now()->toDateString(),
    ]);

    $response->assertSessionHas('success');

    $this->assertDatabaseHas('daily_standups', [
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'yesterday_work' => 'Menyelesaikan modul OAuth2 login',
        'today_work' => 'Mengembangkan antarmuka standup harian',
        'mood' => 'great',
    ]);
});

test('authenticated user can trigger AI standup synthesis', function () {
    DailyStandup::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'user_id' => $this->user->id,
        'date' => now()->toDateString(),
        'yesterday_work' => 'Refactoring API controller',
        'today_work' => 'Menulis Pest tests',
        'blockers' => 'Menunggu review PR dari tech lead',
        'mood' => 'blocked',
    ]);

    $response = $this->actingAs($this->user)->postJson('/scrum/daily-standup/synthesize', [
        'project_id' => $this->project->id,
        'date' => now()->toDateString(),
    ]);

    $response->assertOk();
    $response->assertJsonStructure([
        'summary',
        'blockers_count',
        'blockers_list',
        'velocity_health',
    ]);
});

test('unauthenticated guest is redirected to login', function () {
    $response = $this->get('/scrum/daily-standup');

    $response->assertRedirect('/login');
});
