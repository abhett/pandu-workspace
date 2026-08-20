<?php

namespace App\Services\Agile;

use App\Models\Project;
use App\Models\RetrospectiveItem;
use App\Models\RetrospectiveItemVote;
use App\Models\SprintRetrospective;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkflowStatus;
use Illuminate\Support\Facades\DB;

class SprintRetrospectiveService
{
    /**
     * Get format definitions and categories metadata.
     *
     * @return array<string, mixed>
     */
    public function getFormatDefinitions(): array
    {
        return [
            'what_went_well' => [
                'name' => 'What Went Well / Went Wrong',
                'description' => 'Format klasik agile: Evaluasi hal positif, kekurangan, dan aksi perbaikan tim.',
                'categories' => [
                    ['key' => 'went_well', 'label' => 'Hal yang Berjalan Baik', 'color' => 'emerald', 'icon' => 'Smile'],
                    ['key' => 'went_wrong', 'label' => 'Perlu Ditingkatkan', 'color' => 'rose', 'icon' => 'Frown'],
                    ['key' => 'action_item', 'label' => 'Rencana Aksi Perbaikan', 'color' => 'blue', 'icon' => 'CheckCircle'],
                    ['key' => 'kudos', 'label' => 'Apresiasi & Kudus', 'color' => 'purple', 'icon' => 'Sparkles'],
                ],
            ],
            'start_stop_continue' => [
                'name' => 'Start / Stop / Continue',
                'description' => 'Fokus pada perilaku tim dan proses kerja yang harus diinisiasi, dihentikan, atau dipertahankan.',
                'categories' => [
                    ['key' => 'start', 'label' => 'Mulai Lakukan (Start)', 'color' => 'emerald', 'icon' => 'Play'],
                    ['key' => 'stop', 'label' => 'Hentikan (Stop)', 'color' => 'rose', 'icon' => 'Square'],
                    ['key' => 'continue', 'label' => 'Lanjutkan (Continue)', 'color' => 'blue', 'icon' => 'Repeat'],
                    ['key' => 'action_item', 'label' => 'Rencana Aksi', 'color' => 'amber', 'icon' => 'CheckCircle'],
                ],
            ],
            'mad_sad_glad' => [
                'name' => 'Mad / Sad / Glad',
                'description' => 'Format refleksi emosi dan sentimen tim selama siklus sprint berjalan.',
                'categories' => [
                    ['key' => 'glad', 'label' => 'Gembira & Puas (Glad)', 'color' => 'emerald', 'icon' => 'Smile'],
                    ['key' => 'sad', 'label' => 'Kecewa / Kurang Puas (Sad)', 'color' => 'amber', 'icon' => 'Meh'],
                    ['key' => 'mad', 'label' => 'Frustrasi / Isu Kritis (Mad)', 'color' => 'rose', 'icon' => 'AlertOctagon'],
                    ['key' => 'action_item', 'label' => 'Rencana Aksi', 'color' => 'blue', 'icon' => 'CheckCircle'],
                ],
            ],
            'sailor_boat' => [
                'name' => 'Sailboat Retrospective',
                'description' => 'Metafora perahu layar untuk memetakan visi, akselerator, hambatan, dan risiko karang.',
                'categories' => [
                    ['key' => 'wind', 'label' => 'Angin Pendorong (Wind)', 'color' => 'emerald', 'icon' => 'Wind'],
                    ['key' => 'anchor', 'label' => 'Jangkar Penghambat (Anchor)', 'color' => 'rose', 'icon' => 'Anchor'],
                    ['key' => 'rocks', 'label' => 'Batu Karang Risiko (Rocks)', 'color' => 'amber', 'icon' => 'AlertTriangle'],
                    ['key' => 'island', 'label' => 'Pulau Tujuan (Island)', 'color' => 'blue', 'icon' => 'Compass'],
                    ['key' => 'action_item', 'label' => 'Rencana Aksi', 'color' => 'purple', 'icon' => 'CheckCircle'],
                ],
            ],
        ];
    }

    /**
     * Get aggregate retrospectives index summary for a project.
     *
     * @return array<string, mixed>
     */
    public function getProjectRetrospectives(Project $project): array
    {
        $retros = SprintRetrospective::where('project_id', $project->id)
            ->with(['sprint', 'facilitator', 'items'])
            ->orderByDesc('created_at')
            ->get();

        $totalSessions = $retros->count();
        $totalItems = 0;
        $totalActionItems = 0;
        $completedActionItems = 0;
        $sentimentScores = [];
        $totalKudos = 0;

        $retroList = $retros->map(function ($r) use (&$totalItems, &$totalActionItems, &$completedActionItems, &$sentimentScores, &$totalKudos) {
            $items = $r->items;
            $itemsCount = $items->count();
            $totalItems += $itemsCount;

            $actions = $items->where('is_action_item', true);
            $actionsCount = $actions->count();
            $totalActionItems += $actionsCount;

            $completedActions = $actions->where('action_status', 'completed')->count();
            $completedActionItems += $completedActions;

            $kudosCount = $items->where('category', 'kudos')->count();
            $totalKudos += $kudosCount;

            if ($r->sentiment_score !== null) {
                $sentimentScores[] = (float) $r->sentiment_score;
            }

            return [
                'id' => $r->id,
                'title' => $r->title,
                'format' => $r->format,
                'status' => $r->status,
                'is_anonymous' => (bool) $r->is_anonymous,
                'sentiment_score' => $r->sentiment_score ? (float) $r->sentiment_score : null,
                'summary_notes' => $r->summary_notes,
                'sprint' => $r->sprint ? [
                    'id' => $r->sprint->id,
                    'name' => $r->sprint->name,
                    'status' => $r->sprint->status,
                ] : null,
                'facilitator' => $r->facilitator ? [
                    'id' => $r->facilitator->id,
                    'name' => $r->facilitator->name,
                    'avatar' => $r->facilitator->avatar,
                ] : null,
                'items_count' => $itemsCount,
                'action_items_count' => $actionsCount,
                'completed_action_items_count' => $completedActions,
                'created_at' => $r->created_at->toIso8601String(),
            ];
        })->values()->all();

        $avgSentiment = ! empty($sentimentScores)
            ? round(array_sum($sentimentScores) / count($sentimentScores), 2)
            : 0.0;

        $actionCompletionRate = $totalActionItems > 0
            ? round(($completedActionItems / $totalActionItems) * 100, 1)
            : 100.0;

        return [
            'metrics' => [
                'total_sessions' => $totalSessions,
                'total_action_items' => $totalActionItems,
                'completed_action_items' => $completedActionItems,
                'action_completion_rate' => $actionCompletionRate,
                'average_sentiment_score' => $avgSentiment,
                'total_kudos' => $totalKudos,
            ],
            'retrospectives' => $retroList,
            'format_definitions' => $this->getFormatDefinitions(),
        ];
    }

    /**
     * Get detail of a specific retrospective board.
     *
     * @return array<string, mixed>
     */
    public function getRetrospectiveDetail(SprintRetrospective $retro, ?User $currentUser = null): array
    {
        $retro->load(['project', 'sprint', 'facilitator', 'items.user', 'items.actionOwner', 'items.task.status', 'items.votes']);

        $userVotedItemIds = [];
        if ($currentUser) {
            $userVotedItemIds = RetrospectiveItemVote::where('user_id', $currentUser->id)
                ->whereIn('retrospective_item_id', $retro->items->pluck('id'))
                ->pluck('retrospective_item_id')
                ->all();
        }

        $formats = $this->getFormatDefinitions();
        $formatMeta = $formats[$retro->format] ?? $formats['what_went_well'];

        $itemsFormatted = $retro->items->map(function ($item) use ($retro, $userVotedItemIds) {
            $authorName = 'Anonim';
            $authorAvatar = null;
            if (! $retro->is_anonymous && $item->user) {
                $authorName = $item->user->name;
                $authorAvatar = $item->user->avatar;
            }

            return [
                'id' => $item->id,
                'category' => $item->category,
                'content' => $item->content,
                'votes_count' => $item->votes_count,
                'is_action_item' => (bool) $item->is_action_item,
                'action_status' => $item->action_status,
                'is_voted_by_me' => in_array($item->id, $userVotedItemIds),
                'author' => [
                    'name' => $authorName,
                    'avatar' => $authorAvatar,
                ],
                'action_owner' => $item->actionOwner ? [
                    'id' => $item->actionOwner->id,
                    'name' => $item->actionOwner->name,
                    'avatar' => $item->actionOwner->avatar,
                ] : null,
                'task' => $item->task ? [
                    'id' => $item->task->id,
                    'key' => $item->task->key,
                    'title' => $item->task->title,
                    'status' => $item->task->status?->name ?? 'Todo',
                ] : null,
                'created_at' => $item->created_at->toIso8601String(),
            ];
        })->values()->all();

        return [
            'retrospective' => [
                'id' => $retro->id,
                'title' => $retro->title,
                'format' => $retro->format,
                'status' => $retro->status,
                'is_anonymous' => (bool) $retro->is_anonymous,
                'sentiment_score' => $retro->sentiment_score ? (float) $retro->sentiment_score : null,
                'summary_notes' => $retro->summary_notes,
                'sprint' => $retro->sprint ? [
                    'id' => $retro->sprint->id,
                    'name' => $retro->sprint->name,
                ] : null,
                'facilitator' => $retro->facilitator ? [
                    'id' => $retro->facilitator->id,
                    'name' => $retro->facilitator->name,
                    'avatar' => $retro->facilitator->avatar,
                ] : null,
                'created_at' => $retro->created_at->toIso8601String(),
            ],
            'format_metadata' => $formatMeta,
            'items' => $itemsFormatted,
        ];
    }

    /**
     * Create a new retrospective session.
     *
     * @param  array<string, mixed>  $data
     */
    public function createRetrospective(Project $project, array $data, User $facilitator): SprintRetrospective
    {
        return SprintRetrospective::create([
            'project_id' => $project->id,
            'sprint_id' => $data['sprint_id'] ?? null,
            'title' => $data['title'],
            'format' => $data['format'] ?? 'what_went_well',
            'status' => $data['status'] ?? 'active',
            'facilitator_id' => $facilitator->id,
            'is_anonymous' => (bool) ($data['is_anonymous'] ?? false),
        ]);
    }

    /**
     * Update an existing retrospective session.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateRetrospective(SprintRetrospective $retro, array $data): SprintRetrospective
    {
        $retro->update([
            'title' => $data['title'] ?? $retro->title,
            'format' => $data['format'] ?? $retro->format,
            'status' => $data['status'] ?? $retro->status,
            'sprint_id' => array_key_exists('sprint_id', $data) ? $data['sprint_id'] : $retro->sprint_id,
            'is_anonymous' => array_key_exists('is_anonymous', $data) ? (bool) $data['is_anonymous'] : $retro->is_anonymous,
            'sentiment_score' => array_key_exists('sentiment_score', $data) ? $data['sentiment_score'] : $retro->sentiment_score,
            'summary_notes' => array_key_exists('summary_notes', $data) ? $data['summary_notes'] : $retro->summary_notes,
        ]);

        return $retro->fresh();
    }

    /**
     * Close a retrospective session with sentiment score and summary notes.
     */
    public function closeRetrospective(SprintRetrospective $retro, ?float $sentimentScore, ?string $summaryNotes): SprintRetrospective
    {
        $retro->update([
            'status' => 'closed',
            'sentiment_score' => $sentimentScore,
            'summary_notes' => $summaryNotes,
        ]);

        return $retro->fresh();
    }

    /**
     * Create a feedback item inside a retrospective.
     *
     * @param  array<string, mixed>  $data
     */
    public function createItem(SprintRetrospective $retro, array $data, ?User $user = null): RetrospectiveItem
    {
        $isAction = ($data['category'] === 'action_item') || (bool) ($data['is_action_item'] ?? false);

        return RetrospectiveItem::create([
            'retrospective_id' => $retro->id,
            'user_id' => $user?->id,
            'category' => $data['category'],
            'content' => $data['content'],
            'votes_count' => 0,
            'is_action_item' => $isAction,
            'action_owner_id' => $data['action_owner_id'] ?? null,
            'action_status' => $isAction ? 'pending' : 'pending',
        ]);
    }

    /**
     * Delete a feedback item.
     */
    public function deleteItem(RetrospectiveItem $item): bool
    {
        return (bool) $item->delete();
    }

    /**
     * Toggle a dot vote on a retrospective item.
     *
     * @return array<string, mixed>
     */
    public function toggleVote(RetrospectiveItem $item, User $user): array
    {
        return DB::transaction(function () use ($item, $user) {
            $existing = RetrospectiveItemVote::where('retrospective_item_id', $item->id)
                ->where('user_id', $user->id)
                ->first();

            if ($existing) {
                $existing->delete();
                $item->decrement('votes_count');
                $isVoted = false;
            } else {
                RetrospectiveItemVote::create([
                    'retrospective_item_id' => $item->id,
                    'user_id' => $user->id,
                    'created_at' => now(),
                ]);
                $item->increment('votes_count');
                $isVoted = true;
            }

            return [
                'success' => true,
                'is_voted' => $isVoted,
                'votes_count' => (int) $item->fresh()->votes_count,
            ];
        });
    }

    /**
     * Convert an action item to a real project task.
     *
     * @param  array<string, mixed>  $taskData
     */
    public function convertActionItemToTask(RetrospectiveItem $item, array $taskData, User $creator): Task
    {
        $retro = $item->retrospective;
        $project = $retro->project;

        $defaultStatus = WorkflowStatus::where('project_id', $project->id)
            ->where('category', 'todo')
            ->orderBy('position')
            ->first();

        if (! $defaultStatus) {
            $defaultStatus = WorkflowStatus::whereHas('workflow', fn ($q) => $q->where('organization_id', $project->organization_id))
                ->where('category', 'todo')
                ->first();
        }

        $nextSeq = (Task::where('project_id', $project->id)->max('sequence_number') ?? 0) + 1;
        $taskKey = "{$project->key}-{$nextSeq}";

        return DB::transaction(function () use ($item, $project, $defaultStatus, $nextSeq, $taskKey, $taskData, $creator) {
            $task = Task::create([
                'organization_id' => $project->organization_id,
                'project_id' => $project->id,
                'status_id' => $defaultStatus?->id,
                'sequence_number' => $nextSeq,
                'key' => $taskKey,
                'title' => $taskData['title'] ?? $item->content,
                'description' => "Dibuat otomatis dari Action Item Sesi Retrospektif: {$item->retrospective->title}\n\nCatatan Asli:\n{$item->content}",
                'type' => $taskData['type'] ?? 'task',
                'priority' => $taskData['priority'] ?? 'medium',
                'rank' => '0|hzzzzz:',
            ]);

            if (! empty($taskData['assignee_id'])) {
                $task->assignees()->attach($taskData['assignee_id'], [
                    'assigned_at' => now(),
                    'assigned_by' => $creator->id,
                ]);
            }

            $item->update([
                'task_id' => $task->id,
                'action_status' => 'in_progress',
            ]);

            return $task;
        });
    }
}
