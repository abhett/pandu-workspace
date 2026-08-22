<?php

namespace App\Http\Controllers;

use App\Models\DistributedTrace;
use App\Models\Organization;
use App\Services\Sre\DistributedTraceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DistributedTraceController extends Controller
{
    public function __construct(
        protected DistributedTraceService $traceService
    ) {}

    protected function authorizeAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin mengelola distributed tracing.');
        }

        return $organization;
    }

    /**
     * Display the Distributed Tracing, Service Mesh Topology & Latency Profiler Studio.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeAccess($request, 'view');

        $filters = [
            'service' => $request->query('service'),
            'status' => $request->query('status'),
            'http_method' => $request->query('http_method'),
            'min_duration' => $request->query('min_duration'),
            'search' => $request->query('search'),
        ];

        $data = $this->traceService->getDashboardData($organization, $filters);

        return Inertia::render('organization/sre/traces', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'kpi' => $data['kpi'],
            'topology' => $data['topology'],
            'service_nodes' => $data['service_nodes'],
            'traces' => $data['traces'],
            'services_list' => $data['services_list'],
            'filters' => $data['filters'],
        ]);
    }

    /**
     * Store / simulate a new distributed trace.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        $validated = $request->validate([
            'scenario' => ['nullable', 'string', 'in:checkout_flow,user_auth_flow,document_export_flow,ai_inference_pipeline,failing_payment_flow'],
            'root_service' => ['nullable', 'string', 'max:100'],
            'http_method' => ['nullable', 'string', 'in:GET,POST,PUT,DELETE,PATCH'],
            'root_operation' => ['nullable', 'string', 'max:200'],
        ]);

        $trace = $this->traceService->simulateTrace($organization, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Distributed trace berhasil direkam dan disimulasikan.',
                'trace' => $trace,
            ]);
        }

        return back()->with('success', 'Distributed trace berhasil direkam.');
    }

    /**
     * Show detailed waterfall and span tree for a trace.
     */
    public function show(Request $request, DistributedTrace $trace): JsonResponse
    {
        $organization = $this->authorizeAccess($request, 'view');

        if ($trace->organization_id !== $organization->id) {
            abort(404, 'Trace tidak ditemukan.');
        }

        return response()->json([
            'success' => true,
            'trace' => $trace,
        ]);
    }

    /**
     * Delete a distributed trace.
     */
    public function destroy(Request $request, DistributedTrace $trace): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        if ($trace->organization_id !== $organization->id) {
            abort(404, 'Trace tidak ditemukan.');
        }

        $trace->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Trace record berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Trace record berhasil dihapus.');
    }
}
