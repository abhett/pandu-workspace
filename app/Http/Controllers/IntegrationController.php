<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OrganizationIntegration;
use App\Services\Integration\IntegrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IntegrationController extends Controller
{
    public function __construct(
        protected IntegrationService $integrationService
    ) {}

    protected function authorizeIntegrationAccess($user, $organization): void
    {
        if (! in_array($user->roleInOrganization($organization), ['owner', 'admin']) && ! $user->hasPermissionInOrganization($organization, 'org:manage')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengelola integrasi pihak ketiga.');
        }
    }

    /**
     * Display the Marketplace Integrations page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeIntegrationAccess($user, $organization);

        $category = $request->input('category', 'all');
        $search = $request->input('search');

        $integrations = $this->integrationService->getMarketplace($organization, $category, $search);

        return Inertia::render('integrations/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'integrations' => $integrations,
            'filters' => [
                'category' => $category,
                'search' => $search,
            ],
        ]);
    }

    /**
     * Install or update an integration.
     */
    public function storeOrUpdate(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeIntegrationAccess($user, $organization);

        $validated = $request->validate([
            'provider' => ['required', 'string', 'max:50'],
            'name' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:50'],
            'config' => ['nullable', 'array'],
            'is_active' => ['boolean'],
            'id' => ['nullable', 'string'],
        ]);

        $integration = $this->integrationService->installOrUpdate(
            $organization,
            $user,
            $validated['provider'],
            $validated
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Integrasi berhasil dikonfigurasi.',
                'integration' => $integration,
            ]);
        }

        return back()->with('success', 'Integrasi berhasil dikonfigurasi.');
    }

    /**
     * Toggle active state of an integration.
     */
    public function toggle(Request $request, OrganizationIntegration $integration): JsonResponse|RedirectResponse
    {
        $updated = $this->integrationService->toggleActive($integration);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'is_active' => $updated->is_active,
            ]);
        }

        return back()->with('success', $updated->is_active ? 'Integrasi diaktifkan.' : 'Integrasi dinonaktifkan.');
    }

    /**
     * Disconnect / remove an integration.
     */
    public function destroy(Request $request, OrganizationIntegration $integration): JsonResponse|RedirectResponse
    {
        $this->integrationService->uninstall($integration);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Integrasi berhasil diputuskan.',
            ]);
        }

        return back()->with('success', 'Integrasi berhasil diputuskan.');
    }

    /**
     * Test connection ping to integration.
     */
    public function testPing(Request $request, OrganizationIntegration $integration): JsonResponse
    {
        $result = $this->integrationService->testPing($integration);

        return response()->json($result);
    }
}
