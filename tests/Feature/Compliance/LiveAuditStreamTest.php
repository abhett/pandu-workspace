<?php

use App\Models\ComplianceIncident;
use App\Models\Organization;
use App\Models\OrganizationAuditLog;
use App\Models\OrganizationMembership;
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

    $this->org = Organization::factory()->create(['name' => 'Enterprise Security Org']);

    $this->secOfficer = User::factory()->create(['name' => 'Security Officer', 'email' => 'ciso@security.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->secOfficer->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->memberUser = User::factory()->create(['name' => 'Dev Member', 'email' => 'dev@security.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->memberUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest Auditor', 'email' => 'guest@security.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    // Create initial audit log
    $this->auditLog = OrganizationAuditLog::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->secOfficer->id,
        'event_category' => 'security',
        'action' => 'mfa_policy_updated',
        'resource_type' => 'OrganizationSecuritySetting',
        'resource_id' => $this->org->id,
        'ip_address' => '192.168.1.100',
        'status' => 'success',
        'changes' => ['mfa_required' => true],
    ]);
});

test('user can view live audit stream dashboard', function () {
    $response = $this->actingAs($this->secOfficer)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/compliance/live-stream');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/compliance/live-stream')
            ->has('metrics')
            ->has('logs')
            ->has('incidents')
            ->has('frameworks')
            ->has('members')
        );
});

test('user can fetch incremental feed updates', function () {
    $response = $this->actingAs($this->secOfficer)
        ->withSession(['current_organization_id' => $this->org->id])
        ->getJson('/organization/compliance/live-stream/feed');

    $response->assertOk()
        ->assertJson(['success' => true])
        ->assertJsonStructure([
            'success',
            'count',
            'logs',
        ]);
});

test('user can create compliance incident from audit log', function () {
    $response = $this->actingAs($this->secOfficer)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/compliance/incidents', [
            'audit_log_id' => $this->auditLog->id,
            'title' => 'Suspicious Privilege Escalation',
            'severity' => 'critical',
            'framework' => 'SOC2_TYPE_II',
            'status' => 'open',
            'summary' => 'Investigating unauthorized role modification.',
            'mitigation_notes' => 'Temporarily revoked admin session token.',
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $incident = ComplianceIncident::where('title', 'Suspicious Privilege Escalation')->first();
    expect($incident)->not->toBeNull();
    expect($incident->severity)->toBe('critical');
    expect($incident->audit_log_id)->toBe($this->auditLog->id);
});

test('user can update incident status and mitigation', function () {
    $incident = ComplianceIncident::create([
        'organization_id' => $this->org->id,
        'reporter_id' => $this->secOfficer->id,
        'title' => 'Brute Force Alert',
        'severity' => 'high',
        'framework' => 'ISO_27001',
        'status' => 'open',
        'summary' => 'Repeated failed login attempts.',
    ]);

    $response = $this->actingAs($this->secOfficer)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/organization/compliance/incidents/{$incident->id}", [
            'status' => 'resolved',
            'mitigation_notes' => 'Blocked offending subnet and forced password reset.',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $incident->refresh();
    expect($incident->status)->toBe('resolved');
    expect($incident->resolved_at)->not->toBeNull();
});

test('user can generate certification report', function () {
    $response = $this->actingAs($this->secOfficer)
        ->withSession(['current_organization_id' => $this->org->id])
        ->getJson('/organization/compliance/certification-export?framework=SOC2_TYPE_II');

    $response->assertOk()
        ->assertJson(['success' => true])
        ->assertJsonStructure([
            'success',
            'certificate' => [
                'organization_id',
                'organization_name',
                'framework',
                'certification_status',
                'issued_at',
                'digital_signature',
                'assessed_controls',
            ],
        ]);
});

test('user can delete compliance incident', function () {
    $incident = ComplianceIncident::create([
        'organization_id' => $this->org->id,
        'reporter_id' => $this->secOfficer->id,
        'title' => 'False Alarm Incident',
        'severity' => 'low',
        'framework' => 'SOC2_TYPE_II',
        'status' => 'false_positive',
        'summary' => 'Routine pentest activity.',
    ]);

    $response = $this->actingAs($this->secOfficer)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/compliance/incidents/{$incident->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(ComplianceIncident::find($incident->id))->toBeNull();
});

test('guest role forbidden from managing incidents', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/compliance/incidents', [
            'title' => 'Guest Unauthorized Incident',
            'severity' => 'high',
            'framework' => 'SOC2_TYPE_II',
            'status' => 'open',
            'summary' => 'Unauthorized submission.',
        ])
        ->assertForbidden();
});
