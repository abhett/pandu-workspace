<?php

namespace App\Services\Security;

use App\Models\Organization;
use App\Models\OrganizationSsoConfig;

class SsoService
{
    /**
     * Get or create SSO configuration for the organization.
     */
    public function getOrCreateConfig(Organization $organization): OrganizationSsoConfig
    {
        return OrganizationSsoConfig::firstOrCreate(
            ['organization_id' => $organization->id],
            [
                'provider_type' => 'saml',
                'is_enabled' => false,
                'is_enforced' => false,
                'allowed_domains' => ['@'.strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $organization->name)).'.com'],
            ]
        );
    }

    /**
     * Update SAML 2.0 configuration.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateSamlConfig(Organization $organization, array $data): OrganizationSsoConfig
    {
        $config = $this->getOrCreateConfig($organization);

        $config->update([
            'provider_type' => 'saml',
            'entity_id' => $data['entity_id'] ?? $config->entity_id,
            'sso_url' => $data['sso_url'] ?? $config->sso_url,
            'certificate' => $data['certificate'] ?? $config->certificate,
            'is_enabled' => $data['is_enabled'] ?? true,
        ]);

        return $config->fresh();
    }

    /**
     * Update OpenID Connect (OIDC) configuration.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateOidcConfig(Organization $organization, array $data): OrganizationSsoConfig
    {
        $config = $this->getOrCreateConfig($organization);

        $config->update([
            'provider_type' => 'oidc',
            'client_id' => $data['client_id'] ?? $config->client_id,
            'client_secret' => $data['client_secret'] ?? $config->client_secret,
            'issuer_url' => $data['issuer_url'] ?? $config->issuer_url,
            'is_enabled' => $data['is_enabled'] ?? true,
        ]);

        return $config->fresh();
    }

    /**
     * Toggle SSO enforcement policy.
     */
    public function toggleEnforce(Organization $organization, bool $enforced): OrganizationSsoConfig
    {
        $config = $this->getOrCreateConfig($organization);
        $config->update(['is_enforced' => $enforced]);

        return $config->fresh();
    }

    /**
     * Add allowed email domain restriction.
     */
    public function addDomain(Organization $organization, string $domain): OrganizationSsoConfig
    {
        $config = $this->getOrCreateConfig($organization);
        $domain = trim($domain);
        if (! str_starts_with($domain, '@')) {
            $domain = '@'.$domain;
        }
        $domain = strtolower($domain);

        $domains = $config->allowed_domains ?? [];
        if (! in_array($domain, $domains, true)) {
            $domains[] = $domain;
            $config->update(['allowed_domains' => array_values($domains)]);
        }

        return $config->fresh();
    }

    /**
     * Remove allowed email domain restriction.
     */
    public function removeDomain(Organization $organization, string $domain): OrganizationSsoConfig
    {
        $config = $this->getOrCreateConfig($organization);
        $domains = $config->allowed_domains ?? [];
        $domains = array_filter($domains, fn ($d) => $d !== $domain);

        $config->update(['allowed_domains' => array_values($domains)]);

        return $config->fresh();
    }

    /**
     * Generate Service Provider (SP) Metadata XML string.
     */
    public function generateSpMetadataXml(Organization $organization): string
    {
        $entityId = url("/auth/sso/metadata/{$organization->id}");
        $acsUrl = url("/auth/sso/saml/acs/{$organization->id}");

        return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="{$entityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="{$acsUrl}" index="1" isDefault="true"/>
  </md:SPSSODescriptor>
  <md:Organization>
    <md:OrganizationName xml:lang="en">{$organization->name}</md:OrganizationName>
    <md:OrganizationDisplayName xml:lang="en">{$organization->name} SSO</md:OrganizationDisplayName>
    <md:OrganizationURL xml:lang="en">https://pandu.app</md:OrganizationURL>
  </md:Organization>
</md:EntityDescriptor>
XML;
    }
}
