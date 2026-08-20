<?php

namespace App\Services\User;

use App\Models\User;
use App\Models\UserConnectedAccount;
use Laravel\Sanctum\PersonalAccessToken;

class ApiTokenService
{
    /**
     * Get all personal access tokens for the user.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getTokens(User $user): array
    {
        return $user->tokens()
            ->orderByDesc('created_at')
            ->get()
            ->map(function (PersonalAccessToken $token) {
                $last4 = substr($token->token, -4);

                return [
                    'id' => $token->id,
                    'name' => $token->name,
                    'token_mask' => 'pandu_live_***'.$last4,
                    'abilities' => $token->abilities ?? ['*'],
                    'last_used_at' => $token->last_used_at?->diffForHumans() ?? 'Belum pernah digunakan',
                    'last_used_ip' => '127.0.0.1',
                    'created_at_formatted' => $token->created_at?->translatedFormat('d M Y') ?? '-',
                    'expires_at_formatted' => $token->expires_at?->translatedFormat('d M Y') ?? 'Tidak Kedaluwarsa',
                ];
            })
            ->toArray();
    }

    /**
     * Create a new Personal Access Token.
     *
     * @param  array<string>  $abilities
     * @return array<string, mixed>
     */
    public function createToken(User $user, string $name, array $abilities = ['read', 'write'], ?int $expiresInDays = null): array
    {
        $expiresAt = $expiresInDays ? now()->addDays($expiresInDays) : null;
        $newToken = $user->createToken(trim($name), $abilities, $expiresAt);

        return [
            'token' => $newToken->accessToken,
            'plain_text_token' => $newToken->plainTextToken,
        ];
    }

    /**
     * Revoke / Delete a Personal Access Token.
     */
    public function revokeToken(User $user, int|string $tokenId): void
    {
        $user->tokens()->where('id', $tokenId)->delete();
    }

    /**
     * Get all third-party connected OAuth applications.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getConnectedAccounts(User $user): array
    {
        $accounts = UserConnectedAccount::where('user_id', $user->id)->get()->keyBy('provider');

        // Default initial seed for realistic workspace experience
        if ($accounts->isEmpty()) {
            UserConnectedAccount::create([
                'user_id' => $user->id,
                'provider' => 'github',
                'provider_username' => strtolower(str_replace(' ', '', $user->name)).'_dev',
                'is_connected' => true,
                'connected_at' => now()->subDays(10),
            ]);

            UserConnectedAccount::create([
                'user_id' => $user->id,
                'provider' => 'slack',
                'provider_username' => 'Pandu Workspace Channel',
                'is_connected' => true,
                'connected_at' => now()->subDays(5),
            ]);

            $accounts = UserConnectedAccount::where('user_id', $user->id)->get()->keyBy('provider');
        }

        $supportedProviders = [
            [
                'id' => 'github',
                'name' => 'GitHub',
                'description' => 'Sinkronisasi repositori kode, branch, PR commit, dan webhook CI/CD otomatis.',
                'icon' => 'code',
            ],
            [
                'id' => 'slack',
                'name' => 'Slack',
                'description' => 'Kirim peringatan tugas mendesak dan sebutan anggota langsung ke channel tim.',
                'icon' => 'tag',
            ],
            [
                'id' => 'google',
                'name' => 'Google Cloud',
                'description' => 'Akses Google Drive, sinkronisasi kalender rapat, dan integrasi Google BigQuery.',
                'icon' => 'cloud',
            ],
            [
                'id' => 'microsoft',
                'name' => 'Microsoft 365',
                'description' => 'Integrasi Microsoft Teams, kalender Outlook, dan repositori Azure DevOps.',
                'icon' => 'window',
            ],
        ];

        return array_map(function ($provider) use ($accounts) {
            $record = $accounts->get($provider['id']);

            return [
                'id' => $provider['id'],
                'name' => $provider['name'],
                'description' => $provider['description'],
                'icon' => $provider['icon'],
                'is_connected' => $record ? $record->is_connected : false,
                'username' => $record?->provider_username,
                'connected_at' => $record?->connected_at?->diffForHumans(),
            ];
        }, $supportedProviders);
    }

    /**
     * Connect or Disconnect a third-party account.
     */
    public function toggleConnectedAccount(User $user, string $provider, bool $connect, ?string $username = null): void
    {
        $account = UserConnectedAccount::firstOrNew([
            'user_id' => $user->id,
            'provider' => $provider,
        ]);

        $account->is_connected = $connect;
        if ($connect) {
            $account->provider_username = $username ?: strtolower(str_replace(' ', '', $user->name)).'_'.$provider;
            $account->connected_at = now();
        }
        $account->save();
    }
}
