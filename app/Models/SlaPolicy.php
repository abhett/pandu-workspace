<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SlaPolicy extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'project_id',
        'name',
        'description',
        'priority',
        'issue_type',
        'response_time_hours',
        'resolution_time_hours',
        'operational_hours',
        'active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'response_time_hours' => 'integer',
            'resolution_time_hours' => 'integer',
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

    public function escalationRules(): HasMany
    {
        return $this->hasMany(SlaEscalationRule::class, 'sla_policy_id')->orderBy('position');
    }

    public function taskTrackers(): HasMany
    {
        return $this->hasMany(TaskSlaTracker::class, 'sla_policy_id');
    }
}
