<?php

use App\Models\User;
use App\Services\Auth\TwoFactorAuthenticationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->user = User::factory()->create([
        'password' => Hash::make('SecretPassword123!'),
    ]);
});

test('user can initiate 2FA setup and receive secret key and qr url', function () {
    $response = $this->actingAs($this->user)->postJson('/settings/two-factor-authentication');

    $response->assertOk();
    $response->assertJsonStructure(['secret', 'qr_url']);

    $this->user->refresh();
    expect($this->user->two_factor_secret)->not->toBeNull();
    expect($this->user->two_factor_confirmed_at)->toBeNull();
});

test('user can confirm 2FA with valid OTP code and receive recovery codes', function () {
    // 1. Enable 2FA
    $enableResponse = $this->actingAs($this->user)->postJson('/settings/two-factor-authentication');
    $secret = $enableResponse->json('secret');

    // 2. Generate valid TOTP code
    $twoFactorService = app(TwoFactorAuthenticationService::class);
    $reflection = new ReflectionClass($twoFactorService);
    $method = $reflection->getMethod('calculateCode');
    $method->setAccessible(true);
    $validCode = $method->invoke($twoFactorService, $secret, (int) floor(time() / 30));

    // 3. Confirm 2FA
    $confirmResponse = $this->actingAs($this->user)->postJson('/settings/two-factor-authentication/confirm', [
        'code' => $validCode,
    ]);

    $confirmResponse->assertOk();
    $confirmResponse->assertJsonStructure(['success', 'recovery_codes']);

    $this->user->refresh();
    expect($this->user->two_factor_confirmed_at)->not->toBeNull();
    expect($this->user->two_factor_recovery_codes)->not->toBeNull();
});

test('user can disable 2FA with password confirmation', function () {
    $this->user->update([
        'two_factor_secret' => encrypt('JBSWY3DPEHPK3PXP'),
        'two_factor_confirmed_at' => now(),
    ]);

    $disableResponse = $this->actingAs($this->user)->deleteJson('/settings/two-factor-authentication', [
        'password' => 'SecretPassword123!',
    ]);

    $disableResponse->assertOk();
    $this->user->refresh();
    expect($this->user->two_factor_secret)->toBeNull();
    expect($this->user->two_factor_confirmed_at)->toBeNull();
});

test('user can destroy other active browser sessions with password verification', function () {
    // Start session and get ID
    $currentId = 'test_session_current_123';

    DB::table('sessions')->insert([
        [
            'id' => $currentId,
            'user_id' => $this->user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'payload' => 'payload1',
            'last_activity' => time(),
        ],
        [
            'id' => 'session_2_other',
            'user_id' => $this->user->id,
            'ip_address' => '192.168.1.50',
            'user_agent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
            'payload' => 'payload2',
            'last_activity' => time() - 3600,
        ],
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['_dummy' => 'val'])
        ->deleteJson('/settings/sessions/other', [
            'password' => 'SecretPassword123!',
        ]);

    $response->assertOk();

    // Verify session_2_other was deleted
    $otherSession = DB::table('sessions')->where('id', 'session_2_other')->first();
    expect($otherSession)->toBeNull();
});
