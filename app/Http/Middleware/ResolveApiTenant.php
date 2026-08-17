<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveApiTenant
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

        $organization = null;
        $orgParam = $request->route('organization');

        if ($orgParam instanceof Organization) {
            $organization = $orgParam;
        } elseif (is_string($orgParam) && ! empty($orgParam)) {
            $organization = Organization::where('id', $orgParam)
                ->orWhere('slug', $orgParam)
                ->first();
        }

        // Header lookup
        if (! $organization) {
            $headerOrgId = $request->header('X-Organization-Id');
            if ($headerOrgId) {
                $organization = Organization::where('id', $headerOrgId)
                    ->orWhere('slug', $headerOrgId)
                    ->first();
            }
        }

        // Default to user's first active organization
        if (! $organization) {
            $organization = $user->organizations()
                ->where('organizations.status', 'active')
                ->first();
        }

        if ($organization) {
            // Verify user is an active member
            $isMember = $user->organizations()
                ->where('organizations.id', $organization->id)
                ->wherePivot('status', 'active')
                ->exists();

            if (! $isMember) {
                return response()->json([
                    'error' => [
                        'code' => 'FORBIDDEN_ORGANIZATION_ACCESS',
                        'message' => 'You do not have access to this organization.',
                    ],
                ], 403);
            }

            $request->attributes->set('current_organization', $organization);
        }

        return $next($request);
    }
}
