<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProjectRisk extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'project_id',
        'title',
        'description',
        'category',
        'probability',
        'impact',
        'exposure_score',
        'risk_level',
        'status',
        'mitigation_strategy',
        'contingency_plan',
        'owner_id',
        'task_id',
        'identified_date',
        'target_resolution_date',
    ];

    protected function casts(): array
    {
        return [
            'probability' => 'integer',
            'impact' => 'integer',
            'exposure_score' => 'integer',
            'identified_date' => 'date',
            'target_resolution_date' => 'date',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function actionLogs(): HasMany
    {
        return $this->hasMany(RiskActionLog::class, 'risk_id')->latest('created_at');
    }
}
