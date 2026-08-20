<?php

namespace App\Services\Budget;

use App\Models\Project;
use App\Models\ProjectBudget;
use App\Models\ProjectExpense;
use App\Models\ProjectMemberRate;
use App\Models\Task;
use App\Models\TaskWorklog;
use App\Models\User;

class ProjectBudgetService
{
    /**
     * Get aggregate budget summary and financial metrics for a project.
     *
     * @return array<string, mixed>
     */
    public function getBudgetSummary(Project $project): array
    {
        $budget = $project->budget ?: new ProjectBudget([
            'project_id' => $project->id,
            'total_budget' => 0,
            'currency' => 'IDR',
            'budget_type' => 'fixed',
            'capex_amount' => 0,
            'opex_amount' => 0,
            'alert_threshold_percent' => 85,
        ]);

        $totalLaborCost = (float) TaskWorklog::where('project_id', $project->id)->sum('calculated_cost');
        $totalApprovedExpenses = (float) ProjectExpense::where('project_id', $project->id)
            ->where('status', 'approved')
            ->sum('amount');
        $totalPendingExpenses = (float) ProjectExpense::where('project_id', $project->id)
            ->where('status', 'pending')
            ->sum('amount');

        $totalIncurredCost = $totalLaborCost + $totalApprovedExpenses;
        $totalBudget = (float) $budget->total_budget;
        $remainingBudget = $totalBudget - $totalIncurredCost;

        $burnRatePercent = $totalBudget > 0
            ? round(($totalIncurredCost / $totalBudget) * 100, 1)
            : 0.0;

        $healthStatus = 'healthy';
        if ($totalBudget <= 0) {
            $healthStatus = 'unbudgeted';
        } elseif ($burnRatePercent >= 100.0) {
            $healthStatus = 'exceeded';
        } elseif ($burnRatePercent >= ($budget->alert_threshold_percent ?? 85)) {
            $healthStatus = 'warning';
        }

        // Category breakdown
        $categories = [
            'labor' => $totalLaborCost,
            'software_license' => (float) ProjectExpense::where('project_id', $project->id)->where('category', 'software_license')->where('status', 'approved')->sum('amount'),
            'cloud_hosting' => (float) ProjectExpense::where('project_id', $project->id)->where('category', 'cloud_hosting')->where('status', 'approved')->sum('amount'),
            'hardware_equipment' => (float) ProjectExpense::where('project_id', $project->id)->where('category', 'hardware_equipment')->where('status', 'approved')->sum('amount'),
            'consulting' => (float) ProjectExpense::where('project_id', $project->id)->where('category', 'consulting')->where('status', 'approved')->sum('amount'),
            'travel_meals' => (float) ProjectExpense::where('project_id', $project->id)->where('category', 'travel_meals')->where('status', 'approved')->sum('amount'),
            'other' => (float) ProjectExpense::where('project_id', $project->id)->where('category', 'other')->where('status', 'approved')->sum('amount'),
        ];

        // Member Rates
        $memberRates = ProjectMemberRate::where('project_id', $project->id)
            ->with(['user:id,name,email'])
            ->get()
            ->map(fn (ProjectMemberRate $r) => [
                'id' => $r->id,
                'user_id' => $r->user_id,
                'user_name' => $r->user?->name,
                'user_email' => $r->user?->email,
                'hourly_rate' => (float) $r->hourly_rate,
                'billing_role' => $r->billing_role,
            ]);

        // Worklogs
        $recentWorklogs = TaskWorklog::where('project_id', $project->id)
            ->with(['user:id,name,email', 'task:id,key,title'])
            ->orderByDesc('work_date')
            ->orderByDesc('created_at')
            ->limit(25)
            ->get()
            ->map(fn (TaskWorklog $w) => [
                'id' => $w->id,
                'task_key' => $w->task?->key,
                'task_title' => $w->task?->title,
                'user_name' => $w->user?->name,
                'duration_minutes' => $w->duration_minutes,
                'duration_hours' => round($w->duration_minutes / 60, 2),
                'calculated_cost' => (float) $w->calculated_cost,
                'work_date_formatted' => $w->work_date?->translatedFormat('d M Y'),
                'description' => $w->description,
            ]);

        // Expenses
        $expenses = ProjectExpense::where('project_id', $project->id)
            ->with(['submitter:id,name,email', 'approver:id,name'])
            ->orderByDesc('expense_date')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (ProjectExpense $e) => [
                'id' => $e->id,
                'category' => $e->category,
                'title' => $e->title,
                'amount' => (float) $e->amount,
                'currency' => $e->currency,
                'expense_date_formatted' => $e->expense_date?->translatedFormat('d M Y'),
                'vendor' => $e->vendor,
                'receipt_url' => $e->receipt_url,
                'submitter_name' => $e->submitter?->name,
                'approver_name' => $e->approver?->name,
                'status' => $e->status,
                'rejection_reason' => $e->rejection_reason,
                'notes' => $e->notes,
                'created_at_formatted' => $e->created_at?->translatedFormat('d M Y H:i'),
            ]);

        return [
            'budget' => [
                'id' => $budget->id,
                'total_budget' => $totalBudget,
                'currency' => $budget->currency ?? 'IDR',
                'budget_type' => $budget->budget_type ?? 'fixed',
                'capex_amount' => (float) $budget->capex_amount,
                'opex_amount' => (float) $budget->opex_amount,
                'alert_threshold_percent' => $budget->alert_threshold_percent ?? 85,
            ],
            'financials' => [
                'total_labor_cost' => $totalLaborCost,
                'total_approved_expenses' => $totalApprovedExpenses,
                'total_pending_expenses' => $totalPendingExpenses,
                'total_incurred_cost' => $totalIncurredCost,
                'remaining_budget' => $remainingBudget,
                'burn_rate_percent' => $burnRatePercent,
                'health_status' => $healthStatus,
            ],
            'categories' => $categories,
            'member_rates' => $memberRates,
            'recent_worklogs' => $recentWorklogs,
            'expenses' => $expenses,
        ];
    }

    /**
     * Set or update project budget parameters.
     *
     * @param  array<string, mixed>  $data
     */
    public function setOrUpdateBudget(Project $project, array $data, User $user): ProjectBudget
    {
        return ProjectBudget::updateOrCreate(
            ['project_id' => $project->id],
            [
                'total_budget' => $data['total_budget'] ?? 0,
                'currency' => $data['currency'] ?? 'IDR',
                'budget_type' => $data['budget_type'] ?? 'fixed',
                'capex_amount' => $data['capex_amount'] ?? 0,
                'opex_amount' => $data['opex_amount'] ?? 0,
                'alert_threshold_percent' => $data['alert_threshold_percent'] ?? 85,
                'created_by' => $user->id,
            ]
        );
    }

    /**
     * Set or update member hourly rate for a project.
     */
    public function setMemberRate(Project $project, int $userId, float $rate, ?string $role = null): ProjectMemberRate
    {
        return ProjectMemberRate::updateOrCreate(
            [
                'project_id' => $project->id,
                'user_id' => $userId,
            ],
            [
                'hourly_rate' => $rate,
                'billing_role' => $role,
            ]
        );
    }

    /**
     * Log work time on a task and calculate labor cost.
     */
    public function logWorkTime(
        Task $task,
        User $user,
        int $durationMinutes,
        string $date,
        ?string $description = null
    ): TaskWorklog {
        $memberRate = ProjectMemberRate::where('project_id', $task->project_id)
            ->where('user_id', $user->id)
            ->value('hourly_rate') ?? 0.0;

        $calculatedCost = round(($durationMinutes / 60.0) * (float) $memberRate, 2);

        return TaskWorklog::create([
            'project_id' => $task->project_id,
            'task_id' => $task->id,
            'user_id' => $user->id,
            'duration_minutes' => $durationMinutes,
            'calculated_cost' => $calculatedCost,
            'work_date' => $date,
            'description' => $description,
        ]);
    }

    /**
     * Submit an expense claim for a project.
     *
     * @param  array<string, mixed>  $data
     */
    public function submitExpense(Project $project, User $user, array $data): ProjectExpense
    {
        return ProjectExpense::create([
            'project_id' => $project->id,
            'category' => $data['category'],
            'title' => $data['title'],
            'amount' => $data['amount'],
            'currency' => $data['currency'] ?? 'IDR',
            'expense_date' => $data['expense_date'],
            'vendor' => $data['vendor'] ?? null,
            'receipt_url' => $data['receipt_url'] ?? null,
            'submitted_by' => $user->id,
            'status' => 'pending',
            'notes' => $data['notes'] ?? null,
        ]);
    }

    /**
     * Approve a project expense.
     */
    public function approveExpense(ProjectExpense $expense, User $approver): ProjectExpense
    {
        $expense->update([
            'status' => 'approved',
            'approved_by' => $approver->id,
            'rejection_reason' => null,
        ]);

        return $expense->fresh();
    }

    /**
     * Reject a project expense.
     */
    public function rejectExpense(ProjectExpense $expense, User $approver, string $reason): ProjectExpense
    {
        $expense->update([
            'status' => 'rejected',
            'approved_by' => $approver->id,
            'rejection_reason' => $reason,
        ]);

        return $expense->fresh();
    }
}
