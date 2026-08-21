<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkloadRebalanceLog extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'workload_rebalance_logs';

    protected $fillable = [
        'organization_id',
        'task_id',
        'previous_assignee_id',
        'new_assignee_id',
        'rebalanced_by',
        'reason',
        'points_moved',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'points_moved' => 'float',
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

    public function previousAssignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'previous_assignee_id');
    }

    public function newAssignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'new_assignee_id');
    }

    public function rebalancedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rebalanced_by');
    }
}
