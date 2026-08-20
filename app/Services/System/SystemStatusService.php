<?php

namespace App\Services\System;

use App\Models\SystemIncident;
use App\Models\SystemServiceHealth;

class SystemStatusService
{
    /**
     * Get or initialize all core service health records.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getLiveServicesHealth(): array
    {
        $defaultServices = [
            [
                'service_name' => 'database_cluster',
                'display_name' => 'Database Engine & Replicas',
                'category' => 'core',
                'status' => 'operational',
                'uptime_percentage' => 99.98,
                'latency_ms' => 14,
                'meta' => ['active_connections' => 48, 'replication_lag_ms' => 0],
            ],
            [
                'service_name' => 'api_gateway',
                'display_name' => 'REST API Gateway & Routing',
                'category' => 'core',
                'status' => 'operational',
                'uptime_percentage' => 99.99,
                'latency_ms' => 42,
                'meta' => ['requests_per_sec' => 320, 'ssl_valid' => true],
            ],
            [
                'service_name' => 'ai_inference_cluster',
                'display_name' => 'AI LLM Inference Gateway (Gemini & Claude)',
                'category' => 'ai',
                'status' => 'operational',
                'uptime_percentage' => 99.95,
                'latency_ms' => 180,
                'meta' => ['active_models' => ['gemini-1.5-pro', 'gpt-4o', 'claude-3-5-sonnet']],
            ],
            [
                'service_name' => 'storage_cdn',
                'display_name' => 'Cloud Object Storage & Assets CDN',
                'category' => 'storage',
                'status' => 'operational',
                'uptime_percentage' => 99.99,
                'latency_ms' => 32,
                'meta' => ['edge_hit_ratio' => '94.2%'],
            ],
            [
                'service_name' => 'realtime_websockets',
                'display_name' => 'Real-time WebSockets & Event Bus',
                'category' => 'networking',
                'status' => 'operational',
                'uptime_percentage' => 99.99,
                'latency_ms' => 18,
                'meta' => ['connected_clients' => 124, 'packet_loss' => '0.00%'],
            ],
        ];

        foreach ($defaultServices as $srv) {
            SystemServiceHealth::firstOrCreate(
                ['service_name' => $srv['service_name']],
                [
                    'display_name' => $srv['display_name'],
                    'category' => $srv['category'],
                    'status' => $srv['status'],
                    'uptime_percentage' => $srv['uptime_percentage'],
                    'latency_ms' => $srv['latency_ms'],
                    'meta' => $srv['meta'],
                    'last_checked_at' => now(),
                ]
            );
        }

        return SystemServiceHealth::orderBy('category')->get()->map(function (SystemServiceHealth $health) {
            return [
                'id' => $health->id,
                'service_name' => $health->service_name,
                'display_name' => $health->display_name,
                'category' => $health->category,
                'status' => $health->status,
                'uptime_percentage' => (float) $health->uptime_percentage,
                'latency_ms' => $health->latency_ms,
                'meta' => $health->meta,
                'last_checked_at_formatted' => $health->last_checked_at?->diffForHumans() ?? 'baru saja',
            ];
        })->toArray();
    }

    /**
     * Get incident history logs.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getIncidentHistory(): array
    {
        if (SystemIncident::count() === 0) {
            SystemIncident::create([
                'title' => 'Peningkatan Infrastruktur Database Terjadwal',
                'description' => 'Migrasi kluster penyimpanan failover dan optimalisasi indeks query berhasil diselesaikan tanpa gangguan layanan.',
                'severity' => 'maintenance',
                'status' => 'resolved',
                'affected_services' => ['Database Engine & Replicas'],
                'started_at' => now()->subDays(3)->setTime(2, 0),
                'resolved_at' => now()->subDays(3)->setTime(2, 45),
            ]);

            SystemIncident::create([
                'title' => 'Degradasi Latensi Sementara pada AI Provider Gemini',
                'description' => 'Lonjakan latensi respons API eksternal terdeteksi dan otomatis dialihkan ke kluster cadangan dengan pemulihan 100%.',
                'severity' => 'minor',
                'status' => 'resolved',
                'affected_services' => ['AI LLM Inference Gateway'],
                'started_at' => now()->subDays(8)->setTime(14, 10),
                'resolved_at' => now()->subDays(8)->setTime(14, 28),
            ]);
        }

        return SystemIncident::orderByDesc('started_at')->get()->map(function (SystemIncident $incident) {
            return [
                'id' => $incident->id,
                'title' => $incident->title,
                'description' => $incident->description,
                'severity' => $incident->severity,
                'status' => $incident->status,
                'affected_services' => $incident->affected_services ?? [],
                'started_at_formatted' => $incident->started_at->translatedFormat('d M Y H:i'),
                'resolved_at_formatted' => $incident->resolved_at?->translatedFormat('d M Y H:i') ?? 'Sedang Berlangsung',
                'duration' => $incident->resolved_at ? $incident->started_at->diffInMinutes($incident->resolved_at).' menit' : 'Berjalan',
            ];
        })->toArray();
    }

    /**
     * Get overall system health summary.
     *
     * @return array<string, mixed>
     */
    public function getSystemHealthOverview(): array
    {
        $services = $this->getLiveServicesHealth();
        $incidents = $this->getIncidentHistory();

        $allOperational = collect($services)->every(fn ($s) => $s['status'] === 'operational');
        $avgUptime = round(collect($services)->avg('uptime_percentage'), 2);

        return [
            'status' => $allOperational ? 'all_operational' : 'degraded',
            'status_label' => $allOperational ? 'All Systems Operational' : 'Degraded Performance',
            'average_uptime' => $avgUptime,
            'services' => $services,
            'incidents' => $incidents,
            'last_updated' => now()->toIso8601String(),
        ];
    }
}
