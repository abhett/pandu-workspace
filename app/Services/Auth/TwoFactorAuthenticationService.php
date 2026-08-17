<?php

namespace App\Services\Auth;

use Illuminate\Support\Str;

class TwoFactorAuthenticationService
{
    /**
     * Generate a new random Base32 secret key.
     */
    public function generateSecretKey(): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = '';
        for ($i = 0; $i < 16; $i++) {
            $secret .= $alphabet[random_int(0, 31)];
        }

        return $secret;
    }

    /**
     * Generate the otpauth:// URI for authenticator apps.
     */
    public function qrCodeUrl(string $companyName, string $email, string $secret): string
    {
        $encodedCompany = rawurlencode($companyName);
        $encodedEmail = rawurlencode($email);

        return "otpauth://totp/{$encodedCompany}:{$encodedEmail}?secret={$secret}&issuer={$encodedCompany}&algorithm=SHA1&digits=6&period=30";
    }

    /**
     * Verify a 6-digit TOTP code against a secret key within a +/- 1 time window.
     */
    public function verify(string $secret, string $code): bool
    {
        $code = trim($code);
        if (strlen($code) !== 6 || ! ctype_digit($code)) {
            return false;
        }

        $currentTimeSlice = (int) floor(time() / 30);

        // Check window of -1, 0, +1 time slice (30 seconds each)
        for ($offset = -1; $offset <= 1; $offset++) {
            if ($this->calculateCode($secret, $currentTimeSlice + $offset) === $code) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate a collection of random recovery codes.
     *
     * @return array<int, string>
     */
    public function generateRecoveryCodes(int $count = 8): array
    {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $codes[] = Str::random(10).'-'.Str::random(10);
        }

        return $codes;
    }

    /**
     * Calculate 6-digit TOTP code for a specific time slice.
     */
    protected function calculateCode(string $secret, int $timeSlice): string
    {
        $binaryKey = $this->base32Decode($secret);
        $packedTime = pack('N*', 0).pack('N*', $timeSlice);

        $hash = hash_hmac('sha1', $packedTime, $binaryKey, true);
        $offset = ord($hash[19]) & 0xF;

        $truncatedHash = (
            ((ord($hash[$offset]) & 0x7F) << 24) |
            ((ord($hash[$offset + 1]) & 0xFF) << 16) |
            ((ord($hash[$offset + 2]) & 0xFF) << 8) |
            (ord($hash[$offset + 3]) & 0xFF)
        );

        $otp = $truncatedHash % 1000000;

        return str_pad((string) $otp, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Decode a base32 string into binary data.
     */
    protected function base32Decode(string $base32): string
    {
        $base32 = strtoupper($base32);
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $binary = '';

        for ($i = 0; $i < strlen($base32); $i++) {
            $char = $base32[$i];
            $val = strpos($alphabet, $char);
            if ($val === false) {
                continue;
            }
            $binary .= sprintf('%05b', $val);
        }

        $result = '';
        $chunks = str_split($binary, 8);
        foreach ($chunks as $chunk) {
            if (strlen($chunk) === 8) {
                $result .= chr(bindec($chunk));
            }
        }

        return $result;
    }
}
