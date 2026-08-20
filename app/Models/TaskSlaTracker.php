<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskSlaTracker extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'task_id',
        'sla_policy_id',
        'response_due_at',
        'responded_at',
        'is_response_breached',
        'resolution_due_at',
        'resolved_at',
        'is_resolution_breached',
        'status',
        'escalated_at',
        'escalation_level',
    ];

    protected function casts(): array
    {
        return [
            'response_due_at' => 'datetime',
            'responded_at' => 'datetime',
            'is_response_breached' => 'boolean',
            'resolution_due_at' => 'datetime',
            'resolved_at' => 'datetime',
            'is_resolution_breached' => 'boolean',
            'escalated_at' => 'datetime',
            'escalation_level' => 'integer',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function policy(): BelongsTo
    {
        return $this->belongsTo(SlaPolicy::class, 'sla_policy_id');
    }
}
