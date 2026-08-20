<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemberCapacitySetting extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'organization_id',
        'user_id',
        'weekly_capacity_hours',
        'max_story_points_per_sprint',
        'fte_ratio',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'weekly_capacity_hours' => 'decimal:2',
            'max_story_points_per_sprint' => 'decimal:1',
            'fte_ratio' => 'decimal:2',
            'is_active' => 'boolean',
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
