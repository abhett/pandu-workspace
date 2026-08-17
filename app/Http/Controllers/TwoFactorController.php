<?php

namespace App\Http\Controllers;

use App\Services\Auth\TwoFactorAuthenticationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class TwoFactorController extends Controller
{
    public function __construct(
        protected TwoFactorAuthenticationService $twoFactorService
    ) {}

    /**
     * Enable Two-Factor Authentication (Generates unconfirmed secret).
     */
    public function enable(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();

        if ($user->two_factor_secret && $user->two_factor_confirmed_at) {
            return response()->json([
                'message' => '2FA sudah aktif.',
                'enabled' => true,
            ]);
        }

        $secret = $this->twoFactorService->generateSecretKey();
        $user->forceFill([
            'two_factor_secret' => encrypt($secret),
            'two_factor_confirmed_at' => null,
        ])->save();

        $qrCodeUrl = $this->twoFactorService->qrCodeUrl(
            config('app.name', 'Pandu AI'),
            $user->email,
            $secret
        );

        if ($request->wantsJson()) {
            return response()->json([
                'secret' => $secret,
                'qr_url' => $qrCodeUrl,
            ]);
        }

        return back()->with([
            'two_factor_secret' => $secret,
            'two_factor_qr_url' => $qrCodeUrl,
        ]);
    }

    /**
     * Confirm 2FA with 6-digit OTP code to finalize activation.
     */
    public function confirm(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();

        if (! $user->two_factor_secret) {
            abort(400, '2FA belum diinisiasi.');
        }

        $decryptedSecret = decrypt($user->two_factor_secret);

        if (! $this->twoFactorService->verify($decryptedSecret, $request->code)) {
            if ($request->wantsJson()) {
                return response()->json([
                    'message' => 'Kode OTP tidak valid.',
                    'errors' => ['code' => ['Kode verifikasi 6-digit salah atau kedaluwarsa.']],
                ], 422);
            }

            return back()->withErrors(['code' => 'Kode verifikasi 6-digit salah atau kedaluwarsa.']);
        }

        $recoveryCodes = $this->twoFactorService->generateRecoveryCodes(8);

        $user->forceFill([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => encrypt(json_encode($recoveryCodes)),
        ])->save();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Two-Factor Authentication berhasil diaktifkan.',
                'recovery_codes' => $recoveryCodes,
            ]);
        }

        return back()->with('success', 'Two-Factor Authentication berhasil diaktifkan.');
    }

    /**
     * Disable Two-Factor Authentication.
     */
    public function disable(Request $request): JsonResponse|RedirectResponse
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

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Two-Factor Authentication berhasil dinonaktifkan.',
            ]);
        }

        return back()->with('success', 'Two-Factor Authentication berhasil dinonaktifkan.');
    }

    /**
     * Regenerate 2FA Recovery Codes.
     */
    public function regenerateRecoveryCodes(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();

        if (! $user->two_factor_confirmed_at) {
            abort(400, '2FA belum diaktifkan.');
        }

        $recoveryCodes = $this->twoFactorService->generateRecoveryCodes(8);

        $user->forceFill([
            'two_factor_recovery_codes' => encrypt(json_encode($recoveryCodes)),
        ])->save();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'recovery_codes' => $recoveryCodes,
            ]);
        }

        return back()->with('success', 'Kode pemulihan baru berhasil dibuat.');
    }
}
