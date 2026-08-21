<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeveloperFocusSnapshot extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'developer_focus_snapshots';

    protected $fillable = [
        'organization_id',
        'user_id',
        'snapshot_date',
        'deep_work_minutes',
        'meeting_minutes',
        'context_switches_count',
        'active_tasks_count',
        'pr_reviews_count',
        'burnout_risk_score',
        'burnout_risk_level',
        'focus_efficiency_pct',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'snapshot_date' => 'date',
            'deep_work_minutes' => 'integer',
            'meeting_minutes' => 'integer',
            'context_switches_count' => 'integer',
            'active_tasks_count' => 'integer',
            'pr_reviews_count' => 'integer',
            'burnout_risk_score' => 'integer',
            'focus_efficiency_pct' => 'float',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
