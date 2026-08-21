<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use App\Services\Security\MfaEnforcementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MfaEnforcementController extends Controller
{
    public function __construct(
        protected MfaEnforcementService $mfaService
    ) {}

    protected function authorizeSecurityAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_mfa' && in_array($role, ['member', 'guest'])) {
            abort(403, 'Role Anda tidak memiliki izin untuk mengelola kebijakan keamanan penegakan MFA.');
        }

        return $organization;
    }

    /**
     * Display Enterprise MFA Enforcement & Session Security Gate dashboard.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeSecurityAccess($request, 'view');
        $data = $this->mfaService->getMfaEnforcementOverview($organization);

        return Inertia::render('organization/security/mfa-enforcement', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'settings' => $data['settings'],
            'metrics' => $data['metrics'],
            'members' => $data['members'],
        ]);
    }

    /**
     * Update MFA enforcement policies.
     */
    public function update(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSecurityAccess($request, 'manage_mfa');

        $validated = $request->validate([
            'enforcement_mode' => ['required', 'string', 'in:disabled,privileged_roles_only,all_members'],
            'grace_period_days' => ['required', 'integer', 'min:1', 'max:60'],
            'remember_device_days' => ['required', 'integer', 'min:1', 'max:90'],
            'allowed_methods' => ['required', 'array'],
            'allowed_methods.*' => ['string', 'in:totp_authenticator,security_keys_webauthn,backup_recovery_codes'],
        ]);

        $setting = $this->mfaService->updateMfaSettings($organization, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Kebijakan penegakan MFA berhasil diperbarui.',
                'settings' => $setting,
            ]);
        }

        return back()->with('success', 'Kebijakan penegakan MFA berhasil diperbarui.');
    }

    /**
     * Send MFA setup reminder to a member.
     */
    public function remind(Request $request, User $user): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSecurityAccess($request, 'manage_mfa');

        $this->mfaService->sendMfaSetupReminder($organization, $user);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Pengingat aktivasi MFA telah dikirim ke {$user->email}.",
            ]);
        }

        return back()->with('success', "Pengingat aktivasi MFA telah dikirim ke {$user->email}.");
    }

    /**
     * Grant temporary grace exemption to a member.
     */
    public function exempt(Request $request, User $user): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSecurityAccess($request, 'manage_mfa');

        $validated = $request->validate([
            'extra_days' => ['required', 'integer', 'min:1', 'max:30'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $exemption = $this->mfaService->grantGraceExemption(
            $organization,
            $user,
            $request->user(),
            $validated['extra_days'],
            $validated['reason']
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Pengecualian masa tenggang MFA berhasil diberikan.',
                'exemption' => $exemption,
            ]);
        }

        return back()->with('success', 'Pengecualian masa tenggang MFA berhasil diberikan.');
    }

    /**
     * Revoke grace exemption.
     */
    public function revokeExemption(Request $request, string $exemptionId): JsonResponse|RedirectResponse
    {
        $this->authorizeSecurityAccess($request, 'manage_mfa');

        $this->mfaService->revokeGraceExemption($exemptionId);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Pengecualian masa tenggang berhasil dicabut.',
            ]);
        }

        return back()->with('success', 'Pengecualian masa tenggang berhasil dicabut.');
    }

    /**
     * Emergency Kill-Switch: Terminate all member sessions in organization.
     */
    public function killSwitch(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeSecurityAccess($request, 'manage_mfa');

        $revokedCount = $this->mfaService->triggerEmergencyKillSwitch($organization, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Emergency Kill-Switch diaktifkan. {$revokedCount} sesi aktif telah diputus.",
                'revoked_sessions_count' => $revokedCount,
            ]);
        }

        return back()->with('success', "Emergency Kill-Switch diaktifkan. {$revokedCount} sesi aktif telah diputus.");
    }
}
