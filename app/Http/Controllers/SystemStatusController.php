<?php

namespace App\Http\Controllers;

use App\Services\System\SystemStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SystemStatusController extends Controller
{
    public function __construct(
        protected SystemStatusService $statusService
    ) {}

    /**
     * Display the System Status and Health Dashboard.
     */
    public function index(Request $request): Response
    {
        $overview = $this->statusService->getSystemHealthOverview();

        return Inertia::render('system/status', [
            'overview' => $overview,
        ]);
    }

    /**
     * Public JSON health-check endpoint for synthetic monitoring.
     */
    public function healthApi(): JsonResponse
    {
        $overview = $this->statusService->getSystemHealthOverview();

        return response()->json([
            'status' => $overview['status'],
            'status_label' => $overview['status_label'],
            'average_uptime' => $overview['average_uptime'],
            'timestamp' => now()->toIso8601String(),
            'services' => $overview['services'],
        ]);
    }
}
