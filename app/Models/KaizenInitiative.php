<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KaizenInitiative extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'kaizen_initiatives';

    protected $fillable = [
        'organization_id',
        'project_id',
        'retrospective_item_id',
        'source_sprint_id',
        'target_sprint_id',
        'owner_id',
        'pillar',
        'title',
        'problem_statement',
        'action_plan',
        'expected_impact',
        'measured_outcome',
        'status',
        'impact_score',
        'due_date',
        'verified_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'impact_score' => 'integer',
            'due_date' => 'date',
            'verified_at' => 'datetime',
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

    public function retrospectiveItem(): BelongsTo
    {
        return $this->belongsTo(RetrospectiveItem::class, 'retrospective_item_id');
    }

    public function sourceSprint(): BelongsTo
    {
        return $this->belongsTo(Sprint::class, 'source_sprint_id');
    }

    public function targetSprint(): BelongsTo
    {
        return $this->belongsTo(Sprint::class, 'target_sprint_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
