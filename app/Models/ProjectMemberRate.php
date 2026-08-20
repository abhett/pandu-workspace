<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectMemberRate extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'project_id',
        'user_id',
        'hourly_rate',
        'billing_role',
    ];

    protected function casts(): array
    {
        return [
            'hourly_rate' => 'float',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
