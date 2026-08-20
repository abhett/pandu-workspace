<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiskActionLog extends Model
{
    use HasFactory, HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'risk_id',
        'user_id',
        'action_taken',
        'status_before',
        'status_after',
        'residual_probability',
        'residual_impact',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'residual_probability' => 'integer',
            'residual_impact' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function risk(): BelongsTo
    {
        return $this->belongsTo(ProjectRisk::class, 'risk_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
