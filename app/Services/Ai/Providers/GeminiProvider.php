<?php

namespace App\Services\Ai\Providers;

use App\Services\Ai\Contracts\AiProviderInterface;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiProvider implements AiProviderInterface
{
    public function __construct(
        protected ?string $apiKey = null,
        protected string $model = 'gemini-1.5-flash'
    ) {}

    public function getName(): string
    {
        return 'gemini';
    }

    public function generate(string $prompt, array $options = []): array
    {
        $apiKey = $options['api_key'] ?? $this->apiKey;
        $model = $options['model'] ?? $this->model;

        if (empty($apiKey)) {
            throw new RuntimeException('Google Gemini API Key belum dikonfigurasi untuk organisasi ini.');
        }

        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

        $response = Http::timeout(30)->post($url, [
            'contents' => [
                ['parts' => [['text' => $prompt]]],
            ],
        ]);

        if (! $response->successful()) {
            throw new RuntimeException('Gemini API Error: '.$response->body());
        }

        $json = $response->json();
        $content = $json['candidates'][0]['content']['parts'][0]['text'] ?? '';
        $usage = $json['usageMetadata'] ?? [];

        $promptTokens = $usage['promptTokenCount'] ?? 0;
        $completionTokens = $usage['candidatesTokenCount'] ?? 0;
        $totalTokens = $usage['totalTokenCount'] ?? ($promptTokens + $completionTokens);
        $cost = ($promptTokens * 0.000000075) + ($completionTokens * 0.00000030);

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

        if (empty($apiKey)) {
            throw new RuntimeException('Google Gemini API Key belum dikonfigurasi untuk organisasi ini.');
        }

        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

        $response = Http::timeout(45)->post($url, [
            'contents' => [
                ['parts' => [['text' => $prompt]]],
            ],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
            ],
        ]);

        if (! $response->successful()) {
            throw new RuntimeException('Gemini API Error: '.$response->body());
        }

        $json = $response->json();
        $rawContent = $json['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
        $usage = $json['usageMetadata'] ?? [];

        $parsedData = json_decode($rawContent, true) ?: [];

        $promptTokens = $usage['promptTokenCount'] ?? 0;
        $completionTokens = $usage['candidatesTokenCount'] ?? 0;
        $totalTokens = $usage['totalTokenCount'] ?? ($promptTokens + $completionTokens);
        $cost = ($promptTokens * 0.000000075) + ($completionTokens * 0.00000030);

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
