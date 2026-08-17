<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\WebhookDeliveryResource;
use App\Http\Resources\Api\V1\WebhookSubscriptionResource;
use App\Models\Organization;
use App\Models\WebhookSubscription;
use App\Services\Webhook\WebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WebhookController extends Controller
{
    public function __construct(
        protected WebhookService $webhookService
    ) {}

    /**
     * List all webhook subscriptions for the organization.
     */
    public function index(Request $request): JsonResponse
    {
        $org = $request->attributes->get('current_organization');

        if (! $org) {
            return response()->json([
                'error' => [
                    'code' => 'ORGANIZATION_REQUIRED',
                    'message' => 'No active organization context found.',
                ],
            ], 400);
        }

        $subscriptions = WebhookSubscription::where('organization_id', $org->id)
            ->latest('created_at')
            ->get();

        return response()->json([
            'data' => WebhookSubscriptionResource::collection($subscriptions),
        ]);
    }

    /**
     * Create a new webhook subscription.
     */
    public function store(Request $request): JsonResponse
    {
        $org = $request->attributes->get('current_organization');

        if (! $org) {
            return response()->json([
                'error' => [
                    'code' => 'ORGANIZATION_REQUIRED',
                    'message' => 'No active organization context found.',
                ],
            ], 400);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'url' => ['required', 'url', 'max:1000'],
            'events' => ['required', 'array', 'min:1'],
            'events.*' => ['string'],
            'project_id' => ['nullable', 'string', 'exists:projects,id'],
            'active' => ['nullable', 'boolean'],
            'headers' => ['nullable', 'array'],
        ]);

        $secret = 'whsec_'.Str::random(32);

        $subscription = WebhookSubscription::create([
            'organization_id' => $org->id,
            'project_id' => $validated['project_id'] ?? null,
            'name' => $validated['name'],
            'url' => $validated['url'],
            'secret' => $secret,
            'events' => $validated['events'],
            'active' => $validated['active'] ?? true,
            'headers' => $validated['headers'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => (new WebhookSubscriptionResource($subscription))->resolve(),
            'secret' => $secret,
            'meta' => [
                'warning' => 'Store the signing secret securely. It is used to verify HMAC-SHA256 signatures.',
            ],
        ], 201);
    }

    /**
     * Get details of a webhook subscription.
     */
    public function show(Request $request, WebhookSubscription $webhook): JsonResponse
    {
        $this->authorizeWebhookAccess($request, $webhook);

        return response()->json([
            'data' => new WebhookSubscriptionResource($webhook),
        ]);
    }

    /**
     * Update a webhook subscription.
     */
    public function update(Request $request, WebhookSubscription $webhook): JsonResponse
    {
        $this->authorizeWebhookAccess($request, $webhook);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'url' => ['sometimes', 'required', 'url', 'max:1000'],
            'events' => ['sometimes', 'required', 'array', 'min:1'],
            'events.*' => ['string'],
            'active' => ['sometimes', 'boolean'],
            'headers' => ['nullable', 'array'],
        ]);

        $webhook->update($validated);

        return response()->json([
            'data' => new WebhookSubscriptionResource($webhook),
        ]);
    }

    /**
     * Delete a webhook subscription.
     */
    public function destroy(Request $request, WebhookSubscription $webhook): JsonResponse
    {
        $this->authorizeWebhookAccess($request, $webhook);

        $webhook->delete();

        return response()->json([
            'message' => 'Webhook subscription deleted successfully.',
        ]);
    }

    /**
     * Rotate signing secret.
     */
    public function rotateSecret(Request $request, WebhookSubscription $webhook): JsonResponse
    {
        $this->authorizeWebhookAccess($request, $webhook);

        $newSecret = $this->webhookService->rotateSecret($webhook);

        return response()->json([
            'message' => 'Signing secret rotated successfully.',
            'secret' => $newSecret,
        ]);
    }

    /**
     * View delivery history for a webhook.
     */
    public function deliveries(Request $request, WebhookSubscription $webhook): JsonResponse
    {
        $this->authorizeWebhookAccess($request, $webhook);

        $deliveries = $webhook->deliveries()->limit(50)->get();

        return response()->json([
            'data' => WebhookDeliveryResource::collection($deliveries),
        ]);
    }

    /**
     * Send a test webhook ping.
     */
    public function test(Request $request, WebhookSubscription $webhook): JsonResponse
    {
        $this->authorizeWebhookAccess($request, $webhook);

        $delivery = $this->webhookService->testWebhook($webhook);

        return response()->json([
            'message' => 'Test webhook dispatched.',
            'delivery' => new WebhookDeliveryResource($delivery),
        ]);
    }

    protected function authorizeWebhookAccess(Request $request, WebhookSubscription $webhook): void
    {
        $isMember = $request->user()->organizations()
            ->where('organizations.id', $webhook->organization_id)
            ->wherePivot('status', 'active')
            ->exists();

        if (! $isMember) {
            abort(403, 'You do not have access to this webhook subscription.');
        }
    }
}
