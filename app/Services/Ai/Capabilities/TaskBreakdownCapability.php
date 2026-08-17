<?php

namespace App\Services\Ai\Capabilities;

use App\Models\Project;
use App\Models\User;
use App\Services\Ai\AiGatewayService;
use App\Services\Ai\Dto\AiRequest;
use App\Services\Ai\Dto\AiResponse;

class TaskBreakdownCapability
{
    public function __construct(
        protected AiGatewayService $gateway
    ) {}

    public function generate(Project $project, User $user, array $taskData): AiResponse
    {
        $title = $taskData['title'] ?? 'Task';
        $description = $taskData['description'] ?? 'Tidak ada deskripsi detail.';
        $type = $taskData['type'] ?? 'task';
        $priority = $taskData['priority'] ?? 'medium';

        $prompt = <<<PROMPT
Dekomposisi tugas kerja (work item) berikut menjadi beberapa subtask yang logis, modular, dan siap dieksekusi oleh tim pengembang:

Proyek: {$project->name} ({$project->key})
Judul Tugas: {$title}
Tipe: {$type}
Prioritas: {$priority}
Deskripsi:
{$description}

Berikan usulan dekomposisi subtask dalam format JSON sesuai skema:
- suggested_subtasks: array objek { title, type, priority, estimate_points }
- total_estimated_points: float/number
- complexity_level: string (low, moderate, high, very_high)
PROMPT;

        $jsonSchema = [
            'type' => 'object',
            'properties' => [
                'suggested_subtasks' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'title' => ['type' => 'string'],
                            'type' => ['type' => 'string'],
                            'priority' => ['type' => 'string'],
                            'estimate_points' => ['type' => 'number'],
                        ],
                        'required' => ['title', 'type', 'priority', 'estimate_points'],
                    ],
                ],
                'total_estimated_points' => ['type' => 'number'],
                'complexity_level' => ['type' => 'string'],
            ],
            'required' => ['suggested_subtasks', 'total_estimated_points', 'complexity_level'],
        ];

        $request = new AiRequest(
            organization: $project->organization,
            user: $user,
            capability: 'task_breakdown',
            prompt: $prompt,
            systemPrompt: 'Anda adalah seorang Technical Lead dan Software Architect berpengalaman. Pecah tugas menjadi langkah-langkah implementasi teknis yang jelas.',
            jsonSchema: $jsonSchema,
            project: $project
        );

        return $this->gateway->execute($request);
    }
}
