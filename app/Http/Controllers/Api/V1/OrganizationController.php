<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\OrganizationResource;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizationController extends Controller
{
    /**
     * List all organizations the user belongs to.
     */
    public function index(Request $request): JsonResponse
    {
        $organizations = $request->user()->organizations()
            ->where('organizations.status', 'active')
            ->get();

        return response()->json([
            'data' => OrganizationResource::collection($organizations),
        ]);
    }

    /**
     * Get details of a single organization.
     */
    public function show(Request $request, Organization $organization): JsonResponse
    {
        // Enforce membership
        $isMember = $request->user()->organizations()
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

        return response()->json([
            'data' => new OrganizationResource($organization),
        ]);
    }
}
