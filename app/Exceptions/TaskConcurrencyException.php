<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TaskConcurrencyException extends Exception
{
    public function __construct(
        public int $expectedVersion,
        public int $currentVersion,
        string $message = 'Tugas telah diperbarui oleh pengguna lain. Silakan muat ulang papan atau daftar tugas.',
        int $code = 409
    ) {
        parent::__construct($message, $code);
    }

    /**
     * Render the exception into an HTTP response.
     */
    public function render(Request $request): JsonResponse|Response
    {
        if ($request->expectsJson() || $request->header('X-Inertia')) {
            return response()->json([
                'error' => [
                    'code' => 'TASK_VERSION_CONFLICT',
                    'message' => $this->getMessage(),
                    'details' => [
                        'expected_version' => $this->expectedVersion,
                        'current_version' => $this->currentVersion,
                    ],
                ],
            ], 409);
        }

        return back()->with('error', $this->getMessage());
    }
}
