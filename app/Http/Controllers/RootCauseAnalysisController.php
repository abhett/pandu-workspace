<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\RcaActionItem;
use App\Models\RootCauseAnalysis;
use App\Services\Sre\RootCauseAnalysisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RootCauseAnalysisController extends Controller
{
    public function __construct(
        protected RootCauseAnalysisService $rcaService
    ) {}

    protected function authorizeAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin mengelola Root Cause Analysis.');
        }

        return $organization;
    }

    /**
     * Display the AI-Powered Automated Root Cause Analysis (RCA) & Smart Post-Mortem Copilot Studio.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeAccess($request, 'view');

        $filters = [
            'status' => $request->query('status'),
            'severity' => $request->query('severity'),
            'category' => $request->query('category'),
            'search' => $request->query('search'),
        ];

        $data = $this->rcaService->getDashboardData($organization, $filters);

        return Inertia::render('organization/sre/rca', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'kpi' => $data['kpi'],
            'category_breakdown' => $data['category_breakdown'],
            'analyses' => $data['analyses'],
            'action_items' => $data['action_items'],
            'recent_traces' => $data['recent_traces'],
            'filters' => $data['filters'],
        ]);
    }

    /**
     * Trigger new AI-Powered RCA & Post-Mortem analysis run.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        $validated = $request->validate([
            'scenario' => ['required', 'string', 'in:redis_cache_stampede,db_connection_pool_exhaustion,payment_webhook_timeout'],
            'trace_id' => ['nullable', 'string', 'max:100'],
            'custom_title' => ['nullable', 'string', 'max:200'],
            'incident_id' => ['nullable', 'string', 'max:50'],
        ]);

        $rca = $this->rcaService->analyzeIncident($organization, $validated, $request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'AI Automated Root Cause Analysis & Post-Mortem berhasil dihasilkan.',
                'rca' => $rca,
            ], 201);
        }

        return back()->with('success', 'AI Automated Root Cause Analysis berhasil di-generate.');
    }

    /**
     * Show detailed RCA record and generated post-mortem.
     */
    public function show(Request $request, RootCauseAnalysis $rca): JsonResponse
    {
        $organization = $this->authorizeAccess($request, 'view');

        if ($rca->organization_id !== $organization->id) {
            abort(404, 'Data RCA tidak ditemukan.');
        }

        $rca->load(['creator', 'verifier', 'actionItems.assignee']);

        return response()->json([
            'success' => true,
            'rca' => $rca,
        ]);
    }

    /**
     * Mark RCA as verified by SRE Lead.
     */
    public function verify(Request $request, RootCauseAnalysis $rca): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        if ($rca->organization_id !== $organization->id) {
            abort(404, 'Data RCA tidak ditemukan.');
        }

        $validated = $request->validate([
            'adjusted_confidence' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $updated = $this->rcaService->verifyAnalysis($rca, $request->user(), $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Analisis Root Cause telah diverifikasi oleh SRE Lead.',
                'rca' => $updated,
            ]);
        }

        return back()->with('success', 'Analisis Root Cause telah diverifikasi.');
    }

    /**
     * Export post-mortem in Markdown format.
     */
    public function export(Request $request, RootCauseAnalysis $rca): JsonResponse
    {
        $organization = $this->authorizeAccess($request, 'view');

        if ($rca->organization_id !== $organization->id) {
            abort(404, 'Data RCA tidak ditemukan.');
        }

        $markdown = $this->buildMarkdownPostMortem($rca);

        return response()->json([
            'success' => true,
            'title' => $rca->title,
            'markdown' => $markdown,
        ]);
    }

    /**
     * Store a preventative action item for this RCA.
     */
    public function storeActionItem(Request $request, RootCauseAnalysis $rca): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        if ($rca->organization_id !== $organization->id) {
            abort(404, 'Data RCA tidak ditemukan.');
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'priority' => ['required', 'string', 'in:p0,p1,p2,p3'],
            'type' => ['required', 'string', 'in:preventative,monitoring,architectural,runbook'],
            'assignee_id' => ['nullable', 'uuid', 'exists:users,id'],
            'due_date' => ['nullable', 'date'],
        ]);

        $actionItem = $this->rcaService->createActionItem($rca, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Action item berhasil ditambahkan.',
                'action_item' => $actionItem,
            ], 201);
        }

        return back()->with('success', 'Action item berhasil ditambahkan.');
    }

    /**
     * Update an action item status or priority.
     */
    public function updateActionItem(Request $request, RcaActionItem $actionItem): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        if ($actionItem->organization_id !== $organization->id) {
            abort(404, 'Action item tidak ditemukan.');
        }

        $validated = $request->validate([
            'status' => ['nullable', 'string', 'in:open,in_progress,completed,wont_fix'],
            'priority' => ['nullable', 'string', 'in:p0,p1,p2,p3'],
            'title' => ['nullable', 'string', 'max:255'],
            'due_date' => ['nullable', 'date'],
            'assignee_id' => ['nullable', 'uuid', 'exists:users,id'],
        ]);

        $updated = $this->rcaService->updateActionItem($actionItem, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Status action item berhasil diperbarui.',
                'action_item' => $updated,
            ]);
        }

        return back()->with('success', 'Status action item berhasil diperbarui.');
    }

    /**
     * Delete an RCA record.
     */
    public function destroy(Request $request, RootCauseAnalysis $rca): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeAccess($request, 'manage');

        if ($rca->organization_id !== $organization->id) {
            abort(404, 'Data RCA tidak ditemukan.');
        }

        $this->rcaService->deleteAnalysis($rca);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Rekaman Root Cause Analysis berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Rekaman Root Cause Analysis berhasil dihapus.');
    }

    /**
     * Helper to render full formal markdown post-mortem.
     */
    protected function buildMarkdownPostMortem(RootCauseAnalysis $rca): string
    {
        $dateStr = $rca->created_at->format('Y-m-d H:i T');
        $blast = $rca->blast_radius ?? [];
        $whys = $rca->five_whys ?? [];
        $commits = $rca->blame_commits ?? [];

        $md = "# 🚨 Post-Mortem Report: {$rca->title}\n\n";
        $md .= "**Incident Reference:** `{$rca->incident_id}` | **Severity:** `".strtoupper($rca->severity)."` | **Date:** `{$dateStr}`\n";
        $md .= "**Suspect Service:** `{$rca->suspect_service}` | **AI Confidence:** `{$rca->confidence_score}%`\n\n";
        $md .= "---\n\n";

        $md .= "## 1. Executive Summary\n";
        $md .= "{$rca->impact_summary}\n\n";

        $md .= "### 💥 Blast Radius & Business Impact\n";
        $md .= '- **Affected Users:** '.number_format($blast['affected_users_count'] ?? 0)." users\n";
        $md .= '- **Impacted Organizations/Tenants:** '.($blast['affected_tenants_count'] ?? 0)." tenants\n";
        $md .= '- **Peak Error Rate Spike:** '.($blast['error_rate_spike_pct'] ?? 0)."%\n";
        $md .= '- **P99 Latency Surge:** '.($blast['latency_p99_ms'] ?? 0)." ms\n";
        $md .= '- **Estimated Revenue Loss:** $'.number_format($blast['estimated_revenue_impact_usd'] ?? 0)."\n\n";

        $md .= "## 2. Root Cause Analysis (5-Whys Deduction)\n";
        foreach ($whys as $w) {
            $level = $w['level'] ?? 1;
            $md .= "**Why #{$level}:** {$w['question']}\n";
            $md .= "> **Answer:** {$w['answer']}\n";
            if (! empty($w['evidence'])) {
                $md .= "> *Evidence:* `{$w['evidence']}`\n";
            }
            $md .= "\n";
        }

        if (! empty($commits)) {
            $md .= "## 3. Correlated Code Changes (Blame / Trigger)\n";
            foreach ($commits as $c) {
                $md .= "- Commit [`{$c['commit_sha']}`] by **{$c['author']}**: *{$c['message']}* (Confidence: {$c['similarity_score']}%)\n";
            }
            $md .= "\n";
        }

        $md .= "## 4. Preventative Action Items\n";
        $rca->load('actionItems');
        if ($rca->actionItems->isNotEmpty()) {
            foreach ($rca->actionItems as $item) {
                $statusIcon = $item->status === 'completed' ? '[x]' : '[ ]';
                $md .= "- {$statusIcon} **[".strtoupper($item->priority)."]** {$item->title} - *({$item->type})*\n";
            }
        } else {
            $md .= "*No active action items assigned.*\n";
        }

        $md .= "\n---\n*Generated autonomously by Pandu AI Observability & SRE Copilot*";

        return $md;
    }
}
