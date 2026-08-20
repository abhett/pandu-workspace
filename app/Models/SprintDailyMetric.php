<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $sprint_id
 * @property string $project_id
 * @property Carbon $date
 * @property int $total_points
 * @property int $completed_points
 * @property int $remaining_points
 * @property int $total_tasks
 * @property int $completed_tasks
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'sprint_id',
    'project_id',
    'date',
    'total_points',
    'completed_points',
    'remaining_points',
    'total_tasks',
    'completed_tasks',
])]
class SprintDailyMetric extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'total_points' => 'integer',
            'completed_points' => 'integer',
            'remaining_points' => 'integer',
            'total_tasks' => 'integer',
            'completed_tasks' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Sprint, $this>
     */
    public function sprint(): BelongsTo
    {
        return $this->belongsTo(Sprint::class);
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
