<?php

use App\Models\KaizenInitiative;
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

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->memberRole = Role::whereNull('organization_id')->where('slug', 'member')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'Agile Kaizen Org']);

    $this->leadUser = User::factory()->create(['name' => 'Scrum Master Lead', 'email' => 'scrum@kaizen.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->leadUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devUser = User::factory()->create(['name' => 'Agile Developer', 'email' => 'dev@kaizen.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Observer Guest', 'email' => 'guest@kaizen.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->project = Project::factory()->create([
        'organization_id' => $this->org->id,
        'name' => 'Fintech App Agile Suite',
        'key' => 'FIN',
    ]);
});

test('user can view kaizen dashboard', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/agile/kaizen');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/agile/kaizen')
            ->has('metrics')
            ->has('pillarStats')
            ->has('initiatives')
            ->has('projects')
            ->has('sprints')
            ->has('members')
        );

    expect(KaizenInitiative::where('organization_id', $this->org->id)->exists())->toBeTrue();
});

test('user can create kaizen initiative', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/agile/kaizen/initiatives', [
            'project_id' => $this->project->id,
            'title' => 'Automated PR Size Linter & Review Fast-Track',
            'pillar' => 'engineering_quality',
            'problem_statement' => 'PR reviews sering tertunda lebih dari 2 hari karena ukuran diff terlalu besar.',
            'action_plan' => 'Batasi ukuran PR maksimal 300 LOC dan aktifkan auto-assigner reviewer.',
            'expected_impact' => 'Waktu turnaround code review turun menjadi kurang dari 6 jam.',
            'status' => 'in_progress',
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    expect(KaizenInitiative::where('title', 'Automated PR Size Linter & Review Fast-Track')->exists())->toBeTrue();
});

test('user can update kaizen initiative', function () {
    $initiative = KaizenInitiative::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'owner_id' => $this->devUser->id,
        'pillar' => 'process_agility',
        'title' => 'Async Story Point Poker Sessions',
        'problem_statement' => 'Planning meetings memakan waktu 2 jam.',
        'action_plan' => 'Lakukan voting poker sebelum hari meeting.',
        'status' => 'in_progress',
    ]);

    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/organization/agile/kaizen/initiatives/{$initiative->id}", [
            'title' => 'Async Story Point Poker Sessions (Revised)',
            'pillar' => 'process_agility',
            'problem_statement' => 'Planning meetings memakan waktu 2 jam.',
            'action_plan' => 'Lakukan voting poker 24 jam sebelum planning.',
            'status' => 'implemented',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $initiative->refresh();
    expect($initiative->title)->toBe('Async Story Point Poker Sessions (Revised)');
    expect($initiative->status)->toBe('implemented');
});

test('user can verify kaizen impact', function () {
    $initiative = KaizenInitiative::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'owner_id' => $this->leadUser->id,
        'pillar' => 'developer_experience',
        'title' => 'Docker Dev Environment Caching Optimization',
        'problem_statement' => 'Build docker lokal membutuhkan waktu 15 menit per restart.',
        'action_plan' => 'Gunakan multi-stage build cache layer.',
        'status' => 'implemented',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/agile/kaizen/initiatives/{$initiative->id}/verify", [
            'impact_score' => 96,
            'measured_outcome' => 'Waktu build turun menjadi 45 detik, menghemat 1 jam per developer per hari.',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $initiative->refresh();
    expect($initiative->status)->toBe('verified_effective');
    expect($initiative->impact_score)->toBe(96);
    expect($initiative->measured_outcome)->toContain('Waktu build turun');
});

test('user can delete kaizen initiative', function () {
    $initiative = KaizenInitiative::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'pillar' => 'team_collaboration',
        'title' => 'Temporary test initiative',
        'problem_statement' => 'Testing deletion',
        'action_plan' => 'Delete immediately',
        'status' => 'proposed',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/agile/kaizen/initiatives/{$initiative->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(KaizenInitiative::where('id', $initiative->id)->exists())->toBeFalse();
});

test('guest role forbidden from modifying kaizen', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/agile/kaizen/initiatives', [
            'project_id' => $this->project->id,
            'title' => 'Unauthorized initiative',
            'pillar' => 'process_agility',
            'problem_statement' => 'None',
            'action_plan' => 'None',
        ])
        ->assertForbidden();
});
