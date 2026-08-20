<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProjectBudget extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'project_id',
        'total_budget',
        'currency',
        'budget_type',
        'capex_amount',
        'opex_amount',
        'alert_threshold_percent',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'total_budget' => 'float',
            'capex_amount' => 'float',
            'opex_amount' => 'float',
            'alert_threshold_percent' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
