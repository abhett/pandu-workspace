<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationInvitationController extends Controller
{
    /**
     * Store new organization invitations (single or batch).
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::findOrFail($orgId);

        if (! $user->hasPermissionInOrganization($organization, 'members:invite')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengundang anggota.');
        }

        // Handle single or array of invitations
        if ($request->has('invites')) {
            $validated = $request->validate([
                'invites' => ['required', 'array', 'min:1'],
                'invites.*.email' => ['required', 'email'],
                'invites.*.role' => ['required', 'string', 'in:admin,manager,member,guest'],
            ]);

            foreach ($validated['invites'] as $inviteData) {
                if (empty($inviteData['email'])) {
                    continue;
                }

                // Check if already member
                $existingUser = User::where('email', $inviteData['email'])->first();
                if ($existingUser && $existingUser->belongsToOrganization($organization)) {
                    continue;
                }

                OrganizationInvitation::updateOrCreate(
                    [
                        'organization_id' => $organization->id,
                        'email' => strtolower($inviteData['email']),
                    ],
                    [
                        'inviter_user_id' => $user->id,
                        'role' => $inviteData['role'],
                        'token' => Str::random(40),
                        'expires_at' => now()->addDays(7),
                        'accepted_at' => null,
                    ]
                );
            }

            return back()->with('success', 'Undangan berhasil dikirim.');
        }

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'role' => ['required', 'string', 'in:admin,manager,member,guest'],
        ]);

        $existingUser = User::where('email', $validated['email'])->first();
        if ($existingUser && $existingUser->belongsToOrganization($organization)) {
            return back()->withErrors(['email' => 'Pengguna dengan email ini sudah menjadi anggota organisasi.']);
        }

        OrganizationInvitation::updateOrCreate(
            [
                'organization_id' => $organization->id,
                'email' => strtolower($validated['email']),
            ],
            [
                'inviter_user_id' => $user->id,
                'role' => $validated['role'],
                'token' => Str::random(40),
                'expires_at' => now()->addDays(7),
                'accepted_at' => null,
            ]
        );

        return back()->with('success', 'Undangan berhasil dikirim ke '.$validated['email']);
    }

    /**
     * Cancel or revoke an invitation.
     */
    public function destroy(Request $request, OrganizationInvitation $invitation): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::findOrFail($orgId);

        if ($invitation->organization_id !== $orgId) {
            abort(403, 'Akses tidak sah.');
        }

        if (! $user->hasPermissionInOrganization($organization, 'members:invite')) {
            abort(403, 'Anda tidak memiliki hak akses untuk membatalkan undangan.');
        }

        $invitation->delete();

        return back()->with('success', 'Undangan berhasil dibatalkan.');
    }

    /**
     * Show onboarding step 2: Invite members wizard.
     */
    public function showOnboarding(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');

        if (! $orgId) {
            return redirect()->route('onboarding.create-organization');
        }

        $organization = Organization::findOrFail($orgId);
        $inviteCode = 'org-'.substr(md5($organization->id), 0, 8);

        return Inertia::render('onboarding/invite-members', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
            ],
            'inviteCode' => $inviteCode,
            'inviteUrl' => url('/invitation/join/'.$inviteCode),
        ]);
    }
}
