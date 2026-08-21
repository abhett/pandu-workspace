<?php

namespace App\Services\DevOps;

use App\Models\CodeownerRule;
use App\Models\Organization;
use App\Models\OrganizationAuditLog;
use App\Models\Project;
use App\Models\PullRequestReview;
use App\Models\User;

class PrReviewSlaService
{
    /**
     * Get complete Pull Request Review SLA, Reviewer Load Balancer & Codeowner Dashboard.
     *
     * @return array<string, mixed>
     */
    public function getPrReviewDashboard(
        Organization $organization,
        ?string $status = null,
        ?string $slaStatus = null,
        ?string $reviewerId = null
    ): array {
        $hasPrs = PullRequestReview::where('organization_id', $organization->id)->exists();
        if (! $hasPrs) {
            $defaultProject = Project::where('organization_id', $organization->id)->first();
            $this->seedDefaultPrs($organization, $defaultProject);
        }

        $query = PullRequestReview::where('organization_id', $organization->id)
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($slaStatus, fn ($q) => $q->where('sla_status', $slaStatus))
            ->when($reviewerId, fn ($q) => $q->where('assigned_reviewer_id', $reviewerId))
            ->with([
                'author:id,name,email',
                'assignedReviewer:id,name,email',
                'project:id,name,key',
            ])
            ->orderByDesc('opened_at');

        $prs = $query->get()->map(fn (PullRequestReview $pr) => [
            'id' => $pr->id,
            'pr_number' => $pr->pr_number,
            'title' => $pr->title,
            'repository_name' => $pr->repository_name,
            'branch_name' => $pr->branch_name,
            'author' => $pr->author ? [
                'id' => $pr->author->id,
                'name' => $pr->author->name,
                'email' => $pr->author->email,
            ] : null,
            'assigned_reviewer' => $pr->assignedReviewer ? [
                'id' => $pr->assignedReviewer->id,
                'name' => $pr->assignedReviewer->name,
                'email' => $pr->assignedReviewer->email,
            ] : null,
            'additions_count' => $pr->additions_count,
            'deletions_count' => $pr->deletions_count,
            'status' => $pr->status,
            'sla_status' => $pr->sla_status,
            'ttfr_hours' => $pr->ttfr_hours,
            'turnaround_hours' => $pr->turnaround_hours,
            'matched_codeowner_rule' => $pr->matched_codeowner_rule,
            'project_name' => $pr->project?->name,
            'opened_at_formatted' => $pr->opened_at?->translatedFormat('d M Y, H:i'),
            'first_reviewed_at_formatted' => $pr->first_reviewed_at?->translatedFormat('d M Y, H:i'),
            'merged_at_formatted' => $pr->merged_at?->translatedFormat('d M Y, H:i'),
        ]);

        $allPrs = PullRequestReview::where('organization_id', $organization->id)->get();
        $totalPrs = $allPrs->count();
        $activePrs = $allPrs->whereIn('status', ['pending_review', 'changes_requested', 'approved'])->count();
        $withinSlaCount = $allPrs->where('sla_status', 'within_sla')->count();
        $stalePrs = $allPrs->where('sla_status', 'breached')->count();

        $avgTtfr = $allPrs->whereNotNull('ttfr_hours')->count() > 0
            ? round($allPrs->whereNotNull('ttfr_hours')->avg('ttfr_hours'), 1)
            : 2.4;

        $avgTurnaround = $allPrs->whereNotNull('turnaround_hours')->count() > 0
            ? round($allPrs->whereNotNull('turnaround_hours')->avg('turnaround_hours'), 1)
            : 13.8;

        $complianceRate = $totalPrs > 0 ? round(($withinSlaCount / $totalPrs) * 100, 1) : 94.2;

        $metrics = [
            'total_prs' => $totalPrs,
            'active_prs' => $activePrs,
            'avg_ttfr_hours' => $avgTtfr,
            'avg_turnaround_hours' => $avgTurnaround,
            'sla_compliance_pct' => $complianceRate,
            'stale_prs_count' => $stalePrs,
        ];

        // Member Reviewer Load Matrix
        $memberIds = $organization->memberships()->pluck('user_id');
        $members = User::whereIn('id', $memberIds)->select(['id', 'name', 'email'])->get();

        $reviewerMatrix = $members->map(function (User $member) use ($allPrs) {
            $pendingCount = $allPrs->where('assigned_reviewer_id', $member->id)
                ->whereIn('status', ['pending_review', 'changes_requested'])
                ->count();

            $completedCount = $allPrs->where('assigned_reviewer_id', $member->id)
                ->whereIn('status', ['approved', 'merged'])
                ->count();

            $capacity = 'normal';
            if ($pendingCount === 0) {
                $capacity = 'available';
            } elseif ($pendingCount >= 3) {
                $capacity = 'overloaded';
            }

            return [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'pending_count' => $pendingCount,
                'completed_count' => $completedCount,
                'capacity' => $capacity,
            ];
        });

        $codeownerRules = CodeownerRule::where('organization_id', $organization->id)
            ->with(['leadReviewer:id,name,email', 'fallbackReviewer:id,name,email'])
            ->orderBy('domain_name')
            ->get()
            ->map(fn (CodeownerRule $r) => [
                'id' => $r->id,
                'path_pattern' => $r->path_pattern,
                'domain_name' => $r->domain_name,
                'lead_reviewer_name' => $r->leadReviewer?->name,
                'fallback_reviewer_name' => $r->fallbackReviewer?->name,
            ]);

        $projects = Project::where('organization_id', $organization->id)
            ->select(['id', 'name', 'key'])
            ->orderBy('name')
            ->get();

        return [
            'metrics' => $metrics,
            'reviewerMatrix' => $reviewerMatrix->values()->all(),
            'prs' => $prs->values()->all(),
            'codeownerRules' => $codeownerRules->values()->all(),
            'projects' => $projects,
            'members' => $members,
            'selectedStatus' => $status,
            'selectedSlaStatus' => $slaStatus,
            'selectedReviewerId' => $reviewerId,
        ];
    }

    /**
     * Create a new Pull Request Review record.
     *
     * @param  array<string, mixed>  $data
     */
    public function createPullRequest(Organization $organization, array $data, User $user): PullRequestReview
    {
        $lastNumber = (int) PullRequestReview::where('organization_id', $organization->id)->max('pr_number');
        $nextNumber = $lastNumber + 1;

        $pr = PullRequestReview::create([
            'organization_id' => $organization->id,
            'project_id' => $data['project_id'] ?? null,
            'pr_number' => $nextNumber,
            'title' => $data['title'],
            'repository_name' => $data['repository_name'] ?? 'pandu-app',
            'branch_name' => $data['branch_name'] ?? 'feature/enhancement',
            'author_id' => $data['author_id'] ?? $user->id,
            'assigned_reviewer_id' => $data['assigned_reviewer_id'] ?? null,
            'additions_count' => $data['additions_count'] ?? 120,
            'deletions_count' => $data['deletions_count'] ?? 35,
            'status' => 'pending_review',
            'sla_status' => 'within_sla',
            'opened_at' => now(),
            'matched_codeowner_rule' => $data['matched_codeowner_rule'] ?? 'app/**',
        ]);

        OrganizationAuditLog::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'event_category' => 'devops',
            'action' => 'pr_review_created',
            'resource_type' => 'PullRequestReview',
            'resource_id' => (string) $pr->id,
            'status' => 'success',
            'changes' => [
                'pr_number' => $pr->pr_number,
                'title' => $pr->title,
            ],
        ]);

        return $pr;
    }

    /**
     * Reassign reviewer for load balancing.
     */
    public function reassignReviewer(PullRequestReview $pr, int $newReviewerId, User $user): PullRequestReview
    {
        $pr->update([
            'assigned_reviewer_id' => $newReviewerId,
        ]);

        OrganizationAuditLog::create([
            'organization_id' => $pr->organization_id,
            'user_id' => $user->id,
            'event_category' => 'devops',
            'action' => 'pr_reviewer_reassigned',
            'resource_type' => 'PullRequestReview',
            'resource_id' => (string) $pr->id,
            'status' => 'success',
            'changes' => [
                'pr_number' => $pr->pr_number,
                'new_reviewer_id' => $newReviewerId,
            ],
        ]);

        return $pr;
    }

    /**
     * Update PR Review Status (approve, request changes, merge).
     */
    public function updateReviewStatus(PullRequestReview $pr, string $newStatus, User $user): PullRequestReview
    {
        $updates = ['status' => $newStatus];

        if ($newStatus === 'approved' && ! $pr->first_reviewed_at) {
            $now = now();
            $updates['first_reviewed_at'] = $now;
            $updates['approved_at'] = $now;
            $updates['ttfr_hours'] = round(max(0.2, $pr->opened_at->diffInMinutes($now) / 60), 1);
        } elseif ($newStatus === 'changes_requested' && ! $pr->first_reviewed_at) {
            $now = now();
            $updates['first_reviewed_at'] = $now;
            $updates['ttfr_hours'] = round(max(0.2, $pr->opened_at->diffInMinutes($now) / 60), 1);
        } elseif ($newStatus === 'merged') {
            $now = now();
            $updates['merged_at'] = $now;
            if (! $pr->approved_at) {
                $updates['approved_at'] = $now;
            }
            $updates['turnaround_hours'] = round(max(0.5, $pr->opened_at->diffInMinutes($now) / 60), 1);
        }

        $pr->update($updates);

        return $pr;
    }

    /**
     * Create a new CODEOWNERS rule.
     *
     * @param  array<string, mixed>  $data
     */
    public function createCodeownerRule(Organization $organization, array $data, User $user): CodeownerRule
    {
        $rule = CodeownerRule::create([
            'organization_id' => $organization->id,
            'path_pattern' => $data['path_pattern'],
            'domain_name' => $data['domain_name'],
            'lead_reviewer_id' => $data['lead_reviewer_id'] ?? null,
            'fallback_reviewer_id' => $data['fallback_reviewer_id'] ?? null,
        ]);

        OrganizationAuditLog::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'event_category' => 'devops',
            'action' => 'codeowner_rule_created',
            'resource_type' => 'CodeownerRule',
            'resource_id' => (string) $rule->id,
            'status' => 'success',
            'changes' => [
                'path_pattern' => $rule->path_pattern,
                'domain_name' => $rule->domain_name,
            ],
        ]);

        return $rule;
    }

    /**
     * Delete a Pull Request review record.
     */
    public function deletePullRequest(PullRequestReview $pr): bool
    {
        return (bool) $pr->delete();
    }

    /**
     * Delete a CODEOWNERS rule.
     */
    public function deleteCodeownerRule(CodeownerRule $rule): bool
    {
        return (bool) $rule->delete();
    }

    /**
     * Seed baseline demo PR reviews & codeowner rules.
     */
    public function seedDefaultPrs(Organization $organization, ?Project $project = null): void
    {
        $members = User::whereIn('id', $organization->memberships()->pluck('user_id'))->get();
        $lead = $members->first();
        $dev = $members->count() > 1 ? $members->get(1) : $lead;
        $projectId = $project?->id;

        // 1. Codeowner Rules
        $rule1 = CodeownerRule::create([
            'organization_id' => $organization->id,
            'path_pattern' => 'app/Services/Developer/**',
            'domain_name' => 'Developer Ecosystem & API Governance',
            'lead_reviewer_id' => $lead?->id,
            'fallback_reviewer_id' => $dev?->id,
        ]);

        $rule2 = CodeownerRule::create([
            'organization_id' => $organization->id,
            'path_pattern' => 'resources/js/pages/**',
            'domain_name' => 'Frontend SPA & React Flow Canvas',
            'lead_reviewer_id' => $dev?->id,
            'fallback_reviewer_id' => $lead?->id,
        ]);

        // 2. PR 142: Stripe Billing Webhooks (Within SLA)
        PullRequestReview::create([
            'organization_id' => $organization->id,
            'project_id' => $projectId,
            'pr_number' => 142,
            'title' => 'feat(billing): idempotent webhook ingestion & dead-letter queue recovery',
            'repository_name' => 'pandu-core-api',
            'branch_name' => 'feature/billing-dlq-v2',
            'author_id' => $dev?->id,
            'assigned_reviewer_id' => $lead?->id,
            'additions_count' => 380,
            'deletions_count' => 64,
            'status' => 'pending_review',
            'sla_status' => 'within_sla',
            'ttfr_hours' => 1.8,
            'opened_at' => now()->subHours(3),
            'matched_codeowner_rule' => $rule1->path_pattern,
        ]);

        // 3. PR 143: React Flow Whiteboard Optimizer (Approved)
        PullRequestReview::create([
            'organization_id' => $organization->id,
            'project_id' => $projectId,
            'pr_number' => 143,
            'title' => 'perf(whiteboard): virtualized node canvas rendering on 1000+ elements',
            'repository_name' => 'pandu-web-client',
            'branch_name' => 'perf/canvas-virtualization',
            'author_id' => $lead?->id,
            'assigned_reviewer_id' => $dev?->id,
            'additions_count' => 520,
            'deletions_count' => 210,
            'status' => 'approved',
            'sla_status' => 'within_sla',
            'ttfr_hours' => 0.9,
            'turnaround_hours' => 8.4,
            'opened_at' => now()->subHours(12),
            'first_reviewed_at' => now()->subHours(11),
            'approved_at' => now()->subHours(4),
            'matched_codeowner_rule' => $rule2->path_pattern,
        ]);

        // 4. PR 144: FinOps Cloud Exporter (At Risk)
        PullRequestReview::create([
            'organization_id' => $organization->id,
            'project_id' => $projectId,
            'pr_number' => 144,
            'title' => 'refactor(finops): automated aws & gcp anomaly cost breakdown export',
            'repository_name' => 'pandu-core-api',
            'branch_name' => 'refactor/finops-exporters',
            'author_id' => $dev?->id,
            'assigned_reviewer_id' => $lead?->id,
            'additions_count' => 240,
            'deletions_count' => 85,
            'status' => 'changes_requested',
            'sla_status' => 'at_risk',
            'ttfr_hours' => 3.6,
            'opened_at' => now()->subHours(22),
            'first_reviewed_at' => now()->subHours(18),
            'matched_codeowner_rule' => $rule1->path_pattern,
        ]);
    }
}
