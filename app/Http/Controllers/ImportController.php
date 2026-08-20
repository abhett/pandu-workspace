<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Services\Import\ImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class ImportController extends Controller
{
    public function __construct(
        protected ImportService $importService
    ) {}

    protected function authorizeImportAccess($user, $organization): void
    {
        if (! in_array($user->roleInOrganization($organization), ['owner', 'admin', 'manager']) && ! $user->hasPermissionInOrganization($organization, 'projects:create') && ! $user->hasPermissionInOrganization($organization, 'org:manage')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengimpor data proyek.');
        }
    }

    /**
     * Display the Data Import & Migration Wizard.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeImportAccess($user, $organization);

        $projects = Project::where('organization_id', $organization->id)
            ->select(['id', 'name', 'key', 'type'])
            ->get();

        return Inertia::render('import/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'projects' => $projects,
        ]);
    }

    /**
     * Upload and parse file / raw data to generate mapping recommendation.
     */
    public function upload(Request $request): JsonResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        if ($orgId) {
            $organization = Organization::find($orgId);
            if ($organization) {
                $this->authorizeImportAccess($user, $organization);
            }
        }

        $validated = $request->validate([
            'source_type' => ['required', 'string', 'in:csv,jira,trello,asana,json'],
            'file' => ['nullable', 'file', 'max:10240'], // 10MB max
            'raw_data' => ['nullable', 'string'],
        ]);

        $content = '';
        if ($request->hasFile('file')) {
            $content = file_get_contents($request->file('file')->getRealPath());
        } elseif (! empty($validated['raw_data'])) {
            $content = $validated['raw_data'];
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Silakan unggah file atau masukkan teks data impor.',
            ], 422);
        }

        try {
            $parsed = $this->importService->parseSourceData($content, $validated['source_type']);

            return response()->json([
                'success' => true,
                'data' => $parsed,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Execute the batch import into target project.
     */
    public function process(Request $request): JsonResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $this->authorizeImportAccess($user, $organization);

        $validated = $request->validate([
            'project_id' => ['required', 'string', 'exists:projects,id'],
            'source_type' => ['nullable', 'string'],
            'mappings' => ['required', 'array'],
            'rows' => ['required', 'array', 'min:1'],
        ]);

        $project = Project::where('id', $validated['project_id'])
            ->where('organization_id', $organization->id)
            ->firstOrFail();

        try {
            $result = $this->importService->executeImport(
                $organization,
                $project,
                $user,
                $validated['mappings'],
                $validated['rows'],
                $validated['source_type'] ?? 'csv'
            );

            return response()->json([
                'success' => true,
                'message' => "Berhasil mengimpor {$result['imported_rows']} tugas ke proyek {$project->name}.",
                'result' => $result,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
