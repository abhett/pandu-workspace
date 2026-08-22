<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeploymentPipeline extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'deployment_pipelines';

    protected $fillable = [
        'organization_id',
        'project_id',
        'title',
        'version_tag',
        'commit_sha',
        'repository_url',
        'environments',
        'risk_score',
        'risk_factors',
        'current_environment',
        'status',
        'auto_rollback_enabled',
        'rollback_threshold_pct',
        'deployed_by',
        'started_at',
        'completed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'environments' => 'array',
            'risk_factors' => 'array',
            'risk_score' => 'float',
            'rollback_threshold_pct' => 'float',
            'auto_rollback_enabled' => 'boolean',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function deployedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deployed_by');
    }
}
