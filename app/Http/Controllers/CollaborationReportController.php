<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Services\Reports\CollaborationReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CollaborationReportController extends Controller
{
    public function __construct(
        protected CollaborationReportService $reportService
    ) {}

    /**
     * Display the Team Collaboration Performance & Velocity Hub.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $projectId = $request->query('project_id');
        $data = $this->reportService->getCollaborationOverview($organization, $projectId);

        return Inertia::render('reports/collaboration', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'data' => $data,
        ]);
    }

    /**
     * Export collaboration report data as CSV.
     */
    public function export(Request $request): StreamedResponse|JsonResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $projectId = $request->query('project_id');
        $data = $this->reportService->getCollaborationOverview($organization, $projectId);

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="collaboration-report-'.now()->format('Y-m-d').'.csv"',
        ];

        return response()->stream(function () use ($data) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Member Name', 'Email', 'Role', 'Assigned Tasks', 'Completed Tasks', 'Velocity Points', 'Completion Rate (%)']);

            foreach ($data['members'] as $member) {
                fputcsv($handle, [
                    $member['name'],
                    $member['email'],
                    $member['role'],
                    $member['assigned_tasks'],
                    $member['completed_tasks'],
                    $member['velocity_points'],
                    $member['completion_rate'],
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }
}
