<?php

use App\Http\Controllers\ApiTokenController;
use App\Http\Controllers\Settings\KeyboardShortcutController;
use App\Http\Controllers\Settings\NotificationPreferenceController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use App\Http\Controllers\Settings\UserPreferenceController;
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

    // Notification Preferences
    Route::get('settings/notifications', [NotificationPreferenceController::class, 'edit'])
        ->name('notifications.preferences.edit');
    Route::put('settings/notifications', [NotificationPreferenceController::class, 'update'])
        ->name('notifications.preferences.update');

    // Personal Developer API Tokens & Connected Accounts
    Route::get('settings/api-tokens', [ApiTokenController::class, 'index'])
        ->name('settings.api-tokens');
    Route::post('settings/api-tokens', [ApiTokenController::class, 'store'])
        ->name('settings.api-tokens.store');
    Route::delete('settings/api-tokens/{token}', [ApiTokenController::class, 'destroy'])
        ->name('settings.api-tokens.destroy');
    Route::post('settings/connected-accounts/toggle', [ApiTokenController::class, 'toggleAccount'])
        ->name('settings.connected-accounts.toggle');

    // Personal AI Preferences & Directives
    Route::get('settings/ai-preferences', [UserPreferenceController::class, 'aiIndex'])
        ->name('settings.ai-preferences');
    Route::put('settings/ai-preferences', [UserPreferenceController::class, 'updateAi'])
        ->name('settings.ai-preferences.update');

    // Language, Regional Formats & Timezone
    Route::get('settings/language-timezone', [UserPreferenceController::class, 'regionalIndex'])
        ->name('settings.language-timezone');
    Route::put('settings/language-timezone', [UserPreferenceController::class, 'updateRegional'])
        ->name('settings.language-timezone.update');

    // Keyboard Shortcuts & Accessibility
    Route::get('settings/keyboard-shortcuts', [KeyboardShortcutController::class, 'index'])
        ->name('settings.keyboard-shortcuts');
    Route::put('settings/keyboard-shortcuts', [KeyboardShortcutController::class, 'update'])
        ->name('settings.keyboard-shortcuts.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');
});
