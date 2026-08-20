<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeamMoodPulse extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'team_mood_pulses';

    protected $fillable = [
        'organization_id',
        'user_id',
        'mood_score',
        'energy_level',
        'workload_feeling',
        'tags',
        'notes',
        'is_anonymous',
        'pulse_date',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'mood_score' => 'integer',
            'energy_level' => 'integer',
            'tags' => 'array',
            'is_anonymous' => 'boolean',
            'pulse_date' => 'date',
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
