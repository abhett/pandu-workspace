<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CicdPipelineConfig extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'cicd_pipeline_configs';

    protected $fillable = [
        'organization_id',
        'project_id',
        'name',
        'repository_url',
        'provider',
        'default_branch',
        'webhook_secret',
        'require_prod_approval',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'require_prod_approval' => 'boolean',
            'is_active' => 'boolean',
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

    public function runs(): HasMany
    {
        return $this->hasMany(CicdPipelineRun::class, 'pipeline_config_id')->orderByDesc('run_number');
    }

    public function latestRun(): HasOne
    {
        return $this->hasOne(CicdPipelineRun::class, 'pipeline_config_id')->latestOfMany('run_number');
    }
}
