<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectForecastScenario extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'project_forecast_scenarios';

    protected $fillable = [
        'project_id',
        'created_by',
        'title',
        'target_scope_type',
        'target_points',
        'simulation_runs',
        'historical_sprints_count',
        'sprint_duration_days',
        'start_date',
        'results',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'target_points' => 'float',
            'simulation_runs' => 'integer',
            'historical_sprints_count' => 'integer',
            'sprint_duration_days' => 'integer',
            'start_date' => 'date',
            'results' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
