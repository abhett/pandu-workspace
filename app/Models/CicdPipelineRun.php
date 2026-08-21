<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CicdPipelineRun extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'cicd_pipeline_runs';

    protected $fillable = [
        'pipeline_config_id',
        'organization_id',
        'project_id',
        'run_number',
        'environment',
        'status',
        'branch',
        'commit_sha',
        'commit_message',
        'author_name',
        'trigger_type',
        'stages',
        'duration_seconds',
        'gate_approved_by',
        'gate_approved_at',
        'gate_notes',
        'started_at',
        'finished_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'run_number' => 'integer',
            'stages' => 'array',
            'duration_seconds' => 'integer',
            'gate_approved_at' => 'datetime',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function pipelineConfig(): BelongsTo
    {
        return $this->belongsTo(CicdPipelineConfig::class, 'pipeline_config_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'gate_approved_by');
    }
}
