<?php

use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use App\Http\Controllers\TwoFactorController;
use App\Http\Controllers\UserSessionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/security', [SecurityController::class, 'edit'])
        ->name('security.edit');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    // Two-Factor Authentication (2FA)
    Route::post('settings/two-factor-authentication', [TwoFactorController::class, 'enable'])
        ->name('two-factor.enable');
    Route::post('settings/two-factor-authentication/confirm', [TwoFactorController::class, 'confirm'])
        ->name('two-factor.confirm');
    Route::delete('settings/two-factor-authentication', [TwoFactorController::class, 'disable'])
        ->name('two-factor.disable');
    Route::post('settings/two-factor-authentication/recovery-codes', [TwoFactorController::class, 'regenerateRecoveryCodes'])
        ->name('two-factor.recovery-codes');

    // Session Management
    Route::get('settings/sessions', [UserSessionController::class, 'index'])
        ->name('user-sessions.index');
    Route::delete('settings/sessions/other', [UserSessionController::class, 'destroyOtherSessions'])
        ->name('user-sessions.destroy-other');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');
});
