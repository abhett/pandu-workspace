<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RunbookExecution extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'runbook_executions';

    protected $fillable = [
        'incident_runbook_id',
        'executed_by_user_id',
        'status',
        'trigger_type',
        'execution_params',
        'step_results',
        'total_duration_ms',
        'started_at',
        'completed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'execution_params' => 'array',
            'step_results' => 'array',
            'total_duration_ms' => 'integer',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function runbook(): BelongsTo
    {
        return $this->belongsTo(IncidentRunbook::class, 'incident_runbook_id');
    }

    public function executedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'executed_by_user_id');
    }
}
