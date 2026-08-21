<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class OkrKeyResult extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'okr_key_results';

    protected $fillable = [
        'objective_id',
        'owner_id',
        'title',
        'metric_type',
        'initial_value',
        'current_value',
        'target_value',
        'unit',
        'weight',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'initial_value' => 'float',
            'current_value' => 'float',
            'target_value' => 'float',
            'weight' => 'float',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function objective(): BelongsTo
    {
        return $this->belongsTo(OkrObjective::class, 'objective_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function linkedTasks(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'okr_key_result_tasks', 'key_result_id', 'task_id')
            ->withTimestamps();
    }

    /**
     * Calculate completion percentage (0 - 100).
     */
    public function getProgressPercentageAttribute(): float
    {
        $range = $this->target_value - $this->initial_value;
        if ($range == 0) {
            return $this->current_value >= $this->target_value ? 100.0 : 0.0;
        }

        $progress = (($this->current_value - $this->initial_value) / $range) * 100;

        return (float) max(0.0, min(100.0, round($progress, 1)));
    }
}
