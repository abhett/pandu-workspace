<?php

namespace App\Services\Ai\Contracts;

interface AiProviderInterface
{
    /**
     * Get the identifier name of the provider (e.g. mock, openai, gemini, ollama).
     */
    public function getName(): string;

    /**
     * Generate raw text response for the given prompt.
     *
     * @param  array<string, mixed>  $options
     * @return array{content: string, prompt_tokens: int, completion_tokens: int, total_tokens: int, cost_estimate: float}
     */
    public function generate(string $prompt, array $options = []): array;

    /**
     * Generate a structured JSON response matching the given JSON schema.
     *
     * @param  array<string, mixed>  $jsonSchema
     * @param  array<string, mixed>  $options
     * @return array{data: array<string, mixed>, raw_content: string, prompt_tokens: int, completion_tokens: int, total_tokens: int, cost_estimate: float}
     */
    public function generateStructured(string $prompt, array $jsonSchema, array $options = []): array;
}
