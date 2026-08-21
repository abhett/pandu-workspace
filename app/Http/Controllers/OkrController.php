<?php

namespace App\Http\Controllers;

use App\Models\OkrKeyResult;
use App\Models\OkrObjective;
use App\Models\Organization;
use App\Models\Task;
use App\Services\Okr\OkrAlignmentTreeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OkrController extends Controller
{
    public function __construct(
        protected OkrAlignmentTreeService $okrService
    ) {}

    protected function authorizeOrgAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_okrs' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin mengubah sasaran strategis OKR.');
        }

        return $organization;
    }

    /**
     * Display Multi-Tier Goal & OKR Alignment Tree Visualizer.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeOrgAccess($request, 'view');
        $period = $request->query('period');

        $data = $this->okrService->getOkrTreeData($organization, $period);

        return Inertia::render('organization/okrs/tree', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'tree' => $data['tree'],
            'flat_objectives' => $data['flat_objectives'],
            'periods' => $data['periods'],
            'current_period' => $data['current_period'],
            'projects' => $data['projects'],
            'members' => $data['members'],
        ]);
    }

    /**
     * Store a new strategic objective.
     */
    public function storeObjective(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_okrs');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'level' => ['required', 'string', 'in:company,department,team,project'],
            'period' => ['required', 'string', 'max:50'],
            'parent_id' => ['nullable', 'string'],
            'project_id' => ['nullable', 'string'],
            'owner_id' => ['nullable', 'integer', 'exists:users,id'],
            'confidence_score' => ['nullable', 'numeric', 'min:0', 'max:1'],
        ]);

        $objective = $this->okrService->createObjective($organization, $request->user(), $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Sasaran strategis berhasil dibuat.',
                'objective' => $objective,
            ], 201);
        }

        return back()->with('success', 'Sasaran strategis berhasil dibuat.');
    }

    /**
     * Update an existing objective.
     */
    public function updateObjective(Request $request, OkrObjective $objective): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_okrs');

        if ($objective->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'level' => ['required', 'string', 'in:company,department,team,project'],
            'period' => ['required', 'string', 'max:50'],
            'parent_id' => ['nullable', 'string'],
            'project_id' => ['nullable', 'string'],
            'owner_id' => ['nullable', 'integer', 'exists:users,id'],
            'confidence_score' => ['nullable', 'numeric', 'min:0', 'max:1'],
        ]);

        $updated = $this->okrService->updateObjective($objective, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Sasaran strategis berhasil diperbarui.',
                'objective' => $updated,
            ]);
        }

        return back()->with('success', 'Sasaran strategis berhasil diperbarui.');
    }

    /**
     * Delete an objective.
     */
    public function destroyObjective(Request $request, OkrObjective $objective): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_okrs');

        if ($objective->organization_id !== $organization->id) {
            abort(404);
        }

        $this->okrService->deleteObjective($objective);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Sasaran strategis berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Sasaran strategis berhasil dihapus.');
    }

    /**
     * Store a new key result under an objective.
     */
    public function storeKeyResult(Request $request, OkrObjective $objective): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_okrs');

        if ($objective->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'metric_type' => ['required', 'string', 'in:percentage,numeric,currency,boolean'],
            'initial_value' => ['required', 'numeric'],
            'current_value' => ['required', 'numeric'],
            'target_value' => ['required', 'numeric'],
            'unit' => ['nullable', 'string', 'max:50'],
            'weight' => ['nullable', 'numeric', 'min:0.1', 'max:5.0'],
            'owner_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $kr = $this->okrService->createKeyResult($objective, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Key Result berhasil ditambahkan.',
                'key_result' => $kr,
            ], 201);
        }

        return back()->with('success', 'Key Result berhasil ditambahkan.');
    }

    /**
     * Update an existing key result.
     */
    public function updateKeyResult(Request $request, OkrKeyResult $keyResult): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_okrs');

        if ($keyResult->objective->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'metric_type' => ['sometimes', 'required', 'string', 'in:percentage,numeric,currency,boolean'],
            'initial_value' => ['sometimes', 'required', 'numeric'],
            'current_value' => ['sometimes', 'required', 'numeric'],
            'target_value' => ['sometimes', 'required', 'numeric'],
            'unit' => ['nullable', 'string', 'max:50'],
            'weight' => ['nullable', 'numeric', 'min:0.1', 'max:5.0'],
            'owner_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $updated = $this->okrService->updateKeyResult($keyResult, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Progres Key Result berhasil diperbarui.',
                'key_result' => $updated,
            ]);
        }

        return back()->with('success', 'Progres Key Result berhasil diperbarui.');
    }

    /**
     * Delete a key result.
     */
    public function destroyKeyResult(Request $request, OkrKeyResult $keyResult): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_okrs');

        if ($keyResult->objective->organization_id !== $organization->id) {
            abort(404);
        }

        $this->okrService->deleteKeyResult($keyResult);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Key Result berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Key Result berhasil dihapus.');
    }

    /**
     * Link a project task to a key result.
     */
    public function linkTask(Request $request, OkrKeyResult $keyResult): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_okrs');

        if ($keyResult->objective->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'task_id' => ['required', 'string', 'exists:tasks,id'],
        ]);

        $task = Task::where('organization_id', $organization->id)->where('id', $validated['task_id'])->firstOrFail();
        $this->okrService->linkTask($keyResult, $task);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Tugas proyek berhasil ditautkan ke Key Result.',
            ]);
        }

        return back()->with('success', 'Tugas proyek berhasil ditautkan ke Key Result.');
    }

    /**
     * Unlink a project task from a key result.
     */
    public function unlinkTask(Request $request, OkrKeyResult $keyResult, Task $task): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_okrs');

        if ($keyResult->objective->organization_id !== $organization->id || $task->organization_id !== $organization->id) {
            abort(404);
        }

        $this->okrService->unlinkTask($keyResult, $task);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Tautan tugas berhasil dilepaskan.',
            ]);
        }

        return back()->with('success', 'Tautan tugas berhasil dilepaskan.');
    }
}
