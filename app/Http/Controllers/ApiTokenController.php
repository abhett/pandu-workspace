<?php

namespace App\Http\Controllers;

use App\Services\User\ApiTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApiTokenController extends Controller
{
    public function __construct(
        protected ApiTokenService $apiTokenService
    ) {}

    /**
     * Display personal API tokens and connected accounts page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $tokens = $this->apiTokenService->getTokens($user);
        $connectedAccounts = $this->apiTokenService->getConnectedAccounts($user);

        return Inertia::render('settings/api-tokens', [
            'tokens' => $tokens,
            'connected_accounts' => $connectedAccounts,
        ]);
    }

    /**
     * Create a new personal API access token.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'abilities' => ['required', 'array'],
            'abilities.*' => ['string', 'in:read,write,admin'],
            'expires_in_days' => ['nullable', 'integer', 'min:1', 'max:365'],
        ]);

        $result = $this->apiTokenService->createToken(
            $request->user(),
            $validated['name'],
            $validated['abilities'],
            $validated['expires_in_days'] ?? null
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Token API berhasil dibuat.',
                'plain_text_token' => $result['plain_text_token'],
            ]);
        }

        return back()->with([
            'success' => 'Token API berhasil dibuat.',
            'plain_text_token' => $result['plain_text_token'],
        ]);
    }

    /**
     * Revoke / Delete a Personal Access Token.
     */
    public function destroy(Request $request, string|int $token): JsonResponse|RedirectResponse
    {
        $this->apiTokenService->revokeToken($request->user(), $token);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Token API berhasil dicabut.',
            ]);
        }

        return back()->with('success', 'Token API berhasil dicabut.');
    }

    /**
     * Connect or Disconnect a third-party OAuth application.
     */
    public function toggleAccount(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'provider' => ['required', 'string', 'in:github,slack,google,microsoft'],
            'connect' => ['required', 'boolean'],
            'username' => ['nullable', 'string', 'max:100'],
        ]);

        $this->apiTokenService->toggleConnectedAccount(
            $request->user(),
            $validated['provider'],
            $validated['connect'],
            $validated['username'] ?? null
        );

        $msg = $validated['connect'] ? 'Akun berhasil terhubung.' : 'Akses aplikasi berhasil dicabut.';

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $msg,
            ]);
        }

        return back()->with('success', $msg);
    }
}
