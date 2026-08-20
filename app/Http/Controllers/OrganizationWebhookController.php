<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\WebhookDelivery;
use App\Models\WebhookSubscription;
use App\Services\Webhook\WebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationWebhookController extends Controller
{
    public function __construct(
        protected WebhookService $webhookService
    ) {}

    /**
     * Authorize user access to organization webhooks management.
     */
    protected function authorizeWebhookAccess(Request $request): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin']) && ! $user->hasPermissionInOrganization($organization, 'org:manage')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengelola webhook organisasi.');
        }

        return $organization;
    }

    /**
     * Display Organization Outbound Webhooks Management page.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeWebhookAccess($request);

        $webhooks = WebhookSubscription::where('organization_id', $organization->id)
            ->with(['project:id,name,key'])
            ->withCount([
                'deliveries',
                'deliveries as successful_deliveries_count' => function ($q) {
                    $q->where('status', 'success');
                },
                'deliveries as failed_deliveries_count' => function ($q) {
                    $q->where('status', 'failed');
                },
            ])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (WebhookSubscription $w) => [
                'id' => $w->id,
                'name' => $w->name,
                'url' => $w->url,
                'secret' => $w->secret,
                'events' => $w->events ?? [],
                'active' => (bool) $w->active,
                'headers' => $w->headers ?? [],
                'project' => $w->project ? [
                    'id' => $w->project->id,
                    'name' => $w->project->name,
                    'key' => $w->project->key,
                ] : null,
                'deliveries_count' => $w->deliveries_count,
                'successful_deliveries_count' => $w->successful_deliveries_count,
                'failed_deliveries_count' => $w->failed_deliveries_count,
                'created_at_formatted' => $w->created_at?->translatedFormat('d M Y H:i'),
            ]);

        $stats = $this->webhookService->getStats($organization);
        $availableEvents = $this->webhookService->getAvailableEvents();
        $projects = Project::where('organization_id', $organization->id)->select(['id', 'name', 'key'])->get();

        return Inertia::render('organization/webhooks/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'webhooks' => $webhooks,
            'stats' => $stats,
            'available_events' => $availableEvents,
            'projects' => $projects,
        ]);
    }

    /**
     * Store a newly created webhook subscription.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeWebhookAccess($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'url' => ['required', 'url', 'max:500'],
            'events' => ['required', 'array', 'min:1'],
            'events.*' => ['string'],
            'project_id' => ['nullable', 'string', 'exists:projects,id'],
            'active' => ['boolean'],
            'headers' => ['nullable', 'array'],
        ]);

        $subscription = WebhookSubscription::create([
            'organization_id' => $organization->id,
            'project_id' => $validated['project_id'] ?? null,
            'name' => $validated['name'],
            'url' => $validated['url'],
            'secret' => 'whsec_'.Str::random(32),
            'events' => $validated['events'],
            'active' => $validated['active'] ?? true,
            'headers' => $validated['headers'] ?? [],
            'created_by' => $request->user()->id,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Endpoint webhook berhasil didaftarkan.',
                'webhook' => $subscription,
            ], 201);
        }

        return redirect()->route('organization.webhooks.index')->with('success', 'Endpoint webhook berhasil didaftarkan.');
    }

    /**
     * Update an existing webhook subscription.
     */
    public function update(Request $request, WebhookSubscription $webhook): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeWebhookAccess($request);

        if ($webhook->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'url' => ['required', 'url', 'max:500'],
            'events' => ['required', 'array', 'min:1'],
            'events.*' => ['string'],
            'project_id' => ['nullable', 'string', 'exists:projects,id'],
            'active' => ['boolean'],
            'headers' => ['nullable', 'array'],
        ]);

        $webhook->update($validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Konfigurasi webhook berhasil diperbarui.',
                'webhook' => $webhook->fresh(),
            ]);
        }

        return redirect()->route('organization.webhooks.index')->with('success', 'Konfigurasi webhook berhasil diperbarui.');
    }

    /**
     * Delete a webhook subscription.
     */
    public function destroy(Request $request, WebhookSubscription $webhook): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeWebhookAccess($request);

        if ($webhook->organization_id !== $organization->id) {
            abort(404);
        }

        $webhook->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Endpoint webhook berhasil dihapus.',
            ]);
        }

        return redirect()->route('organization.webhooks.index')->with('success', 'Endpoint webhook berhasil dihapus.');
    }

    /**
     * Rotate signing secret for webhook subscription.
     */
    public function rotateSecret(Request $request, WebhookSubscription $webhook): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeWebhookAccess($request);

        if ($webhook->organization_id !== $organization->id) {
            abort(404);
        }

        $newSecret = $this->webhookService->rotateSecret($webhook);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Signing secret berhasil diperbarui.',
                'secret' => $newSecret,
            ]);
        }

        return back()->with('success', 'Signing secret berhasil diperbarui.');
    }

    /**
     * Dispatch ping test webhook.
     */
    public function test(Request $request, WebhookSubscription $webhook): JsonResponse
    {
        $organization = $this->authorizeWebhookAccess($request);

        if ($webhook->organization_id !== $organization->id) {
            abort(404);
        }

        $delivery = $this->webhookService->testWebhook($webhook);

        return response()->json([
            'success' => true,
            'message' => 'Uji coba pengiriman webhook (ping) berhasil dikirim ke antrean.',
            'delivery' => $delivery,
        ]);
    }

    /**
     * Get recent delivery logs for a webhook subscription.
     */
    public function deliveries(Request $request, WebhookSubscription $webhook): JsonResponse
    {
        $organization = $this->authorizeWebhookAccess($request);

        if ($webhook->organization_id !== $organization->id) {
            abort(404);
        }

        $deliveries = WebhookDelivery::where('webhook_subscription_id', $webhook->id)
            ->orderByDesc('created_at')
            ->limit(25)
            ->get()
            ->map(fn (WebhookDelivery $d) => [
                'id' => $d->id,
                'event_id' => $d->event_id,
                'event_type' => $d->event_type,
                'status' => $d->status,
                'response_code' => $d->response_code,
                'duration_ms' => $d->duration_ms,
                'attempt' => $d->attempt,
                'payload' => $d->payload,
                'response_body' => $d->response_body,
                'error_message' => $d->error_message,
                'delivered_at_formatted' => $d->delivered_at?->translatedFormat('d M Y H:i:s'),
                'created_at_formatted' => $d->created_at?->translatedFormat('d M Y H:i:s'),
            ]);

        return response()->json([
            'success' => true,
            'deliveries' => $deliveries,
        ]);
    }

    /**
     * Re-deliver a historical webhook delivery payload.
     */
    public function redeliver(Request $request, WebhookDelivery $delivery): JsonResponse
    {
        $organization = $this->authorizeWebhookAccess($request);

        if ($delivery->subscription?->organization_id !== $organization->id) {
            abort(404);
        }

        $newDelivery = $this->webhookService->redeliver($delivery);

        return response()->json([
            'success' => true,
            'message' => 'Muatan payload berhasil dijadwalkan untuk pengiriman ulang.',
            'delivery' => $newDelivery,
        ]);
    }
}
