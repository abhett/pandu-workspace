<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Services\Audit\AuditLogService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogController extends Controller
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

    protected function authorizeAuditAccess($user, $organization): void
    {
        if (! in_array($user->roleInOrganization($organization), ['owner', 'admin']) && ! $user->hasPermissionInOrganization($organization, 'audit:view') && ! $user->hasPermissionInOrganization($organization, 'org:manage')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat log audit.');
        }
    }

    /**
     * Display the Organization Audit Logs & Security Activity Feed.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeAuditAccess($user, $organization);

        $filters = [
            'category' => $request->input('category', 'all'),
            'status' => $request->input('status', 'all'),
            'search' => $request->input('search'),
            'days' => $request->input('days', 30),
            'per_page' => 25,
        ];

        $logs = $this->auditLogService->getLogs($organization, $filters);

        return Inertia::render('organization/audit-logs', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'logs' => $logs,
            'filters' => $filters,
        ]);
    }

    /**
     * Export filtered audit logs as a downloadable CSV file.
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeAuditAccess($user, $organization);

        $filters = [
            'category' => $request->input('category', 'all'),
            'status' => $request->input('status', 'all'),
            'search' => $request->input('search'),
            'days' => $request->input('days'),
        ];

        return $this->auditLogService->exportCsv($organization, $filters);
    }
}
