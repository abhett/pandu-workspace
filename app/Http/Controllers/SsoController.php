<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Services\Security\SsoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class SsoController extends Controller
{
    public function __construct(
        protected SsoService $ssoService
    ) {}

    protected function authorizeSsoAccess($user, $organization): void
    {
        if (! in_array($user->roleInOrganization($organization), ['owner', 'admin']) && ! $user->hasPermissionInOrganization($organization, 'org:manage')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengelola konfigurasi SSO.');
        }
    }

    /**
     * Display SSO & Identity Management page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeSsoAccess($user, $organization);

        $config = $this->ssoService->getOrCreateConfig($organization);

        return Inertia::render('organization/sso', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'sso_config' => [
                'id' => $config->id,
                'provider_type' => $config->provider_type,
                'is_enabled' => $config->is_enabled,
                'is_enforced' => $config->is_enforced,
                'entity_id' => $config->entity_id ?? url("/auth/sso/metadata/{$organization->id}"),
                'sso_url' => $config->sso_url ?? '',
                'certificate' => $config->certificate ?? '',
                'client_id' => $config->client_id ?? '',
                'client_secret' => $config->client_secret ? '••••••••••••••••' : '',
                'issuer_url' => $config->issuer_url ?? '',
                'allowed_domains' => $config->allowed_domains ?? [],
                'sp_acs_url' => url("/auth/sso/saml/acs/{$organization->id}"),
                'sp_entity_id' => url("/auth/sso/metadata/{$organization->id}"),
            ],
        ]);
    }

    /**
     * Update SAML 2.0 configuration.
     */
    public function updateSaml(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeSsoAccess($user, $organization);

        $validated = $request->validate([
            'entity_id' => ['nullable', 'string', 'max:255'],
            'sso_url' => ['required', 'url', 'max:500'],
            'certificate' => ['nullable', 'string'],
            'is_enabled' => ['boolean'],
        ]);

        $this->ssoService->updateSamlConfig($organization, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Konfigurasi SAML 2.0 berhasil diperbarui.',
            ]);
        }

        return back()->with('success', 'Konfigurasi SAML 2.0 berhasil diperbarui.');
    }

    /**
     * Update OIDC configuration.
     */
    public function updateOidc(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeSsoAccess($user, $organization);

        $validated = $request->validate([
            'client_id' => ['required', 'string', 'max:255'],
            'client_secret' => ['nullable', 'string', 'max:255'],
            'issuer_url' => ['required', 'url', 'max:500'],
            'is_enabled' => ['boolean'],
        ]);

        $this->ssoService->updateOidcConfig($organization, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Konfigurasi OpenID Connect berhasil diperbarui.',
            ]);
        }

        return back()->with('success', 'Konfigurasi OpenID Connect berhasil diperbarui.');
    }

    /**
     * Toggle SSO Enforcement policy.
     */
    public function toggleEnforce(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeSsoAccess($user, $organization);

        $enforced = $request->boolean('is_enforced', false);
        $this->ssoService->toggleEnforce($organization, $enforced);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Kebijakan penegakan SSO berhasil diperbarui.',
            ]);
        }

        return back()->with('success', 'Kebijakan penegakan SSO berhasil diperbarui.');
    }

    /**
     * Add allowed email domain restriction.
     */
    public function addDomain(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeSsoAccess($user, $organization);

        $validated = $request->validate([
            'domain' => ['required', 'string', 'max:100'],
        ]);

        $this->ssoService->addDomain($organization, $validated['domain']);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Domain berhasil ditambahkan.',
            ]);
        }

        return back()->with('success', 'Domain berhasil ditambahkan.');
    }

    /**
     * Remove allowed email domain restriction.
     */
    public function removeDomain(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeSsoAccess($user, $organization);

        $validated = $request->validate([
            'domain' => ['required', 'string'],
        ]);

        $this->ssoService->removeDomain($organization, $validated['domain']);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Domain berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Domain berhasil dihapus.');
    }

    /**
     * Download SP Metadata XML.
     */
    public function downloadSpMetadata(Request $request): HttpResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $xml = $this->ssoService->generateSpMetadataXml($organization);

        return response($xml, 200, [
            'Content-Type' => 'application/xml',
            'Content-Disposition' => 'attachment; filename="sp-metadata-'.$organization->slug.'.xml"',
        ]);
    }
}
