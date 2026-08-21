<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\WebhookDeliveryAttempt;
use App\Models\WebhookEndpoint;
use App\Services\Developer\WebhookDlqService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WebhookDlqController extends Controller
{
    public function __construct(
        protected WebhookDlqService $dlqService
    ) {}

    protected function authorizeDlqAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_dlq' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk mengelola Dead-Letter Queue & Webhook.');
        }

        return $organization;
    }

    /**
     * Display Webhook Dead-Letter Queue (DLQ) & Event Replay Engine.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeDlqAccess($request, 'view');
        $endpointId = $request->query('endpoint_id');
        $status = $request->query('status');
        $eventType = $request->query('event_type');

        $data = $this->dlqService->getDlqDashboard($organization, $endpointId, $status, $eventType);

        return Inertia::render('organization/developer/webhooks/dlq', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'trafficTrend' => $data['trafficTrend'],
            'attempts' => $data['attempts'],
            'endpoints' => $data['endpoints'],
            'selectedEndpointId' => $endpointId,
            'selectedStatus' => $status,
            'selectedEventType' => $eventType,
        ]);
    }

    /**
     * Replay a single failed delivery.
     */
    public function replay(Request $request, WebhookDeliveryAttempt $attempt): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeDlqAccess($request, 'manage_dlq');

        if ($attempt->organization_id !== $organization->id) {
            abort(404);
        }

        $replayed = $this->dlqService->replayDelivery($attempt, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Pengiriman webhook berhasil diputar ulang (replayed).',
                'attempt' => $replayed,
            ]);
        }

        return back()->with('success', 'Pengiriman webhook berhasil diputar ulang.');
    }

    /**
     * Bulk replay selected DLQ events.
     */
    public function bulkReplay(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeDlqAccess($request, 'manage_dlq');

        $validated = $request->validate([
            'attempt_ids' => ['required', 'array', 'min:1'],
            'attempt_ids.*' => ['required', 'uuid'],
        ]);

        $result = $this->dlqService->bulkReplayDlq($organization, $validated['attempt_ids'], $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "{$result['replayed_count']} event webhook berhasil diputar ulang.",
            ]);
        }

        return back()->with('success', "{$result['replayed_count']} event webhook berhasil diputar ulang.");
    }

    /**
     * Store a new webhook endpoint.
     */
    public function storeEndpoint(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeDlqAccess($request, 'manage_dlq');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'target_url' => ['required', 'url', 'max:500'],
            'event_subscriptions' => ['nullable'],
            'secret' => ['nullable', 'string', 'max:100'],
            'max_retries' => ['nullable', 'integer', 'min:1', 'max:10'],
            'backoff_strategy' => ['nullable', 'string', 'in:exponential,linear,fixed'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $endpoint = $this->dlqService->createEndpoint($organization, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Endpoint webhook berhasil didaftarkan.',
                'endpoint' => $endpoint,
            ], 201);
        }

        return back()->with('success', 'Endpoint webhook berhasil didaftarkan.');
    }

    /**
     * Update an existing webhook endpoint.
     */
    public function updateEndpoint(Request $request, WebhookEndpoint $endpoint): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeDlqAccess($request, 'manage_dlq');

        if ($endpoint->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'target_url' => ['required', 'url', 'max:500'],
            'event_subscriptions' => ['nullable'],
            'max_retries' => ['nullable', 'integer', 'min:1', 'max:10'],
            'backoff_strategy' => ['nullable', 'string', 'in:exponential,linear,fixed'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $updated = $this->dlqService->updateEndpoint($endpoint, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Endpoint webhook berhasil diperbarui.',
                'endpoint' => $updated,
            ]);
        }

        return back()->with('success', 'Endpoint webhook berhasil diperbarui.');
    }

    /**
     * Delete an endpoint.
     */
    public function destroyEndpoint(Request $request, WebhookEndpoint $endpoint): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeDlqAccess($request, 'manage_dlq');

        if ($endpoint->organization_id !== $organization->id) {
            abort(404);
        }

        $this->dlqService->deleteEndpoint($endpoint);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Endpoint webhook berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Endpoint webhook berhasil dihapus.');
    }

    /**
     * Purge a delivery attempt.
     */
    public function destroyAttempt(Request $request, WebhookDeliveryAttempt $attempt): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeDlqAccess($request, 'manage_dlq');

        if ($attempt->organization_id !== $organization->id) {
            abort(404);
        }

        $this->dlqService->deleteDeliveryAttempt($attempt);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Rekaman pengiriman webhook berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Rekaman pengiriman webhook berhasil dihapus.');
    }
}
