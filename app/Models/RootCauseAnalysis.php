<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RootCauseAnalysis extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'root_cause_analyses';

    protected $fillable = [
        'organization_id',
        'incident_id',
        'trace_id',
        'title',
        'status',
        'severity',
        'primary_cause_category',
        'suspect_service',
        'suspect_operation',
        'confidence_score',
        'impact_summary',
        'blast_radius',
        'five_whys',
        'contributing_factors',
        'blame_commits',
        'telemetry_correlations',
        'timeline_events',
        'mitigation_steps',
        'post_mortem_report',
        'created_by',
        'verified_by',
        'verified_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'confidence_score' => 'float',
            'blast_radius' => 'array',
            'five_whys' => 'array',
            'contributing_factors' => 'array',
            'blame_commits' => 'array',
            'telemetry_correlations' => 'array',
            'timeline_events' => 'array',
            'mitigation_steps' => 'array',
            'post_mortem_report' => 'array',
            'verified_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function actionItems(): HasMany
    {
        return $this->hasMany(RcaActionItem::class, 'root_cause_analysis_id');
    }
}
