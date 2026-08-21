<?php

use App\Models\Incident;
use App\Models\IncidentPostMortem;
use App\Models\IncidentUpdate;
use App\Models\OnCallRota;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->memberRole = Role::whereNull('organization_id')->where('slug', 'member')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'Incident War Room Org']);

    $this->sreLead = User::factory()->create(['name' => 'SRE Lead Engineer', 'email' => 'sre@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->sreLead->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devUser = User::factory()->create(['name' => 'Software Engineer', 'email' => 'dev@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest Stakeholder', 'email' => 'guest@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view incidents dashboard', function () {
    $response = $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/ops/incidents');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/ops/incidents')
            ->has('metrics')
            ->has('incidents')
            ->has('onCallRota')
        );

    expect(Incident::where('organization_id', $this->org->id)->exists())->toBeTrue();
    expect(OnCallRota::where('organization_id', $this->org->id)->exists())->toBeTrue();
});

test('user can declare new incident', function () {
    $response = $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/ops/incidents', [
            'title' => 'Kafka Cluster Consumer Group Rebalance Loop',
            'severity' => 'P1',
            'impact_summary' => 'Event ingestion delayed by 15 minutes across all stream workers.',
            'commander_id' => $this->sreLead->id,
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $incident = Incident::where('title', 'Kafka Cluster Consumer Group Rebalance Loop')->first();
    expect($incident)->not->toBeNull();
    expect($incident->severity)->toBe('P1');
    expect($incident->status)->toBe('investigating');
    expect(IncidentUpdate::where('incident_id', $incident->id)->exists())->toBeTrue();
});

test('user can post war room update', function () {
    $incident = Incident::create([
        'organization_id' => $this->org->id,
        'incident_number' => 10,
        'title' => 'Redis Memory Eviction Warning',
        'severity' => 'P2',
        'status' => 'investigating',
        'impact_summary' => 'Cache misses increasing.',
        'started_at' => now(),
    ]);

    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/ops/incidents/{$incident->id}/updates", [
            'status_update' => 'identified',
            'message' => 'Cache size increased and volatile-lru eviction policy tuned.',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $incident->refresh();
    expect($incident->status)->toBe('identified');
    expect(IncidentUpdate::where('incident_id', $incident->id)->where('status_update', 'identified')->exists())->toBeTrue();
});

test('user can resolve incident', function () {
    $incident = Incident::create([
        'organization_id' => $this->org->id,
        'incident_number' => 11,
        'title' => 'Elasticsearch Cluster Red Status',
        'severity' => 'P1',
        'status' => 'monitoring',
        'impact_summary' => 'Search indexing queue backed up.',
        'started_at' => now()->subMinutes(30),
    ]);

    $response = $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/ops/incidents/{$incident->id}/resolve");

    $response->assertOk()
        ->assertJson(['success' => true]);

    $incident->refresh();
    expect($incident->status)->toBe('resolved');
    expect($incident->mttr_minutes)->toBeGreaterThanOrEqual(29);
});

test('user can save post-mortem rca', function () {
    $incident = Incident::create([
        'organization_id' => $this->org->id,
        'incident_number' => 12,
        'title' => 'Payment Gateway Latency Spike',
        'severity' => 'P2',
        'status' => 'resolved',
        'impact_summary' => 'Subscribers experienced 5s delay during checkout.',
        'started_at' => now()->subHours(2),
        'resolved_at' => now()->subHours(1),
    ]);

    $response = $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/ops/incidents/{$incident->id}/post-mortem", [
            'root_cause' => 'Upstream webhook listener thread deadlock under concurrent load.',
            'trigger_event' => 'Flash sale event created sudden 10x traffic spike.',
            'lessons_learned' => 'Always queue webhooks asynchronously into Dead-Letter Queue before database operations.',
            'action_items' => "Implement asynchronous BullMQ event bus\nAdd rate limiting burst guard",
            'status' => 'published',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $postMortem = IncidentPostMortem::where('incident_id', $incident->id)->first();
    expect($postMortem)->not->toBeNull();
    expect($postMortem->status)->toBe('published');
    expect($postMortem->action_items)->toHaveCount(2);
});

test('user can update on-call rota', function () {
    $response = $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/ops/incidents/on-call-rota', [
            'shift_name' => 'APAC 24/7 SRE Shift',
            'primary_user_id' => $this->sreLead->id,
            'secondary_user_id' => $this->devUser->id,
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(OnCallRota::where('shift_name', 'APAC 24/7 SRE Shift')->exists())->toBeTrue();
});

test('user can delete incident', function () {
    $incident = Incident::create([
        'organization_id' => $this->org->id,
        'incident_number' => 13,
        'title' => 'Test Incident to delete',
        'severity' => 'P4',
        'status' => 'resolved',
        'impact_summary' => 'Test impact',
        'started_at' => now(),
    ]);

    $response = $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/ops/incidents/{$incident->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(Incident::where('id', $incident->id)->exists())->toBeFalse();
});

test('guest role forbidden from managing incidents', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/ops/incidents', [
            'title' => 'Unauthorized Incident',
            'severity' => 'P1',
            'impact_summary' => 'No access',
        ])
        ->assertForbidden();
});
