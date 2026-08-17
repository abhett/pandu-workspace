<?php

namespace App\Jobs;

use App\Models\WebhookDelivery;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Throwable;

class DispatchWebhookJob implements ShouldQueue
{
    use Queueable;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @return array<int, int>
     */
    public function backoff(): array
    {
        return [10, 60, 300];
    }

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $deliveryId
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $delivery = WebhookDelivery::with('subscription')->find($this->deliveryId);

        if (! $delivery || ! $delivery->subscription || ! $delivery->subscription->active) {
            return;
        }

        $subscription = $delivery->subscription;
        $timestamp = (string) now()->timestamp;
        $payloadJson = json_encode($delivery->payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        // Compute HMAC-SHA256 signature
        $signature = 'v1='.hash_hmac('sha256', "{$timestamp}.{$payloadJson}", $subscription->secret);

        $headers = array_merge([
            'Content-Type' => 'application/json',
            'User-Agent' => 'Pandu-WMS-Webhook/1.0',
            'X-WMS-Event-Id' => $delivery->event_id,
            'X-WMS-Event-Type' => $delivery->event_type,
            'X-WMS-Timestamp' => $timestamp,
            'X-WMS-Signature' => $signature,
        ], $subscription->headers ?? []);

        $startTime = microtime(true);

        try {
            $response = Http::withHeaders($headers)
                ->timeout(10)
                ->withBody($payloadJson, 'application/json')
                ->post($subscription->url);

            $durationMs = (int) round((microtime(true) - $startTime) * 1000);
            $statusCode = $response->status();
            $body = substr($response->body(), 0, 5000);

            if ($response->successful()) {
                $delivery->update([
                    'status' => 'success',
                    'response_code' => $statusCode,
                    'response_body' => $body,
                    'duration_ms' => $durationMs,
                    'delivered_at' => now(),
                    'error_message' => null,
                ]);
            } else {
                $this->handleFailure($delivery, $statusCode, $body, "HTTP status code {$statusCode}", $durationMs);
            }
        } catch (Throwable $e) {
            $durationMs = (int) round((microtime(true) - $startTime) * 1000);
            $this->handleFailure($delivery, null, null, $e->getMessage(), $durationMs);

            throw $e;
        }
    }

    /**
     * Handle delivery failure.
     */
    protected function handleFailure(
        WebhookDelivery $delivery,
        ?int $statusCode,
        ?string $body,
        string $errorMessage,
        int $durationMs
    ): void {
        $delivery->update([
            'attempt' => $delivery->attempt + 1,
            'status' => 'failed',
            'response_code' => $statusCode,
            'response_body' => $body,
            'duration_ms' => $durationMs,
            'error_message' => $errorMessage,
            'next_attempt_at' => now()->addSeconds(60),
        ]);
    }
}
