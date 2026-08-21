<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FeatureFlag extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'feature_flags';

    protected $fillable = [
        'organization_id',
        'project_id',
        'key',
        'name',
        'description',
        'strategy',
        'is_enabled',
        'rollout_percentage',
        'target_rules',
        'evaluations_count',
        'error_rate_pct',
        'status',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'rollout_percentage' => 'integer',
            'target_rules' => 'array',
            'evaluations_count' => 'integer',
            'error_rate_pct' => 'float',
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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(FeatureFlagEvaluationLog::class, 'feature_flag_id');
    }
}
