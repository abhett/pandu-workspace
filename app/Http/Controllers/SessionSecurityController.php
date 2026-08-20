<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Services\Security\SessionSecurityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SessionSecurityController extends Controller
{
    public function __construct(
        protected SessionSecurityService $sessionSecurityService
    ) {}

    protected function authorizeSecurityAccess($user, $organization): void
    {
        if (! in_array($user->roleInOrganization($organization), ['owner', 'admin']) && ! $user->hasPermissionInOrganization($organization, 'org:manage')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengelola pengaturan keamanan organisasi.');
        }
    }

    /**
     * Display Organization Security & Access Management page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeSecurityAccess($user, $organization);

        $policy = $this->sessionSecurityService->getOrCreatePolicy($organization);
        $sessions = $this->sessionSecurityService->getActiveSessions($user, $request);

        return Inertia::render('organization/security-settings', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'policy' => [
                'id' => $policy->id,
                'mfa_enforced' => $policy->mfa_enforced,
                'min_password_length' => $policy->min_password_length,
                'password_rotation_days' => $policy->password_rotation_days,
                'require_uppercase' => $policy->require_uppercase,
                'require_lowercase' => $policy->require_lowercase,
                'require_numeric' => $policy->require_numeric,
                'require_symbols' => $policy->require_symbols,
                'lockout_enabled' => $policy->lockout_enabled,
                'lockout_max_attempts' => $policy->lockout_max_attempts,
                'lockout_duration_minutes' => $policy->lockout_duration_minutes,
                'session_timeout_minutes' => $policy->session_timeout_minutes,
                'ip_allowlist' => $policy->ip_allowlist ?? [],
            ],
            'sessions' => $sessions,
        ]);
    }

    /**
     * Update security policies.
     */
    public function updatePolicy(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeSecurityAccess($user, $organization);

        $validated = $request->validate([
            'mfa_enforced' => ['boolean'],
            'min_password_length' => ['required', 'integer', 'min:8', 'max:64'],
            'password_rotation_days' => ['required', 'integer', 'min:0', 'max:365'],
            'require_uppercase' => ['boolean'],
            'require_lowercase' => ['boolean'],
            'require_numeric' => ['boolean'],
            'require_symbols' => ['boolean'],
            'lockout_enabled' => ['boolean'],
            'lockout_max_attempts' => ['required', 'integer', 'min:3', 'max:20'],
            'lockout_duration_minutes' => ['required', 'integer', 'min:5', 'max:1440'],
            'session_timeout_minutes' => ['required', 'integer', 'min:15', 'max:1440'],
        ]);

        $this->sessionSecurityService->updatePolicy($organization, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Kebijakan keamanan organisasi berhasil diperbarui.',
            ]);
        }

        return back()->with('success', 'Kebijakan keamanan organisasi berhasil diperbarui.');
    }

    /**
     * Add allowed IP address or CIDR.
     */
    public function addIp(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeSecurityAccess($user, $organization);

        $validated = $request->validate([
            'ip' => ['required', 'string', 'max:50'],
        ]);

        $this->sessionSecurityService->addAllowedIp($organization, $validated['ip']);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'IP berhasil ditambahkan ke daftar putih.',
            ]);
        }

        return back()->with('success', 'IP berhasil ditambahkan ke daftar putih.');
    }

    /**
     * Remove allowed IP address or CIDR.
     */
    public function removeIp(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeSecurityAccess($user, $organization);

        $validated = $request->validate([
            'ip' => ['required', 'string'],
        ]);

        $this->sessionSecurityService->removeAllowedIp($organization, $validated['ip']);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'IP berhasil dihapus dari daftar putih.',
            ]);
        }

        return back()->with('success', 'IP berhasil dihapus dari daftar putih.');
    }

    /**
     * Revoke a single active session.
     */
    public function revokeSession(Request $request, string $sessionId): JsonResponse|RedirectResponse
    {
        $this->sessionSecurityService->revokeSession($request->user(), $sessionId);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Sesi perangkat berhasil dicabut.',
            ]);
        }

        return back()->with('success', 'Sesi perangkat berhasil dicabut.');
    }

    /**
     * Revoke all other active sessions except current.
     */
    public function revokeOtherSessions(Request $request): JsonResponse|RedirectResponse
    {
        $this->sessionSecurityService->revokeOtherSessions($request->user(), $request->session()->getId());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Semua sesi lain berhasil dicabut.',
            ]);
        }

        return back()->with('success', 'Semua sesi lain berhasil dicabut.');
    }
}
