<?php

namespace App\Services\Ai\Capabilities;

use App\Models\Project;
use App\Models\User;
use App\Services\Ai\AiGatewayService;
use App\Services\Ai\Dto\AiRequest;
use App\Services\Ai\Dto\AiResponse;

class AcceptanceCriteriaCapability
{
    public function __construct(
        protected AiGatewayService $gateway
    ) {}

    public function generate(Project $project, User $user, array $taskData): AiResponse
    {
        $title = $taskData['title'] ?? 'Task';
        $description = $taskData['description'] ?? 'Tidak ada deskripsi detail.';
        $type = $taskData['type'] ?? 'task';

        $prompt = <<<PROMPT
Buatkan kriteria penerimaan (Acceptance Criteria) standar industri berbasis format Given-When-Then (Gherkin/BDD) untuk tugas berikut:

Proyek: {$project->name} ({$project->key})
Judul Tugas: {$title}
Tipe: {$type}
Deskripsi:
{$description}

Berikan daftar kriteria penerimaan dalam format JSON sesuai skema:
- criteria_list: array of string (Setiap string berformat "Given ..., When ..., Then ...")
- edge_cases: array of string (Skenario batas, error handling, dan keamanan yang perlu diuji)
PROMPT;

        $jsonSchema = [
            'type' => 'object',
            'properties' => [
                'criteria_list' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                ],
                'edge_cases' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                ],
            ],
            'required' => ['criteria_list', 'edge_cases'],
        ];

        $request = new AiRequest(
            organization: $project->organization,
            user: $user,
            capability: 'acceptance_criteria',
            prompt: $prompt,
            systemPrompt: 'Anda adalah seorang QA Automation Architect & Product Owner profesional. Buat kriteria pengujian yang presisi, dapat diuji secara otomatis, dan komprehensif.',
            jsonSchema: $jsonSchema,
            project: $project
        );

        return $this->gateway->execute($request);
    }
}
