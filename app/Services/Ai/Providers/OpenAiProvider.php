<?php

namespace App\Services\Ai\Providers;

use App\Services\Ai\Contracts\AiProviderInterface;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OpenAiProvider implements AiProviderInterface
{
    public function __construct(
        protected ?string $apiKey = null,
        protected string $model = 'gpt-4o-mini',
        protected ?string $baseUrl = null
    ) {}

    public function getName(): string
    {
        return 'openai';
    }

    public function generate(string $prompt, array $options = []): array
    {
        $apiKey = $options['api_key'] ?? $this->apiKey;
        $model = $options['model'] ?? $this->model;
        $baseUrl = rtrim($options['base_url'] ?? $this->baseUrl ?? 'https://api.openai.com/v1', '/');

        if (empty($apiKey)) {
            throw new RuntimeException('OpenAI API Key belum dikonfigurasi untuk organisasi ini.');
        }

        $response = Http::withToken($apiKey)
            ->timeout(30)
            ->post("{$baseUrl}/chat/completions", [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'temperature' => $options['temperature'] ?? 0.3,
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('OpenAI API Error: '.$response->body());
        }

        $json = $response->json();
        $content = $json['choices'][0]['message']['content'] ?? '';
        $usage = $json['usage'] ?? [];

        $promptTokens = $usage['prompt_tokens'] ?? 0;
        $completionTokens = $usage['completion_tokens'] ?? 0;
        $totalTokens = $usage['total_tokens'] ?? ($promptTokens + $completionTokens);

        // Approximate pricing for gpt-4o-mini ($0.15/1M input, $0.60/1M output)
        $cost = ($promptTokens * 0.00000015) + ($completionTokens * 0.00000060);

        return [
            'content' => $content,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'total_tokens' => $totalTokens,
            'cost_estimate' => $cost,
        ];
    }

    public function generateStructured(string $prompt, array $jsonSchema, array $options = []): array
    {
        $apiKey = $options['api_key'] ?? $this->apiKey;
        $model = $options['model'] ?? $this->model;
        $baseUrl = rtrim($options['base_url'] ?? $this->baseUrl ?? 'https://api.openai.com/v1', '/');

        if (empty($apiKey)) {
            throw new RuntimeException('OpenAI API Key belum dikonfigurasi untuk organisasi ini.');
        }

        $systemPrompt = 'You are an expert AI work management assistant. You MUST respond with valid JSON strictly adhering to the schema.';

        $response = Http::withToken($apiKey)
            ->timeout(45)
            ->post("{$baseUrl}/chat/completions", [
                'model' => $model,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $prompt],
                ],
                'response_format' => ['type' => 'json_object'],
                'temperature' => 0.2,
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('OpenAI API Error: '.$response->body());
        }

        $json = $response->json();
        $rawContent = $json['choices'][0]['message']['content'] ?? '{}';
        $usage = $json['usage'] ?? [];

        $parsedData = json_decode($rawContent, true) ?: [];

        $promptTokens = $usage['prompt_tokens'] ?? 0;
        $completionTokens = $usage['completion_tokens'] ?? 0;
        $totalTokens = $usage['total_tokens'] ?? ($promptTokens + $completionTokens);
        $cost = ($promptTokens * 0.00000015) + ($completionTokens * 0.00000060);

        return [
            'data' => $parsedData,
            'raw_content' => $rawContent,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'total_tokens' => $totalTokens,
            'cost_estimate' => $cost,
        ];
    }
}
