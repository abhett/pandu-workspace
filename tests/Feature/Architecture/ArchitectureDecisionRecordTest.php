<?php

use App\Models\ArchitectureDecisionRecord;
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

    $this->org = Organization::factory()->create(['name' => 'Enterprise Architecture Org']);

    $this->leadUser = User::factory()->create(['name' => 'Chief Architect', 'email' => 'architect@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->leadUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devUser = User::factory()->create(['name' => 'Principal Engineer', 'email' => 'principal@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Auditor Guest', 'email' => 'guest@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view adr dashboard', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/architecture/adr');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/architecture/adr')
            ->has('metrics')
            ->has('domainStats')
            ->has('adrs')
            ->has('projects')
            ->has('members')
        );

    expect(ArchitectureDecisionRecord::where('organization_id', $this->org->id)->exists())->toBeTrue();
});

test('user can create new adr', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/architecture/adr', [
            'domain' => 'security_compliance',
            'title' => 'Standardize WebAuthn Passkeys for Zero-Trust MFA',
            'status' => 'accepted',
            'context_and_problem' => 'SMS OTP is vulnerable to SIM-swap attacks.',
            'decision_outcome' => 'Enforce WebAuthn FIDO2 passkeys for privileged roles.',
            'positive_consequences' => "Phishing-resistant authentication\nFast biometrics login",
            'negative_consequences' => 'Requires modern browser and hardware authenticator support',
            'alternatives_considered' => 'TOTP Authenticator Apps only',
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    expect(ArchitectureDecisionRecord::where('title', 'Standardize WebAuthn Passkeys for Zero-Trust MFA')->exists())->toBeTrue();
});

test('user can update adr', function () {
    $adr = ArchitectureDecisionRecord::create([
        'organization_id' => $this->org->id,
        'author_id' => $this->devUser->id,
        'adr_number' => 10,
        'domain' => 'api_design',
        'title' => 'gRPC for Internal Microservices Communication',
        'status' => 'proposed',
        'context_and_problem' => 'REST payload overhead is too high.',
        'decision_outcome' => 'Use gRPC with Protobuf.',
    ]);

    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/organization/architecture/adr/{$adr->id}", [
            'domain' => 'api_design',
            'title' => 'gRPC for High-Throughput Internal Microservices',
            'status' => 'accepted',
            'context_and_problem' => 'REST payload overhead is too high for telemetry stream.',
            'decision_outcome' => 'Adopt gRPC with Protobuf definition catalog.',
            'positive_consequences' => 'Binary serialization throughput increased by 4x',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $adr->refresh();
    expect($adr->title)->toBe('gRPC for High-Throughput Internal Microservices');
    expect($adr->status)->toBe('accepted');
});

test('user can delete adr', function () {
    $adr = ArchitectureDecisionRecord::create([
        'organization_id' => $this->org->id,
        'adr_number' => 99,
        'domain' => 'infrastructure',
        'title' => 'Temporary Test ADR',
        'status' => 'rejected',
        'context_and_problem' => 'Testing deletion',
        'decision_outcome' => 'None',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/architecture/adr/{$adr->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(ArchitectureDecisionRecord::where('id', $adr->id)->exists())->toBeFalse();
});

test('guest role forbidden from creating adr', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/architecture/adr', [
            'domain' => 'data_architecture',
            'title' => 'Unauthorized ADR',
            'status' => 'proposed',
            'context_and_problem' => 'None',
            'decision_outcome' => 'None',
        ])
        ->assertForbidden();
});
