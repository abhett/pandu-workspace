<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSkill extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'organization_id',
        'user_id',
        'skill_id',
        'proficiency_level',
        'years_of_experience',
        'verified',
        'endorsed_by',
    ];

    protected function casts(): array
    {
        return [
            'years_of_experience' => 'float',
            'verified' => 'boolean',
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

    public function skill(): BelongsTo
    {
        return $this->belongsTo(Skill::class);
    }

    public function endorser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'endorsed_by');
    }
}
