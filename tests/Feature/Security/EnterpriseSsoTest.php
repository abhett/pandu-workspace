<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\OrganizationSsoConfig;
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

    $this->user = User::factory()->create(['name' => 'SecOps Admin', 'email' => 'secops@example.com']);
    $this->org = Organization::factory()->create(['name' => 'Enterprise Identity Corp']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view sso configuration page', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sso');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('organization/sso')
        ->has('sso_config')
    );
});

test('user can update saml 2.0 configuration', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sso/saml', [
            'entity_id' => 'http://www.okta.com/exk123456789',
            'sso_url' => 'https://identity.okta.com/app/saml/sso',
            'certificate' => '-----BEGIN CERTIFICATE-----TEST-----END CERTIFICATE-----',
            'is_enabled' => true,
        ]);

    $response->assertOk();
    $config = OrganizationSsoConfig::where('organization_id', $this->org->id)->first();
    expect($config)->not->toBeNull();
    expect($config->provider_type)->toBe('saml');
    expect($config->is_enabled)->toBeTrue();
    expect($config->sso_url)->toBe('https://identity.okta.com/app/saml/sso');
});

test('user can update oidc configuration and toggle enforce', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sso/oidc', [
            'client_id' => 'google-client-id-12345',
            'client_secret' => 'super-secret-key',
            'issuer_url' => 'https://accounts.google.com',
            'is_enabled' => true,
        ]);

    $response->assertOk();
    $config = OrganizationSsoConfig::where('organization_id', $this->org->id)->first();
    expect($config->provider_type)->toBe('oidc');
    expect($config->client_id)->toBe('google-client-id-12345');

    // Toggle enforce
    $enforceResp = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sso/toggle-enforce', [
            'is_enforced' => true,
        ]);

    $enforceResp->assertOk();
    $config->refresh();
    expect($config->is_enforced)->toBeTrue();
});

test('user can manage allowed domains and download sp metadata', function () {
    // Add domain
    $domainResp = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sso/domains', [
            'domain' => 'acme-holding.com',
        ]);

    $domainResp->assertOk();
    $config = OrganizationSsoConfig::where('organization_id', $this->org->id)->first();
    expect($config->allowed_domains)->toContain('@acme-holding.com');

    // Delete domain
    $delResp = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson('/organization/sso/domains', [
            'domain' => '@acme-holding.com',
        ]);

    $delResp->assertOk();
    $config->refresh();
    expect($config->allowed_domains)->not->toContain('@acme-holding.com');

    // Download metadata
    $metaResp = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sso/metadata');

    $metaResp->assertOk();
    expect($metaResp->headers->get('content-type'))->toBe('application/xml');
    expect($metaResp->getContent())->toContain('EntityDescriptor');
});
