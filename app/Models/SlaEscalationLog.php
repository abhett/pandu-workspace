<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SlaEscalationLog extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'sla_escalation_logs';

    protected $fillable = [
        'organization_id',
        'task_id',
        'tracker_id',
        'triggered_by',
        'escalation_tier',
        'previous_priority',
        'new_priority',
        'previous_assignee_id',
        'new_assignee_id',
        'breach_risk_score',
        'reason',
        'actions_taken',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'escalation_tier' => 'integer',
            'breach_risk_score' => 'float',
            'actions_taken' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function tracker(): BelongsTo
    {
        return $this->belongsTo(TaskSlaTracker::class, 'tracker_id');
    }

    public function triggerer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by');
    }

    public function previousAssignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'previous_assignee_id');
    }

    public function newAssignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'new_assignee_id');
    }
}
