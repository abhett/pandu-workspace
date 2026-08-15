<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Services\Auth\PermissionRegistry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class RolePermissionController extends Controller
{
    /**
     * Display the Roles & Permissions matrix page.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');

        if (! $orgId) {
            return redirect()->route('onboarding.create-organization');
        }

        $organization = Organization::findOrFail($orgId);

        // Fetch all permissions grouped by category
        $groupedPermissions = PermissionRegistry::allGrouped();

        // Fetch system roles and org custom roles
        $roles = Role::with('permissions')
            ->where(function ($query) use ($orgId) {
                $query->whereNull('organization_id')
                    ->orWhere('organization_id', $orgId);
            })
            ->orderByRaw("CASE 
                WHEN slug = 'owner' THEN 1 
                WHEN slug = 'admin' THEN 2 
                WHEN slug = 'manager' THEN 3 
                WHEN slug = 'member' THEN 4 
                WHEN slug = 'guest' THEN 5 
                ELSE 6 END")
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'slug' => $role->slug,
                'description' => $role->description,
                'is_system' => $role->is_system,
                'organization_id' => $role->organization_id,
                'permissions' => $role->permissions->pluck('id')->all(),
            ]);

        return Inertia::render('organization/roles', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
            ],
            'groupedPermissions' => $groupedPermissions,
            'roles' => $roles,
        ]);
    }

    /**
     * Create a new custom role.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::findOrFail($orgId);

        // Check permission (owner or admin)
        if (! $user->hasPermissionInOrganization($organization, 'roles:manage')) {
            abort(403, 'Anda tidak memiliki hak akses untuk membuat peran.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,id'],
        ]);

        $slug = Str::slug($validated['name']);
        // Ensure uniqueness within organization
        $existingCount = Role::where('organization_id', $orgId)->where('slug', $slug)->count();
        if ($existingCount > 0) {
            $slug = $slug.'-'.Str::random(4);
        }

        $role = Role::create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'is_system' => false,
        ]);

        if (! empty($validated['permissions'])) {
            $role->permissions()->sync($validated['permissions']);
        }

        return back()->with('success', 'Peran kustom berhasil dibuat.');
    }

    /**
     * Batch update role permissions matrix.
     */
    public function updateMatrix(Request $request): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::findOrFail($orgId);

        if (! $user->hasPermissionInOrganization($organization, 'permissions:manage')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah matriks izin.');
        }

        $validated = $request->validate([
            'matrix' => ['required', 'array'],
            'matrix.*.role_id' => ['required', 'string', 'exists:roles,id'],
            'matrix.*.permissions' => ['present', 'array'],
            'matrix.*.permissions.*' => ['string', 'exists:permissions,id'],
        ]);

        foreach ($validated['matrix'] as $item) {
            $role = Role::findOrFail($item['role_id']);

            // Do not alter Owner system role permissions
            if ($role->slug === 'owner' && $role->is_system) {
                continue;
            }

            // Only allow modifying roles in current org or non-owner system roles
            if ($role->organization_id !== null && $role->organization_id !== $orgId) {
                continue;
            }

            $role->permissions()->sync($item['permissions']);
        }

        return back()->with('success', 'Matriks izin berhasil diperbarui.');
    }

    /**
     * Delete a custom role.
     */
    public function destroy(Request $request, Role $role): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::findOrFail($orgId);

        if (! $user->hasPermissionInOrganization($organization, 'roles:manage')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus peran.');
        }

        if ($role->is_system || $role->organization_id !== $orgId) {
            abort(403, 'Peran sistem tidak dapat dihapus.');
        }

        $role->delete();

        return back()->with('success', 'Peran kustom berhasil dihapus.');
    }
}
