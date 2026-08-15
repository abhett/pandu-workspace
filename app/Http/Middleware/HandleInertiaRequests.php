<?php

namespace App\Http\Middleware;

use App\Services\Auth\PermissionRegistry;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $currentOrg = $request->attributes->get('current_organization');
        $userOrgs = [];
        $userPermissions = [];
        $userRole = 'guest';

        if ($user) {
            if (! $currentOrg && session('current_organization_id')) {
                $currentOrg = $user->organizations()
                    ->where('organizations.id', session('current_organization_id'))
                    ->first();
            }

            if (! $currentOrg) {
                $currentOrg = $user->organizations()->first();
            }

            $userOrgs = $user->organizations()
                ->select(['organizations.id', 'organizations.name', 'organizations.slug'])
                ->get()
                ->map(fn ($org) => [
                    'id' => $org->id,
                    'name' => $org->name,
                    'slug' => $org->slug,
                    'role' => $org->pivot->role ?? 'member',
                ])
                ->all();

            if ($currentOrg) {
                $membership = $user->memberships()
                    ->with('roleModel.permissions')
                    ->where('organization_id', $currentOrg->id)
                    ->first();

                if ($membership) {
                    $userRole = $membership->role;

                    if ($membership->role === 'owner') {
                        $userPermissions = array_column(PermissionRegistry::allFlat(), 'id');
                    } elseif ($membership->role_id && $membership->roleModel) {
                        $userPermissions = $membership->roleModel->permissions->pluck('id')->all();
                    } else {
                        $userPermissions = PermissionRegistry::defaultPermissionsForRole($membership->role);
                    }
                }
            }
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                'organization' => $currentOrg ? [
                    'id' => $currentOrg->id,
                    'name' => $currentOrg->name,
                    'slug' => $currentOrg->slug,
                    'role' => $userRole,
                    'settings' => $currentOrg->settings ?? [],
                ] : null,
                'permissions' => $userPermissions,
                'organizations' => $userOrgs,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
