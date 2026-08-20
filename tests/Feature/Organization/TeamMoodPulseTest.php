<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\TeamMoodPulse;
use App\Models\User;
use App\Models\WellnessInitiative;
use App\Services\Wellness\TeamMoodPulseService;
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

    $this->org = Organization::factory()->create(['name' => 'Wellness Pulse Org']);

    $this->ownerUser = User::factory()->create(['name' => 'Company Leader', 'email' => 'leader@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ownerUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devA = User::factory()->create(['name' => 'Software Engineer', 'email' => 'devA@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devA->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Observer Guest', 'email' => 'observer@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view team mood pulse dashboard and metrics', function () {
    TeamMoodPulse::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devA->id,
        'mood_score' => 4,
        'energy_level' => 4,
        'workload_feeling' => 'manageable',
        'tags' => ['clear_goals', 'supportive_team'],
        'notes' => 'Sprint berjalan lancar hari ini!',
        'is_anonymous' => false,
        'pulse_date' => now()->toDateString(),
    ]);

    $response = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/pulse');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/pulse/index')
            ->has('metrics')
            ->has('distributions')
            ->has('daily_trends')
            ->has('recent_feed', 1)
            ->where('my_today_pulse.mood_score', 4)
        );
});

test('user can submit and update daily mood check-in', function () {
    // 1. Submit today check-in
    $response = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/pulse/check-in', [
            'mood_score' => 5,
            'energy_level' => 5,
            'workload_feeling' => 'manageable',
            'tags' => ['proud_achievement'],
            'notes' => 'Deploy fitur baru ke production sukses!',
            'is_anonymous' => false,
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $pulse = TeamMoodPulse::where('organization_id', $this->org->id)
        ->where('user_id', $this->devA->id)
        ->whereDate('pulse_date', now()->toDateString())
        ->first();

    expect($pulse)->not->toBeNull();
    expect($pulse->mood_score)->toBe(5);
    expect($pulse->energy_level)->toBe(5);

    // 2. Update check-in later today
    $updateResponse = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/pulse/check-in', [
            'mood_score' => 4,
            'energy_level' => 3,
            'workload_feeling' => 'heavy',
            'tags' => ['meeting_fatigue'],
            'notes' => 'Sedikit lelah setelah rapat panjang.',
        ]);

    $updateResponse->assertOk()
        ->assertJson(['success' => true]);

    $pulse->refresh();
    expect($pulse->mood_score)->toBe(4);
    expect($pulse->energy_level)->toBe(3);
    expect($pulse->workload_feeling)->toBe('heavy');
});

test('anonymous pulse submission protects user identity in feed', function () {
    $pulse = TeamMoodPulse::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devA->id,
        'mood_score' => 2,
        'energy_level' => 2,
        'workload_feeling' => 'overwhelmed',
        'tags' => ['unclear_reqs'],
        'notes' => 'Kebutuhan fitur masih ambigu.',
        'is_anonymous' => true,
        'pulse_date' => now()->toDateString(),
    ]);

    $service = app(TeamMoodPulseService::class);
    $dashboard = $service->getDashboard($this->org, $this->ownerUser);

    $feedItem = collect($dashboard['recent_feed'])->firstWhere('id', $pulse->id);
    expect($feedItem)->not->toBeNull();
    expect($feedItem['is_anonymous'])->toBeTrue();
    expect($feedItem['author']['name'])->toBe('Anggota Tim (Anonim)');
    expect($feedItem['author']['avatar'])->toBeNull();
});

test('burnout risk index calculation detects stressed members', function () {
    // 1 Stressed (score 1), 1 Overwhelmed (workload overwhelmed), 2 Happy (score 5)
    TeamMoodPulse::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devA->id,
        'mood_score' => 1,
        'energy_level' => 1,
        'workload_feeling' => 'overwhelmed',
        'pulse_date' => now()->subDay()->toDateString(),
    ]);

    TeamMoodPulse::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ownerUser->id,
        'mood_score' => 5,
        'energy_level' => 5,
        'workload_feeling' => 'manageable',
        'pulse_date' => now()->toDateString(),
    ]);

    $service = app(TeamMoodPulseService::class);
    $dashboard = $service->getDashboard($this->org, $this->ownerUser);

    // 1 out of 2 = 50%
    expect($dashboard['metrics']['burnout_risk_rate'])->toEqual(50.0);
});

test('admin can create, update, and delete wellness initiatives', function () {
    // 1. Create initiative
    $createResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/pulse/initiatives', [
            'title' => 'No-Meeting Friday Afternoon',
            'category' => 'no_meeting_day',
            'impact_summary' => 'Memberikan waktu fokus tanpa interupsi bagi developer.',
            'target_date' => now()->addWeek()->toDateString(),
        ]);

    $createResponse->assertCreated()
        ->assertJson(['success' => true]);

    $initiative = WellnessInitiative::where('organization_id', $this->org->id)->first();
    expect($initiative)->not->toBeNull();
    expect($initiative->title)->toBe('No-Meeting Friday Afternoon');

    // 2. Update initiative
    $updateResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/organization/pulse/initiatives/{$initiative->id}", [
            'status' => 'in_progress',
        ]);

    $updateResponse->assertOk()
        ->assertJson(['success' => true]);

    $initiative->refresh();
    expect($initiative->status)->toBe('in_progress');

    // 3. Delete initiative
    $deleteResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/pulse/initiatives/{$initiative->id}");

    $deleteResponse->assertOk()
        ->assertJson(['success' => true]);

    expect(WellnessInitiative::find($initiative->id))->toBeNull();
});

test('guest role is forbidden from creating wellness initiatives', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/pulse/initiatives', [
            'title' => 'Unauthorized Initiative',
            'category' => 'team_building',
        ])
        ->assertForbidden();
});
