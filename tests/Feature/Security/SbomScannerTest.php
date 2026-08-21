<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\SbomPackage;
use App\Models\SbomVulnerability;
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

    $this->org = Organization::factory()->create(['name' => 'Security Supply Chain Org', 'slug' => 'sec-org']);

    $this->leadUser = User::factory()->create(['name' => 'SecOps Lead', 'email' => 'secops@sbom.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->leadUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devUser = User::factory()->create(['name' => 'AppSec Engineer', 'email' => 'appsec@sbom.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest Auditor', 'email' => 'auditor@sbom.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view sbom dashboard', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/security/sbom');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/security/sbom')
            ->has('metrics')
            ->has('ecosystemStats')
            ->has('licenseStats')
            ->has('packages')
            ->has('vulnerabilities')
        );

    expect(SbomPackage::where('organization_id', $this->org->id)->exists())->toBeTrue();
});

test('user can trigger dependency scan', function () {
    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/security/sbom/scan');

    $response->assertOk()
        ->assertJson(['success' => true]);
});

test('user can triage vulnerability', function () {
    $pkg = SbomPackage::create([
        'organization_id' => $this->org->id,
        'ecosystem' => 'npm',
        'name' => 'lodash',
        'version' => '4.17.20',
        'license' => 'MIT',
        'license_risk' => 'low_risk',
        'has_vulnerabilities' => true,
        'vulnerabilities_count' => 1,
        'highest_severity' => 'high',
        'latest_safe_version' => '4.17.21',
    ]);

    $vuln = SbomVulnerability::create([
        'package_id' => $pkg->id,
        'cve_id' => 'CVE-2021-23337',
        'title' => 'Prototype pollution in lodash',
        'description' => 'Command injection via template function.',
        'severity' => 'high',
        'cvss_score' => 7.2,
        'patched_version' => '4.17.21',
        'remediation_advice' => 'Upgrade to 4.17.21',
        'status' => 'open',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/security/sbom/vulnerabilities/{$vuln->id}/triage", [
            'status' => 'mitigated',
            'notes' => 'Lodash upgraded to 4.17.21 in package.json.',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $vuln->refresh();
    expect($vuln->status)->toBe('mitigated');
});

test('user can export sbom cyclonedx json', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/security/sbom/export');

    $response->assertOk()
        ->assertJsonStructure([
            'bomFormat',
            'specVersion',
            'serialNumber',
            'components',
        ]);
});

test('guest role forbidden from triggering scan', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/security/sbom/scan')
        ->assertForbidden();
});
