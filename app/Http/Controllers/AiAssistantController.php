<?php

namespace App\Http\Controllers;

use App\Models\AiUsageLog;
use App\Models\Organization;
use App\Models\OrganizationAiSetting;
use App\Models\Project;
use App\Models\Sprint;
use App\Services\Ai\Capabilities\AcceptanceCriteriaCapability;
use App\Services\Ai\Capabilities\SprintSummaryCapability;
use App\Services\Ai\Capabilities\TaskBreakdownCapability;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AiAssistantController extends Controller
{
    public function __construct(
        protected SprintSummaryCapability $sprintSummaryCapability,
        protected TaskBreakdownCapability $taskBreakdownCapability,
        protected AcceptanceCriteriaCapability $acceptanceCriteriaCapability
    ) {}

    /**
     * Generate an AI Sprint Summary & Retrospective analysis.
     */
    public function sprintSummary(Request $request, Project $project, Sprint $sprint): JsonResponse
    {
        $user = $request->user();
        $this->authorizeProjectAccess($request, $project);

        if ($sprint->project_id !== $project->id) {
            abort(404, 'Sprint tidak ditemukan dalam proyek ini.');
        }

        $response = $this->sprintSummaryCapability->generate($sprint, $user);

        if (! $response->success) {
            return response()->json([
                'success' => false,
                'error' => $response->errorMessage,
                'status' => $response->status,
            ], $response->status === 'budget_exceeded' ? 429 : 500);
        }

        return response()->json([
            'success' => true,
            'data' => $response->structuredData,
            'meta' => [
                'provider' => $response->provider,
                'model' => $response->model,
                'total_tokens' => $response->totalTokens,
                'latency_ms' => $response->latencyMs,
            ],
        ]);
    }

    /**
     * Generate AI Task Breakdown / Subtask decomposition.
     */
    public function taskBreakdown(Request $request, Project $project): JsonResponse
    {
        $user = $request->user();
        $this->authorizeProjectAccess($request, $project);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'type' => ['nullable', 'string'],
            'priority' => ['nullable', 'string'],
        ]);

        $response = $this->taskBreakdownCapability->generate($project, $user, $validated);

        if (! $response->success) {
            return response()->json([
                'success' => false,
                'error' => $response->errorMessage,
                'status' => $response->status,
            ], $response->status === 'budget_exceeded' ? 429 : 500);
        }

        return response()->json([
            'success' => true,
            'data' => $response->structuredData,
            'meta' => [
                'provider' => $response->provider,
                'model' => $response->model,
                'total_tokens' => $response->totalTokens,
                'latency_ms' => $response->latencyMs,
            ],
        ]);
    }

    /**
     * Generate AI Acceptance Criteria (Given-When-Then).
     */
    public function acceptanceCriteria(Request $request, Project $project): JsonResponse
    {
        $user = $request->user();
        $this->authorizeProjectAccess($request, $project);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'type' => ['nullable', 'string'],
        ]);

        $response = $this->acceptanceCriteriaCapability->generate($project, $user, $validated);

        if (! $response->success) {
            return response()->json([
                'success' => false,
                'error' => $response->errorMessage,
                'status' => $response->status,
            ], $response->status === 'budget_exceeded' ? 429 : 500);
        }

        return response()->json([
            'success' => true,
            'data' => $response->structuredData,
            'meta' => [
                'provider' => $response->provider,
                'model' => $response->model,
                'total_tokens' => $response->totalTokens,
                'latency_ms' => $response->latencyMs,
            ],
        ]);
    }

    /**
     * Display Organization AI Settings & Quota Dashboard.
     */
    public function settings(Request $request): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if (! $user->hasPermissionInOrganization($organization, 'organization:manage') && ! in_array($user->roleInOrganization($organization), ['owner', 'admin'])) {
            abort(403, 'Anda tidak memiliki hak untuk melihat konfigurasi AI organisasi.');
        }

        $setting = OrganizationAiSetting::firstOrCreate(
            ['organization_id' => $organization->id],
            [
                'default_provider' => 'mock',
                'default_model' => 'gpt-4o-mini',
                'monthly_token_budget' => 500000,
                'is_enabled' => true,
            ]
        );

        $usageLogs = AiUsageLog::where('organization_id', $organization->id)
            ->with(['user:id,name', 'project:id,name,key'])
            ->latest('created_at')
            ->take(20)
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'capability' => $log->capability,
                'provider' => $log->provider,
                'model' => $log->model,
                'total_tokens' => $log->total_tokens,
                'cost_estimate' => (float) $log->cost_estimate,
                'latency_ms' => $log->latency_ms,
                'status' => $log->status,
                'user_name' => $log->user?->name ?? 'System',
                'project_name' => $log->project?->name ?? 'Global',
                'created_at' => $log->created_at->diffForHumans(),
            ]);

        return Inertia::render('organization/ai-settings', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
            ],
            'aiSetting' => [
                'id' => $setting->id,
                'default_provider' => $setting->default_provider,
                'has_openai_key' => ! empty($setting->openai_api_key),
                'has_gemini_key' => ! empty($setting->gemini_api_key),
                'ollama_base_url' => $setting->ollama_base_url,
                'default_model' => $setting->default_model,
                'monthly_token_budget' => $setting->monthly_token_budget,
                'current_month_tokens_used' => $setting->current_month_tokens_used,
                'current_month_cost_estimate' => (float) $setting->current_month_cost_estimate,
                'budget_usage_percent' => $setting->budgetUsagePercent(),
                'is_budget_exceeded' => $setting->isBudgetExceeded(),
                'is_enabled' => $setting->is_enabled,
            ],
            'usageLogs' => $usageLogs,
        ]);
    }

    /**
     * Update Organization AI Settings.
     */
    public function updateSettings(Request $request): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if (! $user->hasPermissionInOrganization($organization, 'organization:manage')) {
            abort(403, 'Anda tidak memiliki hak untuk mengonfigurasi AI organisasi.');
        }

        $validated = $request->validate([
            'default_provider' => ['required', 'string', 'in:mock,openai,gemini,ollama'],
            'openai_api_key' => ['nullable', 'string'],
            'gemini_api_key' => ['nullable', 'string'],
            'ollama_base_url' => ['nullable', 'string', 'url'],
            'default_model' => ['nullable', 'string', 'max:60'],
            'monthly_token_budget' => ['required', 'integer', 'min:0'],
            'is_enabled' => ['required', 'boolean'],
        ]);

        $setting = OrganizationAiSetting::firstOrCreate(['organization_id' => $organization->id]);

        $payload = [
            'default_provider' => $validated['default_provider'],
            'ollama_base_url' => $validated['ollama_base_url'] ?? 'http://localhost:11434',
            'default_model' => $validated['default_model'] ?? 'gpt-4o-mini',
            'monthly_token_budget' => $validated['monthly_token_budget'],
            'is_enabled' => $validated['is_enabled'],
        ];

        if (! empty($validated['openai_api_key'])) {
            $payload['openai_api_key'] = $validated['openai_api_key'];
        }

        if (! empty($validated['gemini_api_key'])) {
            $payload['gemini_api_key'] = $validated['gemini_api_key'];
        }

        $setting->update($payload);

        return back()->with('success', 'Konfigurasi AI organisasi berhasil disimpan.');
    }

    protected function authorizeProjectAccess(Request $request, Project $project): void
    {
        $isMember = $request->user()->organizations()
            ->where('organizations.id', $project->organization_id)
            ->wherePivot('status', 'active')
            ->exists();

        if (! $isMember) {
            abort(403, 'Akses tidak sah.');
        }
    }
}
