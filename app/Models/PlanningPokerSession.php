<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlanningPokerSession extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'planning_poker_sessions';

    protected $fillable = [
        'project_id',
        'sprint_id',
        'moderator_id',
        'title',
        'card_deck_type',
        'active_task_id',
        'status',
        'consensus_points',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'consensus_points' => 'float',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function sprint(): BelongsTo
    {
        return $this->belongsTo(Sprint::class);
    }

    public function moderator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderator_id');
    }

    public function activeTask(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'active_task_id');
    }

    public function votes(): HasMany
    {
        return $this->hasMany(PlanningPokerVote::class, 'session_id');
    }
}
