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
}
