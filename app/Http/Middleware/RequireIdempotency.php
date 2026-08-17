<?php

namespace App\Http\Middleware;

use App\Models\IdempotencyKey;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class RequireIdempotency
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (SymfonyResponse)  $next
     */
    public function handle(Request $request, Closure $next): SymfonyResponse
    {
        $idempotencyKey = $request->header('Idempotency-Key') ?? $request->header('X-Idempotency-Key');

        // Only enforce for state-changing HTTP methods or when header is explicitly passed
        if (! $idempotencyKey) {
            return $next($request);
        }

        $user = $request->user();
        $org = $request->attributes->get('current_organization');
        $orgId = $org?->id;
        $userId = $user?->id;

        $method = $request->method();
        $path = $request->path();
        $checksum = hash('sha256', $method.'|'.$request->fullUrl().'|'.$request->getContent());

        $existing = IdempotencyKey::where('key', $idempotencyKey)
            ->where(function ($q) use ($orgId, $userId) {
                if ($orgId) {
                    $q->where('organization_id', $orgId);
                } elseif ($userId) {
                    $q->where('user_id', $userId);
                }
            })
            ->first();

        if ($existing) {
            if ($existing->status === 'processing') {
                return response()->json([
                    'error' => [
                        'code' => 'IDEMPOTENCY_KEY_IN_FLIGHT',
                        'message' => 'An identical request with this Idempotency-Key is currently being processed.',
                    ],
                ], 409);
            }

            if ($existing->request_checksum !== $checksum) {
                return response()->json([
                    'error' => [
                        'code' => 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PARAMS',
                        'message' => 'This Idempotency-Key was previously used with different request parameters.',
                    ],
                ], 422);
            }

            // Replay the previous response
            $headers = $existing->response_headers ?? [];
            $headers['X-Idempotent-Replayed'] = 'true';

            return response(
                $existing->response_body,
                $existing->response_status ?? 200,
                $headers
            );
        }

        // Lock the key in processing state
        $record = IdempotencyKey::create([
            'key' => $idempotencyKey,
            'organization_id' => $orgId,
            'user_id' => $userId,
            'request_method' => $method,
            'request_path' => $path,
            'request_checksum' => $checksum,
            'status' => 'processing',
            'expires_at' => now()->addHours(24),
        ]);

        try {
            $response = $next($request);

            // If response is successful or client-side error (not server exception)
            if ($response->getStatusCode() < 500) {
                $content = $response->getContent();
                $headersToStore = [
                    'Content-Type' => $response->headers->get('Content-Type') ?? 'application/json',
                ];

                $record->update([
                    'status' => 'completed',
                    'response_status' => $response->getStatusCode(),
                    'response_headers' => $headersToStore,
                    'response_body' => $content,
                ]);
            } else {
                // Delete failed attempt so client can retry cleanly
                $record->delete();
            }

            return $response;
        } catch (\Throwable $e) {
            $record->delete();

            throw $e;
        }
    }
}
