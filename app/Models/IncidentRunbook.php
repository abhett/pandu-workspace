<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IncidentRunbook extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'incident_runbooks';

    protected $fillable = [
        'organization_id',
        'title',
        'slug',
        'description',
        'category',
        'severity',
        'estimated_duration_minutes',
        'is_automated',
        'steps',
        'parameters',
        'total_runs',
        'success_rate',
        'last_executed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_automated' => 'boolean',
            'steps' => 'array',
            'parameters' => 'array',
            'estimated_duration_minutes' => 'integer',
            'total_runs' => 'integer',
            'success_rate' => 'float',
            'last_executed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function executions(): HasMany
    {
        return $this->hasMany(RunbookExecution::class, 'incident_runbook_id');
    }
}
