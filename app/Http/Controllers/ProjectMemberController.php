<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProjectMemberController extends Controller
{
    /**
     * Add a member to the project.
     */
    public function store(Request $request, Project $project): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::findOrFail($orgId);

        if ($project->organization_id !== $orgId) {
            abort(403, 'Akses tidak sah.');
        }

        if (! $user->hasPermissionInOrganization($organization, 'projects:edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengelola anggota proyek.');
        }

        $validated = $request->validate([
            'user_id' => [
                'required',
                'integer',
                'exists:users,id',
                Rule::unique('project_members')->where(fn ($q) => $q->where('project_id', $project->id)),
            ],
            'role' => ['required', 'string', 'in:lead,admin,member,viewer'],
        ]);

        // Verify that target user belongs to the organization
        $targetUser = User::findOrFail($validated['user_id']);
        if (! $targetUser->belongsToOrganization($organization)) {
            return back()->withErrors(['user_id' => 'Pengguna tidak terdaftar dalam organisasi ini.']);
        }

        ProjectMember::create([
            'project_id' => $project->id,
            'user_id' => $targetUser->id,
            'role' => $validated['role'],
            'joined_at' => now(),
        ]);

        return back()->with('success', $targetUser->name.' berhasil ditambahkan ke dalam proyek.');
    }

    /**
     * Update a project member's role.
     */
    public function update(Request $request, Project $project, ProjectMember $member): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::findOrFail($orgId);

        if ($project->organization_id !== $orgId || $member->project_id !== $project->id) {
            abort(403, 'Akses tidak sah.');
        }

        if (! $user->hasPermissionInOrganization($organization, 'projects:edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah peran anggota.');
        }

        $validated = $request->validate([
            'role' => ['required', 'string', 'in:lead,admin,member,viewer'],
        ]);

        $member->update(['role' => $validated['role']]);

        return back()->with('success', 'Peran anggota proyek berhasil diperbarui.');
    }

    /**
     * Remove a member from the project.
     */
    public function destroy(Request $request, Project $project, ProjectMember $member): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::findOrFail($orgId);

        if ($project->organization_id !== $orgId || $member->project_id !== $project->id) {
            abort(403, 'Akses tidak sah.');
        }

        if (! $user->hasPermissionInOrganization($organization, 'projects:edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengeluarkan anggota.');
        }

        $member->delete();

        return back()->with('success', 'Anggota berhasil dikeluarkan dari proyek.');
    }
}
