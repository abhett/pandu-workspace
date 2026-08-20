<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskWorklog extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'project_id',
        'task_id',
        'user_id',
        'duration_minutes',
        'calculated_cost',
        'work_date',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'duration_minutes' => 'integer',
            'calculated_cost' => 'float',
            'work_date' => 'date',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
