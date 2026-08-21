<?php

use App\Models\DataResidencyConfig;
use App\Models\DataSubjectAccessRequest;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\PiiMaskingRule;
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

    $this->org = Organization::factory()->create(['name' => 'Data Privacy Org']);

    $this->dpoUser = User::factory()->create(['name' => 'Data Protection Officer', 'email' => 'dpo@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->dpoUser->id,
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

test('user can view data privacy dashboard', function () {
    $response = $this->actingAs($this->dpoUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/compliance/data-privacy');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/compliance/data-privacy')
            ->has('metrics')
            ->has('residencyConfig')
            ->has('maskingRules')
            ->has('dsarRequests')
        );

    expect(DataResidencyConfig::where('organization_id', $this->org->id)->exists())->toBeTrue();
    expect(PiiMaskingRule::where('organization_id', $this->org->id)->exists())->toBeTrue();
});

test('user can update data residency config', function () {
    $response = $this->actingAs($this->dpoUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/compliance/data-privacy/residency', [
            'primary_region' => 'eu-central-1',
            'compliance_framework' => 'eu_gdpr',
            'cross_border_transfer_allowed' => true,
            'encryption_key_management' => 'byok_customer_managed',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $config = DataResidencyConfig::where('organization_id', $this->org->id)->first();
    expect($config->primary_region)->toBe('eu-central-1');
    expect($config->compliance_framework)->toBe('eu_gdpr');
    expect($config->cross_border_transfer_allowed)->toBeTrue();
});

test('user can create pii masking rule', function () {
    $response = $this->actingAs($this->dpoUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/compliance/data-privacy/rules', [
            'field_name' => 'passport_number',
            'resource_model' => 'KycIdentity',
            'masking_strategy' => 'partial_mask',
            'sample_input' => 'A12345678',
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $rule = PiiMaskingRule::where('field_name', 'passport_number')->first();
    expect($rule)->not->toBeNull();
    expect($rule->is_active)->toBeTrue();
});

test('user can toggle pii masking rule', function () {
    $rule = PiiMaskingRule::create([
        'organization_id' => $this->org->id,
        'field_name' => 'ip_address',
        'resource_model' => 'AuditLog',
        'masking_strategy' => 'full_redaction',
        'sample_input' => '192.168.1.1',
        'sample_masked_output' => '[REDACTED_PII]',
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->dpoUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/compliance/data-privacy/rules/{$rule->id}/toggle");

    $response->assertOk()
        ->assertJson(['success' => true]);

    $rule->refresh();
    expect($rule->is_active)->toBeFalse();
});

test('user can submit and process dsar request', function () {
    $response = $this->actingAs($this->dpoUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/compliance/data-privacy/dsar', [
            'request_type' => 'erasure',
            'subject_identifier' => 'user-to-forget@domain.com',
            'reason' => 'Right to be forgotten request under GDPR Article 17',
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $dsar = DataSubjectAccessRequest::where('subject_identifier', 'user-to-forget@domain.com')->first();
    expect($dsar)->not->toBeNull();
    expect($dsar->status)->toBe('pending_review');

    // Process to completed
    $processResponse = $this->actingAs($this->dpoUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/compliance/data-privacy/dsar/{$dsar->id}/process", [
            'status' => 'completed',
        ]);

    $processResponse->assertOk()
        ->assertJson(['success' => true]);

    $dsar->refresh();
    expect($dsar->status)->toBe('completed');
    expect($dsar->completed_at)->not->toBeNull();
});

test('user can test pii masking algorithm', function () {
    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/compliance/data-privacy/test-mask', [
            'input' => 'admin@pandu.com',
            'strategy' => 'partial_mask',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true])
        ->assertJsonPath('masked_output', 'a****@pandu.com');
});

test('user can delete pii masking rule', function () {
    $rule = PiiMaskingRule::create([
        'organization_id' => $this->org->id,
        'field_name' => 'to_delete',
        'resource_model' => 'TempModel',
        'masking_strategy' => 'partial_mask',
        'sample_input' => 'test',
        'sample_masked_output' => 't***',
    ]);

    $response = $this->actingAs($this->dpoUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/compliance/data-privacy/rules/{$rule->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(PiiMaskingRule::where('id', $rule->id)->exists())->toBeFalse();
});

test('guest role forbidden from modifying data privacy', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/compliance/data-privacy/residency', [
            'primary_region' => 'eu-central-1',
            'compliance_framework' => 'eu_gdpr',
            'cross_border_transfer_allowed' => false,
            'encryption_key_management' => 'aws_kms_managed',
        ])
        ->assertForbidden();
});
