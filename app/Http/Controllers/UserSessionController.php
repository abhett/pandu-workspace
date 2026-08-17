<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSessionController extends Controller
{
    /**
     * Get list of active sessions for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentSessionId = $request->session()->getId();

        $sessions = DB::table('sessions')
            ->where('user_id', $user->id)
            ->orderBy('last_activity', 'desc')
            ->get()
            ->map(function ($session) use ($currentSessionId) {
                $agent = $this->createAgent($session);

                return [
                    'id' => $session->id,
                    'ip_address' => $session->ip_address,
                    'is_current_device' => $session->id === $currentSessionId,
                    'browser' => $agent->browser() ?: 'Unknown Browser',
                    'platform' => $agent->platform() ?: 'Unknown OS',
                    'device' => $agent->isDesktop() ? 'Desktop' : ($agent->isTablet() ? 'Tablet' : 'Mobile'),
                    'last_active' => Carbon::createFromTimestamp($session->last_activity)->diffForHumans(),
                ];
            });

        return response()->json([
            'sessions' => $sessions,
        ]);
    }

    /**
     * Destroy other active browser sessions for the user.
     */
    public function destroyOtherSessions(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (! Hash::check($request->password, $user->password)) {
            if ($request->wantsJson()) {
                return response()->json([
                    'message' => 'Password salah.',
                    'errors' => ['password' => ['Password yang Anda masukkan tidak sesuai.']],
                ], 422);
            }

            return back()->withErrors(['password' => 'Password yang Anda masukkan tidak sesuai.']);
        }

        $currentSessionId = $request->session()->getId();

        DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', '!=', $currentSessionId)
            ->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Sesi perangkat lain berhasil dicabut.',
            ]);
        }

        return back()->with('success', 'Sesi perangkat lain berhasil dicabut.');
    }

    protected function createAgent($session): object
    {
        $userAgent = $session->user_agent ?? '';

        return new class($userAgent)
        {
            public function __construct(protected string $ua) {}

            public function browser(): string
            {
                if (str_contains($this->ua, 'Edg')) {
                    return 'Edge';
                }
                if (str_contains($this->ua, 'Chrome')) {
                    return 'Chrome';
                }
                if (str_contains($this->ua, 'Firefox')) {
                    return 'Firefox';
                }
                if (str_contains($this->ua, 'Safari')) {
                    return 'Safari';
                }

                return 'Web Browser';
            }

            public function platform(): string
            {
                if (str_contains($this->ua, 'Windows')) {
                    return 'Windows';
                }
                if (str_contains($this->ua, 'Macintosh') || str_contains($this->ua, 'Mac OS')) {
                    return 'macOS';
                }
                if (str_contains($this->ua, 'Linux')) {
                    return 'Linux';
                }
                if (str_contains($this->ua, 'Android')) {
                    return 'Android';
                }
                if (str_contains($this->ua, 'iPhone') || str_contains($this->ua, 'iPad')) {
                    return 'iOS';
                }

                return 'Unknown OS';
            }

            public function isDesktop(): bool
            {
                return ! str_contains($this->ua, 'Mobile') && ! str_contains($this->ua, 'Android') && ! str_contains($this->ua, 'iPhone');
            }

            public function isTablet(): bool
            {
                return str_contains($this->ua, 'iPad') || str_contains($this->ua, 'Tablet');
            }
        };
    }
}
