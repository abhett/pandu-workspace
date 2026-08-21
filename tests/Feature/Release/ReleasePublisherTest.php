<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\ReleasePublication;
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

    $this->org = Organization::factory()->create(['name' => 'Release Publisher Org']);

    $this->leadUser = User::factory()->create(['name' => 'Release Manager', 'email' => 'releases@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->leadUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devUser = User::factory()->create(['name' => 'Dev Engineer', 'email' => 'dev@pandu.com']);
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

test('user can view release publisher dashboard', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/releases/publisher');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/releases/publisher')
            ->has('metrics')
            ->has('publications')
            ->has('projects')
        );

    expect(ReleasePublication::where('organization_id', $this->org->id)->exists())->toBeTrue();
});

test('user can generate release notes from sprint', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/releases/publisher/generate', [
            'version_tag' => 'v3.5.0',
            'version_type' => 'minor',
            'release_title' => 'Release v3.5.0: Next-Gen PR Load Balancer',
            'executive_summary' => 'This release introduces automated PR Review SLA calculation and load balancing.',
            'features' => "Automated TTFR measurement\nReviewer load matrix",
            'fixes' => 'Fixed database deadlock in DLQ worker',
            'target_channels' => ['public_changelog', 'github_releases'],
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $pub = ReleasePublication::where('version_tag', 'v3.5.0')->first();
    expect($pub)->not->toBeNull();
    expect($pub->status)->toBe('draft');
    expect($pub->categories['features'])->toHaveCount(2);
});

test('user can publish release to channels', function () {
    $pub = ReleasePublication::create([
        'organization_id' => $this->org->id,
        'version_tag' => 'v3.4.0',
        'version_type' => 'minor',
        'release_title' => 'Test Release v3.4.0',
        'executive_summary' => 'Test summary',
        'markdown_content' => '## Test Markdown',
        'target_channels' => ['public_changelog'],
        'status' => 'draft',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/releases/publisher/{$pub->id}/publish");

    $response->assertOk()
        ->assertJson(['success' => true]);

    $pub->refresh();
    expect($pub->status)->toBe('published');
    expect($pub->published_at)->not->toBeNull();
});

test('user can update release publication draft', function () {
    $pub = ReleasePublication::create([
        'organization_id' => $this->org->id,
        'version_tag' => 'v3.3.1',
        'version_type' => 'patch',
        'release_title' => 'Initial Title',
        'executive_summary' => 'Initial summary',
        'markdown_content' => '## Initial',
        'status' => 'draft',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/organization/releases/publisher/{$pub->id}", [
            'version_tag' => 'v3.3.1',
            'version_type' => 'patch',
            'release_title' => 'Updated Release Title v3.3.1',
            'executive_summary' => 'Updated summary content',
            'markdown_content' => '## Updated Content',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $pub->refresh();
    expect($pub->release_title)->toBe('Updated Release Title v3.3.1');
});

test('user can delete release publication', function () {
    $pub = ReleasePublication::create([
        'organization_id' => $this->org->id,
        'version_tag' => 'v3.3.9',
        'version_type' => 'patch',
        'release_title' => 'To delete',
        'executive_summary' => 'Summary',
        'markdown_content' => 'Content',
        'status' => 'draft',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/releases/publisher/{$pub->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(ReleasePublication::where('id', $pub->id)->exists())->toBeFalse();
});

test('guest role forbidden from managing release publications', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/releases/publisher/generate', [
            'version_tag' => 'v9.9.9',
            'version_type' => 'major',
            'release_title' => 'Unauthorized Release',
            'executive_summary' => 'No access',
        ])
        ->assertForbidden();
});
