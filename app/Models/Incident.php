<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Incident extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'incidents';

    protected $fillable = [
        'organization_id',
        'project_id',
        'incident_number',
        'title',
        'severity',
        'status',
        'impact_summary',
        'commander_id',
        'started_at',
        'acknowledged_at',
        'resolved_at',
        'mtta_minutes',
        'mttr_minutes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'incident_number' => 'integer',
            'started_at' => 'datetime',
            'acknowledged_at' => 'datetime',
            'resolved_at' => 'datetime',
            'mtta_minutes' => 'integer',
            'mttr_minutes' => 'integer',
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

    public function commander(): BelongsTo
    {
        return $this->belongsTo(User::class, 'commander_id');
    }

    public function updates(): HasMany
    {
        return $this->hasMany(IncidentUpdate::class, 'incident_id')->orderBy('posted_at', 'desc');
    }

    public function postMortem(): HasOne
    {
        return $this->hasOne(IncidentPostMortem::class, 'incident_id');
    }
}
