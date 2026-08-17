<?php

namespace App\Services\Ai;

use App\Models\AiUsageLog;
use App\Models\OrganizationAiSetting;
use App\Services\Ai\Contracts\AiGatewayInterface;
use App\Services\Ai\Contracts\AiProviderInterface;
use App\Services\Ai\Dto\AiRequest;
use App\Services\Ai\Dto\AiResponse;
use App\Services\Ai\Providers\GeminiProvider;
use App\Services\Ai\Providers\MockAiProvider;
use App\Services\Ai\Providers\OllamaProvider;
use App\Services\Ai\Providers\OpenAiProvider;
use App\Services\Ai\Redaction\RedactionService;
use Exception;
use Illuminate\Support\Facades\DB;

class AiGatewayService implements AiGatewayInterface
{
    public function __construct(
        protected RedactionService $redactionService
    ) {}

    /**
     * Execute an AI capability request through the internal gateway pipeline.
     */
    public function execute(AiRequest $request): AiResponse
    {
        $startTime = microtime(true);

        // 1. Retrieve or initialize organization AI settings
        $setting = OrganizationAiSetting::firstOrCreate(
            ['organization_id' => $request->organization->id],
            [
                'default_provider' => 'mock',
                'default_model' => 'gpt-4o-mini',
                'monthly_token_budget' => 500000,
                'is_enabled' => true,
            ]
        );

        // 2. Check if AI features are enabled for the tenant
        if (! $setting->is_enabled) {
            return AiResponse::failed(
                $setting->default_provider,
                $setting->default_model,
                'Fitur AI dinonaktifkan untuk organisasi ini.',
                'disabled'
            );
        }

        // 3. Quota & Budget Enforcement
        if ($setting->isBudgetExceeded()) {
            $latencyMs = (int) round((microtime(true) - $startTime) * 1000);

            // Log budget exceeded rejection
            AiUsageLog::create([
                'organization_id' => $request->organization->id,
                'project_id' => $request->project?->id,
                'user_id' => $request->user->id,
                'provider' => $request->providerOverride ?? $setting->default_provider,
                'model' => $request->modelOverride ?? $setting->default_model,
                'capability' => $request->capability,
                'prompt_tokens' => 0,
                'completion_tokens' => 0,
                'total_tokens' => 0,
                'cost_estimate' => 0,
                'latency_ms' => $latencyMs,
                'status' => 'budget_exceeded',
                'error_message' => 'Batas kuota token bulanan telah tercapai.',
                'created_at' => now(),
            ]);

            return AiResponse::failed(
                $setting->default_provider,
                $setting->default_model,
                'Batas kuota token bulanan telah tercapai untuk organisasi Anda.',
                'budget_exceeded'
            );
        }

        // 4. Redact sensitive data from prompt before egress
        $sanitizedPrompt = $this->redactionService->redact($request->prompt);

        // 5. Resolve active provider adapter
        $providerName = $request->providerOverride ?? $setting->default_provider;
        $provider = $this->resolveProvider($providerName, $setting);
        $model = $request->modelOverride ?? $setting->default_model;

        // 6. Execute Provider Request
        try {
            $options = array_merge($request->options, [
                'api_key' => match ($providerName) {
                    'openai' => $setting->openai_api_key,
                    'gemini' => $setting->gemini_api_key,
                    default => null,
                },
                'base_url' => $setting->ollama_base_url,
                'model' => $model,
                'capability' => $request->capability,
            ]);

            if ($request->jsonSchema !== null) {
                $result = $provider->generateStructured($sanitizedPrompt, $request->jsonSchema, $options);
                $structuredData = $result['data'];
                $rawContent = $result['raw_content'];
            } else {
                $result = $provider->generate($sanitizedPrompt, $options);
                $structuredData = null;
                $rawContent = $result['content'];
            }

            $latencyMs = (int) round((microtime(true) - $startTime) * 1000);
            $promptTokens = $result['prompt_tokens'];
            $completionTokens = $result['completion_tokens'];
            $totalTokens = $result['total_tokens'];
            $costEstimate = $result['cost_estimate'];

            // 7. Update usage stats & budget counter atomically
            DB::transaction(function () use ($setting, $totalTokens, $costEstimate) {
                $setting->increment('current_month_tokens_used', $totalTokens);
                $setting->update([
                    'current_month_cost_estimate' => $setting->current_month_cost_estimate + $costEstimate,
                ]);
            });

            // 8. Record audit log
            AiUsageLog::create([
                'organization_id' => $request->organization->id,
                'project_id' => $request->project?->id,
                'user_id' => $request->user->id,
                'provider' => $providerName,
                'model' => $model,
                'capability' => $request->capability,
                'prompt_tokens' => $promptTokens,
                'completion_tokens' => $completionTokens,
                'total_tokens' => $totalTokens,
                'cost_estimate' => $costEstimate,
                'latency_ms' => $latencyMs,
                'status' => 'success',
                'created_at' => now(),
            ]);

            return new AiResponse(
                success: true,
                provider: $providerName,
                model: $model,
                content: $rawContent,
                structuredData: $structuredData,
                promptTokens: $promptTokens,
                completionTokens: $completionTokens,
                totalTokens: $totalTokens,
                costEstimate: $costEstimate,
                latencyMs: $latencyMs,
                status: 'success'
            );
        } catch (Exception $e) {
            $latencyMs = (int) round((microtime(true) - $startTime) * 1000);

            AiUsageLog::create([
                'organization_id' => $request->organization->id,
                'project_id' => $request->project?->id,
                'user_id' => $request->user->id,
                'provider' => $providerName,
                'model' => $model,
                'capability' => $request->capability,
                'prompt_tokens' => 0,
                'completion_tokens' => 0,
                'total_tokens' => 0,
                'cost_estimate' => 0,
                'latency_ms' => $latencyMs,
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'created_at' => now(),
            ]);

            return AiResponse::failed(
                $providerName,
                $model,
                $e->getMessage(),
                'failed'
            );
        }
    }

    /**
     * Resolve the provider adapter instance based on provider name.
     */
    protected function resolveProvider(string $providerName, OrganizationAiSetting $setting): AiProviderInterface
    {
        return match (strtolower($providerName)) {
            'openai' => new OpenAiProvider(
                apiKey: $setting->openai_api_key,
                model: $setting->default_model
            ),
            'gemini' => new GeminiProvider(
                apiKey: $setting->gemini_api_key,
                model: $setting->default_model
            ),
            'ollama' => new OllamaProvider(
                baseUrl: $setting->ollama_base_url ?? 'http://localhost:11434',
                model: $setting->default_model
            ),
            default => new MockAiProvider,
        };
    }
}
