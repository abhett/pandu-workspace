<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationMemberController extends Controller
{
    /**
     * Display the Organization Members directory.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');

        if (! $orgId) {
            return redirect()->route('onboarding.create-organization');
        }

        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if (! $user->hasPermissionInOrganization($organization, 'members:view') && ! in_array($user->roleInOrganization($organization), ['owner', 'admin'])) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat direktori anggota.');
        }

        // Fetch members with user info, roles, and teams
        $members = OrganizationMembership::with(['user.teams' => function ($q) use ($orgId) {
            $q->where('teams.organization_id', $orgId);
        }, 'roleModel'])
            ->where('organization_id', $orgId)
            ->get()
            ->map(fn (OrganizationMembership $m) => [
                'id' => $m->id,
                'user_id' => $m->user_id,
                'name' => $m->user->name,
                'email' => $m->user->email,
                'role' => $m->role,
                'role_id' => $m->role_id,
                'role_name' => $m->roleModel?->name ?? ucfirst($m->role),
                'title' => $m->title ?? 'Team Member',
                'status' => $m->status,
                'has_2fa' => ! empty($m->user->two_factor_confirmed_at),
                'last_login_at' => $m->user->last_login_at?->diffForHumans() ?? 'Belum login',
                'joined_at' => $m->joined_at->isoFormat('D MMM Y'),
                'teams' => $m->user->teams->map(fn ($t) => [
                    'id' => $t->id,
                    'name' => $t->name,
                    'department' => $t->department,
                ])->all(),
            ]);

        // Pending invitations
        $pendingInvitations = OrganizationInvitation::where('organization_id', $orgId)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->get()
            ->map(function (OrganizationInvitation $inv) {
                return [
                    'id' => $inv->id,
                    'email' => $inv->email,
                    'role' => $inv->role,
                    'expires_at' => $inv->expires_at ? $inv->expires_at->diffForHumans() : '',
                    'created_at' => $inv->created_at ? $inv->created_at->isoFormat('D MMM Y') : '',
                ];
            });

        // Available roles for assignment
        $availableRoles = Role::where(function ($query) use ($orgId) {
            $query->whereNull('organization_id')
                ->orWhere('organization_id', $orgId);
        })
            ->orderBy('name')
            ->get()
            ->map(fn (Role $r) => [
                'id' => $r->id,
                'name' => $r->name,
                'slug' => $r->slug,
                'is_system' => $r->is_system,
            ]);

        // Available teams for assignment
        $availableTeams = Team::where('organization_id', $orgId)
            ->select(['id', 'name', 'department'])
            ->orderBy('name')
            ->get();

        return Inertia::render('organization/members', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
            ],
            'members' => $members,
            'pendingInvitations' => $pendingInvitations,
            'availableRoles' => $availableRoles,
            'availableTeams' => $availableTeams,
            'stats' => [
                'total_members' => $members->count(),
                'active_now' => $members->where('status', 'active')->count(),
                'pending_invitations' => $pendingInvitations->count(),
            ],
        ]);
    }

    /**
     * Manually add / create a member in the organization.
     */
    public function store(Request $request): RedirectResponse
    {
        $currentUser = $request->user();
        $orgId = session('current_organization_id') ?? $currentUser->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if (! $currentUser->hasPermissionInOrganization($organization, 'members:invite')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menambahkan anggota.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', 'string', 'in:admin,manager,member,guest'],
            'role_id' => ['nullable', 'string', 'exists:roles,id'],
            'title' => ['nullable', 'string', 'max:100'],
            'team_ids' => ['nullable', 'array'],
            'team_ids.*' => ['string', 'exists:teams,id'],
        ]);

        $email = strtolower($validated['email']);
        $user = User::where('email', $email)->first();

        if ($user) {
            // If already in this org
            if ($user->belongsToOrganization($organization)) {
                return back()->withErrors(['email' => 'Pengguna dengan email ini sudah terdaftar sebagai anggota di organisasi ini.']);
            }
        } else {
            // Create user
            $user = User::create([
                'name' => $validated['name'],
                'email' => $email,
                'password' => Hash::make($validated['password'] ?? 'password123'),
                'email_verified_at' => now(),
                'status' => 'active',
                'locale' => 'id',
                'timezone' => 'Asia/Jakarta',
            ]);
        }

        // Create membership
        OrganizationMembership::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'role' => $validated['role'],
            'role_id' => $validated['role_id'] ?? null,
            'title' => $validated['title'] ?? 'Team Member',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        // Attach to teams if selected
        if (! empty($validated['team_ids'])) {
            foreach ($validated['team_ids'] as $teamId) {
                TeamMember::firstOrCreate(
                    [
                        'team_id' => $teamId,
                        'user_id' => $user->id,
                    ],
                    [
                        'role' => 'member',
                        'joined_at' => now(),
                    ]
                );
            }
        }

        return back()->with('success', 'Anggota "'.$user->name.'" berhasil ditambahkan ke organisasi.');
    }

    /**
     * Update a member's role or custom role assignment.
     */
    public function updateRole(Request $request, OrganizationMembership $membership): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($membership->organization_id !== $orgId) {
            abort(403, 'Akses tidak sah.');
        }

        if (! $user->hasPermissionInOrganization($organization, 'members:update_role')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah peran anggota.');
        }

        $validated = $request->validate([
            'role' => ['required', 'string', 'in:owner,admin,manager,member,guest'],
            'role_id' => ['nullable', 'string', 'exists:roles,id'],
            'title' => ['nullable', 'string', 'max:100'],
        ]);

        // Guard: Prevent demoting the only owner
        if ($membership->role === 'owner' && $validated['role'] !== 'owner') {
            $ownerCount = OrganizationMembership::where('organization_id', $orgId)
                ->where('role', 'owner')
                ->count();

            if ($ownerCount <= 1) {
                return back()->withErrors(['role' => 'Organisasi harus memiliki setidaknya satu Owner.']);
            }
        }

        $membership->update([
            'role' => $validated['role'],
            'role_id' => $validated['role_id'] ?? null,
            'title' => $validated['title'] ?? $membership->title,
        ]);

        return back()->with('success', 'Peran anggota berhasil diperbarui.');
    }

    /**
     * Remove or revoke a member from the organization.
     */
    public function destroy(Request $request, OrganizationMembership $membership): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($membership->organization_id !== $orgId) {
            abort(403, 'Akses tidak sah.');
        }

        if (! $user->hasPermissionInOrganization($organization, 'members:remove')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengeluarkan anggota.');
        }

        if ($membership->role === 'owner') {
            $ownerCount = OrganizationMembership::where('organization_id', $orgId)
                ->where('role', 'owner')
                ->count();

            if ($ownerCount <= 1) {
                return back()->withErrors(['error' => 'Tidak dapat menghapus satu-satunya Owner organisasi.']);
            }
        }

        $membership->delete();

        return back()->with('success', 'Anggota berhasil dikeluarkan dari organisasi.');
    }
}
