<?php

namespace App\Services\Ai\Providers;

use App\Services\Ai\Contracts\AiProviderInterface;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OllamaProvider implements AiProviderInterface
{
    public function __construct(
        protected string $baseUrl = 'http://localhost:11434',
        protected string $model = 'llama3'
    ) {}

    public function getName(): string
    {
        return 'ollama';
    }

    public function generate(string $prompt, array $options = []): array
    {
        $baseUrl = rtrim($options['base_url'] ?? $this->baseUrl, '/');
        $model = $options['model'] ?? $this->model;

        $response = Http::timeout(60)->post("{$baseUrl}/api/generate", [
            'model' => $model,
            'prompt' => $prompt,
            'stream' => false,
        ]);

        if (! $response->successful()) {
            throw new RuntimeException('Ollama Server Error: '.$response->body());
        }

        $json = $response->json();
        $content = $json['response'] ?? '';
        $promptTokens = $json['prompt_eval_count'] ?? max(10, (int) (strlen($prompt) / 4));
        $completionTokens = $json['eval_count'] ?? max(10, (int) (strlen($content) / 4));

        return [
            'content' => $content,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'total_tokens' => $promptTokens + $completionTokens,
            'cost_estimate' => 0.0, // Self-hosted local inference has 0 direct cloud API cost
        ];
    }

    public function generateStructured(string $prompt, array $jsonSchema, array $options = []): array
    {
        $baseUrl = rtrim($options['base_url'] ?? $this->baseUrl, '/');
        $model = $options['model'] ?? $this->model;

        $response = Http::timeout(60)->post("{$baseUrl}/api/generate", [
            'model' => $model,
            'prompt' => $prompt."\n\nFormat your output strictly as a JSON object.",
            'format' => 'json',
            'stream' => false,
        ]);

        if (! $response->successful()) {
            throw new RuntimeException('Ollama Server Error: '.$response->body());
        }

        $json = $response->json();
        $rawContent = $json['response'] ?? '{}';
        $parsedData = json_decode($rawContent, true) ?: [];

        $promptTokens = $json['prompt_eval_count'] ?? max(10, (int) (strlen($prompt) / 4));
        $completionTokens = $json['eval_count'] ?? max(10, (int) (strlen($rawContent) / 4));

        return [
            'data' => $parsedData,
            'raw_content' => $rawContent,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'total_tokens' => $promptTokens + $completionTokens,
            'cost_estimate' => 0.0,
        ];
    }
}
