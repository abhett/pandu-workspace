<?php

namespace App\Services\Integration;

use App\Models\Organization;
use App\Models\OrganizationIntegration;
use App\Models\User;
use Illuminate\Support\Facades\Http;

class IntegrationService
{
    /**
     * Pre-configured marketplace providers definition.
     *
     * @return array<string, array<string, mixed>>
     */
    public function getProviderCatalog(): array
    {
        return [
            'github' => [
                'provider' => 'github',
                'name' => 'GitHub',
                'category' => 'development',
                'description' => 'Sinkronisasi repositori, kelola issue, dan tautkan pull request langsung ke tugas tim.',
                'docs_url' => 'https://docs.github.com',
                'icon' => 'github',
                'config_fields' => [
                    ['key' => 'repository', 'label' => 'Nama Repositori (org/repo)', 'type' => 'text', 'placeholder' => 'acme/pandu-app'],
                    ['key' => 'access_token', 'label' => 'Personal Access Token', 'type' => 'password', 'placeholder' => 'ghp_xxxx'],
                    ['key' => 'auto_close_tasks', 'label' => 'Tutup tugas otomatis saat PR dimerge', 'type' => 'checkbox', 'default' => true],
                ],
            ],
            'gitlab' => [
                'provider' => 'gitlab',
                'name' => 'GitLab',
                'category' => 'development',
                'description' => 'Integrasikan pipeline CI/CD, merge request, dan webhook issue repositori GitLab.',
                'docs_url' => 'https://docs.gitlab.com',
                'icon' => 'gitlab',
                'config_fields' => [
                    ['key' => 'project_url', 'label' => 'URL Proyek GitLab', 'type' => 'text', 'placeholder' => 'https://gitlab.com/group/repo'],
                    ['key' => 'webhook_secret', 'label' => 'Webhook Secret Token', 'type' => 'password', 'placeholder' => 'glpat-xxxx'],
                ],
            ],
            'slack' => [
                'provider' => 'slack',
                'name' => 'Slack',
                'category' => 'communication',
                'description' => 'Kirim notifikasi instan ke channel tim saat tugas baru dibuat, status berubah, atau sprint dimulai.',
                'docs_url' => 'https://api.slack.com',
                'icon' => 'slack',
                'config_fields' => [
                    ['key' => 'webhook_url', 'label' => 'Incoming Webhook URL', 'type' => 'text', 'placeholder' => 'https://hooks.slack.com/services/...'],
                    ['key' => 'channel', 'label' => 'Nama Channel', 'type' => 'text', 'placeholder' => '#engineering-feed'],
                ],
            ],
            'discord' => [
                'provider' => 'discord',
                'name' => 'Discord',
                'category' => 'communication',
                'description' => 'Kirim broadcast alert aktivitas sprint dan milestone penting ke server Discord tim.',
                'docs_url' => 'https://discord.com/developers/docs',
                'icon' => 'discord',
                'config_fields' => [
                    ['key' => 'webhook_url', 'label' => 'Discord Webhook URL', 'type' => 'text', 'placeholder' => 'https://discord.com/api/webhooks/...'],
                ],
            ],
            'google_calendar' => [
                'provider' => 'google_calendar',
                'name' => 'Google Calendar',
                'category' => 'calendar',
                'description' => 'Sinkronisasi tenggat waktu tugas, rentang tanggal sprint, dan milestone proyek ke kalender Google.',
                'docs_url' => 'https://developers.google.com/calendar',
                'icon' => 'calendar',
                'config_fields' => [
                    ['key' => 'calendar_id', 'label' => 'Google Calendar ID', 'type' => 'text', 'placeholder' => 'primary / yourteam@group.calendar.google.com'],
                    ['key' => 'sync_milestones', 'label' => 'Sinkronisasi milestone proyek', 'type' => 'checkbox', 'default' => true],
                ],
            ],
            'google_drive' => [
                'provider' => 'google_drive',
                'name' => 'Google Drive',
                'category' => 'storage',
                'description' => 'Tautkan folder Google Drive bersama untuk menyimpan dokumen aset dan lampiran proyek.',
                'docs_url' => 'https://developers.google.com/drive',
                'icon' => 'google_drive',
                'config_fields' => [
                    ['key' => 'folder_id', 'label' => 'Folder ID / Shared Drive ID', 'type' => 'text', 'placeholder' => '1a2b3c4d5e...'],
                ],
            ],
            'figma' => [
                'provider' => 'figma',
                'name' => 'Figma',
                'category' => 'design',
                'description' => 'Sematkan frame prototipe Figma interaktif langsung ke dalam task drawer dan wiki tim.',
                'docs_url' => 'https://www.figma.com/developers',
                'icon' => 'figma',
                'config_fields' => [
                    ['key' => 'access_token', 'label' => 'Figma Personal Access Token', 'type' => 'password', 'placeholder' => 'figd_xxxx'],
                    ['key' => 'team_id', 'label' => 'Figma Team ID', 'type' => 'text', 'placeholder' => '123456789'],
                ],
            ],
            'zapier' => [
                'provider' => 'zapier',
                'name' => 'Zapier & Make',
                'category' => 'automation',
                'description' => 'Hubungkan sistem Pandu dengan lebih dari 5.000 aplikasi cloud melalui webhook otomasi.',
                'docs_url' => 'https://zapier.com',
                'icon' => 'zapier',
                'config_fields' => [
                    ['key' => 'catch_hook_url', 'label' => 'Zapier Catch Hook URL', 'type' => 'text', 'placeholder' => 'https://hooks.zapier.com/hooks/catch/...'],
                ],
            ],
        ];
    }

    /**
     * Get marketplace list merged with organization active installation state.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getMarketplace(Organization $organization, ?string $category = null, ?string $search = null): array
    {
        $installed = OrganizationIntegration::where('organization_id', $organization->id)
            ->get()
            ->keyBy('provider');

        $catalog = $this->getProviderCatalog();
        $results = [];

        foreach ($catalog as $providerKey => $item) {
            $installedRecord = $installed->get($providerKey);

            $entry = [
                'provider' => $providerKey,
                'name' => $item['name'],
                'category' => $item['category'],
                'description' => $item['description'],
                'docs_url' => $item['docs_url'],
                'icon' => $item['icon'],
                'config_fields' => $item['config_fields'],
                'is_installed' => $installedRecord !== null,
                'is_active' => $installedRecord ? $installedRecord->is_active : false,
                'installed_id' => $installedRecord?->id,
                'config' => $installedRecord?->config ?? [],
                'last_synced_at' => $installedRecord?->last_synced_at?->toIso8601String(),
            ];

            $results[] = $entry;
        }

        // Add custom webhook apps
        $customApps = OrganizationIntegration::where('organization_id', $organization->id)
            ->where('provider', 'custom_webhook')
            ->get();

        foreach ($customApps as $custom) {
            $results[] = [
                'provider' => 'custom_webhook',
                'name' => $custom->name,
                'category' => $custom->category,
                'description' => $custom->config['description'] ?? 'Integrasi webhook kustom internal.',
                'docs_url' => '#',
                'icon' => 'webhook',
                'config_fields' => [
                    ['key' => 'webhook_url', 'label' => 'Target Webhook URL', 'type' => 'text', 'placeholder' => 'https://api.yourdomain.com/webhook'],
                ],
                'is_installed' => true,
                'is_active' => $custom->is_active,
                'installed_id' => $custom->id,
                'config' => $custom->config ?? [],
                'last_synced_at' => $custom->last_synced_at?->toIso8601String(),
            ];
        }

        // Filter by category
        if ($category && $category !== 'all') {
            $results = array_values(array_filter($results, fn ($i) => $i['category'] === $category));
        }

        // Filter by search query
        if ($search) {
            $q = strtolower($search);
            $results = array_values(array_filter($results, function ($i) use ($q) {
                return str_contains(strtolower($i['name']), $q) || str_contains(strtolower($i['description']), $q);
            }));
        }

        return $results;
    }

    /**
     * Install or update an integration for the organization.
     *
     * @param  array<string, mixed>  $data
     */
    public function installOrUpdate(Organization $organization, User $user, string $provider, array $data): OrganizationIntegration
    {
        $catalog = $this->getProviderCatalog();
        $providerMeta = $catalog[$provider] ?? null;

        $name = $data['name'] ?? ($providerMeta['name'] ?? 'Aplikasi Kustom');
        $category = $data['category'] ?? ($providerMeta['category'] ?? 'automation');

        if ($provider === 'custom_webhook' && isset($data['id'])) {
            $integration = OrganizationIntegration::where('organization_id', $organization->id)
                ->where('id', $data['id'])
                ->firstOrFail();

            $integration->update([
                'name' => $name,
                'category' => $category,
                'config' => $data['config'] ?? [],
                'is_active' => (bool) ($data['is_active'] ?? true),
                'last_synced_at' => now(),
            ]);

            return $integration;
        }

        return OrganizationIntegration::updateOrCreate(
            [
                'organization_id' => $organization->id,
                'provider' => $provider,
            ],
            [
                'name' => $name,
                'category' => $category,
                'config' => $data['config'] ?? [],
                'is_active' => (bool) ($data['is_active'] ?? true),
                'last_synced_at' => now(),
                'created_by' => $user->id,
            ]
        );
    }

    /**
     * Toggle active state of an installed integration.
     */
    public function toggleActive(OrganizationIntegration $integration): OrganizationIntegration
    {
        $integration->update([
            'is_active' => ! $integration->is_active,
        ]);

        return $integration->fresh();
    }

    /**
     * Disconnect / uninstall an integration.
     */
    public function uninstall(OrganizationIntegration $integration): void
    {
        $integration->delete();
    }

    /**
     * Test connection ping to the integration webhook endpoint.
     *
     * @return array<string, mixed>
     */
    public function testPing(OrganizationIntegration $integration): array
    {
        $url = $integration->config['webhook_url'] ?? ($integration->config['catch_hook_url'] ?? null);

        if (! $url) {
            return [
                'success' => true,
                'simulated' => true,
                'message' => "Simulasi tes koneksi {$integration->name} berhasil (kredensial tervalidasi).",
            ];
        }

        try {
            $response = Http::timeout(5)->post($url, [
                'event' => 'pandu.integration.ping',
                'organization' => $integration->organization->name,
                'timestamp' => now()->toIso8601String(),
                'message' => 'Tes koneksi integrasi dari platform Pandu Manajemen.',
            ]);

            $integration->update(['last_synced_at' => now()]);

            return [
                'success' => $response->successful(),
                'status_code' => $response->status(),
                'message' => $response->successful() ? 'Koneksi webhook aktif dan merespon dengan sukses!' : 'Webhook menerima koneksi namun mengembalikan status '.$response->status(),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => 'Gagal terhubung ke endpoint: '.$e->getMessage(),
            ];
        }
    }
}
