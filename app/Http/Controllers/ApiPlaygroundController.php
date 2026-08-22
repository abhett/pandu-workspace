<?php

namespace App\Http\Controllers;

use App\Models\ApiRequestPreset;
use App\Models\Organization;
use App\Services\Developer\ApiPlaygroundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApiPlaygroundController extends Controller
{
    public function __construct(
        protected ApiPlaygroundService $playgroundService
    ) {}

    protected function authorizeDeveloperAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_presets' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk menyimpan preset API.');
        }

        return $organization;
    }

    /**
     * Display API Playground & SDK Generator Studio.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeDeveloperAccess($request, 'view');
        $data = $this->playgroundService->getPlaygroundDashboard($organization, $request->user());

        return Inertia::render('organization/developer/api-playground', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'endpointsCatalog' => $data['endpointsCatalog'],
            'presets' => $data['presets'],
        ]);
    }

    /**
     * Execute live sandbox API request and return SDK code snippets.
     */
    public function execute(Request $request): JsonResponse
    {
        $organization = $this->authorizeDeveloperAccess($request, 'view');

        $validated = $request->validate([
            'method' => ['required', 'string', 'in:GET,POST,PUT,DELETE,PATCH'],
            'endpoint_path' => ['required', 'string', 'max:255'],
            'headers' => ['nullable', 'array'],
            'request_body' => ['nullable', 'array'],
        ]);

        $execution = $this->playgroundService->executeSandboxRequest(
            $organization,
            $request->user(),
            $validated['method'],
            $validated['endpoint_path'],
            $validated['headers'] ?? [],
            $validated['request_body'] ?? []
        );

        return response()->json([
            'success' => true,
            'execution' => $execution,
        ]);
    }

    /**
     * Save API request preset.
     */
    public function storePreset(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeDeveloperAccess($request, 'manage_presets');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'method' => ['required', 'string', 'in:GET,POST,PUT,DELETE,PATCH'],
            'endpoint_path' => ['required', 'string', 'max:255'],
            'headers' => ['nullable', 'array'],
            'query_params' => ['nullable', 'array'],
            'request_body' => ['nullable', 'array'],
        ]);

        $preset = $this->playgroundService->savePreset($organization, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Preset request API berhasil disimpan.',
                'preset' => $preset,
            ], 201);
        }

        return back()->with('success', 'Preset request API berhasil disimpan.');
    }

    /**
     * Delete API request preset.
     */
    public function destroyPreset(Request $request, ApiRequestPreset $preset): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeDeveloperAccess($request, 'manage_presets');

        if ($preset->organization_id !== $organization->id) {
            abort(404);
        }

        $this->playgroundService->deletePreset($preset);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Preset request API berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Preset request API berhasil dihapus.');
    }
}
