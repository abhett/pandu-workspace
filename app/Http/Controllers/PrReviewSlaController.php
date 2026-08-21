<?php

namespace App\Http\Controllers;

use App\Models\CodeownerRule;
use App\Models\Organization;
use App\Models\PullRequestReview;
use App\Services\DevOps\PrReviewSlaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PrReviewSlaController extends Controller
{
    public function __construct(
        protected PrReviewSlaService $prReviewService
    ) {}

    protected function authorizePrReviewAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_prs' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin untuk mengelola Pull Request & Codeowner Rules.');
        }

        return $organization;
    }

    /**
     * Display Pull Request Review SLA & Load Balancer Dashboard.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizePrReviewAccess($request, 'view');
        $status = $request->query('status');
        $slaStatus = $request->query('sla_status');
        $reviewerId = $request->query('reviewer_id');

        $data = $this->prReviewService->getPrReviewDashboard($organization, $status, $slaStatus, $reviewerId);

        return Inertia::render('organization/devops/pr-reviews', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'metrics' => $data['metrics'],
            'reviewerMatrix' => $data['reviewerMatrix'],
            'prs' => $data['prs'],
            'codeownerRules' => $data['codeownerRules'],
            'projects' => $data['projects'],
            'members' => $data['members'],
            'selectedStatus' => $status,
            'selectedSlaStatus' => $slaStatus,
            'selectedReviewerId' => $reviewerId,
        ]);
    }

    /**
     * Store a new pull request review record.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizePrReviewAccess($request, 'manage_prs');

        $validated = $request->validate([
            'project_id' => ['nullable', 'uuid', 'exists:projects,id'],
            'title' => ['required', 'string', 'max:250'],
            'repository_name' => ['required', 'string', 'max:150'],
            'branch_name' => ['required', 'string', 'max:150'],
            'assigned_reviewer_id' => ['nullable', 'integer', 'exists:users,id'],
            'additions_count' => ['nullable', 'integer', 'min:0'],
            'deletions_count' => ['nullable', 'integer', 'min:0'],
            'matched_codeowner_rule' => ['nullable', 'string', 'max:150'],
        ]);

        $pr = $this->prReviewService->createPullRequest($organization, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Pull Request berhasil didaftarkan.',
                'pr' => $pr,
            ], 201);
        }

        return back()->with('success', 'Pull Request berhasil didaftarkan.');
    }

    /**
     * Reassign reviewer for load balancing.
     */
    public function reassign(Request $request, PullRequestReview $pr): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizePrReviewAccess($request, 'manage_prs');

        if ($pr->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'reviewer_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $reassigned = $this->prReviewService->reassignReviewer($pr, (int) $validated['reviewer_id'], $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Reviewer berhasil dialokasikan ulang (Load Balanced).',
                'pr' => $reassigned,
            ]);
        }

        return back()->with('success', 'Reviewer berhasil dialokasikan ulang.');
    }

    /**
     * Update review status (approve, request changes, merge).
     */
    public function updateStatus(Request $request, PullRequestReview $pr): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizePrReviewAccess($request, 'manage_prs');

        if ($pr->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:pending_review,changes_requested,approved,merged'],
        ]);

        $updated = $this->prReviewService->updateReviewStatus($pr, $validated['status'], $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Status Pull Request berhasil diubah menjadi {$validated['status']}.",
                'pr' => $updated,
            ]);
        }

        return back()->with('success', "Status Pull Request berhasil diubah menjadi {$validated['status']}.");
    }

    /**
     * Store a new CODEOWNERS rule.
     */
    public function storeCodeownerRule(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizePrReviewAccess($request, 'manage_prs');

        $validated = $request->validate([
            'path_pattern' => ['required', 'string', 'max:250'],
            'domain_name' => ['required', 'string', 'max:100'],
            'lead_reviewer_id' => ['nullable', 'integer', 'exists:users,id'],
            'fallback_reviewer_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $rule = $this->prReviewService->createCodeownerRule($organization, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Aturan CODEOWNERS berhasil disimpan.',
                'rule' => $rule,
            ], 201);
        }

        return back()->with('success', 'Aturan CODEOWNERS berhasil disimpan.');
    }

    /**
     * Destroy a CODEOWNERS rule.
     */
    public function destroyCodeownerRule(Request $request, CodeownerRule $rule): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizePrReviewAccess($request, 'manage_prs');

        if ($rule->organization_id !== $organization->id) {
            abort(404);
        }

        $this->prReviewService->deleteCodeownerRule($rule);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Aturan CODEOWNERS berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Aturan CODEOWNERS berhasil dihapus.');
    }

    /**
     * Destroy a Pull Request record.
     */
    public function destroy(Request $request, PullRequestReview $pr): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizePrReviewAccess($request, 'manage_prs');

        if ($pr->organization_id !== $organization->id) {
            abort(404);
        }

        $this->prReviewService->deletePullRequest($pr);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Rekaman Pull Request berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Rekaman Pull Request berhasil dihapus.');
    }
}
