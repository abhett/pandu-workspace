<?php

use App\Models\BoardroomBriefing;
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

    $this->org = Organization::factory()->create(['name' => 'Boardroom Org']);

    $this->execUser = User::factory()->create(['name' => 'Chief Executive Officer', 'email' => 'ceo@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->execUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devUser = User::factory()->create(['name' => 'Senior Director', 'email' => 'director@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Observer Guest', 'email' => 'observer@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view executive boardroom dashboard', function () {
    $response = $this->actingAs($this->execUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/reports/boardroom');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/reports/boardroom')
            ->has('metrics')
            ->has('pillars')
            ->has('briefings')
        );

    expect(BoardroomBriefing::where('organization_id', $this->org->id)->exists())->toBeTrue();
});

test('user can create boardroom briefing', function () {
    $response = $this->actingAs($this->execUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/reports/boardroom', [
            'title' => 'Q4 2026 Strategic Growth Review',
            'period' => 'Q4 2026',
            'executive_summary' => 'Ringkasan eksekutif kuartal 4 dengan target pencapaian pasar global.',
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $briefing = BoardroomBriefing::where('title', 'Q4 2026 Strategic Growth Review')->first();
    expect($briefing)->not->toBeNull();
    expect($briefing->status)->toBe('draft');
});

test('user can update boardroom briefing', function () {
    $briefing = BoardroomBriefing::create([
        'organization_id' => $this->org->id,
        'title' => 'Initial Title',
        'period' => 'Q3 2026',
        'executive_summary' => 'Initial summary',
        'status' => 'draft',
    ]);

    $response = $this->actingAs($this->execUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/organization/reports/boardroom/{$briefing->id}", [
            'title' => 'Updated Strategy Title',
            'period' => 'Q3 2026',
            'executive_summary' => 'Updated summary text',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $briefing->refresh();
    expect($briefing->title)->toBe('Updated Strategy Title');
});

test('user can finalize boardroom briefing', function () {
    $briefing = BoardroomBriefing::create([
        'organization_id' => $this->org->id,
        'title' => 'Draft Deck',
        'period' => 'Q3 2026',
        'executive_summary' => 'Draft summary',
        'status' => 'draft',
    ]);

    $response = $this->actingAs($this->execUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/reports/boardroom/{$briefing->id}/finalize");

    $response->assertOk()
        ->assertJson(['success' => true]);

    $briefing->refresh();
    expect($briefing->status)->toBe('finalized');
    expect($briefing->presented_at)->not->toBeNull();
});

test('user can delete boardroom briefing', function () {
    $briefing = BoardroomBriefing::create([
        'organization_id' => $this->org->id,
        'title' => 'Deck To Delete',
        'period' => 'Q3 2026',
        'executive_summary' => 'To delete',
        'status' => 'draft',
    ]);

    $response = $this->actingAs($this->execUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/reports/boardroom/{$briefing->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(BoardroomBriefing::where('id', $briefing->id)->exists())->toBeFalse();
});

test('guest role forbidden from managing boardroom briefings', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/reports/boardroom', [
            'title' => 'Unauthorized Deck',
            'period' => 'Q3 2026',
            'executive_summary' => 'Unauthorized summary',
        ])
        ->assertForbidden();
});
