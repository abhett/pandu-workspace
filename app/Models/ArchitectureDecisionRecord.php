<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ArchitectureDecisionRecord extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'architecture_decision_records';

    protected $fillable = [
        'organization_id',
        'project_id',
        'author_id',
        'adr_number',
        'domain',
        'title',
        'status',
        'context_and_problem',
        'decision_outcome',
        'positive_consequences',
        'negative_consequences',
        'alternatives_considered',
        'superseded_by_id',
        'decided_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'adr_number' => 'integer',
            'positive_consequences' => 'array',
            'negative_consequences' => 'array',
            'alternatives_considered' => 'array',
            'decided_at' => 'date',
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

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function supersededBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'superseded_by_id');
    }

    public function supersedes(): HasMany
    {
        return $this->hasMany(self::class, 'superseded_by_id');
    }
}
