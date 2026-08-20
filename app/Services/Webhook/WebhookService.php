<?php

namespace App\Services\Webhook;

use App\Jobs\DispatchWebhookJob;
use App\Models\Organization;
use App\Models\Project;
use App\Models\WebhookDelivery;
use App\Models\WebhookSubscription;
use Illuminate\Support\Str;

class WebhookService
{
    /**
     * Dispatch webhooks for an event across an organization.
     *
     * @param  array<string, mixed>  $data
     * @return array<int, WebhookDelivery>
     */
    public function dispatch(
        string $eventType,
        array $data,
        Organization $organization,
        ?Project $project = null
    ): array {
        $query = WebhookSubscription::where('organization_id', $organization->id)
            ->where('active', true);

        if ($project) {
            $query->where(function ($q) use ($project) {
                $q->whereNull('project_id')->orWhere('project_id', $project->id);
            });
        }

        $subscriptions = $query->get();
        $deliveries = [];

        foreach ($subscriptions as $subscription) {
            if (! $subscription->matchesEvent($eventType)) {
                continue;
            }

            $eventId = (string) Str::uuid7();
            $payload = [
                'id' => $eventId,
                'type' => $eventType,
                'occurred_at' => now()->toIso8601String(),
                'organization_id' => $organization->id,
                'project_id' => $project?->id,
                'data' => $data,
            ];

            $delivery = WebhookDelivery::create([
                'webhook_subscription_id' => $subscription->id,
                'event_id' => $eventId,
                'event_type' => $eventType,
                'payload' => $payload,
                'attempt' => 1,
                'status' => 'pending',
            ]);

            DispatchWebhookJob::dispatch($delivery->id);
            $deliveries[] = $delivery;
        }

        return $deliveries;
    }

    /**
     * Rotate the signing secret for a webhook subscription.
     */
    public function rotateSecret(WebhookSubscription $subscription): string
    {
        $newSecret = 'whsec_'.Str::random(32);
        $subscription->update(['secret' => $newSecret]);

        return $newSecret;
    }

    /**
     * Send a ping/test webhook delivery.
     */
    public function testWebhook(WebhookSubscription $subscription): WebhookDelivery
    {
        $eventId = (string) Str::uuid7();
        $payload = [
            'id' => $eventId,
            'type' => 'ping',
            'occurred_at' => now()->toIso8601String(),
            'organization_id' => $subscription->organization_id,
            'project_id' => $subscription->project_id,
            'data' => [
                'message' => 'This is a test webhook payload from Pandu Work Management System.',
                'subscription_id' => $subscription->id,
            ],
        ];

        $delivery = WebhookDelivery::create([
            'webhook_subscription_id' => $subscription->id,
            'event_id' => $eventId,
            'event_type' => 'ping',
            'payload' => $payload,
            'attempt' => 1,
            'status' => 'pending',
        ]);

        DispatchWebhookJob::dispatch($delivery->id);

        return $delivery;
    }

    /**
     * Re-deliver an existing webhook delivery payload.
     */
    public function redeliver(WebhookDelivery $delivery): WebhookDelivery
    {
        $newDelivery = WebhookDelivery::create([
            'webhook_subscription_id' => $delivery->webhook_subscription_id,
            'event_id' => (string) Str::uuid7(),
            'event_type' => $delivery->event_type,
            'payload' => $delivery->payload,
            'attempt' => 1,
            'status' => 'pending',
        ]);

        DispatchWebhookJob::dispatch($newDelivery->id);

        return $newDelivery;
    }

    /**
     * Get system supported webhook events list.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getAvailableEvents(): array
    {
        return [
            [
                'category' => 'Tasks & Issues',
                'events' => [
                    ['id' => 'task.created', 'name' => 'Tugas Dibuat', 'description' => 'Dipicu saat tugas baru dibuat dalam proyek.'],
                    ['id' => 'task.updated', 'name' => 'Tugas Diperbarui', 'description' => 'Dipicu saat detail tugas (judul, prioritas, estimasi) diubah.'],
                    ['id' => 'task.status_changed', 'name' => 'Status Tugas Berubah', 'description' => 'Dipicu saat tugas berpindah kolom alur kerja Kanban.'],
                    ['id' => 'task.deleted', 'name' => 'Tugas Dihapus', 'description' => 'Dipicu saat tugas dihapus atau diarsipkan.'],
                    ['id' => 'task.commented', 'name' => 'Komentar Tugas Ditambahkan', 'description' => 'Dipicu saat anggota tim mengirim komentar pada tugas.'],
                ],
            ],
            [
                'category' => 'Scrum & Sprints',
                'events' => [
                    ['id' => 'sprint.started', 'name' => 'Sprint Dimulai', 'description' => 'Dipicu saat sprint baru diaktifkan oleh Scrum Master.'],
                    ['id' => 'sprint.completed', 'name' => 'Sprint Selesai', 'description' => 'Dipicu saat sprint ditutup dan dirangkum.'],
                ],
            ],
            [
                'category' => 'Releases & Roadmaps',
                'events' => [
                    ['id' => 'release.published', 'name' => 'Rilis Diterbitkan', 'description' => 'Dipicu saat versi rilis baru dipublikasikan.'],
                    ['id' => 'milestone.reached', 'name' => 'Milestone Tercapai', 'description' => 'Dipicu saat milestone proyek berhasil diselesaikan.'],
                ],
            ],
            [
                'category' => 'Team & Organization',
                'events' => [
                    ['id' => 'member.invited', 'name' => 'Anggota Diundang', 'description' => 'Dipicu saat undangan anggota organisasi baru dikirim.'],
                    ['id' => 'member.role_changed', 'name' => 'Peran Anggota Berubah', 'description' => 'Dipicu saat hak akses atau peran anggota diperbarui.'],
                ],
            ],
        ];
    }

    /**
     * Get aggregate delivery metrics for an organization.
     *
     * @return array<string, mixed>
     */
    public function getStats(Organization $organization): array
    {
        $subscriptionIds = WebhookSubscription::where('organization_id', $organization->id)->pluck('id');

        $totalDeliveries = WebhookDelivery::whereIn('webhook_subscription_id', $subscriptionIds)->count();
        $successfulDeliveries = WebhookDelivery::whereIn('webhook_subscription_id', $subscriptionIds)
            ->where('status', 'success')
            ->count();
        $failedDeliveries = WebhookDelivery::whereIn('webhook_subscription_id', $subscriptionIds)
            ->where('status', 'failed')
            ->count();

        $avgDuration = (int) round(
            WebhookDelivery::whereIn('webhook_subscription_id', $subscriptionIds)
                ->whereNotNull('duration_ms')
                ->avg('duration_ms') ?? 0
        );

        $successRate = $totalDeliveries > 0
            ? round(($successfulDeliveries / $totalDeliveries) * 100, 1)
            : 100.0;

        return [
            'total_subscriptions' => $subscriptionIds->count(),
            'active_subscriptions' => WebhookSubscription::where('organization_id', $organization->id)->where('active', true)->count(),
            'total_deliveries' => $totalDeliveries,
            'successful_deliveries' => $successfulDeliveries,
            'failed_deliveries' => $failedDeliveries,
            'success_rate' => $successRate,
            'avg_duration_ms' => $avgDuration,
        ];
    }
}
