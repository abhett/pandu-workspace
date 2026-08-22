<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RcaActionItem extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'rca_action_items';

    protected $fillable = [
        'root_cause_analysis_id',
        'organization_id',
        'title',
        'description',
        'priority',
        'type',
        'status',
        'assignee_id',
        'due_date',
        'completed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'completed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function rootCauseAnalysis(): BelongsTo
    {
        return $this->belongsTo(RootCauseAnalysis::class, 'root_cause_analysis_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }
}
