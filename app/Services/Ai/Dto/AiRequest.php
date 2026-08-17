<?php

namespace App\Services\Ai\Dto;

use App\Models\Organization;
use App\Models\Project;
use App\Models\User;

class AiRequest
{
    /**
     * @param  array<string, mixed>|null  $jsonSchema
     * @param  array<string, mixed>  $options
     */
    public function __construct(
        public Organization $organization,
        public User $user,
        public string $capability,
        public string $prompt,
        public ?string $systemPrompt = null,
        public ?array $jsonSchema = null,
        public ?Project $project = null,
        public ?string $providerOverride = null,
        public ?string $modelOverride = null,
        public array $options = []
    ) {}
}
