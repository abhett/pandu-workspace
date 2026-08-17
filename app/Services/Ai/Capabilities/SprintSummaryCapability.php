<?php

namespace App\Services\Ai\Capabilities;

use App\Models\Sprint;
use App\Models\User;
use App\Services\Ai\AiGatewayService;
use App\Services\Ai\Dto\AiRequest;
use App\Services\Ai\Dto\AiResponse;

class SprintSummaryCapability
{
    public function __construct(
        protected AiGatewayService $gateway
    ) {}

    public function generate(Sprint $sprint, User $user): AiResponse
    {
        $sprint->load(['project.organization', 'tasks.status', 'tasks.assignees']);

        $tasks = $sprint->tasks;
        $totalPoints = $sprint->committed_points ?? $tasks->sum('estimate_points');
        $completedTasks = $tasks->filter(fn ($t) => $t->status?->is_completed || $t->status?->category === 'completed');
        $completedPoints = $sprint->completed_points ?? $completedTasks->sum('estimate_points');

        $taskListStr = $tasks->map(function ($t) {
            $isDone = $t->status?->is_completed ? '[SELESAI]' : '[BELUM SELESAI]';
            $pts = $t->estimate_points ? "({$t->estimate_points} SP)" : '';

            return "- {$t->key}: {$t->title} {$pts} {$isDone} (Status: {$t->status?->name})";
        })->implode("\n");

        $prompt = <<<PROMPT
Analisis sprint berikut dan berikan ringkasan retrospektif terstruktur:

Nama Sprint: {$sprint->name}
Tujuan (Goal): {$sprint->goal}
Status: {$sprint->status}
Story Points Terkomitmen: {$totalPoints}
Story Points Selesai: {$completedPoints}
Total Tugas: {$tasks->count()} (Selesai: {$completedTasks->count()})

Daftar Tugas dalam Sprint:
{$taskListStr}

Berikan analisis dalam format JSON sesuai skema berikut:
- executive_summary (string)
- velocity_analysis (string)
- key_achievements (array of strings)
- identified_blockers (array of strings)
- retrospective_recommendations (array of strings)
- overall_health_score (integer 0-100)
PROMPT;

        $jsonSchema = [
            'type' => 'object',
            'properties' => [
                'executive_summary' => ['type' => 'string'],
                'velocity_analysis' => ['type' => 'string'],
                'key_achievements' => ['type' => 'array', 'items' => ['type' => 'string']],
                'identified_blockers' => ['type' => 'array', 'items' => ['type' => 'string']],
                'retrospective_recommendations' => ['type' => 'array', 'items' => ['type' => 'string']],
                'overall_health_score' => ['type' => 'integer'],
            ],
            'required' => ['executive_summary', 'velocity_analysis', 'key_achievements', 'identified_blockers', 'retrospective_recommendations', 'overall_health_score'],
        ];

        $request = new AiRequest(
            organization: $sprint->organization,
            user: $user,
            capability: 'sprint_summary',
            prompt: $prompt,
            systemPrompt: 'Anda adalah seorang AI Agile Coach & Scrum Master profesional. Berikan analisis berbasis data yang objektif dan konstruktif.',
            jsonSchema: $jsonSchema,
            project: $sprint->project
        );

        return $this->gateway->execute($request);
    }
}
