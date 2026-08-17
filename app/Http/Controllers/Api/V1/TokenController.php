<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TokenController extends Controller
{
    /**
     * List user's active API tokens.
     */
    public function index(Request $request): JsonResponse
    {
        $tokens = $request->user()->tokens()->latest('created_at')->get();

        return response()->json([
            'data' => $tokens->map(fn ($token) => [
                'id' => $token->id,
                'name' => $token->name,
                'abilities' => $token->abilities,
                'last_used_at' => $token->last_used_at?->toIso8601String(),
                'expires_at' => $token->expires_at?->toIso8601String(),
                'created_at' => $token->created_at?->toIso8601String(),
            ]),
        ]);
    }

    /**
     * Create a new Personal Access Token.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'abilities' => ['nullable', 'array'],
            'abilities.*' => ['string'],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ]);

        $abilities = $validated['abilities'] ?? ['*'];
        $expiresAt = isset($validated['expires_at']) ? new \DateTime($validated['expires_at']) : null;

        $token = $request->user()->createToken($validated['name'], $abilities, $expiresAt);

        return response()->json([
            'data' => [
                'id' => $token->accessToken->id,
                'name' => $token->accessToken->name,
                'plain_text_token' => $token->plainTextToken,
                'abilities' => $token->accessToken->abilities,
                'expires_at' => $token->accessToken->expires_at?->toIso8601String(),
                'created_at' => $token->accessToken->created_at?->toIso8601String(),
            ],
            'meta' => [
                'warning' => 'Store the plain text token in a secure location. It will not be shown again.',
            ],
        ], 201);
    }

    /**
     * Revoke an API token.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $token = $request->user()->tokens()->where('id', $id)->first();

        if (! $token) {
            return response()->json([
                'error' => [
                    'code' => 'TOKEN_NOT_FOUND',
                    'message' => 'The specified API token does not exist or does not belong to you.',
                ],
            ], 404);
        }

        $token->delete();

        return response()->json([
            'message' => 'Token revoked successfully.',
        ]);
    }
}
