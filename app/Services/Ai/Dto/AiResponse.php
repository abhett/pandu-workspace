<?php

namespace App\Services\Ai\Dto;

class AiResponse
{
    /**
     * @param  array<string, mixed>|null  $structuredData
     */
    public function __construct(
        public bool $success,
        public string $provider,
        public string $model,
        public ?string $content = null,
        public ?array $structuredData = null,
        public int $promptTokens = 0,
        public int $completionTokens = 0,
        public int $totalTokens = 0,
        public float $costEstimate = 0.0,
        public int $latencyMs = 0,
        public string $status = 'success',
        public ?string $errorMessage = null
    ) {}

    public static function failed(string $provider, string $model, string $errorMessage, string $status = 'failed'): self
    {
        return new self(
            success: false,
            provider: $provider,
            model: $model,
            status: $status,
            errorMessage: $errorMessage
        );
    }
}
