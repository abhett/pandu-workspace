<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetTenantContext
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $sessionOrgId = session('current_organization_id');
        $organization = null;

        if ($sessionOrgId) {
            $organization = $user->organizations()
                ->where('organizations.id', $sessionOrgId)
                ->where('organizations.status', 'active')
                ->first();
        }

        if (! $organization) {
            $organization = $user->organizations()
                ->where('organizations.status', 'active')
                ->first();

            if ($organization) {
                session(['current_organization_id' => $organization->id]);
            }
        }

        // If user has no active organization, check if the route is exempted
        if (! $organization) {
            $isExempted = $request->is('onboarding*', 'settings*', 'email*', 'logout', 'organizations/*/switch')
                || $request->routeIs('onboarding.*', 'profile.*', 'security.*', 'user-password.*', 'appearance.*', 'verification.*', 'organizations.switch', 'logout');

            if (! $isExempted) {
                return redirect()->route('onboarding.organization');
            }
        }

        if ($organization) {
            $request->attributes->set('current_organization', $organization);
        }

        return $next($request);
    }
}
