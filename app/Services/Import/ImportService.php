<?php

namespace App\Services\Import;

use App\Models\ImportJob;
use App\Models\Organization;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\Task\TaskService;
use Exception;
use Illuminate\Support\Carbon;
use InvalidArgumentException;

class ImportService
{
    public function __construct(
        protected TaskService $taskService
    ) {}

    /**
     * Parse raw source content (CSV or JSON) into structured headers and rows.
     *
     * @return array<string, mixed>
     */
    public function parseSourceData(string $content, string $sourceType = 'csv'): array
    {
        $content = trim($content);
        if (empty($content)) {
            throw new InvalidArgumentException('Konten data impor kosong.');
        }

        if ($sourceType === 'json' || $sourceType === 'trello' || str_starts_with($content, '{') || str_starts_with($content, '[')) {
            return $this->parseJsonContent($content, $sourceType);
        }

        return $this->parseCsvContent($content);
    }

    /**
     * Parse CSV string into headers and rows.
     *
     * @return array<string, mixed>
     */
    protected function parseCsvContent(string $content): array
    {
        $lines = preg_split('/\r\n|\r|\n/', $content);
        $lines = array_values(array_filter($lines, fn ($l) => trim($l) !== ''));

        if (empty($lines)) {
            throw new InvalidArgumentException('File CSV tidak memiliki baris data.');
        }

        // Parse Header
        $firstLine = array_shift($lines);
        $delimiter = str_contains($firstLine, ';') ? ';' : (str_contains($firstLine, "\t") ? "\t" : ',');
        $headers = str_getcsv($firstLine, $delimiter);
        $headers = array_map(fn ($h) => trim($h, " \t\n\r\0\x0B\"'"), $headers);

        $rows = [];
        foreach ($lines as $lineIndex => $line) {
            $parsed = str_getcsv($line, $delimiter);
            if (count($parsed) === 0 || (count($parsed) === 1 && $parsed[0] === null)) {
                continue;
            }

            $rowObj = [];
            foreach ($headers as $colIdx => $colName) {
                $rowObj[$colName] = $parsed[$colIdx] ?? '';
            }
            $rows[] = $rowObj;
        }

        $suggestedMappings = $this->generateDefaultMappings($headers);

        return [
            'source_type' => 'csv',
            'headers' => $headers,
            'total_rows' => count($rows),
            'rows' => $rows,
            'sample_rows' => array_slice($rows, 0, 5),
            'suggested_mappings' => $suggestedMappings,
        ];
    }

    /**
     * Parse JSON string into headers and rows.
     *
     * @return array<string, mixed>
     */
    protected function parseJsonContent(string $content, string $sourceType): array
    {
        $decoded = json_decode($content, true);
        if ($decoded === null) {
            throw new InvalidArgumentException('Format JSON tidak valid.');
        }

        $rows = [];

        // Support Trello export structure
        if (isset($decoded['cards']) && is_array($decoded['cards'])) {
            foreach ($decoded['cards'] as $card) {
                if (isset($card['closed']) && $card['closed'] === true) {
                    continue;
                }
                $rows[] = [
                    'title' => $card['name'] ?? '',
                    'description' => $card['desc'] ?? '',
                    'due_date' => $card['due'] ?? '',
                    'is_milestone' => false,
                ];
            }
        } elseif (isset($decoded['issues']) && is_array($decoded['issues'])) {
            // Support Jira export structure
            foreach ($decoded['issues'] as $issue) {
                $fields = $issue['fields'] ?? $issue;
                $rows[] = [
                    'title' => $fields['summary'] ?? $issue['key'] ?? '',
                    'description' => is_string($fields['description'] ?? null) ? $fields['description'] : '',
                    'priority' => $fields['priority']['name'] ?? 'medium',
                    'due_date' => $fields['duedate'] ?? '',
                    'story_points' => $fields['customfield_10016'] ?? $fields['story_points'] ?? '',
                    'status' => $fields['status']['name'] ?? '',
                ];
            }
        } elseif (is_array($decoded)) {
            // Generic array of objects
            $items = isset($decoded['data']) && is_array($decoded['data']) ? $decoded['data'] : $decoded;
            foreach ($items as $item) {
                if (is_array($item)) {
                    $rows[] = $item;
                }
            }
        }

        if (empty($rows)) {
            throw new InvalidArgumentException('Tidak ditemukan data tugas dalam file JSON.');
        }

        // Collect all unique keys as headers
        $headers = [];
        foreach ($rows as $r) {
            foreach (array_keys($r) as $k) {
                if (! in_array($k, $headers, true)) {
                    $headers[] = $k;
                }
            }
        }

        $suggestedMappings = $this->generateDefaultMappings($headers);

        return [
            'source_type' => $sourceType,
            'headers' => $headers,
            'total_rows' => count($rows),
            'rows' => $rows,
            'sample_rows' => array_slice($rows, 0, 5),
            'suggested_mappings' => $suggestedMappings,
        ];
    }

    /**
     * Generate smart field mapping recommendations based on column name heuristics.
     *
     * @param  array<string>  $headers
     * @return array<string, string>
     */
    public function generateDefaultMappings(array $headers): array
    {
        $mappings = [];

        $synonyms = [
            'title' => ['title', 'summary', 'issue_title', 'task_name', 'name', 'subject', 'card_name', 'judul', 'nama_tugas'],
            'description' => ['description', 'details', 'body', 'notes', 'desc', 'deskripsi', 'keterangan'],
            'priority' => ['priority', 'severity', 'urgency', 'importance', 'prioritas', 'tingkat_urgensi'],
            'story_points' => ['story_points', 'estimate', 'points', 'story points', 'estimation', 'effort', 'poin', 'bobot'],
            'start_date' => ['start_date', 'start date', 'started_at', 'begin_date', 'tanggal_mulai'],
            'due_date' => ['due_date', 'due date', 'deadline', 'target_date', 'due', 'tenggat_waktu', 'tanggal_selesai'],
            'status' => ['status', 'stage', 'column', 'state', 'workflow_status', 'tahap'],
            'assignee' => ['assignee', 'assigned_to', 'owner', 'member', 'responsible', 'penanggung_jawab', 'pelaksana'],
            'is_milestone' => ['is_milestone', 'milestone', 'is milestone', 'deliverable', 'tonggak_capaian'],
        ];

        foreach ($headers as $header) {
            $normalized = strtolower(str_replace(['_', '-', ' '], '', $header));

            foreach ($synonyms as $targetField => $aliases) {
                foreach ($aliases as $alias) {
                    $normalizedAlias = strtolower(str_replace(['_', '-', ' '], '', $alias));
                    if ($normalized === $normalizedAlias || str_contains($normalized, $normalizedAlias)) {
                        if (! in_array($targetField, $mappings, true)) {
                            $mappings[$header] = $targetField;
                            break 2;
                        }
                    }
                }
            }
        }

        return $mappings;
    }

    /**
     * Execute batch import of tasks into target project.
     *
     * @param  array<string, string>  $mappings  [sourceHeader => targetField]
     * @param  array<array<string, mixed>>  $rows
     * @return array<string, mixed>
     */
    public function executeImport(
        Organization $organization,
        Project $project,
        User $actor,
        array $mappings,
        array $rows,
        string $sourceType = 'csv'
    ): array {
        // Reverse mappings: targetField => sourceHeader
        $fieldToHeader = array_flip($mappings);

        if (! isset($fieldToHeader['title'])) {
            throw new InvalidArgumentException('Kolom "Judul Tugas (Title)" wajib dipetakan sebelum melakukan impor.');
        }

        $titleHeader = $fieldToHeader['title'];
        $descHeader = $fieldToHeader['description'] ?? null;
        $priorityHeader = $fieldToHeader['priority'] ?? null;
        $pointsHeader = $fieldToHeader['story_points'] ?? null;
        $startHeader = $fieldToHeader['start_date'] ?? null;
        $dueHeader = $fieldToHeader['due_date'] ?? null;
        $statusHeader = $fieldToHeader['status'] ?? null;
        $assigneeHeader = $fieldToHeader['assignee'] ?? null;
        $milestoneHeader = $fieldToHeader['is_milestone'] ?? null;

        // Pre-fetch available statuses & members in the project
        $statuses = $project->statuses()->get();
        $defaultStatusId = $project->statuses()->where('is_initial', true)->value('id')
            ?? $project->statuses()->orderBy('position')->value('id');

        $members = $project->members()->get();

        $imported = 0;
        $failed = 0;
        $errors = [];

        $createdTaskIds = [];

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 1;

            $title = trim((string) ($row[$titleHeader] ?? ''));
            if ($title === '') {
                $failed++;
                $errors[] = [
                    'row' => $rowNumber,
                    'message' => 'Judul tugas kosong.',
                ];

                continue;
            }

            try {
                // Determine description
                $description = $descHeader && isset($row[$descHeader]) ? trim((string) $row[$descHeader]) : null;

                // Determine priority
                $rawPriority = $priorityHeader && isset($row[$priorityHeader]) ? strtolower(trim((string) $row[$priorityHeader])) : 'medium';
                $priority = match (true) {
                    str_contains($rawPriority, 'urgent') || str_contains($rawPriority, 'crit') || str_contains($rawPriority, 'block') => 'urgent',
                    str_contains($rawPriority, 'high') || str_contains($rawPriority, 'tinggi') => 'high',
                    str_contains($rawPriority, 'low') || str_contains($rawPriority, 'rendah') => 'low',
                    default => 'medium',
                };

                // Determine Story points
                $points = null;
                if ($pointsHeader && isset($row[$pointsHeader]) && is_numeric(trim((string) $row[$pointsHeader]))) {
                    $points = (float) trim((string) $row[$pointsHeader]);
                }

                // Determine Dates
                $startDate = null;
                if ($startHeader && ! empty($row[$startHeader])) {
                    try {
                        $startDate = Carbon::parse($row[$startHeader])->toDateString();
                    } catch (Exception) {
                        $startDate = null;
                    }
                }

                $dueDate = null;
                if ($dueHeader && ! empty($row[$dueHeader])) {
                    try {
                        $dueDate = Carbon::parse($row[$dueHeader])->toDateString();
                    } catch (Exception) {
                        $dueDate = null;
                    }
                }

                // Determine Status
                $statusId = $defaultStatusId;
                if ($statusHeader && ! empty($row[$statusHeader])) {
                    $rawStatus = strtolower(trim((string) $row[$statusHeader]));
                    $matchedStatus = $statuses->first(function ($s) use ($rawStatus) {
                        return strtolower($s->name) === $rawStatus || strtolower($s->category) === $rawStatus;
                    });
                    if ($matchedStatus) {
                        $statusId = $matchedStatus->id;
                    }
                }

                // Determine Assignees
                $assigneeIds = [];
                if ($assigneeHeader && ! empty($row[$assigneeHeader])) {
                    $rawAssignee = strtolower(trim((string) $row[$assigneeHeader]));
                    $matchedMember = $members->first(function ($m) use ($rawAssignee) {
                        return strtolower($m->name) === $rawAssignee || strtolower($m->email) === $rawAssignee;
                    });
                    if ($matchedMember) {
                        $assigneeIds = [$matchedMember->id];
                    }
                }

                // Determine Milestone
                $isMilestone = false;
                if ($milestoneHeader && isset($row[$milestoneHeader])) {
                    $val = strtolower(trim((string) $row[$milestoneHeader]));
                    $isMilestone = in_array($val, ['1', 'true', 'yes', 'ya', 'milestone'], true);
                }

                // Create Task via TaskService
                $task = $this->taskService->create($project, $actor, [
                    'title' => $title,
                    'description' => $description,
                    'status_id' => $statusId,
                    'priority' => $priority,
                    'story_points' => $points,
                    'start_date' => $startDate,
                    'due_date' => $dueDate,
                    'is_milestone' => $isMilestone,
                    'assignee_ids' => $assigneeIds,
                ]);

                $createdTaskIds[] = $task->id;
                $imported++;
            } catch (Exception $e) {
                $failed++;
                $errors[] = [
                    'row' => $rowNumber,
                    'message' => $e->getMessage(),
                ];
            }
        }

        // Record Audit Job
        $job = ImportJob::create([
            'organization_id' => $organization->id,
            'project_id' => $project->id,
            'user_id' => $actor->id,
            'source_type' => $sourceType,
            'field_mappings' => $mappings,
            'status' => $failed === 0 ? 'completed' : ($imported > 0 ? 'completed' : 'failed'),
            'total_rows' => count($rows),
            'imported_rows' => $imported,
            'failed_rows' => $failed,
            'errors' => $errors,
        ]);

        return [
            'job_id' => $job->id,
            'project_id' => $project->id,
            'project_name' => $project->name,
            'total_rows' => count($rows),
            'imported_rows' => $imported,
            'failed_rows' => $failed,
            'errors' => $errors,
            'created_task_ids' => $createdTaskIds,
        ];
    }
}
