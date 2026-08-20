<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\ProjectExpense;
use App\Models\Task;
use App\Services\Budget\ProjectBudgetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectBudgetController extends Controller
{
    public function __construct(
        protected ProjectBudgetService $budgetService
    ) {}

    /**
     * Authorize user access to project budget.
     */
    protected function authorizeProjectAccess(Request $request, Project $project, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($project->organization_id !== $organization->id) {
            abort(404);
        }

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke proyek ini.');
        }

        if ($action === 'manage_budget' && in_array($role, ['member', 'guest'])) {
            abort(403, 'Role Anda tidak memiliki izin untuk mengelola anggaran proyek.');
        }

        if ($action === 'approve_expense' && in_array($role, ['member', 'guest'])) {
            abort(403, 'Hanya Project Lead atau Administrator yang dapat menyetujui klaim pengeluaran.');
        }

        return $organization;
    }

    /**
     * Display Project Budgeting & Financial Cost Dashboard.
     */
    public function index(Request $request, Project $project): Response
    {
        $organization = $this->authorizeProjectAccess($request, $project, 'view');

        $summary = $this->budgetService->getBudgetSummary($project);

        $members = $project->members()
            ->select(['users.id', 'users.name', 'users.email'])
            ->get();

        $tasks = Task::where('project_id', $project->id)
            ->select(['id', 'key', 'title'])
            ->orderBy('sequence_number')
            ->get();

        return Inertia::render('projects/budget', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
                'slug' => $project->slug,
                'color' => $project->color,
                'icon' => $project->icon,
            ],
            'summary' => $summary,
            'members' => $members,
            'tasks' => $tasks,
        ]);
    }

    /**
     * Store or update project budget parameters.
     */
    public function storeOrUpdateBudget(Request $request, Project $project): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_budget');

        $validated = $request->validate([
            'total_budget' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'max:10'],
            'budget_type' => ['required', 'string', 'in:fixed,time_and_materials,monthly_recurring'],
            'capex_amount' => ['nullable', 'numeric', 'min:0'],
            'opex_amount' => ['nullable', 'numeric', 'min:0'],
            'alert_threshold_percent' => ['required', 'integer', 'min:1', 'max:100'],
        ]);

        $budget = $this->budgetService->setOrUpdateBudget($project, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Alokasi anggaran proyek berhasil disimpan.',
                'budget' => $budget,
            ]);
        }

        return back()->with('success', 'Alokasi anggaran proyek berhasil disimpan.');
    }

    /**
     * Store or update member hourly rate.
     */
    public function storeMemberRate(Request $request, Project $project): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_budget');

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'hourly_rate' => ['required', 'numeric', 'min:0'],
            'billing_role' => ['nullable', 'string', 'max:100'],
        ]);

        $rate = $this->budgetService->setMemberRate(
            $project,
            (int) $validated['user_id'],
            (float) $validated['hourly_rate'],
            $validated['billing_role'] ?? null
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Tarif kerja anggota tim berhasil diperbarui.',
                'rate' => $rate,
            ]);
        }

        return back()->with('success', 'Tarif kerja anggota tim berhasil diperbarui.');
    }

    /**
     * Log work time on a task with labor cost calculation.
     */
    public function storeWorklog(Request $request, Project $project): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'view');

        $validated = $request->validate([
            'task_id' => ['required', 'string', 'exists:tasks,id'],
            'duration_minutes' => ['required', 'integer', 'min:1', 'max:1440'],
            'work_date' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $task = Task::where('project_id', $project->id)->where('id', $validated['task_id'])->firstOrFail();

        $worklog = $this->budgetService->logWorkTime(
            $task,
            $request->user(),
            (int) $validated['duration_minutes'],
            $validated['work_date'],
            $validated['description'] ?? null
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Log waktu kerja dan kalkulasi biaya berhasil dicatat.',
                'worklog' => $worklog,
            ], 201);
        }

        return back()->with('success', 'Log waktu kerja dan kalkulasi biaya berhasil dicatat.');
    }

    /**
     * Submit a project expense claim.
     */
    public function storeExpense(Request $request, Project $project): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'view');

        $validated = $request->validate([
            'category' => ['required', 'string', 'in:software_license,cloud_hosting,hardware_equipment,consulting,travel_meals,other'],
            'title' => ['required', 'string', 'max:150'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency' => ['nullable', 'string', 'max:10'],
            'expense_date' => ['required', 'date'],
            'vendor' => ['nullable', 'string', 'max:150'],
            'receipt_url' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $expense = $this->budgetService->submitExpense($project, $request->user(), $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Pengajuan pengeluaran berhasil dikirim.',
                'expense' => $expense,
            ], 201);
        }

        return back()->with('success', 'Pengajuan pengeluaran berhasil dikirim.');
    }

    /**
     * Approve a project expense.
     */
    public function approveExpense(Request $request, Project $project, ProjectExpense $expense): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'approve_expense');

        if ($expense->project_id !== $project->id) {
            abort(404);
        }

        $approvedExpense = $this->budgetService->approveExpense($expense, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Klaim pengeluaran berhasil disetujui.',
                'expense' => $approvedExpense,
            ]);
        }

        return back()->with('success', 'Klaim pengeluaran berhasil disetujui.');
    }

    /**
     * Reject a project expense.
     */
    public function rejectExpense(Request $request, Project $project, ProjectExpense $expense): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'approve_expense');

        if ($expense->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $rejectedExpense = $this->budgetService->rejectExpense($expense, $request->user(), $validated['reason']);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Klaim pengeluaran ditolak.',
                'expense' => $rejectedExpense,
            ]);
        }

        return back()->with('success', 'Klaim pengeluaran ditolak.');
    }

    /**
     * Delete an expense record.
     */
    public function destroyExpense(Request $request, Project $project, ProjectExpense $expense): JsonResponse|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project, 'manage_budget');

        if ($expense->project_id !== $project->id) {
            abort(404);
        }

        $expense->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Catatan pengeluaran berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Catatan pengeluaran berhasil dihapus.');
    }
}
