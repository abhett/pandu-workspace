<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TeamController extends Controller
{
    /**
     * Display the Teams Directory.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');

        if (! $orgId) {
            return redirect()->route('onboarding.create-organization');
        }

        $organization = Organization::findOrFail($orgId);

        // Fetch teams with lead and members
        $teams = Team::with(['lead', 'users'])
            ->where('organization_id', $orgId)
            ->orderBy('name')
            ->get()
            ->map(fn (Team $team) => [
                'id' => $team->id,
                'name' => $team->name,
                'slug' => $team->slug,
                'department' => $team->department ?? 'Umum',
                'description' => $team->description ?? 'Tidak ada deskripsi.',
                'lead' => $team->lead ? [
                    'id' => $team->lead->id,
                    'name' => $team->lead->name,
                    'email' => $team->lead->email,
                ] : null,
                'members_count' => $team->users->count(),
                'members' => $team->users->map(fn (User $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'role' => $u->pivot->role ?? 'member',
                ])->all(),
                'created_at' => $team->created_at->isoFormat('D MMM Y'),
            ]);

        // Get available members from the organization
        $availableMembers = $organization->users()
            ->select(['users.id', 'users.name', 'users.email'])
            ->get()
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ]);

        // Distinct departments
        $departments = $teams->pluck('department')->unique()->values()->all();

        return Inertia::render('teams/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
            ],
            'teams' => $teams,
            'departments' => $departments,
            'availableMembers' => $availableMembers,
        ]);
    }

    /**
     * Store a newly created team.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::findOrFail($orgId);

        if (! $user->hasPermissionInOrganization($organization, 'teams:manage')) {
            abort(403, 'Anda tidak memiliki hak akses untuk membuat tim.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'department' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'lead_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'member_user_ids' => ['nullable', 'array'],
            'member_user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $slug = Str::slug($validated['name']);
        $existingCount = Team::where('organization_id', $orgId)->where('slug', $slug)->count();
        if ($existingCount > 0) {
            $slug = $slug.'-'.Str::random(4);
        }

        $team = Team::create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'slug' => $slug,
            'department' => $validated['department'] ?? 'General',
            'description' => $validated['description'] ?? null,
            'lead_user_id' => $validated['lead_user_id'] ?? null,
        ]);

        // Attach members
        $memberIds = $validated['member_user_ids'] ?? [];
        if (! empty($validated['lead_user_id']) && ! in_array($validated['lead_user_id'], $memberIds)) {
            $memberIds[] = $validated['lead_user_id'];
        }

        $syncData = [];
        foreach ($memberIds as $mId) {
            $role = ($mId == $validated['lead_user_id']) ? 'lead' : 'member';
            $syncData[$mId] = ['role' => $role, 'id' => (string) Str::uuid7()];
        }

        $team->users()->sync($syncData);

        return back()->with('success', 'Tim "'.$team->name.'" berhasil dibuat.');
    }

    /**
     * Update the specified team.
     */
    public function update(Request $request, Team $team): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::findOrFail($orgId);

        if ($team->organization_id !== $orgId) {
            abort(403, 'Akses tidak sah.');
        }

        if (! $user->hasPermissionInOrganization($organization, 'teams:manage')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengedit tim.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'department' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'lead_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'member_user_ids' => ['nullable', 'array'],
            'member_user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $team->update([
            'name' => $validated['name'],
            'department' => $validated['department'] ?? $team->department,
            'description' => $validated['description'] ?? null,
            'lead_user_id' => $validated['lead_user_id'] ?? null,
        ]);

        if (isset($validated['member_user_ids'])) {
            $memberIds = $validated['member_user_ids'];
            if (! empty($validated['lead_user_id']) && ! in_array($validated['lead_user_id'], $memberIds)) {
                $memberIds[] = $validated['lead_user_id'];
            }

            $syncData = [];
            foreach ($memberIds as $mId) {
                $role = ($mId == $validated['lead_user_id']) ? 'lead' : 'member';
                $syncData[$mId] = ['role' => $role, 'id' => (string) Str::uuid7()];
            }

            $team->users()->sync($syncData);
        }

        return back()->with('success', 'Tim "'.$team->name.'" berhasil diperbarui.');
    }

    /**
     * Delete the specified team.
     */
    public function destroy(Request $request, Team $team): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::findOrFail($orgId);

        if ($team->organization_id !== $orgId) {
            abort(403, 'Akses tidak sah.');
        }

        if (! $user->hasPermissionInOrganization($organization, 'teams:manage')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus tim.');
        }

        $team->delete();

        return back()->with('success', 'Tim berhasil dihapus.');
    }
}
