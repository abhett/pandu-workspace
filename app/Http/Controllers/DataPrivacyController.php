<?php

namespace App\Http\Controllers;

use App\Models\DataSubjectAccessRequest;
use App\Models\Organization;
use App\Models\PiiMaskingRule;
use App\Services\Compliance\DataPrivacyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DataPrivacyController extends Controller
{
    public function __construct(
        protected DataPrivacyService $privacyService
    ) {}

    protected function authorizePrivacyAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_privacy' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk mengubah konfigurasi privasi data.');
        }

        return $organization;
    }

    /**
     * Display Data Privacy, Residency & PII Masking Dashboard.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizePrivacyAccess($request, 'view');
        $status = $request->query('status');

        $data = $this->privacyService->getDataPrivacyDashboard($organization, $status);

        return Inertia::render('organization/compliance/data-privacy', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'residencyConfig' => $data['residencyConfig'],
            'maskingRules' => $data['maskingRules'],
            'dsarRequests' => $data['dsarRequests'],
            'selectedStatus' => $status,
        ]);
    }

    /**
     * Update data residency configuration.
     */
    public function updateResidency(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizePrivacyAccess($request, 'manage_privacy');

        $validated = $request->validate([
            'primary_region' => ['required', 'string', 'in:ap-southeast-3,eu-central-1,us-east-1'],
            'compliance_framework' => ['required', 'string', 'in:id_pdp,eu_gdpr,us_hipaa_soc2'],
            'cross_border_transfer_allowed' => ['required', 'boolean'],
            'encryption_key_management' => ['required', 'string', 'in:aws_kms_managed,byok_customer_managed'],
        ]);

        $config = $this->privacyService->updateDataResidency($organization, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Konfigurasi residensi wilayah data berhasil diperbarui.',
                'config' => $config,
            ]);
        }

        return back()->with('success', 'Konfigurasi residensi wilayah data berhasil diperbarui.');
    }

    /**
     * Store a new PII masking rule.
     */
    public function storeRule(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizePrivacyAccess($request, 'manage_privacy');

        $validated = $request->validate([
            'field_name' => ['required', 'string', 'max:100'],
            'resource_model' => ['required', 'string', 'max:100'],
            'masking_strategy' => ['required', 'string', 'in:partial_mask,full_redaction,hashing_sha256,pseudonymization'],
            'sample_input' => ['required', 'string', 'max:150'],
        ]);

        $rule = $this->privacyService->createMaskingRule($organization, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Aturan PII masking berhasil disimpan.',
                'rule' => $rule,
            ], 201);
        }

        return back()->with('success', 'Aturan PII masking berhasil disimpan.');
    }

    /**
     * Toggle active status of masking rule.
     */
    public function toggleRule(Request $request, PiiMaskingRule $rule): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizePrivacyAccess($request, 'manage_privacy');

        if ($rule->organization_id !== $organization->id) {
            abort(404);
        }

        $toggled = $this->privacyService->toggleMaskingRule($rule, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Status aturan `{$toggled->field_name}` berhasil diubah.",
                'rule' => $toggled,
            ]);
        }

        return back()->with('success', "Status aturan `{$toggled->field_name}` berhasil diubah.");
    }

    /**
     * Destroy a masking rule.
     */
    public function destroyRule(Request $request, PiiMaskingRule $rule): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizePrivacyAccess($request, 'manage_privacy');

        if ($rule->organization_id !== $organization->id) {
            abort(404);
        }

        $this->privacyService->deleteMaskingRule($rule);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Aturan PII masking berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Aturan PII masking berhasil dihapus.');
    }

    /**
     * Submit new DSAR request.
     */
    public function storeDsar(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizePrivacyAccess($request, 'manage_privacy');

        $validated = $request->validate([
            'request_type' => ['required', 'string', 'in:erasure,export,rectification'],
            'subject_identifier' => ['required', 'string', 'max:150'],
            'reason' => ['nullable', 'string'],
        ]);

        $dsar = $this->privacyService->createDsarRequest($organization, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Permohonan {$dsar->request_number} berhasil diajukan.",
                'dsar' => $dsar,
            ], 201);
        }

        return back()->with('success', "Permohonan {$dsar->request_number} berhasil diajukan.");
    }

    /**
     * Process DSAR request status.
     */
    public function processDsar(Request $request, DataSubjectAccessRequest $dsar): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizePrivacyAccess($request, 'manage_privacy');

        if ($dsar->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:processing,completed,rejected'],
        ]);

        $processed = $this->privacyService->processDsarRequest($dsar, $validated['status'], $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Status {$processed->request_number} diubah menjadi {$validated['status']}.",
                'dsar' => $processed,
            ]);
        }

        return back()->with('success', "Status {$processed->request_number} diubah.");
    }

    /**
     * Test masking interactive API.
     */
    public function testMask(Request $request): JsonResponse
    {
        $this->authorizePrivacyAccess($request, 'view');

        $validated = $request->validate([
            'input' => ['required', 'string', 'max:250'],
            'strategy' => ['required', 'string', 'in:partial_mask,full_redaction,hashing_sha256,pseudonymization'],
        ]);

        $masked = $this->privacyService->testMaskString($validated['input'], $validated['strategy']);

        return response()->json([
            'success' => true,
            'input' => $validated['input'],
            'strategy' => $validated['strategy'],
            'masked_output' => $masked,
        ]);
    }
}
