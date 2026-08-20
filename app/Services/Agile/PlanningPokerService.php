<?php

namespace App\Services\Agile;

use App\Models\PlanningPokerSession;
use App\Models\PlanningPokerVote;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;

class PlanningPokerService
{
    /**
     * Get card deck options and values.
     *
     * @return array<string, array<string, mixed>>
     */
    public function getDeckDefinitions(): array
    {
        return [
            'fibonacci' => [
                'name' => 'Standard Fibonacci',
                'description' => '0, 1, 2, 3, 5, 8, 13, 21, 34, 55, ☕, ?',
                'cards' => [
                    ['value' => '0', 'numeric' => 0.0],
                    ['value' => '1', 'numeric' => 1.0],
                    ['value' => '2', 'numeric' => 2.0],
                    ['value' => '3', 'numeric' => 3.0],
                    ['value' => '5', 'numeric' => 5.0],
                    ['value' => '8', 'numeric' => 8.0],
                    ['value' => '13', 'numeric' => 13.0],
                    ['value' => '21', 'numeric' => 21.0],
                    ['value' => '34', 'numeric' => 34.0],
                    ['value' => '55', 'numeric' => 55.0],
                    ['value' => '☕', 'numeric' => null],
                    ['value' => '?', 'numeric' => null],
                ],
            ],
            'modified_fibonacci' => [
                'name' => 'Modified Fibonacci',
                'description' => '0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100, ☕, ?',
                'cards' => [
                    ['value' => '0', 'numeric' => 0.0],
                    ['value' => '0.5', 'numeric' => 0.5],
                    ['value' => '1', 'numeric' => 1.0],
                    ['value' => '2', 'numeric' => 2.0],
                    ['value' => '3', 'numeric' => 3.0],
                    ['value' => '5', 'numeric' => 5.0],
                    ['value' => '8', 'numeric' => 8.0],
                    ['value' => '13', 'numeric' => 13.0],
                    ['value' => '20', 'numeric' => 20.0],
                    ['value' => '40', 'numeric' => 40.0],
                    ['value' => '100', 'numeric' => 100.0],
                    ['value' => '☕', 'numeric' => null],
                    ['value' => '?', 'numeric' => null],
                ],
            ],
            't_shirt' => [
                'name' => 'T-Shirt Sizes',
                'description' => 'XS, S, M, L, XL, XXL, ?',
                'cards' => [
                    ['value' => 'XS', 'numeric' => 1.0],
                    ['value' => 'S', 'numeric' => 2.0],
                    ['value' => 'M', 'numeric' => 3.0],
                    ['value' => 'L', 'numeric' => 5.0],
                    ['value' => 'XL', 'numeric' => 8.0],
                    ['value' => 'XXL', 'numeric' => 13.0],
                    ['value' => '?', 'numeric' => null],
                ],
            ],
            'powers_of_two' => [
                'name' => 'Powers of Two',
                'description' => '1, 2, 4, 8, 16, 32, 64, ?',
                'cards' => [
                    ['value' => '1', 'numeric' => 1.0],
                    ['value' => '2', 'numeric' => 2.0],
                    ['value' => '4', 'numeric' => 4.0],
                    ['value' => '8', 'numeric' => 8.0],
                    ['value' => '16', 'numeric' => 16.0],
                    ['value' => '32', 'numeric' => 32.0],
                    ['value' => '64', 'numeric' => 64.0],
                    ['value' => '?', 'numeric' => null],
                ],
            ],
        ];
    }

    /**
     * Map card string value to numeric points based on deck.
     */
    public function resolveNumericValue(string $deckType, string $voteValue): ?float
    {
        $decks = $this->getDeckDefinitions();
        $deck = $decks[$deckType] ?? $decks['fibonacci'];

        foreach ($deck['cards'] as $card) {
            if ($card['value'] === $voteValue) {
                return $card['numeric'];
            }
        }

        return is_numeric($voteValue) ? (float) $voteValue : null;
    }

    /**
     * Get summary sessions list for a project.
     *
     * @return array<string, mixed>
     */
    public function getProjectSessions(Project $project): array
    {
        $sessions = PlanningPokerSession::where('project_id', $project->id)
            ->with(['moderator', 'sprint', 'activeTask'])
            ->withCount('votes')
            ->orderByDesc('created_at')
            ->get();

        $totalEstimatedTasks = Task::where('project_id', $project->id)
            ->whereNotNull('estimate_points')
            ->where('estimate_points', '>', 0)
            ->count();

        $unestimatedTasksCount = Task::where('project_id', $project->id)
            ->where(function ($q) {
                $q->whereNull('estimate_points')->orWhere('estimate_points', '<=', 0);
            })
            ->count();

        $completedSessions = $sessions->where('status', 'completed')->count();
        $activeSessions = $sessions->whereIn('status', ['voting', 'revealed'])->count();

        return [
            'sessions' => $sessions->map(function ($s) {
                return [
                    'id' => $s->id,
                    'title' => $s->title,
                    'card_deck_type' => $s->card_deck_type,
                    'status' => $s->status,
                    'consensus_points' => $s->consensus_points,
                    'moderator' => [
                        'id' => $s->moderator?->id,
                        'name' => $s->moderator?->name,
                        'avatar' => $s->moderator?->avatar,
                    ],
                    'sprint' => $s->sprint ? [
                        'id' => $s->sprint->id,
                        'name' => $s->sprint->name,
                    ] : null,
                    'active_task' => $s->activeTask ? [
                        'id' => $s->activeTask->id,
                        'key' => $s->activeTask->key ?? ('TASK-'.$s->activeTask->id),
                        'title' => $s->activeTask->title,
                    ] : null,
                    'votes_count' => $s->votes_count,
                    'created_at' => $s->created_at->toIso8601String(),
                ];
            })->values()->all(),
            'metrics' => [
                'total_sessions' => $sessions->count(),
                'active_sessions' => $activeSessions,
                'completed_sessions' => $completedSessions,
                'estimated_tasks' => $totalEstimatedTasks,
                'unestimated_tasks' => $unestimatedTasksCount,
            ],
            'deck_definitions' => $this->getDeckDefinitions(),
        ];
    }

    /**
     * Get detailed planning poker session state.
     *
     * @return array<string, mixed>
     */
    public function getSessionDetail(PlanningPokerSession $session, User $currentUser): array
    {
        $project = $session->project;
        $decks = $this->getDeckDefinitions();
        $deckConfig = $decks[$session->card_deck_type] ?? $decks['fibonacci'];

        // 1. Backlog & Queue of tasks
        $taskQuery = Task::where('project_id', $project->id);
        if ($session->sprint_id) {
            $taskQuery->where('sprint_id', $session->sprint_id);
        }

        $allTasks = $taskQuery->with('assignees')->get();

        $queueTasks = $allTasks->filter(fn ($t) => empty($t->estimate_points) || $t->estimate_points <= 0)
            ->map(fn ($t) => [
                'id' => $t->id,
                'key' => $t->key ?? ('TASK-'.$t->id),
                'title' => $t->title,
                'priority' => $t->priority ?? 'medium',
                'type' => $t->type ?? 'story',
                'estimate_points' => $t->estimate_points,
                'is_active' => $t->id === $session->active_task_id,
            ])->values()->all();

        $estimatedTasks = $allTasks->filter(fn ($t) => ! empty($t->estimate_points) && $t->estimate_points > 0)
            ->map(fn ($t) => [
                'id' => $t->id,
                'key' => $t->key ?? ('TASK-'.$t->id),
                'title' => $t->title,
                'estimate_points' => $t->estimate_points,
                'priority' => $t->priority ?? 'medium',
                'type' => $t->type ?? 'story',
            ])->values()->all();

        // 2. Active Task
        $activeTask = null;
        if ($session->active_task_id) {
            $task = Task::with(['assignees', 'creator'])->find($session->active_task_id);
            if ($task) {
                $activeTask = [
                    'id' => $task->id,
                    'key' => $task->key ?? ('TASK-'.$task->id),
                    'title' => $task->title,
                    'description' => $task->description,
                    'priority' => $task->priority ?? 'medium',
                    'type' => $task->type ?? 'story',
                    'estimate_points' => $task->estimate_points,
                    'assignees' => $task->assignees->map(fn ($a) => [
                        'id' => $a->id,
                        'name' => $a->name,
                        'avatar' => $a->avatar,
                    ])->all(),
                ];
            }
        }

        // 3. Votes for active task
        $votes = [];
        $statistics = [
            'total_votes' => 0,
            'average' => null,
            'median' => null,
            'min' => null,
            'max' => null,
            'has_consensus' => false,
            'suggested_points' => null,
        ];

        $myVote = null;

        if ($session->active_task_id) {
            $taskVotes = PlanningPokerVote::where('session_id', $session->id)
                ->where('task_id', $session->active_task_id)
                ->with('user')
                ->get();

            $isRevealed = $session->status === 'revealed' || $session->status === 'completed';

            foreach ($taskVotes as $v) {
                $isMyVote = $v->user_id === $currentUser->id;
                if ($isMyVote) {
                    $myVote = $v->vote_value;
                }

                $votes[] = [
                    'id' => $v->id,
                    'user' => [
                        'id' => $v->user?->id,
                        'name' => $v->user?->name ?? 'Participant',
                        'avatar' => $v->user?->avatar,
                    ],
                    'has_voted' => true,
                    // If revealed or it's my vote, reveal value; otherwise hide
                    'vote_value' => ($isRevealed || $isMyVote) ? $v->vote_value : 'HIDDEN',
                    'numeric_value' => $isRevealed ? $v->numeric_value : null,
                    'voted_at' => $v->voted_at->toIso8601String(),
                ];
            }

            // Calculate statistics if revealed
            if ($isRevealed && $taskVotes->isNotEmpty()) {
                $numericVotes = $taskVotes->pluck('numeric_value')->filter(fn ($val) => ! is_null($val))->values()->all();

                if (! empty($numericVotes)) {
                    sort($numericVotes);
                    $count = count($numericVotes);
                    $sum = array_sum($numericVotes);
                    $avg = round($sum / $count, 2);

                    $mid = floor(($count - 1) / 2);
                    $median = ($count % 2 === 0)
                        ? round(($numericVotes[$mid] + $numericVotes[$mid + 1]) / 2, 2)
                        : $numericVotes[$mid];

                    $min = min($numericVotes);
                    $max = max($numericVotes);
                    $hasConsensus = ($min === $max);

                    // Suggested point: nearest standard fibonacci/deck card or median
                    $suggested = $median;

                    $statistics = [
                        'total_votes' => $count,
                        'average' => $avg,
                        'median' => $median,
                        'min' => $min,
                        'max' => $max,
                        'has_consensus' => $hasConsensus,
                        'suggested_points' => $suggested,
                    ];
                }
            }
        }

        return [
            'session' => [
                'id' => $session->id,
                'title' => $session->title,
                'card_deck_type' => $session->card_deck_type,
                'deck_config' => $deckConfig,
                'status' => $session->status,
                'consensus_points' => $session->consensus_points,
                'is_moderator' => $session->moderator_id === $currentUser->id,
                'moderator' => [
                    'id' => $session->moderator?->id,
                    'name' => $session->moderator?->name,
                    'avatar' => $session->moderator?->avatar,
                ],
                'sprint' => $session->sprint ? [
                    'id' => $session->sprint->id,
                    'name' => $session->sprint->name,
                ] : null,
            ],
            'active_task' => $activeTask,
            'my_vote' => $myVote,
            'votes' => $votes,
            'statistics' => $statistics,
            'queue_tasks' => $queueTasks,
            'estimated_tasks' => $estimatedTasks,
        ];
    }

    /**
     * Create planning poker session.
     *
     * @param  array<string, mixed>  $data
     */
    public function createSession(Project $project, User $moderator, array $data): PlanningPokerSession
    {
        $activeTaskId = $data['active_task_id'] ?? null;

        if (! $activeTaskId) {
            // Auto pick first unestimated task in project or sprint
            $firstTask = Task::where('project_id', $project->id)
                ->when(! empty($data['sprint_id']), fn ($q) => $q->where('sprint_id', $data['sprint_id']))
                ->where(function ($q) {
                    $q->whereNull('estimate_points')->orWhere('estimate_points', '<=', 0);
                })
                ->first();

            $activeTaskId = $firstTask?->id;
        }

        return PlanningPokerSession::create([
            'project_id' => $project->id,
            'sprint_id' => $data['sprint_id'] ?? null,
            'moderator_id' => $moderator->id,
            'title' => $data['title'],
            'card_deck_type' => $data['card_deck_type'] ?? 'fibonacci',
            'active_task_id' => $activeTaskId,
            'status' => 'voting',
        ]);
    }

    /**
     * Cast or update a vote on the active task.
     */
    public function castVote(PlanningPokerSession $session, Task $task, User $user, string $voteValue): PlanningPokerVote
    {
        $numericValue = $this->resolveNumericValue($session->card_deck_type, $voteValue);

        $vote = PlanningPokerVote::where('session_id', $session->id)
            ->where('task_id', $task->id)
            ->where('user_id', $user->id)
            ->first();

        if ($vote) {
            $vote->update([
                'vote_value' => $voteValue,
                'numeric_value' => $numericValue,
                'voted_at' => now(),
            ]);

            return $vote->fresh();
        }

        return PlanningPokerVote::create([
            'session_id' => $session->id,
            'task_id' => $task->id,
            'user_id' => $user->id,
            'vote_value' => $voteValue,
            'numeric_value' => $numericValue,
            'voted_at' => now(),
        ]);
    }

    /**
     * Reveal all votes and compute consensus.
     */
    public function revealVotes(PlanningPokerSession $session): PlanningPokerSession
    {
        $session->update(['status' => 'revealed']);

        return $session->fresh();
    }

    /**
     * Reset voting for active task.
     */
    public function resetVoting(PlanningPokerSession $session): PlanningPokerSession
    {
        if ($session->active_task_id) {
            PlanningPokerVote::where('session_id', $session->id)
                ->where('task_id', $session->active_task_id)
                ->delete();
        }

        $session->update([
            'status' => 'voting',
            'consensus_points' => null,
        ]);

        return $session->fresh();
    }

    /**
     * Set active task.
     */
    public function setActiveTask(PlanningPokerSession $session, Task $task): PlanningPokerSession
    {
        $session->update([
            'active_task_id' => $task->id,
            'status' => 'voting',
            'consensus_points' => null,
        ]);

        return $session->fresh();
    }

    /**
     * Apply consensus story points to task and advance queue.
     */
    public function applyConsensusAndNext(PlanningPokerSession $session, Task $task, float $finalPoints, ?string $nextTaskId = null): Task
    {
        // 1. Update task estimate points
        $task->update([
            'estimate_points' => $finalPoints,
        ]);

        // 2. Advance to next task if provided or auto-find next unestimated task
        if (! $nextTaskId) {
            $nextTask = Task::where('project_id', $session->project_id)
                ->when($session->sprint_id, fn ($q) => $q->where('sprint_id', $session->sprint_id))
                ->where('id', '!=', $task->id)
                ->where(function ($q) {
                    $q->whereNull('estimate_points')->orWhere('estimate_points', '<=', 0);
                })
                ->first();

            $nextTaskId = $nextTask?->id;
        }

        $session->update([
            'active_task_id' => $nextTaskId,
            'status' => 'voting',
            'consensus_points' => $finalPoints,
        ]);

        return $task->fresh();
    }

    /**
     * Delete planning poker session.
     */
    public function destroySession(PlanningPokerSession $session): bool
    {
        return (bool) $session->delete();
    }
}
