<?php

namespace App\Services\Risk;

use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\RiskActionLog;
use App\Models\User;

class ProjectRiskService
{
    /**
     * Calculate exposure score and risk level from probability and impact.
     *
     * @return array{exposure_score: int, risk_level: string}
     */
    public function calculateRiskLevel(int $probability, int $impact): array
    {
        $probability = max(1, min(5, $probability));
        $impact = max(1, min(5, $impact));
        $score = $probability * $impact;

        $level = 'low';
        if ($score >= 20) {
            $level = 'critical';
        } elseif ($score >= 12) {
            $level = 'high';
        } elseif ($score >= 5) {
            $level = 'medium';
        }

        return [
            'exposure_score' => $score,
            'risk_level' => $level,
        ];
    }

    /**
     * Get aggregate project risk summary, 5x5 heatmap, and category metrics.
     *
     * @return array<string, mixed>
     */
    public function getProjectRiskSummary(Project $project): array
    {
        $risks = ProjectRisk::where('project_id', $project->id)
            ->with(['owner:id,name,email', 'task:id,key,title', 'actionLogs.user:id,name'])
            ->orderByDesc('exposure_score')
            ->orderByDesc('created_at')
            ->get();

        // 5x5 Heatmap Matrix: [probability 1..5][impact 1..5]
        $heatmap = [];
        for ($p = 5; $p >= 1; $p--) {
            for ($i = 1; $i <= 5; $i++) {
                $heatmap[$p][$i] = [
                    'probability' => $p,
                    'impact' => $i,
                    'score' => $p * $i,
                    'level' => $this->calculateRiskLevel($p, $i)['risk_level'],
                    'count' => 0,
                    'risks' => [],
                ];
            }
        }

        $criticalCount = 0;
        $highCount = 0;
        $mediumCount = 0;
        $lowCount = 0;
        $mitigatedCount = 0;
        $totalScore = 0;
        $categoriesBreakdown = [];

        foreach ($risks as $r) {
            $p = $r->probability;
            $i = $r->impact;
            if (isset($heatmap[$p][$i])) {
                $heatmap[$p][$i]['count']++;
                $heatmap[$p][$i]['risks'][] = [
                    'id' => $r->id,
                    'title' => $r->title,
                    'status' => $r->status,
                    'exposure_score' => $r->exposure_score,
                ];
            }

            if ($r->risk_level === 'critical') {
                $criticalCount++;
            } elseif ($r->risk_level === 'high') {
                $highCount++;
            } elseif ($r->risk_level === 'medium') {
                $mediumCount++;
            } else {
                $lowCount++;
            }

            if (in_array($r->status, ['mitigating', 'closed', 'avoided', 'transferred'])) {
                $mitigatedCount++;
            }

            $totalScore += $r->exposure_score;

            $cat = $r->category ?? 'other';
            if (! isset($categoriesBreakdown[$cat])) {
                $categoriesBreakdown[$cat] = 0;
            }
            $categoriesBreakdown[$cat]++;
        }

        $totalRisks = $risks->count();
        $avgScore = $totalRisks > 0 ? round($totalScore / $totalRisks, 1) : 0.0;
        $mitigationRate = $totalRisks > 0 ? round(($mitigatedCount / $totalRisks) * 100, 1) : 0.0;

        return [
            'metrics' => [
                'total_risks' => $totalRisks,
                'critical_count' => $criticalCount,
                'high_count' => $highCount,
                'medium_count' => $mediumCount,
                'low_count' => $lowCount,
                'mitigated_count' => $mitigatedCount,
                'mitigation_rate' => $mitigationRate,
                'average_exposure_score' => $avgScore,
                'category_breakdown' => $categoriesBreakdown,
            ],
            'heatmap' => $heatmap,
            'risks' => $risks->map(fn (ProjectRisk $r) => [
                'id' => $r->id,
                'title' => $r->title,
                'description' => $r->description,
                'category' => $r->category,
                'probability' => $r->probability,
                'impact' => $r->impact,
                'exposure_score' => $r->exposure_score,
                'risk_level' => $r->risk_level,
                'status' => $r->status,
                'mitigation_strategy' => $r->mitigation_strategy,
                'contingency_plan' => $r->contingency_plan,
                'owner_name' => $r->owner?->name,
                'owner_email' => $r->owner?->email,
                'task_key' => $r->task?->key,
                'task_title' => $r->task?->title,
                'identified_date_formatted' => $r->identified_date?->translatedFormat('d M Y'),
                'target_resolution_date_formatted' => $r->target_resolution_date?->translatedFormat('d M Y'),
                'action_logs' => $r->actionLogs->map(fn (RiskActionLog $log) => [
                    'id' => $log->id,
                    'action_taken' => $log->action_taken,
                    'status_before' => $log->status_before,
                    'status_after' => $log->status_after,
                    'user_name' => $log->user?->name,
                    'created_at_formatted' => $log->created_at?->translatedFormat('d M Y H:i'),
                ]),
            ]),
        ];
    }

    /**
     * Create a new project risk.
     *
     * @param  array<string, mixed>  $data
     */
    public function createRisk(Project $project, array $data, User $creator): ProjectRisk
    {
        $calculated = $this->calculateRiskLevel(
            (int) ($data['probability'] ?? 3),
            (int) ($data['impact'] ?? 3)
        );

        return ProjectRisk::create([
            'project_id' => $project->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'category' => $data['category'] ?? 'technical',
            'probability' => (int) ($data['probability'] ?? 3),
            'impact' => (int) ($data['impact'] ?? 3),
            'exposure_score' => $calculated['exposure_score'],
            'risk_level' => $calculated['risk_level'],
            'status' => $data['status'] ?? 'open',
            'mitigation_strategy' => $data['mitigation_strategy'] ?? null,
            'contingency_plan' => $data['contingency_plan'] ?? null,
            'owner_id' => $data['owner_id'] ?? null,
            'task_id' => $data['task_id'] ?? null,
            'identified_date' => $data['identified_date'] ?? now()->toDateString(),
            'target_resolution_date' => $data['target_resolution_date'] ?? null,
        ]);
    }

    /**
     * Update an existing project risk.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateRisk(ProjectRisk $risk, array $data): ProjectRisk
    {
        $prob = isset($data['probability']) ? (int) $data['probability'] : $risk->probability;
        $imp = isset($data['impact']) ? (int) $data['impact'] : $risk->impact;
        $calculated = $this->calculateRiskLevel($prob, $imp);

        $risk->update([
            'title' => $data['title'] ?? $risk->title,
            'description' => array_key_exists('description', $data) ? $data['description'] : $risk->description,
            'category' => $data['category'] ?? $risk->category,
            'probability' => $prob,
            'impact' => $imp,
            'exposure_score' => $calculated['exposure_score'],
            'risk_level' => $calculated['risk_level'],
            'status' => $data['status'] ?? $risk->status,
            'mitigation_strategy' => array_key_exists('mitigation_strategy', $data) ? $data['mitigation_strategy'] : $risk->mitigation_strategy,
            'contingency_plan' => array_key_exists('contingency_plan', $data) ? $data['contingency_plan'] : $risk->contingency_plan,
            'owner_id' => array_key_exists('owner_id', $data) ? $data['owner_id'] : $risk->owner_id,
            'task_id' => array_key_exists('task_id', $data) ? $data['task_id'] : $risk->task_id,
            'target_resolution_date' => array_key_exists('target_resolution_date', $data) ? $data['target_resolution_date'] : $risk->target_resolution_date,
        ]);

        return $risk->fresh();
    }

    /**
     * Log a mitigation action on a risk.
     *
     * @param  array<string, mixed>  $data
     */
    public function logMitigationAction(ProjectRisk $risk, User $user, array $data): RiskActionLog
    {
        $statusBefore = $risk->status;
        $statusAfter = $data['status_after'] ?? $statusBefore;

        $log = RiskActionLog::create([
            'risk_id' => $risk->id,
            'user_id' => $user->id,
            'action_taken' => $data['action_taken'],
            'status_before' => $statusBefore,
            'status_after' => $statusAfter,
            'residual_probability' => $data['residual_probability'] ?? null,
            'residual_impact' => $data['residual_impact'] ?? null,
            'created_at' => now(),
        ]);

        $updateData = ['status' => $statusAfter];
        if (isset($data['residual_probability'])) {
            $updateData['probability'] = (int) $data['residual_probability'];
        }
        if (isset($data['residual_impact'])) {
            $updateData['impact'] = (int) $data['residual_impact'];
        }

        $this->updateRisk($risk, $updateData);

        return $log;
    }

    /**
     * Delete a risk.
     */
    public function deleteRisk(ProjectRisk $risk): bool
    {
        return (bool) $risk->delete();
    }
}
