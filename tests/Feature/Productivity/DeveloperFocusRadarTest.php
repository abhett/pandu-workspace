<?php

use App\Models\DeveloperFocusSnapshot;
use App\Models\FocusTimeRecommendation;
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

    $this->org = Organization::factory()->create(['name' => 'Cognitive Engineering Org']);

    $this->leadUser = User::factory()->create(['name' => 'Engineering Director', 'email' => 'director@focus.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->leadUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devUser = User::factory()->create(['name' => 'Backend Engineer', 'email' => 'backend@focus.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Observer Guest', 'email' => 'guest@focus.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view focus radar dashboard', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/productivity/focus');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/productivity/focus')
            ->has('metrics')
            ->has('dailyTrend')
            ->has('developerRadar')
            ->has('recommendations')
            ->has('members')
        );

    expect(DeveloperFocusSnapshot::where('organization_id', $this->org->id)->exists())->toBeTrue();
});

test('user can apply focus recommendation', function () {
    $rec = FocusTimeRecommendation::create([
        'organization_id' => $this->org->id,
        'type' => 'no_meeting_block',
        'title' => 'Wednesday Afternoon Focus Block',
        'description' => 'Block meetings on Wednesday 13:00 - 17:00.',
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/productivity/focus/recommendations/{$rec->id}/apply");

    $response->assertOk()
        ->assertJson(['success' => true]);

    $rec->refresh();
    expect($rec->status)->toBe('applied');
});

test('user can acknowledge focus recommendation', function () {
    $rec = FocusTimeRecommendation::create([
        'organization_id' => $this->org->id,
        'type' => 'wip_limit_alert',
        'title' => 'WIP Limit Advisory',
        'description' => 'Reduce active tasks to 2.',
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/productivity/focus/recommendations/{$rec->id}/acknowledge");

    $response->assertOk()
        ->assertJson(['success' => true]);

    $rec->refresh();
    expect($rec->status)->toBe('acknowledged');
});

test('guest role forbidden from modifying recommendations', function () {
    $rec = FocusTimeRecommendation::create([
        'organization_id' => $this->org->id,
        'type' => 'batch_pr_review',
        'title' => 'PR Review Batching',
        'description' => 'Review PRs at 16:00.',
        'status' => 'active',
    ]);

    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/productivity/focus/recommendations/{$rec->id}/apply")
        ->assertForbidden();
});
