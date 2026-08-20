<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SprintRetrospective extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'sprint_retrospectives';

    protected $fillable = [
        'project_id',
        'sprint_id',
        'title',
        'format',
        'status',
        'facilitator_id',
        'is_anonymous',
        'sentiment_score',
        'summary_notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_anonymous' => 'boolean',
            'sentiment_score' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function sprint(): BelongsTo
    {
        return $this->belongsTo(Sprint::class);
    }

    public function facilitator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'facilitator_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(RetrospectiveItem::class, 'retrospective_id');
    }
}
