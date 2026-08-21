<?php

namespace App\Services\Financial;

use App\Models\CostCenter;
use App\Models\Organization;
use App\Models\Project;
use App\Models\ProjectCostCenterAllocation;
use App\Models\ProjectExpense;
use App\Models\TaskWorklog;
use App\Models\User;

class CostAllocationService
{
    /**
     * Get aggregate cost allocation overview, project profitability leaderboard, and cost center breakdown.
     *
     * @return array<string, mixed>
     */
    public function getCostAllocationOverview(Organization $organization, ?string $timeframe = null): array
    {
        $projects = Project::where('organization_id', $organization->id)
            ->with(['budget', 'costCenterAllocations.costCenter'])
            ->orderBy('name')
            ->get();

        $costCenters = CostCenter::where('organization_id', $organization->id)
            ->with(['manager:id,name,email', 'projectAllocations.project:id,key,name'])
            ->orderBy('code')
            ->get();

        // 1. Calculate project-level profitability matrix
        $projectProfitability = $projects->map(function (Project $p) {
            $totalBudget = (float) ($p->budget?->total_budget ?? 0);
            $laborCost = (float) TaskWorklog::where('project_id', $p->id)->sum('calculated_cost');
            $totalHours = round((float) TaskWorklog::where('project_id', $p->id)->sum('duration_minutes') / 60, 1);
            $approvedExpenses = (float) ProjectExpense::where('project_id', $p->id)->where('status', 'approved')->sum('amount');
            $totalIncurredCost = $laborCost + $approvedExpenses;

            $grossMargin = $totalBudget - $totalIncurredCost;
            $grossMarginPct = $totalBudget > 0
                ? round(($grossMargin / $totalBudget) * 100, 1)
                : ($totalIncurredCost > 0 ? -100.0 : 0.0);

            $status = 'healthy';
            if ($totalBudget <= 0 && $totalIncurredCost > 0) {
                $status = 'over_budget';
            } elseif ($grossMarginPct >= 40.0) {
                $status = 'highly_profitable';
            } elseif ($grossMarginPct >= 20.0) {
                $status = 'healthy';
            } elseif ($grossMarginPct >= 0.0) {
                $status = 'thin';
            } else {
                $status = 'over_budget';
            }

            return [
                'id' => $p->id,
                'key' => $p->key,
                'name' => $p->name,
                'status' => $p->status,
                'total_budget' => $totalBudget,
                'labor_cost' => $laborCost,
                'total_hours' => $totalHours,
                'direct_expenses' => $approvedExpenses,
                'total_incurred_cost' => $totalIncurredCost,
                'gross_margin' => $grossMargin,
                'gross_margin_pct' => $grossMarginPct,
                'profitability_status' => $status,
                'currency' => $p->budget?->currency ?? 'IDR',
                'cost_centers' => $p->costCenterAllocations->map(fn ($a) => [
                    'id' => $a->id,
                    'cost_center_id' => $a->cost_center_id,
                    'code' => $a->costCenter?->code,
                    'name' => $a->costCenter?->name,
                    'allocation_percentage' => (float) $a->allocation_percentage,
                ]),
            ];
        });

        $projectCostsMap = $projectProfitability->keyBy('id');

        // 2. Calculate Cost Center Realized Spend & Utilization
        $costCenterBreakdown = $costCenters->map(function (CostCenter $cc) use ($projectCostsMap) {
            $allocatedBudget = (float) $cc->allocated_budget;
            $realizedSpend = 0.0;

            $allocatedProjects = $cc->projectAllocations->map(function (ProjectCostCenterAllocation $a) use ($projectCostsMap, &$realizedSpend) {
                $projectCost = $projectCostsMap->get($a->project_id);
                $projectIncurred = $projectCost ? $projectCost['total_incurred_cost'] : 0.0;
                $portionIncurred = $projectIncurred * ((float) $a->allocation_percentage / 100);
                $realizedSpend += $portionIncurred;

                return [
                    'allocation_id' => $a->id,
                    'project_id' => $a->project_id,
                    'project_key' => $a->project?->key,
                    'project_name' => $a->project?->name,
                    'allocation_percentage' => (float) $a->allocation_percentage,
                    'portion_incurred' => round($portionIncurred, 2),
                ];
            });

            $remaining = $allocatedBudget - $realizedSpend;
            $utilizationPct = $allocatedBudget > 0
                ? round(($realizedSpend / $allocatedBudget) * 100, 1)
                : 0.0;

            return [
                'id' => $cc->id,
                'code' => $cc->code,
                'name' => $cc->name,
                'department' => $cc->department,
                'allocated_budget' => $allocatedBudget,
                'realized_spend' => round($realizedSpend, 2),
                'remaining_budget' => round($remaining, 2),
                'utilization_pct' => $utilizationPct,
                'currency' => $cc->currency,
                'description' => $cc->description,
                'manager' => $cc->manager ? ['id' => $cc->manager->id, 'name' => $cc->manager->name] : null,
                'allocated_projects' => $allocatedProjects->values()->all(),
            ];
        });

        // 3. Category Breakdown (Capex vs Opex)
        $totalLabor = (float) $projectProfitability->sum('labor_cost');
        $allProjectIds = $projects->pluck('id');

        $expenseCategories = [
            'engineering_labor' => $totalLabor,
            'cloud_hosting' => (float) ProjectExpense::whereIn('project_id', $allProjectIds)->where('category', 'cloud_hosting')->where('status', 'approved')->sum('amount'),
            'software_license' => (float) ProjectExpense::whereIn('project_id', $allProjectIds)->where('category', 'software_license')->where('status', 'approved')->sum('amount'),
            'consulting' => (float) ProjectExpense::whereIn('project_id', $allProjectIds)->where('category', 'consulting')->where('status', 'approved')->sum('amount'),
            'hardware_equipment' => (float) ProjectExpense::whereIn('project_id', $allProjectIds)->where('category', 'hardware_equipment')->where('status', 'approved')->sum('amount'),
            'travel_meals' => (float) ProjectExpense::whereIn('project_id', $allProjectIds)->where('category', 'travel_meals')->where('status', 'approved')->sum('amount'),
            'other' => (float) ProjectExpense::whereIn('project_id', $allProjectIds)->where('category', 'other')->where('status', 'approved')->sum('amount'),
        ];

        // 4. Overall Financial Metrics
        $totalOrgBudget = (float) $projectProfitability->sum('total_budget');
        $totalDirectExpenses = (float) $projectProfitability->sum('direct_expenses');
        $totalIncurredCost = (float) $projectProfitability->sum('total_incurred_cost');
        $overallGrossProfit = $totalOrgBudget - $totalIncurredCost;
        $overallGrossMarginPct = $totalOrgBudget > 0
            ? round(($overallGrossProfit / $totalOrgBudget) * 100, 1)
            : 0.0;

        $profitableProjectsCount = $projectProfitability->whereIn('profitability_status', ['highly_profitable', 'healthy'])->count();
        $atRiskProjectsCount = $projectProfitability->where('profitability_status', 'over_budget')->count();

        // 5. Members & Projects for form selectors
        $members = User::whereIn('id', $organization->memberships()->pluck('user_id'))
            ->select(['id', 'name', 'email'])
            ->orderBy('name')
            ->get();

        return [
            'metrics' => [
                'total_org_budget' => $totalOrgBudget,
                'total_incurred_cost' => $totalIncurredCost,
                'total_labor_cost' => $totalLabor,
                'total_direct_expenses' => $totalDirectExpenses,
                'overall_gross_profit' => $overallGrossProfit,
                'overall_gross_margin_pct' => $overallGrossMarginPct,
                'total_cost_centers' => $costCenters->count(),
                'total_cost_centers_budget' => (float) $costCenters->sum('allocated_budget'),
                'profitable_projects_count' => $profitableProjectsCount,
                'at_risk_projects_count' => $atRiskProjectsCount,
            ],
            'projects' => $projectProfitability->values()->all(),
            'cost_centers' => $costCenterBreakdown->values()->all(),
            'category_breakdown' => $expenseCategories,
            'members' => $members,
            'raw_projects' => $projects->map(fn ($p) => ['id' => $p->id, 'key' => $p->key, 'name' => $p->name]),
        ];
    }

    /**
     * Create a new cost center.
     */
    public function createCostCenter(Organization $organization, array $data): CostCenter
    {
        return CostCenter::create([
            'organization_id' => $organization->id,
            'manager_id' => ! empty($data['manager_id']) && $data['manager_id'] !== 'none' ? (int) $data['manager_id'] : null,
            'code' => $data['code'],
            'name' => $data['name'],
            'department' => $data['department'] ?? 'Engineering',
            'allocated_budget' => (float) ($data['allocated_budget'] ?? 0),
            'currency' => $data['currency'] ?? 'IDR',
            'description' => $data['description'] ?? null,
        ]);
    }

    /**
     * Update a cost center.
     */
    public function updateCostCenter(CostCenter $costCenter, array $data): CostCenter
    {
        $costCenter->update([
            'manager_id' => array_key_exists('manager_id', $data) ? ($data['manager_id'] === 'none' ? null : (int) $data['manager_id']) : $costCenter->manager_id,
            'code' => $data['code'] ?? $costCenter->code,
            'name' => $data['name'] ?? $costCenter->name,
            'department' => $data['department'] ?? $costCenter->department,
            'allocated_budget' => isset($data['allocated_budget']) ? (float) $data['allocated_budget'] : $costCenter->allocated_budget,
            'currency' => $data['currency'] ?? $costCenter->currency,
            'description' => array_key_exists('description', $data) ? $data['description'] : $costCenter->description,
        ]);

        return $costCenter;
    }

    /**
     * Delete a cost center.
     */
    public function deleteCostCenter(CostCenter $costCenter): bool
    {
        return (bool) $costCenter->delete();
    }

    /**
     * Allocate project to a cost center.
     */
    public function allocateProject(CostCenter $costCenter, Project $project, float $percentage = 100.0): ProjectCostCenterAllocation
    {
        return ProjectCostCenterAllocation::updateOrCreate(
            [
                'cost_center_id' => $costCenter->id,
                'project_id' => $project->id,
            ],
            [
                'allocation_percentage' => $percentage,
            ]
        );
    }

    /**
     * Remove project allocation from cost center.
     */
    public function removeProjectAllocation(string $allocationId): bool
    {
        return (bool) ProjectCostCenterAllocation::where('id', $allocationId)->delete();
    }
}
