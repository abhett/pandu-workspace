<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\OrganizationResource;
use App\Http\Resources\Api\V1\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MeController extends Controller
{
    /**
     * Get details of the currently authenticated user.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $organizations = $user->organizations()->where('organizations.status', 'active')->get();
        $currentOrg = $request->attributes->get('current_organization');

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'current_organization' => $currentOrg ? new OrganizationResource($currentOrg) : null,
                'organizations' => OrganizationResource::collection($organizations),
            ],
            'meta' => [
                'token_abilities' => $request->user()->currentAccessToken()?->abilities ?? ['*'],
            ],
        ]);
    }
}
