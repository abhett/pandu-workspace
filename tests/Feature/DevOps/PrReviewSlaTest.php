<?php

use App\Models\CodeownerRule;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\PullRequestReview;
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

    $this->org = Organization::factory()->create(['name' => 'PR Review SLA Org']);

    $this->leadUser = User::factory()->create(['name' => 'Lead Reviewer', 'email' => 'lead@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->leadUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devUser = User::factory()->create(['name' => 'Developer Reviewer', 'email' => 'dev@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest Observer', 'email' => 'guest@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view pr reviews dashboard', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/devops/pr-reviews');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/devops/pr-reviews')
            ->has('metrics')
            ->has('reviewerMatrix')
            ->has('prs')
            ->has('codeownerRules')
        );

    expect(PullRequestReview::where('organization_id', $this->org->id)->exists())->toBeTrue();
    expect(CodeownerRule::where('organization_id', $this->org->id)->exists())->toBeTrue();
});

test('user can create pull request review', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/devops/pr-reviews', [
            'title' => 'feat(auth): webauthn passkey login support',
            'repository_name' => 'pandu-core-api',
            'branch_name' => 'feature/passkeys',
            'author_id' => $this->devUser->id,
            'assigned_reviewer_id' => $this->leadUser->id,
            'additions_count' => 310,
            'deletions_count' => 45,
            'matched_codeowner_rule' => 'app/Services/Auth/**',
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $pr = PullRequestReview::where('title', 'feat(auth): webauthn passkey login support')->first();
    expect($pr)->not->toBeNull();
    expect($pr->status)->toBe('pending_review');
    expect($pr->sla_status)->toBe('within_sla');
});

test('user can reassign reviewer for load balancing', function () {
    $pr = PullRequestReview::create([
        'organization_id' => $this->org->id,
        'pr_number' => 200,
        'title' => 'refactor(db): partitioned logs schema',
        'repository_name' => 'pandu-core-api',
        'branch_name' => 'refactor/logs',
        'author_id' => $this->devUser->id,
        'assigned_reviewer_id' => $this->leadUser->id,
        'opened_at' => now(),
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/devops/pr-reviews/{$pr->id}/reassign", [
            'reviewer_id' => $this->devUser->id,
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $pr->refresh();
    expect($pr->assigned_reviewer_id)->toBe($this->devUser->id);
});

test('user can update review status', function () {
    $pr = PullRequestReview::create([
        'organization_id' => $this->org->id,
        'pr_number' => 201,
        'title' => 'fix(cors): allow subdomains',
        'repository_name' => 'pandu-web',
        'branch_name' => 'fix/cors',
        'author_id' => $this->devUser->id,
        'assigned_reviewer_id' => $this->leadUser->id,
        'opened_at' => now()->subHours(2),
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/devops/pr-reviews/{$pr->id}/status", [
            'status' => 'approved',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $pr->refresh();
    expect($pr->status)->toBe('approved');
    expect($pr->ttfr_hours)->toBeGreaterThan(0);
});

test('user can create codeowner rule', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/devops/codeowners', [
            'path_pattern' => 'app/Services/Security/**',
            'domain_name' => 'Security & Encryption Domain',
            'lead_reviewer_id' => $this->leadUser->id,
            'fallback_reviewer_id' => $this->devUser->id,
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    expect(CodeownerRule::where('domain_name', 'Security & Encryption Domain')->exists())->toBeTrue();
});

test('user can delete pull request review', function () {
    $pr = PullRequestReview::create([
        'organization_id' => $this->org->id,
        'pr_number' => 202,
        'title' => 'chore: bump dependencies',
        'repository_name' => 'pandu-core-api',
        'branch_name' => 'chore/deps',
        'author_id' => $this->devUser->id,
        'opened_at' => now(),
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/devops/pr-reviews/{$pr->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(PullRequestReview::where('id', $pr->id)->exists())->toBeFalse();
});

test('guest role forbidden from managing pr reviews', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/devops/pr-reviews', [
            'title' => 'Unauthorized PR',
            'repository_name' => 'test',
            'branch_name' => 'test',
        ])
        ->assertForbidden();
});
