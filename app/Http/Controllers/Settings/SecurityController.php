<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use App\Http\Requests\Settings\TwoFactorAuthenticationRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class SecurityController extends Controller
{
    /**
     * Show the user's security settings page.
     */
    public function edit(TwoFactorAuthenticationRequest $request): Response
    {
        $user = $request->user();
        $currentSessionId = $request->session()->getId();

        $sessions = DB::table('sessions')
            ->where('user_id', $user->id)
            ->orderBy('last_activity', 'desc')
            ->get()
            ->map(function ($session) use ($currentSessionId) {
                $ua = $session->user_agent ?? '';

                $browser = 'Web Browser';
                if (str_contains($ua, 'Edg')) {
                    $browser = 'Edge';
                } elseif (str_contains($ua, 'Chrome')) {
                    $browser = 'Chrome';
                } elseif (str_contains($ua, 'Firefox')) {
                    $browser = 'Firefox';
                } elseif (str_contains($ua, 'Safari')) {
                    $browser = 'Safari';
                }

                $platform = 'Unknown OS';
                if (str_contains($ua, 'Windows')) {
                    $platform = 'Windows';
                } elseif (str_contains($ua, 'Macintosh') || str_contains($ua, 'Mac OS')) {
                    $platform = 'macOS';
                } elseif (str_contains($ua, 'Linux')) {
                    $platform = 'Linux';
                } elseif (str_contains($ua, 'Android')) {
                    $platform = 'Android';
                } elseif (str_contains($ua, 'iPhone') || str_contains($ua, 'iPad')) {
                    $platform = 'iOS';
                }

                return [
                    'id' => $session->id,
                    'ip_address' => $session->ip_address,
                    'is_current_device' => $session->id === $currentSessionId,
                    'browser' => $browser,
                    'platform' => $platform,
                    'device' => (! str_contains($ua, 'Mobile') && ! str_contains($ua, 'Android') && ! str_contains($ua, 'iPhone')) ? 'Desktop' : 'Mobile',
                    'last_active' => Carbon::createFromTimestamp($session->last_activity)->diffForHumans(),
                ];
            });

        $recoveryCodes = [];
        if ($user->two_factor_confirmed_at && $user->two_factor_recovery_codes) {
            try {
                $recoveryCodes = json_decode(decrypt($user->two_factor_recovery_codes), true) ?: [];
            } catch (\Exception) {
                $recoveryCodes = [];
            }
        }

        $props = [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
            'twoFactorEnabled' => ! empty($user->two_factor_confirmed_at),
            'hasTwoFactorSecret' => ! empty($user->two_factor_secret) && empty($user->two_factor_confirmed_at),
            'recoveryCodes' => $recoveryCodes,
            'sessions' => $sessions,
        ];

        return Inertia::render('settings/security', $props);
    }

    /**
     * Update the user's password.
     */
    public function update(PasswordUpdateRequest $request): RedirectResponse
    {
        $request->user()->update([
            'password' => $request->password,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Password updated.')]);

        return back();
    }
}
