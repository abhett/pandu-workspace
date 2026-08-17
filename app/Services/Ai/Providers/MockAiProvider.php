<?php

namespace App\Services\Ai\Providers;

use App\Services\Ai\Contracts\AiProviderInterface;

class MockAiProvider implements AiProviderInterface
{
    public function getName(): string
    {
        return 'mock';
    }

    public function generate(string $prompt, array $options = []): array
    {
        $content = 'AI Analysis response generated for: '.substr($prompt, 0, 80).'...';
        $promptTokens = max(10, (int) (strlen($prompt) / 4));
        $completionTokens = (int) (strlen($content) / 4);

        return [
            'content' => $content,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'total_tokens' => $promptTokens + $completionTokens,
            'cost_estimate' => 0.00001,
        ];
    }

    public function generateStructured(string $prompt, array $jsonSchema, array $options = []): array
    {
        $capability = $options['capability'] ?? 'default';
        $data = $this->buildMockDataForCapability($capability, $prompt);

        $rawContent = json_encode($data, JSON_PRETTY_PRINT);
        $promptTokens = max(15, (int) (strlen($prompt) / 4));
        $completionTokens = max(20, (int) (strlen($rawContent) / 4));

        return [
            'data' => $data,
            'raw_content' => $rawContent,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'total_tokens' => $promptTokens + $completionTokens,
            'cost_estimate' => 0.00002,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function buildMockDataForCapability(string $capability, string $prompt): array
    {
        switch ($capability) {
            case 'sprint_summary':
                return [
                    'executive_summary' => 'Sprint berjalan dengan stabilitas tinggi dan mencapai target utama arsitektur inti.',
                    'velocity_analysis' => 'Tim menyelesaikan sebagian besar komitmen story points dengan fluktuasi minimal.',
                    'key_achievements' => [
                        'Penyelesaian otentikasi token personal dan manajemen sesi.',
                        'Implementasi modul lampiran berkas dan streaming unduhan.',
                        'Penerapan middleware idempotency untuk seluruh endpoint mutasi data.',
                    ],
                    'identified_blockers' => [
                        'Pengujian integrasi pihak ketiga membutuhkan mock environment.',
                    ],
                    'retrospective_recommendations' => [
                        'Pertahankan pembagian tugas granular maksimum 5 story points per kartu.',
                        'Tingkatkan cakupan test concurrency pada alur pergeseran status kartu.',
                    ],
                    'overall_health_score' => 92,
                ];

            case 'task_breakdown':
                return [
                    'suggested_subtasks' => [
                        [
                            'title' => 'Buat skema migrasi basis data dan relasi tabel',
                            'type' => 'subtask',
                            'priority' => 'high',
                            'estimate_points' => 2.0,
                        ],
                        [
                            'title' => 'Implementasi controller, request validation, dan service logic',
                            'type' => 'subtask',
                            'priority' => 'medium',
                            'estimate_points' => 3.0,
                        ],
                        [
                            'title' => 'Tulis automated feature tests dan validasi edge cases',
                            'type' => 'subtask',
                            'priority' => 'medium',
                            'estimate_points' => 1.5,
                        ],
                    ],
                    'total_estimated_points' => 6.5,
                    'complexity_level' => 'moderate',
                ];

            case 'acceptance_criteria':
                return [
                    'criteria_list' => [
                        'Given user terotentikasi, When mengunggah file lampiran, Then sistem memverifikasi tipe MIME dan menyimpan file di storage terisolasi.',
                        'Given user dari organisasi lain, When mencoba mengunduh file privat, Then sistem mengembalikan respons 403 Forbidden.',
                        'Given ukuran file melebihi batas 25MB, When upload dilakukan, Then sistem menolak dengan kode status 422 Unprocessable Entity.',
                    ],
                    'edge_cases' => [
                        'Penanganan nama file dengan karakter khusus atau ekstensi ganda (.php.png).',
                    ],
                ];

            default:
                return [
                    'message' => 'Structured response generated successfully.',
                    'summary' => substr($prompt, 0, 100),
                ];
        }
    }
}
