<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OkrObjective extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'okr_objectives';

    protected $fillable = [
        'organization_id',
        'parent_id',
        'project_id',
        'owner_id',
        'title',
        'description',
        'level',
        'period',
        'status',
        'confidence_score',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'confidence_score' => 'float',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(OkrObjective::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(OkrObjective::class, 'parent_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function keyResults(): HasMany
    {
        return $this->hasMany(OkrKeyResult::class, 'objective_id');
    }
}
